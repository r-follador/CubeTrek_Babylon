import  eventBus from './EventBus.js';
import { settings } from "./utilities.js";
import { Map2D } from "./map2d.js";
import { GraphCube } from "./graph.js";
import { Map3D } from "./map3d.js";


var geojson;
var map2d;
var graph;
var map3d;

settings();
init()

function init() {
    fetchGeoJSON().then(r => {
        geojson = r;
        map2d = new Map2D(geojson);
        graph = new GraphCube(geojson);
        map3d = new Map3D(geojson);
    });
}

function hideMarkers(data) {
    console.log('Hide markers:', data);
    map2d.hideMarker();
    graph.hideMarker();
    map3d.hideMarker();
}

function moveMarkers(data) {
    console.log('Move markers:', data);
    map2d.moveMarker(data.lat, data.lon);
    graph.moveMarker(data.datasIndex);
    map3d.moveMarker(data.lat, data.lon);
}

// Subscribe to the sync events
eventBus.on('hideMarkers', hideMarkers);
eventBus.on('moveMarkers', moveMarkers);

async function fetchGeoJSON() {
    return fetch(sharedObjects.root + "geojson/"+sharedObjects.trackid+".geojson")
        .then(response => {
            if (!response.ok) {
                document.getElementById("errormessage").innerText = "Error Loading Assets; Try again.";
                document.getElementById("errormessage").style.display = "block";
                document.getElementById("progressdiv").style.display = "none";
                console.error(response.statusText);
            }
            return response.json();
        });
}