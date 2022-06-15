const MAPBOX_ACCESS_TOKEN = '';
const GATEWAY_API = '';

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10',
    center: [ 30.52428, 50.45056 ],
    zoom: 10.5
});

let allStreets = [];
let selectedStreet = {};
let centerMarkers = [];

async function getAllStreets() {
    removeRoute();

    allStreets = await fetch(GATEWAY_API + 'all-streets')
        .then(response => response.json())
        .then(response => response.Items);

    // showAllStreets();
    showAllStreetsCenterMarker();
}

function addSuggestions() {
    const searchInput = document.getElementById("search");
    const suggestionsList = document.getElementById("suggestions");

    let currentNamesSuggestions = [];
    let formerNamesSuggestions = [];
    let allSuggestions = [];

    allStreets.forEach(street => {
        const currentStreetOption = `<option value=${street.id}>${street.name}</option>`;
        currentNamesSuggestions.push(currentStreetOption);
        const formerNames = street.formerNamesInfo.map(formerNameInfo => {
            if (formerNameInfo.formerName !== street.name) {
                let text = (formerNameInfo.formerName + " (теп. " + street.name + ")");
                return `<option value=${street.id}>${text}</option>`
            }
        }).join("");
        formerNamesSuggestions = formerNamesSuggestions.concat(formerNames);
    });

    allSuggestions = currentNamesSuggestions.concat(formerNamesSuggestions).join("");

    const options = allSuggestions;

    suggestionsList.innerHTML = `
    ${options}
    `

    searchInput.onselect = function (e) {
        e.currentTarget.select();
    }

    searchInput.onfocus = function (e) {
        if (e.target.value && e.target.value.length >= 2) {
            suggestionsList.style.display = 'block';
        }
        for (let option of suggestionsList.options) {
            option.onclick = function () {
                searchInput.value = allStreets.find(street => street.id === option.value).name;
                showWholeStreetAndInfoAbout(option.value);
                suggestionsList.style.display = 'none';
            }
        }
    }

    let currentSuggestions = [];

    searchInput.oninput = function () {
        currentSuggestions = [];
        const inputString = searchInput.value.toLowerCase();
        if (inputString.length >= 2) {
            suggestionsList.style.display = 'block';
            for (let option of suggestionsList.options) {
                const regex = /[(].*/gm;
                const streetFullName = option.innerHTML.toLowerCase().replaceAll(regex, "").replaceAll("\\s+", " ").trim();
                const splittedWords = streetFullName.split(" ").filter(word => word.length > 0);
                for (const word of splittedWords) {
                    if (word.startsWith(inputString)) {
                        currentSuggestions.push(option);
                        makeSuggestionActive(currentSuggestions, 0);
                        option.style.display = "block";
                        break;
                    } else {
                        option.style.display = "none";
                    }
                }
            }
        } else {
            suggestionsList.style.display = 'none';
        }
    }

    let currentFocus = 0;
    searchInput.onkeydown = function (e) {
        if (e.key === "ArrowDown") {
            currentFocus++;
            if (currentFocus > currentSuggestions.length - 1) {
                currentFocus = currentSuggestions.length - 1;
            }
            makeSuggestionActive(currentSuggestions, currentFocus);
        } else if (e.key === "ArrowUp") {
            currentFocus--;
            if (currentFocus < 0) {
                currentFocus = 0;
            }
            makeSuggestionActive(currentSuggestions, currentFocus);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (currentFocus > -1) {
                if (currentFocus > currentSuggestions.length - 1) {
                    currentFocus = currentSuggestions.length - 1;
                }
                if (currentFocus < 0) {
                    currentFocus = 0;
                }
                if (currentSuggestions[currentFocus]) {
                    currentSuggestions[currentFocus].click();
                }
            }
        }
    }
}

function makeSuggestionActive(currentSuggestions, currentFocus) {
    if (currentSuggestions[currentFocus]) {
        currentSuggestions[currentFocus].classList.add("active");
    }
    currentSuggestions.forEach((suggestion, i) => {
        if (i !== currentFocus) {
            suggestion.classList.remove("active");
        }
    })
}

function showWholeStreetAndInfoAbout(streetId) {
    selectedStreet = allStreets.find(street => street.id === streetId);
    showStreet();

    const infoBox = document.getElementsByClassName('info-box')[0];
    infoBox.classList.remove("hidden-div");
    const formerNamesPart = selectedStreet.formerNamesInfo.map(formerNameInfo => (
        `<li class="progress__item">
                <div class="progress__title" onclick="toggleVisibility(event)">${formerNameInfo.formerName} ${formerNameInfo.year ? "(" + formerNameInfo.year + ")" : ""} ${(formerNameInfo.generalInfo || formerNameInfo.namedAfter) ? '</br> <p class="progress__title__more shown-text">Більше...</p>' : ''}</div>
                <div class="progress__info hidden-text">${formerNameInfo.namedAfter ? `<h3>На честь</h3>${formerNameInfo.namedAfter}` : ""}</div>
                <div class="progress__info hidden-text">${formerNameInfo.generalInfo ? `<h3>Загальна інформація</h3>${formerNameInfo.generalInfo}` : ""}</div>
             </li>`
    )).join("");

    infoBox.innerHTML = `
        <ul class="progress">
            <li class="progress__item">
                <div class="progress__title" onclick="toggleVisibility(event)">${selectedStreet.name} ${selectedStreet.year ? "(" + selectedStreet.year + ")" : ""} ${(selectedStreet.generalInfo || selectedStreet.namedAfter) ? '</br> <p class="progress__title__more hidden-text">Більше...</p>' : ''}</div>
                <div class="progress__info shown-text">${selectedStreet.namedAfter ? `<h3>На честь</h3>${selectedStreet.namedAfter}` : ""}</div>
                <div class="progress__info shown-text">${selectedStreet.generalInfo ? `<h3>Загальна інформація</h3>${selectedStreet.generalInfo}` : ""}</div>
            </li>
            ${formerNamesPart}
        </ul>
        `;

    const zoomCenter = {...selectedStreet.centerCoords};


    let zoom = 12;
    if (selectedStreet.type && selectedStreet.type === "SQUARE") {
        zoom = 13;
        zoomCenter.lng -= 0.02 * window.innerWidth / 1500;
    } else {
        zoomCenter.lng -= 0.035 * window.innerWidth / 1500;
    }


    map.flyTo({
        center: zoomCenter,
        zoom,
        bearing: 0,
        speed: 0.7,
        curve: 1,
        essential: true
    });
}

function toggleVisibility(event) {
    let target;
    if (event.target.classList.contains("progress__title__more")) {
        target = event.target.parentElement.parentElement;
    } else {
        target = event.target.parentElement;
    }

    if (target.getElementsByClassName("progress__info")[0].classList.contains("hidden-text")) {
        const allInfos = target.parentElement.getElementsByClassName("progress__item");
        for (let element of allInfos) {
            if (element.children[0] && element.children[0].getElementsByClassName("progress__title__more")[0]) {
                element.children[0].getElementsByClassName("progress__title__more")[0].classList.add("shown-text");
                element.children[0].getElementsByClassName("progress__title__more")[0].classList.remove("hidden-text");
            }
            element.children[1].classList.remove("shown-text");
            element.children[2].classList.remove("shown-text");
            element.children[1].classList.add("hidden-text");
            element.children[2].classList.add("hidden-text");
        }
        if (target.getElementsByClassName("progress__title")[0] && target.getElementsByClassName("progress__title")[0].getElementsByClassName("progress__title__more")[0]) {
            target.getElementsByClassName("progress__title")[0].getElementsByClassName("progress__title__more")[0].classList.remove("shown-text");
            target.getElementsByClassName("progress__title")[0].getElementsByClassName("progress__title__more")[0].classList.add("hidden-text");
        }
        target.getElementsByClassName("progress__info")[0].classList.remove("hidden-text");
        target.getElementsByClassName("progress__info")[1].classList.remove("hidden-text");
        target.getElementsByClassName("progress__info")[0].classList.add("shown-text");
        target.getElementsByClassName("progress__info")[1].classList.add("shown-text");

    } else {
        if (target.getElementsByClassName("progress__title")[0]) {
            target.getElementsByClassName("progress__title")[0].getElementsByClassName("progress__title__more")[0].classList.add("shown-text");
            target.getElementsByClassName("progress__title")[0].getElementsByClassName("progress__title__more")[0].classList.remove("hidden-text");
        }
        target.getElementsByClassName("progress__info")[0].classList.add("hidden-text");
        target.getElementsByClassName("progress__info")[1].classList.add("hidden-text");
        target.getElementsByClassName("progress__info")[0].classList.remove("shown-text");
        target.getElementsByClassName("progress__info")[1].classList.remove("shown-text");
    }
}

function showAllStreetsCenterMarker() {
    if (allStreets && allStreets.length > 0) {
        allStreets.forEach(street => {
            let color = "#3FB1CE";
            if (street.type) {
                if (street.type === "SQUARE") {
                    color = "#ff0000"
                }
            }
            const marker = new mapboxgl.Marker({
                color
            });
            const infoPopup = new mapboxgl.Popup({offset: 25}).setText(street.name);
            marker
                .setLngLat(street.centerCoords)
                .addTo(map);
            marker.getElement().addEventListener('click', () => {
                showWholeStreetAndInfoAbout(street.id);
            });
            marker.getElement().addEventListener('mouseover', () => {
                infoPopup.setLngLat(street.centerCoords).addTo(map);
            });
            marker.getElement().addEventListener('mouseleave', () => {
                infoPopup.remove();
            });
            centerMarkers.push(marker);
        });
    }
}

function showAllStreets() {
    if (allStreets && allStreets.length > 0) {
        allStreets.forEach(street => {
            map.addLayer({
                'id': street.id,
                'type': 'line',
                'source': {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {coordinates: street.coords, type: "LineString"}
                    }
                },
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#03AA46',
                    'line-width': 8,
                    'line-opacity': 0.8
                }
            });
        });
    }
}

function showStreet() {
    if (map.getSource('selectedStreet')) {
        map.removeLayer('selectedStreet');
        map.removeSource('selectedStreet');
    }
    let type = "line";
    let color = "#03AA46";
    let layout = {
        'line-join': 'round',
        'line-cap': 'round'
    }
    let paint = {
        'line-color': color,
        'line-width': 8,
        'line-opacity': 0.8
    };
    if (selectedStreet.type) {
        if (selectedStreet.type === "SQUARE") {
            type = "fill";
            color = "#f04f4f";
            layout = {}
            paint = {
                'fill-color': color,
                'fill-opacity': 0.8
            }
        }
    }
    map.addLayer({
        'id': 'selectedStreet',
        'type': type,
        'source': {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {coordinates: selectedStreet.coords, type: "LineString"}
            }
        },
        'layout': layout,
        'paint': paint
    });
}

function removeRoute() {
    if (!map.getSource('selectedStreet')) return;
    map.removeLayer('selectedStreet');
    map.removeSource('selectedStreet');
}

getAllStreets()
    .then(() => {
        addSuggestions();
    });