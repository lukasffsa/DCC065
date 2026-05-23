import * as THREE from 'three';
import { onWindowResize } from "../libs/util/util.js";
import { airplane } from './airplane.js';
import { scene, renderer } from './config.js';
import { updateAirplane } from './raycast.js';
import { updateCamera, camera } from './camera.js';
import { updatePlane, plane_array } from './terrain.js';
import { buildInterface, stats } from './fog.js';
import { createEnemies, updateEnemies } from './enemy.js';
import { updatePlayerShoot } from './shooting.js';
import { updateCollisions } from './collision.js';
import { createCrosshair } from './target.js';

window.addEventListener('resize', ()=> onWindowResize(camera, renderer), false);

//================ PAUSA =================

const pauseText = document.createElement("div");
pauseText.innerHTML = "PAUSADO";
pauseText.style.position = "fixed";
pauseText.style.top = "50%";
pauseText.style.left = "50%";
pauseText.style.transform = "translate(-50%,-50%)";
pauseText.style.fontSize = "50px";
pauseText.style.fontWeight = "bold";
pauseText.style.color = "white";
pauseText.style.background = "rgba(0,0,0,0.5)";
pauseText.style.padding = "20px";
pauseText.style.borderRadius = "10px";
pauseText.style.display = "none";
document.body.appendChild(pauseText);

let paused = false;

document.addEventListener('keydown', (event)=>{
  
  if(event.code === 'Escape'){
    paused = true;
    pauseText.style.display = "block";
    renderer.domElement.style.cursor = "default";
    mira.style.display = "none";
  }

}
);

renderer.domElement.addEventListener('click', ()=>{

  if(paused){

    paused = false;
    pauseText.style.display = "none";
    renderer.domElement.style.cursor = "none";
    mira.style.display = "block";

  }

}
);


//================ VELOCIDADE =================

let speed = 7;
const speedText = document.createElement("div");
speedText.innerHTML = "Velocidade: NORMAL";
speedText.style.position = "fixed";
speedText.style.bottom = "20px";
speedText.style.left = "20px";
speedText.style.color = "white";
speedText.style.background = "rgba(0,0,0,.5)";
speedText.style.padding = "10px";
document.body.appendChild(speedText);
document.addEventListener('keydown', (event)=>{

  if(event.code==='Digit1'){

    speed=5;
    speedText.innerHTML = "Velocidade: LENTA";

  }

  else if(event.code==='Digit2'){

    speed=7;
    speedText.innerHTML = "Velocidade: NORMAL";

  }

  else if(event.code==='Digit3'){

    speed=9;
    speedText.innerHTML = "Velocidade: RÁPIDA";

  }

}
);


//================ SOMBRAS =================

let dirLight = new THREE.DirectionalLight("rgb(200,200,200)", 5);
dirLight.position.set(2000,900,-2000);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -5000;
dirLight.shadow.camera.right = 5000;
dirLight.shadow.camera.top = 5000;
dirLight.shadow.camera.bottom = -5000;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 10000;
scene.add(dirLight);


//================ INIT =================

buildInterface();
const mira = createCrosshair(renderer);
createEnemies();
animate();

//================ LOOP =================

function animate(){

  requestAnimationFrame(animate);
  stats.update();

  if(!paused){

      airplane.propeller.rotation.z +=10;
      updatePlane(plane_array, speed);
      updateAirplane();
      updateCamera();
      updatePlayerShoot(airplane);
      updateEnemies(airplane);
      updateCollisions(airplane);

  }

  renderer.render(scene, camera);

}