import * as THREE from  'three';
import { initCamera } from "../libs/util/util.js";
import { airplane } from './airplane.js'
import { scene, intersectionPoint, cameraBehind, cameraHeight, camTiltIntensity, camLerpSpeed, maxCamOffset, boundMaxX } from './config.js'

export let camera = initCamera(new THREE.Vector3(0, 100, -600)); 

camera.position.set(
    airplane.position.x,
    airplane.position.y + cameraHeight,
    airplane.position.z - cameraBehind
);

scene.add(camera); 
camera.lookAt(0,0,0);

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