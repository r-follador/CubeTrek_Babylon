import eventBus from './EventBus.js';

const zscaling = 1.5;

export class Map3D {

    constructor(geojson) {
        this.geojson = geojson;
        this.canvas = document.getElementById("renderCanvas"); // Get the canvas element
        this.canvas.addEventListener("wheel", evt => evt.preventDefault());
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.engine.setHardwareScalingLevel(0.7);

        this.coordinateSystem = [];
        this.maxAltitude = 5000;
        this.minAltitude = 0;

        //TODO: define maxAltitude, minAltitude

        //Get relevant measurements for calculations from the GEOJson
        this.coordinateSystem.centerLat = geojson.properties.bbox.centerLat;
        this.coordinateSystem.centerLon = geojson.properties.bbox.centerLon;
        this.coordinateSystem.metersPerDegreeLat = geojson.properties.bbox.metersPerDegreeLat;
        this.coordinateSystem.metersPerDegreeLon = geojson.properties.bbox.metersPerDegreeLon;
        this.width_y = (geojson.properties.bbox.boundingBoxN-geojson.properties.bbox.boundingBoxS)*geojson.properties.bbox.metersPerDegreeLat;
        this.width_x = (geojson.properties.bbox.boundingBoxE-geojson.properties.bbox.boundingBoxW)*geojson.properties.bbox.metersPerDegreeLon;
        this.zoomfactor = geojson.properties.tileBBoxes[0].tile_zoom;

        this.scene = this.delayCreateScene();

        this.engine.runRenderLoop(() => {
            if (this.scene.activeCamera) {
                this.scene.render();
            }
        });
        this.meshes = [];
    }

    delayCreateScene() {
        console.log("delayCreateScene");
        const scene = new BABYLON.Scene(this.engine);
        this.loadMeshAndTexture(scene).then(() => {

            //Set the camera
            var camera = new BABYLON.ArcRotateCamera("camera", Math.PI/4, Math.PI/4, 5000, new BABYLON.Vector3(0,0,1500), scene);
            camera.upVector = new BABYLON.Vector3(0, 0, 1);
            camera.setTarget(this.globalBoundingInfo.boundingBox.center);
            camera.radius = this.globalBoundingInfo.diagonalLength * 1.5; //
            camera.maxZ = 100000;
            camera.upperBetaLimit = Math.PI/2;
            camera.upperRadiusLimit = Math.min(100000, 10000*Math.pow(2,14-this.zoomfactor));
            camera.lowerRadiusLimit = 100;
            camera.wheelPrecision = 0.1; //Mouse wheel speed
            camera.zoomToMouseLocation = true;
            camera.panningSensibility = 2/Math.pow(2,14-this.zoomfactor);
            camera.multiTouchPanAndZoom = true;
            camera.useNaturalPinchZoom = true;
            camera.attachControl(this.canvas, true, true);
            camera.useAutoRotationBehavior = true;
            camera.autoRotationBehavior.idleRotationWaitTime = 60 * 1000;

            //Background
            var layer = new BABYLON.Layer('','../assets/bkgrd.png', scene, true);
            scene.clearColor = new BABYLON.Color3.FromHexString("#2e3c4d");

            //Lighting
            this.helperLight = new BABYLON.HemisphericLight("DirectionalLightAbove", new BABYLON.Vector3(0,0, -1), scene);
            this.helperLight.intensity=0.6;
            var dirLight = new BABYLON.DirectionalLight("DirectionalLightSide", new BABYLON.Vector3(1, 1, 0), scene);
            dirLight.intensity = 2;
            scene.ambientColor = new BABYLON.Color3(1, 1, 1);

            camera.onViewMatrixChangedObservable.add(function(c) {
                c.target.z = Math.min(Math.max(c.target.z, (sharedObjects.minAltitude-200)*zscaling), (sharedObjects.maxAltitude+200)*zscaling);
                dirLight.direction = new BABYLON.Vector3(-1 * c.position.y, c.position.x, 0);
            })
        })

        console.log("next step;")

        var particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
        particleSystem.particleTexture = new BABYLON.Texture("../assets/flare.png", scene);
        particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
        particleSystem.minEmitPower = 100*Math.pow(2,14-this.zoomfactor);
        particleSystem.maxEmitPower = 300*Math.pow(2,14-this.zoomfactor);
        particleSystem.direction1 = new BABYLON.Vector3(0, 0, 1);
        particleSystem.direction2 = new BABYLON.Vector3(0, 0, 1);
        particleSystem.emitRate = 100;
        particleSystem.minLifeTime = 1;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1.0, 0.5, 0.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 1.0);
        particleSystem.minSize = 10*Math.pow(2,14-this.zoomfactor);
        particleSystem.maxSize = 150*Math.pow(2,14-this.zoomfactor);
        particleSystem.emitter.z = -2000;

        return scene;
    }

    async loadMeshAndTexture(scene) {
        try {
            const rootPath = sharedObjects.root + "gltf/";
            const fileName = sharedObjects.trackid + ".gltf";

            // Progress callback
            const onProgress = (evt) => {
                let loadedPercent = 0;
                if (evt.lengthComputable) {
                    loadedPercent = (evt.loaded * 100 / evt.total).toFixed();
                } else {
                    const dlCount = evt.loaded / (1024 * 1024); // Convert bytes to MB
                    loadedPercent = Math.floor(dlCount * 100.0) / 100.0;
                }
                document.getElementById("progressbar").setAttribute("style", "width: " + loadedPercent + "%");
            };
            const result = await BABYLON.SceneLoader.ImportMeshAsync(null, rootPath, fileName, scene, onProgress);

            console.log("Mesh import completed", result);
            document.getElementById("progressdiv").style.display = "none";

            //Loop through all meshes, Z-scale them, compute the normals (they are not properly set in the GLTF),
            // and add the relevent meshes to the this.meshes list
            let bounds = result.meshes[0].getHierarchyBoundingVectors();
            this.globalBoundingInfo = new BABYLON.BoundingInfo(bounds.min, bounds.max);
            result.meshes.forEach(parentMesh => {
                parentMesh.getChildren().forEach(mesh => {
                    mesh.scaling.z = zscaling;
                    var normals = [];
                    BABYLON.VertexData.ComputeNormals(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind), mesh.getIndices(), normals);
                    mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
                    if (mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)) {
                        this.meshes.push(mesh);
                    }
                    //mesh.forceSharedVertices();
                })
            })

            //Draw the GPS Path onto emissive DynamicTextures

            //for each mesh, add a DynamicTexture with emissive property (for the path drawing)
            const textureSize = 512;
            let textureContexts = [];
            for (let i =0; i < this.meshes.length; i++ ) {
                var myDynamicTexture = new BABYLON.DynamicTexture("bla"+i, textureSize, scene);
                var textureContext = myDynamicTexture.getContext();
                textureContexts.push(textureContext);
                this.meshes[i].material.emissiveTexture = myDynamicTexture; //pBR texture
                this.meshes[i].material.emissiveColor = new BABYLON.Color3(1, 1, 1);
                //textureContext.strokeStyle = "#2a84de";
                textureContext.strokeStyle = "#ff8001";
                textureContext.lineWidth = 3;
                textureContext.beginPath();
            }

            //Use the GeoJson to draw the path onto the DynamicTexture
            let tileIndex = -1;
            let px_perDegree_lat = 0;
            let px_perDegree_lon = 0;
            for (let i=0; i < this.geojson.geometry.coordinates.length; i++) {
                let track = this.geojson.geometry.coordinates[i];
                for (let j = 1; j < track.length; j++) {

                    if (tileIndex===-1 || !(this.geojson.properties.tileBBoxes[tileIndex].n_Bound > track[j][1] && this.geojson.properties.tileBBoxes[tileIndex].s_Bound < track[j][1] && this.geojson.properties.tileBBoxes[tileIndex].w_Bound < track[j][0] && this.geojson.properties.tileBBoxes[tileIndex].e_Bound > track[j][0])) {
                        if (tileIndex !== -1) {//before tile switch; draw into void of old tile to keep lines correct
                            let x=(track[j][0]-this.geojson.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                            let y=(track[j][1]-this.geojson.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                            textureContexts[tileIndex].lineTo(x, y);
                        }
                        for (let k = 0; k < this.geojson.properties.tileBBoxes.length; k++) {
                            if (this.geojson.properties.tileBBoxes[k].n_Bound > track[j][1] && this.geojson.properties.tileBBoxes[k].s_Bound < track[j][1] && this.geojson.properties.tileBBoxes[k].w_Bound < track[j][0] && this.geojson.properties.tileBBoxes[k].e_Bound > track[j][0]) {
                                tileIndex = k;
                                px_perDegree_lon = textureSize / this.geojson.properties.tileBBoxes[tileIndex].widthLonDegree;
                                px_perDegree_lat = textureSize / this.geojson.properties.tileBBoxes[tileIndex].widthLatDegree;

                                //after tile switch; move to previous point into void of new tile to keep lines correct
                                let x=(track[j-1][0]-this.geojson.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                                let y=(track[j-1][1]-this.geojson.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                                textureContexts[tileIndex].moveTo(x, y);
                                break;
                            }
                        }
                    }

                    let x=(track[j][0]-this.geojson.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                    let y=(track[j][1]-this.geojson.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                    textureContexts[tileIndex].lineTo(x, y);
                }
            }

            //Update all the new textures
            for (let i =0; i < this.meshes.length; i++ ) {
                textureContexts[i].stroke();
                this.meshes[i].material.emissiveTexture.update();
            }

        } catch (error) {
            document.getElementById("errormessage").innerText = "Error Loading Assets; Try again.";
            document.getElementById("errormessage").style.display = "block";
            document.getElementById("progressdiv").style.display = "none";
            console.error(error);
        }
    }
}