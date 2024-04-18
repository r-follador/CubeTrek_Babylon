# CubeTrek - Babylon.js Sandbox

## What's this?
[CubeTrek](https://cubetrek.com) is a free and open-source web app to visualize, share and manage your GPS tracks
(see the full repo at [github.com/r-follador/cubetrek](https://github.com/r-follador/CubeTrek))

One of its main features is the ability to show a 3-dimensional topographic model of the area with the GPS track overlaid.
<video src="https://github.com/r-follador/CubeTrek/assets/3812273/c2f175b4-dbcb-4ade-aca7-a2ffc3bb2c8b"></video>

The amazing [Babylon.js library](https://babylonjs.com/) is used to render the models and handle the user interactions
on the front end.

## How can you help?
CubeTrek can use some creative input on how to improve the user experience, make it easier to interact with the
topographical model, add some cool effects or whatever other ideas you have.

The idea is to bring any advancements from this repo to the [CubeTrek main repo](https://github.com/r-follador/CubeTrek),
for everyone to use.

## Why this sandbox?
The CubeTrek backend handles the dynamic aspects of generating the 3D model (a GLTF file), preparing
GeoJSON data, serving the map textures and producing a list of nearby peaks; all the parts required for the final
Babylon.js scene.

To make it easier to work on the Babylon.js (and other JavaScript) code, this repo provides three GPS tracks statically,
with all the required files:

- St. Moritz run
  - a large, mountainous terrain; well suited to showcase the potential of the 3D visualization
  - issues include zoom and panning speed (not well suited for the large area), visibility of the track marking
  - [Live view](https://cubetrek.com/view/6638), [HTML file](St.%20Moritz%20Run%20-%20CubeTrek.html)
- Cima di Fiorina
  - similar mountainous terrain, smaller size; lots of annotated peaks
  - [Live view](https://cubetrek.com/view/6338), [HTML file](Cima%20di%20Fiorina%20-%20CubeTrek.html)
- Chicago Run
  - flat, urban terrain, by the sea
  - issue: because there are almost no topographical features (very flat!), the 3D effect is rather useless and boring
  - [Live view](https://cubetrek.com/view/5876), [HTML file](Chicago%20Run%20-%20CubeTrek.html)

By the way, there are loads of other examples on [Cubetrek.com](https://cubetrek.com), you can also upload your own GPS
tracks.

## How to get started
- Clone the repo: `git clone https://github.com/r-follador/CubeTrek_Babylon`
- Create your own branch `git checkout -b my-beautiful-new-branch` (use a cooler branch name)
- Because the javascripts use modules, if you try to load the HTML file locally (i.e. with a file:// URL),
  you'll run into CORS errors due to JavaScript module security requirements. You need to do your testing through a server.
  It's best to use some type of IDE (IntelliJ, Visual Studio Code) anyway.
- Get started by modifying the Babylon.js script in [js/map3d.js](js/map3d.js).
- Commit and push your branch to origin (`git push -u origin my-beautiful-new-branch`)

## Short explanation of the contents
- Main HTML files (as mentioned above)
  - [St. Moritz Run - CubeTrek.html](St.%20Moritz%20Run%20-%20CubeTrek.html)
  - [Cima di Fiorina - CubeTrek.html](Cima%20di%20Fiorina%20-%20CubeTrek.html)
  - [Chicago Run - CubeTrek.html](Chicago%20Run%20-%20CubeTrek.html)
- JavaScript (in ./js)
  - [main.js](js/main.js): starting point, loading all modules
  - [map3d.js](js/map3d.js): **<-- this is where the CubeTrek.js magic happens!**
  - [map2d.js](js/map2d.js): the auxiliary 2D map on the bottom right (powered by [MapLibre GL JS](https://maplibre.org/))
  - [graph.js](js/graph.js): the statistic graph on the top right (powered by [D3.js](https://d3js.org/))
  - [EventBus.js](js/EventBus.js): connecting the Babylon map, the Maplibre map and the statistics graph on mouse hover
  - some other files...
- Usually generated on the fly from the CubeTrek server, but provided statically in this sandbox (in ./api):
  - [./api/gltf/*.gltf](api/gltf/5876.gltf) the GLTF files
  - [./api/gltf/map/*/*/*/*.png](api/gltf/map/satellite/13/4317/2896.png) the textures; either as map or as satellite pictures
  - [./api/geojson/*.json](api/geojson/5876.geojson) the geojson containing the lat/lon GPS points, timing data and some additional info
  - [./api/peaks/*](api/peaks/nbound=41.902277040963696&sbound=41.82045509614033&wbound=-87.626953125&ebound=-87.5830078125) a json containing a list of nearby peaks
