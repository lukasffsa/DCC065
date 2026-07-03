import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';

import { scene } from './config.js';
import { airplane } from './airplane.js';

export let enemies = [];
export let enemyBullets = [];

const enemySpeed = 3;
let timer = 1000;

// ─────────────────────────────────────────────
// LOAD MODEL
// ─────────────────────────────────────────────

const loader = new GLTFLoader();

let enemyTemplate = null;

loader.load(
    './assets/enemy.glb', // CHANGE if filename differs

    (gltf) => {
        enemyTemplate = gltf.scene;

        enemyTemplate.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        console.log('Enemy model loaded');
    },

    undefined,

    (err) => {
        console.error('Error loading enemy model:', err);
    }
);

// ─────────────────────────────────────────────
// CREATE ENEMY
// ─────────────────────────────────────────────

function createEnemyMesh(side) {

    if (!enemyTemplate) return null;

    const enemy = SkeletonUtils.clone(enemyTemplate);

    enemy.position.set(
        side * 1000,
        THREE.MathUtils.randFloat(200, 300),
        300
    );

    // adjust to fit your model
    enemy.scale.set(5, 5, 5);

    // rotate if model faces wrong way
    enemy.rotation.y = Math.PI;

    enemy.speedX = side === 1 ? -enemySpeed : enemySpeed;

    enemy.lastShot = performance.now();

    enemy.box = new THREE.Box3();

    scene.add(enemy);

    return enemy;
}

// ─────────────────────────────────────────────
// BULLETS
// ─────────────────────────────────────────────

const enemyBulletGeo = new THREE.ConeGeometry(0.8, 7, 8);
enemyBulletGeo.rotateX(Math.PI / 2);

const enemyBulletMat =
    new THREE.MeshPhongMaterial({
        color: 0xff0000
    });

function shootEnemy(enemy) {

    const bullet =
        new THREE.Mesh(
            enemyBulletGeo,
            enemyBulletMat
        );

    bullet.position.copy(enemy.position);

    bullet.direction =
        new THREE.Vector3()
            .subVectors(
                airplane.position,
                enemy.position
            )
            .normalize();

    bullet.lookAt(
        airplane.position
    );

    bullet.owner = enemy;

    bullet.box =
        new THREE.Box3();

    scene.add(bullet);

    enemyBullets.push(
        bullet
    );
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export function updateEnemies(speed) {

    timer -= speed;

    if (
        timer <= 0 &&
        enemyTemplate
    ) {

        const e1 =
            createEnemyMesh(1);

        const e2 =
            createEnemyMesh(-1);

        if (e1)
            enemies.push(e1);

        if (e2)
            enemies.push(e2);

        timer = 2500;
    }

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy =
            enemies[i];

        if (
            enemy.isDead
        ) {

            enemy.position.y -= 2;

            enemy.rotation.y += 0.2;

            if (
                enemy.position.y <= 100
            ) {

                scene.remove(
                    enemy
                );

                enemies.splice(
                    i,
                    1
                );
            }

            continue;
        }

        enemy.position.x +=
            enemy.speedX;

        if (
            enemy.position.z >= -250
        ) {
            enemy.position.z -= 3;
        }

        enemy.lookAt(
            airplane.position
        );

        enemy.box.setFromObject(
            enemy
        );

        if (
            enemy.position.x >= -600 &&
            enemy.position.x <= 600
        ) {

            const t =
                performance.now();

            if (
                t -
                    enemy.lastShot >
                999
            ) {

                shootEnemy(
                    enemy
                );

                enemy.lastShot =
                    t;
            }
        }
    }

    for (
        let i =
            enemyBullets.length -
            1;
        i >= 0;
        i--
    ) {

        const b =
            enemyBullets[i];

        b.position.add(
            b.direction
                .clone()
                .multiplyScalar(
                    6
                )
        );

        if (
            b.position.distanceTo(
                airplane.position
            ) > 3000
        ) {

            scene.remove(
                b
            );

            enemyBullets.splice(
                i,
                1
            );
        }
    }
}
