class Trackview3D {
    constructor() {
        this.canvas = document.getElementById("renderCanvas"); // Get the canvas element
        canvas.addEventListener("wheel", evt => evt.preventDefault());
        this.engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
        engine.setHardwareScalingLevel(0.7);
        this.scene = delayCreateScene(); //Call the createScene function

        // Register a render loop to repeatedly render the scene
        engine.runRenderLoop(function () {
            if (scene.activeCamera) {
                scene.render();
            }
        });
    }


}

var delayCreateScene = function() {
    var scene = new BABYLON.Scene(engine);
    var gl = new BABYLON.GlowLayer("glow", scene);
    var masterMesh;
    var particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);

    Promise.all([
        BABYLON.SceneLoader.ImportMeshAsync(null, root + "gltf/", trackid+".gltf", scene, function (evt) {
            var loadedPercent = 0;
            if (evt.lengthComputable) {
                loadedPercent = (evt.loaded * 100 / evt.total).toFixed();
            } else {
                var dlCount = evt.loaded / (1024 * 1024);
                loadedPercent = Math.floor(dlCount * 100.0) / 100.0;
            }
            document.getElementById("progressbar").setAttribute("style","width: "+loadedPercent+"%")
        }),
        getJSON(root + "geojson/"+trackid+".geojson")
    ]).catch(error => {
        document.getElementById("errormessage").innerText = "Error Loading Assets; Try again.";
        document.getElementById("errormessage").style.display = "block";
        document.getElementById("progressdiv").style.display = "none";
        console.error(error);
    }).then((values) => {
        let result = values[0]; //returned from ImportMeshAsync
        result.meshes.forEach(parentMesh => {
            parentMesh.getChildren().forEach(mesh => {
                mesh.scaling.z = zscaling;
                var normals = [];
                BABYLON.VertexData.ComputeNormals(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind), mesh.getIndices(), normals);
                mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
                if (mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)) { //ignore the
                    meshes.push(mesh);
                }
                //mesh.forceSharedVertices();
            })
        })
        jsonData = values[1]; //returned from getJSON
        prepareMap2d(jsonData);
        coordinateSystem.centerLat = jsonData.properties.bbox.centerLat;
        coordinateSystem.centerLon = jsonData.properties.bbox.centerLon;
        coordinateSystem.metersPerDegreeLat = jsonData.properties.bbox.metersPerDegreeLat;
        coordinateSystem.metersPerDegreeLon = jsonData.properties.bbox.metersPerDegreeLon;
        width_y = (jsonData.properties.bbox.boundingBoxN-jsonData.properties.bbox.boundingBoxS)*jsonData.properties.bbox.metersPerDegreeLat;
        width_x = (jsonData.properties.bbox.boundingBoxE-jsonData.properties.bbox.boundingBoxW)*jsonData.properties.bbox.metersPerDegreeLon;
        zoomfactor = jsonData.properties.tileBBoxes[0].tile_zoom;

        var layer = new BABYLON.Layer('','../assets/bkgrd.png', scene, true);
        scene.clearColor = new BABYLON.Color3.FromHexString("#2e3c4d");

        var camera = new BABYLON.ArcRotateCamera("camera", Math.PI/4, Math.PI/4, 5000, new BABYLON.Vector3(0,0,1500), scene);
        camera.upVector = new BABYLON.Vector3(0, 0, 1);
        camera.zoomOn(masterMesh);
        camera.maxZ = 100000;
        camera.upperBetaLimit = Math.PI/2;
        camera.upperRadiusLimit = Math.min(100000, 10000*Math.pow(2,14-zoomfactor));
        camera.lowerRadiusLimit = 100;
        camera.wheelPrecision = 0.1; //Mouse wheel speed
        camera.zoomToMouseLocation = true;
        camera.panningSensibility = 2/Math.pow(2,14-zoomfactor);
        camera.multiTouchPanAndZoom = true;
        camera.useNaturalPinchZoom = true;

        camera.attachControl(canvas, true, true);
        camera.useAutoRotationBehavior = true;
        camera.autoRotationBehavior.idleRotationWaitTime = 60 * 1000;

        //showWorldAxis(5000);
        helperLight = new BABYLON.HemisphericLight("DirectionalLightAbove", new BABYLON.Vector3(0,0, -1), scene);
        helperLight.intensity=0.6;
        var dirLight = new BABYLON.DirectionalLight("DirectionalLightSide", new BABYLON.Vector3(1, 1, 0), scene);
        dirLight.intensity = 2;
        scene.ambientColor = new BABYLON.Color3(1, 1, 1);

        camera.onViewMatrixChangedObservable.add(function(c) {
            c.target.z = Math.min(Math.max(c.target.z, (minAltitude-200)*zscaling), (maxAltitude+200)*zscaling);
            dirLight.direction = new BABYLON.Vector3(-1 * c.position.y, c.position.x, 0);
        })

        particleSystem.particleTexture = new BABYLON.Texture("../assets/flare.png", scene);
        particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
        particleSystem.minEmitPower = 100*Math.pow(2,14-zoomfactor);
        particleSystem.maxEmitPower = 300*Math.pow(2,14-zoomfactor);
        particleSystem.direction1 = new BABYLON.Vector3(0, 0, 1);
        particleSystem.direction2 = new BABYLON.Vector3(0, 0, 1);
        particleSystem.emitRate = 100;
        particleSystem.minLifeTime = 1;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1.0, 0.5, 0.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 1.0);
        particleSystem.minSize = 10*Math.pow(2,14-zoomfactor);
        particleSystem.maxSize = 150*Math.pow(2,14-zoomfactor);
        particleSystem.emitter.z = -2000;

        const textureSize = 512;
        let textureContexts = [];
        for (let i =0; i < meshes.length; i++ ) {
            var myDynamicTexture = new BABYLON.DynamicTexture("bla"+i, textureSize, scene);
            var textureContext = myDynamicTexture.getContext();
            textureContexts.push(textureContext);
            meshes[i].material.emissiveTexture = myDynamicTexture; //pBR texture
            meshes[i].material.emissiveColor = new BABYLON.Color3(1, 1, 1);
            //textureContext.strokeStyle = "#2a84de";
            textureContext.strokeStyle = "#ff8001";
            textureContext.lineWidth = 3;
            textureContext.beginPath();
        }

        let tileIndex = -1;
        let px_perDegree_lat = 0;
        let px_perDegree_lon = 0;
        for (let i=0; i < jsonData.geometry.coordinates.length; i++) {
            let track = jsonData.geometry.coordinates[i];
            for (let j = 1; j < track.length; j++) {

                if (tileIndex===-1 || !(jsonData.properties.tileBBoxes[tileIndex].n_Bound > track[j][1] && jsonData.properties.tileBBoxes[tileIndex].s_Bound < track[j][1] && jsonData.properties.tileBBoxes[tileIndex].w_Bound < track[j][0] && jsonData.properties.tileBBoxes[tileIndex].e_Bound > track[j][0])) {
                    if (tileIndex !== -1) {//before tile switch; draw into void of old tile to keep lines correct
                        let x=(track[j][0]-jsonData.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                        let y=(track[j][1]-jsonData.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                        textureContexts[tileIndex].lineTo(x, y);
                    }
                    for (let k = 0; k < jsonData.properties.tileBBoxes.length; k++) {
                        if (jsonData.properties.tileBBoxes[k].n_Bound > track[j][1] && jsonData.properties.tileBBoxes[k].s_Bound < track[j][1] && jsonData.properties.tileBBoxes[k].w_Bound < track[j][0] && jsonData.properties.tileBBoxes[k].e_Bound > track[j][0]) {
                            tileIndex = k;
                            px_perDegree_lon = textureSize / jsonData.properties.tileBBoxes[tileIndex].widthLonDegree;
                            px_perDegree_lat = textureSize / jsonData.properties.tileBBoxes[tileIndex].widthLatDegree;

                            //after tile switch; move to previous point into void of new tile to keep lines correct
                            let x=(track[j-1][0]-jsonData.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                            let y=(track[j-1][1]-jsonData.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                            textureContexts[tileIndex].moveTo(x, y);
                            break;
                        }
                    }
                }

                let x=(track[j][0]-jsonData.properties.tileBBoxes[tileIndex].w_Bound)*px_perDegree_lon;
                let y=(track[j][1]-jsonData.properties.tileBBoxes[tileIndex].s_Bound)*px_perDegree_lat;
                textureContexts[tileIndex].lineTo(x, y);
            }
        }

        for (let i =0; i < meshes.length; i++ ) {
            textureContexts[i].stroke();
            meshes[i].material.emissiveTexture.update();
        }

        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                var hit = scene.pick(scene.pointerX, scene.pointerY)
                if (hit.hit) {
                    var lat = (hit.pickedPoint._y/coordinateSystem.metersPerDegreeLat)+coordinateSystem.centerLat;
                    var lon = coordinateSystem.centerLon-(hit.pickedPoint._x/coordinateSystem.metersPerDegreeLon);
                    findLine(lat,lon);
                } else {
                    findLine(null);
                }
            }
        });

        prepareGraph(jsonData);
        document.getElementById("progressdiv").style.display = "none";
        var n_bound = jsonData.properties.tileBBoxes[0].n_Bound;
        var w_bound = jsonData.properties.tileBBoxes[0].w_Bound;
        var e_bound = jsonData.properties.tileBBoxes[jsonData.properties.tileBBoxes.length-1].e_Bound;
        var s_bound = jsonData.properties.tileBBoxes[jsonData.properties.tileBBoxes.length-1].s_Bound;
        return getJSON(root+"peaks/nbound="+n_bound+"&sbound="+s_bound+"&wbound="+w_bound+"&ebound="+e_bound);
    }).then(function(result) { //peak list
        var font_size = 48;
        var font = font_size + "px Helvetica";
        var planeHeight = 100;
        var DTHeight = 1.5 * font_size;
        var ratio = planeHeight/DTHeight;
        var temp = new BABYLON.DynamicTexture("DynamicTexture", 64, scene);
        var tmpctx = temp.getContext();
        tmpctx.font = font;
        const f = new BABYLON.Vector4(0,0, 1, 1);
        const b = new BABYLON.Vector4(1,0, 0, 1);

        var mat2 = new BABYLON.StandardMaterial("mat", scene);
        mat2.ambientColor = new BABYLON.Color3(1, 1, 1);
        mat2.alpha = 0.7;
        for (let i=0; i < result.peaklist.length && i < 100; i++) {
            var text = result.peaklist[i].name;
            var DTWidth = tmpctx.measureText(text).width + 8;
            var planeWidth = DTWidth * ratio;
            var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", {width:DTWidth, height:DTHeight}, scene, false);
            var mat = new BABYLON.StandardMaterial("mat", scene);
            mat.ambientTexture = dynamicTexture;
            mat.ambientColor = new BABYLON.Color3(1, 1, 1);
            mat.alpha = 0.7;
            dynamicTexture.drawText(text, null, null, font, "#000000", "#ffffff", true);
            var plane = BABYLON.MeshBuilder.CreatePlane("plane", {width:planeWidth, height:planeHeight, frontUVs: f, backUVs: b, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, scene);
            plane.material = mat;

            var pos = getPosition(result.peaklist[i].lat, result.peaklist[i].lon);
            plane.position.x = pos.x;
            plane.position.y = pos.y;
            plane.position.z = pos.z+(planeHeight)+70;
            plane.rotation.x = Math.PI/2;
            plane.isPickable = false;
            var plane2 = BABYLON.MeshBuilder.CreatePlane("plane2", {width:20, height:140, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, scene);
            plane2.position.x = pos.x;
            plane2.position.y = pos.y;
            plane2.position.z = pos.z+70;
            plane2.rotation.x = Math.PI/2;
            plane2.isPickable = false;
            plane2.material = mat2;
        }

    });

    settings();
    return scene;
};

function getPosition(lat, lon) {
    var x = (coordinateSystem.centerLon-lon)*coordinateSystem.metersPerDegreeLon;
    var y = (lat-coordinateSystem.centerLat)*coordinateSystem.metersPerDegreeLat;
    var ray = new BABYLON.Ray(new BABYLON.Vector3(x,y,20000), new BABYLON.Vector3(0,0,-1), 20100);
    var hit = scene.pickWithRay(ray);
    if (hit.hit) {
        return hit.pickedPoint;
    } else
        return false;
}

function mapstyle(style) {
    let styletype;
    switch(style) {
        case 'summer':
            styletype = 'standard';
            helperLight.intensity=0.6;
            break;
        case 'winter':
            styletype = 'winter';
            helperLight.intensity=0.6;
            break;
        case 'satellite':
            styletype = 'satellite';
            helperLight.intensity=0.8;
            break;
        default:
            styletype = 'standard';
    }

    for (let i =0; i < meshes.length; i++ ) {
        meshes[i].material.albedoTexture.dispose();
        let url = root + `gltf/map/${styletype}/${jsonData.properties.tileBBoxes[i].tile_zoom}/${jsonData.properties.tileBBoxes[i].tile_x}/${jsonData.properties.tileBBoxes[i].tile_y}.png`;
        meshes[i].material.albedoTexture = new BABYLON.Texture(url, scene);
        meshes[i].material.albedoTexture.vScale = -1;
        jsonData.properties.tileBBoxes[i];
    }
}