import * as THREE from  'three';
import { initCamera } from "../libs/util/util.js";
import { airplane } from './airplane.js'
import { scene, intersectionPoint, cameraBehind, cameraHeight, camTiltIntensity, camLerpSpeed, maxCamOffset, boundMaxX } from './config.js'
import { CAMERA_FAR } from './terrain.js';

export let camera = initCamera(new THREE.Vector3(0, 100, -600)); 

camera.position.set(
    airplane.position.x,
    airplane.position.y + cameraHeight,
    airplane.position.z - cameraBehind
);

scene.add(camera); 
camera.lookAt(0,0,0);
// CAMERA_FAR vem do terrain.js — é a mesma constante usada para calcular
// FOG_FAR e o buffer de chunks carregados. Antes esse "5000" era um literal
// independente aqui; bastava mudar a distância de neblina no terrain.js para
// os dois números saírem de sincronia (fog terminando depois do far-clip da
// câmera), fazendo o terreno "aparecer" de repente em vez de emergir da
// névoa. Importar a mesma constante elimina essa classe de bug de vez.
camera.far = CAMERA_FAR;
camera.updateProjectionMatrix();

export function updateCamera() {
  let excessX = 0;
  const bound = boundMaxX * 0.8

  if (intersectionPoint.x > bound) {
    excessX = intersectionPoint.x - bound;
  } else if (intersectionPoint.x < -bound) {
    excessX = intersectionPoint.x + bound;
  }

  let targetCamX = excessX * camTiltIntensity;
  targetCamX = THREE.MathUtils.clamp(targetCamX, -maxCamOffset, maxCamOffset);

  camera.position.x = THREE.MathUtils.lerp(
    camera.position.x,
    targetCamX,
    camLerpSpeed
  );
}