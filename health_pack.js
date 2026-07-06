import * as THREE from "three";
import { scene } from "./config.js";
import { playHpSound } from "./audio.js";
import { loadingManager } from "./loadingManager.js";

const textureLoader = new THREE.TextureLoader(loadingManager);

const healthPackTexture = textureLoader.load(
  "./resources/healthpack.png"
);

healthPackTexture.colorSpace = THREE.SRGBColorSpace;

export let healthPacks = [];
let spawnTimer = 2000;

function createHealthPack() {
  const healthPack = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(40, 40, 40);

  // const bodyMat = new THREE.MeshStandardMaterial({
  //   map: healthPackTexture,
  //   // roughness: 0.7,
  //   // metalness: 0.1,
  // });

  // const bodyMat = new THREE.MeshBasicMaterial({
  //   map: healthPackTexture,
  // });

  const bodyMat = new THREE.MeshPhongMaterial({
    map: healthPackTexture,
    shininess: 30
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  healthPack.add(bodyMesh);

  healthPack.position.set(
    THREE.MathUtils.randFloat(-250, 250),
    THREE.MathUtils.randFloat(150, 250),
    1000
  );

  healthPack.box = new THREE.Box3();
  healthPack.box.setFromObject(healthPack);
  healthPack.box.expandByScalar(100);

  healthPack.isAttracted = false;

  scene.add(healthPack);
  return healthPack;
}

export function updateHealthPacks(speed, airplane) {
  spawnTimer -= speed;

  if (spawnTimer <= 0) {
    healthPacks.push(createHealthPack());
    spawnTimer = 4000;
  }

  for (let i = healthPacks.length - 1; i >= 0; i--) {
    const hp = healthPacks[i];

    if (hp.isAttracted) {
      const direction = new THREE.Vector3()
        .subVectors(airplane.position, hp.position)
        .normalize();

      const targetScale = 0.2;
      hp.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.15
      );

      hp.position.addScaledVector(direction, 8);

      if (hp.position.distanceTo(airplane.position) < 10) {
        airplane.hp = Math.min(20, airplane.hp + 5);
        airplane.updateHpBar();
        playHpSound();

        scene.remove(hp);
        healthPacks.splice(i, 1);
        continue;
      }
    } else {
      hp.position.z -= 4;
    }

    hp.box.setFromObject(hp);
    hp.box.expandByScalar(100);

    if (hp.position.z < -1200) {
      scene.remove(hp);
      healthPacks.splice(i, 1);
    }
  }
}
