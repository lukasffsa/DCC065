import * as THREE from "three";
import { scene, boundMaxX } from "./config.js";
import { playDamageSound } from './audio.js';
import { GLTFLoader } from "../build/jsm/loaders/GLTFLoader.js";
import { loadingManager } from "./loadingManager.js";

export const backBar = document.createElement('div');
backBar.style.position = 'absolute';
// backBar.style.top = '30px';  

backBar.style.position = 'absolute';
backBar.style.left = '50%';
backBar.style.transform = 'translateX(-50%)';
backBar.style.width = '200px';
backBar.style.backgroundColor = '#000000';
backBar.style.padding = '20px';
backBar.style.bottom = '10px';
backBar.style.borderRadius = '20px';
backBar.style.pointerEvents = 'none';
backBar.style.zIndex = '100';
backBar.style.overflow = 'hidden';

export const hpBar = document.createElement('div');
hpBar.style.position = 'absolute';
hpBar.style.top = '0';
hpBar.style.left = '0';
hpBar.style.width = '100%';
hpBar.style.height = '100%';
hpBar.style.backgroundColor = '#ff0000';
hpBar.style.transition = 'width 0.2s ease-out';

document.body.appendChild(backBar);
backBar.appendChild(hpBar);

function createAirplane() {
  const loader = new GLTFLoader(loadingManager);

  const airplane = new THREE.Group();

  // estado do jogo
  airplane.hp = 20;
  airplane.isHit = false;
  airplane.isInvincible = false;
  airplane.isDead = false;

  // posição inicial
  airplane.position.set(0.0, 100, -1050);

  loader.load('./assets/plane.glb', (gltf) => {
    const model = gltf.scene;

    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // ajuste padrão (você provavelmente vai calibrar isso)
    model.position.set(0, 0, 0);
    model.scale.set(50, 50, 50);

    model.rotateY(THREE.MathUtils.degToRad(90));

    airplane.add(model);
    console.log(airplane);
  });

  // ================= DANO / VIDA =================

  airplane.hit = function () {
    if (airplane.isInvincible || airplane.isDead) return;

    airplane.hp--;
    airplane.updateHpBar();

    if (airplane.hp <= 0) {
      airplane.isDead = true;
      document.getElementById("gameOverOverlay").style.display = "flex";
    }

    playDamageSound();

    let count = 0;
    const interval = setInterval(() => {
      airplane.visible = !airplane.visible;
      count++;

      if (count > 8) {
        clearInterval(interval);
        airplane.visible = true;
        airplane.isHit = false;
      }
    }, 100);
  };

  airplane.updateHpBar = function () {
    hpBar.style.width = `${(this.hp / 20) * 100}%`;
  };

  scene.add(airplane);

  return airplane;
}

export const airplane = createAirplane();
