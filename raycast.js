import * as THREE from  'three';
import { renderer, raycaster, targetPosition, boundMaxX, maxRoll, alpha, rotationSpeed, mouse, planeXY, intersectionPoint } from './config.js'
import { airplane } from './airplane.js'
import { camera } from './camera.js'

export function updateAirplane() {
  updateRaycast();

  targetPosition.set(
    THREE.MathUtils.clamp(intersectionPoint.x, -boundMaxX, boundMaxX),
    THREE.MathUtils.clamp(intersectionPoint.y, 140, 260),
    airplane.position.z
  );

  const deltaX = targetPosition.x - airplane.position.x;
  const targetRoll = -(deltaX * 0.01);
  const clampedRoll = THREE.MathUtils.clamp(targetRoll, -maxRoll, maxRoll);

  airplane.position.lerp(targetPosition, alpha);

  airplane.rotation.y = THREE.MathUtils.lerp(
    airplane.rotation.y, 
    clampedRoll, 
    rotationSpeed
  );
}

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
})

function updateRaycast() {
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeXY, intersectionPoint);
}