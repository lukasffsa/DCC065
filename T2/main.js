import * as THREE from 'three';
import { onWindowResize, initDefaultBasicLight } from "../libs/util/util.js";
import { airplane } from './airplane.js'
import { scene, renderer } from './config.js';
import { updateAirplane } from './raycast.js'
import { updateCamera, camera } from './camera.js'
import { updatePlane, plane_array, speed } from './terrain.js'
import { buildInterface, stats } from './fog.js';

window.addEventListener('resize', function(){ onWindowResize(camera, renderer)},false);

let light = initDefaultBasicLight(scene); 
scene.add(light);

renderer.domElement.style.cursor = "none";

const mira = document.createElement("div");
mira.innerHTML = "⊕";

mira.style.position = "fixed";
mira.style.fontSize = "30px";
mira.style.pointerEvents = "none";
mira.style.zIndex = "9999";

document.body.appendChild(mira);

document.addEventListener("mousemove", (e)=>{
    mira.style.left = e.clientX + "px";
    mira.style.top = e.clientY + "px";
});

buildInterface();
render();

function render() {

    stats.update();

    airplane.propeller.rotation.z += 10;

    updatePlane(plane_array, speed);
    updateAirplane();
    updateCamera();

    requestAnimationFrame(render);
    renderer.render(scene, camera);
}