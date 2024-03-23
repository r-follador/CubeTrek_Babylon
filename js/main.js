import  eventBus from './EventBus.js';
import { settings } from "./utilities.js";
import { Map2D } from "./map2d.js";
import { GraphCube } from "./graph.js";


//Tons of Globals, a sign of shitty programming
var maxAltitude = 5000;
var minAltitude = 0;
var width_x = 1000;
var depth_y = 1000;
var zoomfactor = 12;
var meshes = [];
var jsonData;
const zscaling = 1.5;
const coordinateSystem = [];
const root = "../api/";
var helperLight;

var geojson;
var map2d;
var graph;

settings();
init()

function init() {

    fetchGeoJSON().then(r => {
        geojson = r;
        map2d = new Map2D(geojson);
        graph = new GraphCube(geojson);
    });
}

function hideMarkers(data) {
    console.log('Hide markers:', data);
    map2d.hideMarker();
}

function moveMarkers(data) {
    console.log('Move markers:', data);
    map2d.moveMarker(data.lat, data.lon);
}

// Subscribe to the sync event
eventBus.on('hideMarkers', hideMarkers);
eventBus.on('moveMarkers', moveMarkers);




function init2() {
//RUN
    const canvas = document.getElementById("renderCanvas"); // Get the canvas element
    canvas.addEventListener("wheel", evt => evt.preventDefault());
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
    engine.setHardwareScalingLevel(0.7);
    const scene = delayCreateScene(); //Call the createScene function

// Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
        if (scene.activeCamera) {
            scene.render();
        }
    });
// Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
        graph = new drawGraph(graphYAxis, graphXAxis);
    });
}

var marker;


function hideMapMarker() {
    scene.particleSystems[0].stop();
    marker.setLngLat([0, 0]); //2D map
}

function moveMapMarker(lat, lon) {
    marker.setLngLat([lon, lat]); //2D map
    var x = (coordinateSystem.centerLon-lon)*coordinateSystem.metersPerDegreeLon;
    var y = (lat-coordinateSystem.centerLat)*coordinateSystem.metersPerDegreeLat;
    scene.particleSystems[0].emitter.x=x;
    scene.particleSystems[0].emitter.y=y;
    var ray = new BABYLON.Ray(new BABYLON.Vector3(x,y,20000), new BABYLON.Vector3(0,0,-1), 20100);
    var hit = scene.pickWithRay(ray);
    if (hit.hit) {
        scene.particleSystems[0].emitter = hit.pickedPoint;
        scene.particleSystems[0].start();
        return true;
    }
    return false;
}


async function fetchGeoJSON() {
    return fetch(root + "geojson/"+sharedObjects.trackid+".geojson")
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
