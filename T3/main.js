import * as THREE from 'three';
import { onWindowResize } from "../libs/util/util.js";
import { airplane, hpBar, backBar } from './airplane.js';
import { scene, renderer } from './config.js';
import { updateAirplane } from './raycast.js';
import { updateCamera, camera } from './camera.js';
import { updatePlane, plane_array } from './terrain.js';
import { buildInterface, stats } from './fog.js';
import { enemies, updateEnemies } from './enemy.js';
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
    mira.pause(); 
  }

});
renderer.domElement.addEventListener('click', ()=>{

  if(paused){

    paused = false;
    pauseText.style.display = "none";
    mira.resume(); // restaura mira e esconde cursor
  }

});

//================ VELOCIDADE =================

const commands = document.createElement("div");
commands.innerHTML = "G - Invencibilidade<br>S - Musica";
commands.style.position = "fixed";
commands.style.bottom = "20px";
commands.style.right = "20px";
commands.style.color = "white";
commands.style.background = "rgba(0,0,0,.5)";
commands.style.padding = "10px";
document.body.appendChild(commands);

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

// inv aviao
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'g') {
    airplane.isInvincible = !airplane.isInvincible; 

    if (airplane.isInvincible) {
      backBar.style.boxShadow = '0 0 15px #ffff00';
    } else {
      backBar.style.boxShadow = 'none';
    }
  }
});

//================ SOMBRAS =================

export let dirLight = new THREE.DirectionalLight("rgb(200,200,200)", 5);
dirLight.position.set(500,800,-350);
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

buildInterface(dirLight);
const mira = createCrosshair(renderer);
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
      updateEnemies(speed);
      updateCollisions(airplane);
  }

  renderer.render(scene, camera);
}