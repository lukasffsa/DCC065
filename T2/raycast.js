import * as THREE from  'three';
import { renderer, raycaster, targetPosition, boundMaxX, maxRoll, alpha, rotationSpeed, mouse, planeXY, intersectionPoint } from './config.js'
import { airplane } from './airplane.js'
import { camera } from './camera.js'

const baseRotationX = airplane.rotation.x;

export function updateAirplane() {
    updateRaycast();

    targetPosition.set(
        THREE.MathUtils.clamp(intersectionPoint.x, -boundMaxX, boundMaxX),
        THREE.MathUtils.clamp(intersectionPoint.y, 140, 260),
        airplane.position.z
    );

    // diferença horizontal
    const deltaX = targetPosition.x - airplane.position.x;

    // diferença vertical
    const deltaY = targetPosition.y - airplane.position.y;

    // rotação lateral 
    const targetRoll = -(deltaX * 0.01);

    const clampedRoll =
        THREE.MathUtils.clamp(
            targetRoll,
            -maxRoll,
            maxRoll
        );

    // inclinação nariz cima/baixo
    const targetPitch = deltaY * 0.003;

    const clampedPitch =
        THREE.MathUtils.clamp(
            targetPitch,
            -0.18,
            0.18
        );

    airplane.position.lerp(targetPosition, alpha);

    // esquerda-direita
    airplane.rotation.y =
        THREE.MathUtils.lerp(
            airplane.rotation.y,
            clampedRoll,
            rotationSpeed
        );

    // cima-baixo 
  airplane.rotation.x =
      THREE.MathUtils.lerp(
          airplane.rotation.x,
          baseRotationX - clampedPitch,
          rotationSpeed * 0.35
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