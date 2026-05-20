import * as THREE from 'three';
import { onWindowResize, initDefaultBasicLight } from "../libs/util/util.js";
import { airplane } from './airplane.js'
import { scene, renderer } from './config.js';
import { updateAirplane } from './raycast.js'
import { updateCamera, camera } from './camera.js'
import { updatePlane, plane_array} from './terrain.js'
import { buildInterface, stats } from './fog.js';

window.addEventListener(
    'resize',
    function(){ onWindowResize(camera, renderer)},
    false
);

let light = initDefaultBasicLight(scene);
scene.add(light);


// ================= MIRA =================

const mira = document.createElement("div");

mira.innerHTML = "⊕";

mira.style.position = "fixed";
mira.style.fontSize = "30px";
mira.style.color = "white";
mira.style.pointerEvents = "none";
mira.style.zIndex = "9999";

document.body.appendChild(mira);

renderer.domElement.style.cursor = "none";
document.addEventListener("mousemove",(e)=>{
    mira.style.left = e.clientX + "px";
    mira.style.top = e.clientY + "px";
});

// ================= TEXTO PAUSA =================

const pauseText = document.createElement("div");
pauseText.innerHTML = "PAUSADO";
pauseText.style.position = "fixed";
pauseText.style.top = "50%";
pauseText.style.left = "50%";
pauseText.style.transform ="translate(-50%,-50%)";
pauseText.style.fontSize = "50px";
pauseText.style.fontWeight = "bold";
pauseText.style.color = "white";
pauseText.style.background ="rgba(0,0,0,0.5)";
pauseText.style.padding = "20px";
pauseText.style.borderRadius = "10px";
pauseText.style.display = "none";
pauseText.style.zIndex = "9999";
document.body.appendChild(pauseText);


// ================= PAUSA =================

let paused = false;

document.addEventListener(
'keydown',
(event)=>{
    if(event.code === 'Escape'){
        paused = true;
        pauseText.style.display = "block";
        renderer.domElement.style.cursor = "default";
        mira.style.display = "none";
    }

});

renderer.domElement.addEventListener('click', ()=>{
    if(paused){
        paused = false;
        pauseText.style.display = "none";
        renderer.domElement.style.cursor = "none";
        mira.style.display = "block";
    }
});

// ================= VELOCIDADE =================

let speed = 5; 

const speedText = document.createElement("div");
speedText.innerHTML = "Velocidade: NORMAL";
speedText.style.position = "fixed";
speedText.style.bottom = "20px";
speedText.style.left = "20px";
speedText.style.color = "white";
speedText.style.fontSize = "12px";
speedText.style.background ="rgba(0,0,0,0.5)";
speedText.style.padding = "10px";
speedText.style.borderRadius = "10px";
speedText.style.zIndex = "9999";
document.body.appendChild(speedText);


// teclas
document.addEventListener(
'keydown',
(event)=>{

    if(event.code === 'Digit1'){
        speed = 5;
        speedText.innerHTML = "Velocidade: LENTA";
    }

    else if(event.code === 'Digit2'){
        speed = 7; 
        speedText.innerHTML = "Velocidade: NORMAL";
    }

    else if(event.code === 'Digit3'){
        speed = 9;
        speedText.innerHTML = "Velocidade: RÁPIDA";
    }

});

buildInterface();
render();


function render(){

    stats.update();

    if(!paused){

        airplane.propeller.rotation.z += 10;

        updatePlane(plane_array, speed);

        updateAirplane();
        updateCamera();
    }

    requestAnimationFrame(render);

    renderer.render(
        scene,
        camera
    );
}