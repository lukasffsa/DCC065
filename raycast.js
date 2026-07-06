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
    const targetRoll = -(deltaX * 0.05);

    const clampedRoll =
        THREE.MathUtils.clamp(
            targetRoll,
            -maxRoll,
            maxRoll
        );

    // inclinação nariz cima/baixo
    const targetPitch = deltaY * 0.01;

    const clampedPitch =
        THREE.MathUtils.clamp(
            targetPitch,
            -0.18,
            0.18
        );

    // airplane.position.lerp(targetPosition, alpha);

    const moveSpeed = 5; 

    const direction = targetPosition
        .clone()
        .sub(airplane.position);

    const distance = direction.length();

    if(distance > moveSpeed){

        direction.normalize();

        airplane.position.add(
            direction.multiplyScalar(moveSpeed)
        );

    }else{

        airplane.position.copy(
            targetPosition
        );
    }

    // esquerda-direita
    airplane.rotation.z =
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