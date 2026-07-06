import * as THREE from "three";
import { scene } from "./config.js";
import { camera } from "./camera.js";
import { playShootingSound } from './audio.js';


export let bullets = [];

let canShoot = true;
const fireRate = 150;
let shooting = false;

// mouse normalizado

const mouse = new THREE.Vector2();

const raycaster = new THREE.Raycaster();

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;

  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// botão esquerdo

window.addEventListener("mousedown", (e) => {
  if (e.button === 0) shooting = true;
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) shooting = false;
});

const bulletGeometry = new THREE.BoxGeometry(2, 2, 15);

const bulletMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

export function updatePlayerShoot(player) {
  if (shooting && canShoot) {
    createBullet(player);
    playShootingSound();
    canShoot = false;
    setTimeout(() => {
      canShoot = true;
    }, fireRate);
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.position.add(b.direction.clone().multiplyScalar(18));

    if (b.position.z > 3000 || b.position.z < -3000) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }
}

function createBullet(player) {
  let bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  const nosePosition = new THREE.Vector3(0, 0, 0);

  player.updateMatrixWorld(true);

  bullet.position.copy(player.localToWorld(nosePosition));

  raycaster.setFromCamera(mouse, camera);

  // ponto distante seguindo o cursor

//   const target = raycaster.ray.origin.clone()
//     .add(
//         raycaster.ray.direction.clone().multiplyScalar(5000)
//     );

    const aimPlane = new THREE.Plane(
        new THREE.Vector3(0,0,1),
        -(player.position.z + 300)
    );

    const target = new THREE.Vector3();

    raycaster.ray.intersectPlane(
        aimPlane,
        target
    );

  // direção exata

  bullet.direction = target.clone().sub(bullet.position).normalize();

  // gira tiro

  bullet.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    bullet.direction,
  );

  bullet.box = new THREE.Box3();

  scene.add(bullet);

  bullets.push(bullet);
}
