import * as THREE from 'three';
import { scene } from './config.js';
import { airplane } from './airplane.js';
import { plane_array } from './terrain.js';
import { playEnemyDownSound } from './audio.js'

let pendingSpawns = 0;
const MAX_ENEMIES = 2;
export let enemies      = [];
export let enemyBullets = [];
const zDistance = 300;
const enemySpeed = 5;
let timer = 1000;
let active = false
const maxX = 200

// ─── MESH ─────────────────────────────────────────────────────────────────────

function createEnemyMesh(side) {
    const group = new THREE.Group();
    const body  = new THREE.Mesh(
        new THREE.ConeGeometry(2, 8, 6),
        new THREE.MeshPhongMaterial({ color: 0xff00ff })
    );
    body.rotation.x = -Math.PI / 2;
    body.rotation.z = -Math.PI;

    const wing = new THREE.Mesh(
        new THREE.BoxGeometry(5, .35),
        new THREE.MeshPhongMaterial({ color: 0x666666 })
    );

    body.castShadow = true;
    wing.castShadow = true;

    group.add(body);
    group.add(wing);

    group.position.set(
        1000 * side,
        THREE.MathUtils.randFloat(200, 300),
        300
    );
    group.scale.set(10, 10, 10)
    scene.add(group)

    group.speedX = side === 1 ? -3 : 3;
    

    group.lastShot = performance.now();

    return group;
}

export function updateEnemies(speed) {
    timer -= speed;

    if (timer <= 0) {
        enemies.push(createEnemyMesh(1));
        enemies.push(createEnemyMesh(-1))           
           
        timer = 2500;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if(enemy.isDead) {
            playEnemyDownSound();
            enemy.position.y -= 2;                 
            enemy.rotation.y += 0.2;       

            if (enemy.position.y <= 100) {
                scene.remove(enemy);
                enemies.splice(i, 1);
            }
            continue;
        }

        enemy.position.x += enemy.speedX;
        if (enemy.position.z >= -250) {
            enemy.position.z -= 3;
        }
        enemy.lookAt(airplane.position);

        enemy.box = new THREE.Box3().setFromObject(enemy);

        if(enemy.position.x >= -600 && enemy.position.x <= 600) {
            const t = performance.now();

            if(t - enemy.lastShot > 999) {
                shootEnemy(enemy);
                enemy.lastShot = t
            }
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        
        b.position.add(b.direction.clone().multiplyScalar(6));

        if (b.position.distanceTo(airplane.position) > 3000) {
            scene.remove(b);
            enemyBullets.splice(i, 1);
        }
    }
}


// // ─── SPAWN ────────────────────────────────────────────────────────────────────
// // Garante que os dois inimigos fiquem em X bem separados entre si

// function pickX() {
//     // Divide o eixo X em lado esquerdo [-700, -300] e direito [300, 700]
//     // Se já existe um inimigo vivo, o novo vai pro lado oposto
//     if (enemies.length >= 1) {
//         const existingSide = enemies[enemies.length - 1].side;
//         const side = existingSide === -1 ? 1 : -1;
//         return {
//             x:    side === -1 ? -(300 + Math.random() * 400) : (300 + Math.random() * 400),
//             side: side
//         };
//     }
//     // Primeiro inimigo: lado aleatório
//     const side = Math.random() < 0.5 ? -1 : 1;
//     return {
//         x:    side === -1 ? -(300 + Math.random() * 400) : (300 + Math.random() * 400),
//         side: side
//     };
// }

// function spawnEnemy() {
//     pendingSpawns--;

//     const { x, side } = pickX();

//     // Z bem à frente, com variação para não spawnar no mesmo plano Z
//     const posZ = airplane.position.z + 1100 + Math.random() * 400;
//     const posY = airplane.position.y + 40   + Math.random() * 10;

//     const enemy = createEnemyMesh();
//     enemy.scale.set(4, 4, 4);
//     enemy.position.set(x, posY, posZ);

//     enemy.side     = side;
//     enemy.stopZ    = airplane.position.z + 300; // para nessa Z (espaço de mundo)
//     enemy.speed    = 2;
//     enemy.stopped  = false;
//     enemy.box      = new THREE.Box3();
//     enemy.lastShot = performance.now();

//     enemy.lookAt(airplane.position);
//     scene.add(enemy);
//     enemies.push(enemy);
// }

// // ─── CRIAÇÃO INICIAL ──────────────────────────────────────────────────────────

// export function createEnemies() {
//     setTimeout(() => spawnEnemy(), 500 + Math.random() * 500);
// }

// // ─── TIROS ────────────────────────────────────────────────────────────────────

const enemyBulletGeo = new THREE.ConeGeometry(0.8, 7, 8);
enemyBulletGeo.rotateX(Math.PI / 2);
const enemyBulletMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });

function shootEnemy(enemy) {
    const bullet = new THREE.Mesh(enemyBulletGeo, enemyBulletMat);
    bullet.position.copy(enemy.position);
    bullet.direction = new THREE.Vector3()
        .subVectors(airplane.position, enemy.position)
        .normalize();
    bullet.lookAt(airplane.position);
    bullet.owner = enemy;
    bullet.box   = new THREE.Box3();
    scene.add(bullet);
    enemyBullets.push(bullet);
}

// // ─── UPDATE ───────────────────────────────────────────────────────────────────

// export function updateEnemies() {

//     // ── inimigos ───────────────────────────────────────────────────────────────

//     for (let i = enemies.length - 1; i >= 0; i--) {
//         const enemy = enemies[i];

//         if (!enemy.stopped) {
//             // Aproxima em Z (espaço de mundo, igual ao original)
//             enemy.position.z -= enemy.speed;

//             // Deriva suave em X em direção ao centro sem cruzar
//             if (enemy.position.x < 0) enemy.position.x += 0.5;
//             else                       enemy.position.x -= 0.5;

//             if (enemy.position.z <= enemy.stopZ) {
//                 enemy.stopped = true;
//             }
//         }

//         // Parado: fica imóvel no espaço de mundo (terreno passa por baixo)

//         enemy.lookAt(airplane.position);

//         const t = performance.now();
//         if (t - enemy.lastShot > 999) {
//             shootEnemy(enemy);
//             enemy.lastShot = t;
//         }

//         // Remove quando ficou longe atrás
//         if (enemy.position.z < -1200) {
//             for (let k = enemyBullets.length - 1; k >= 0; k--) {
//                 if (enemyBullets[k].owner === enemy) {
//                     scene.remove(enemyBullets[k]);
//                     enemyBullets.splice(k, 1);
//                 }
//             }
//             scene.remove(enemy);
//             enemies.splice(i, 1);
//         }
//     }

//     // ── tiros ──────────────────────────────────────────────────────────────────

//     for (let i = enemyBullets.length - 1; i >= 0; i--) {
//         const b = enemyBullets[i];
//         b.position.add(b.direction.clone().multiplyScalar(6));

//         if (b.position.distanceTo(airplane.position) > 3000) {
//             scene.remove(b);
//             enemyBullets.splice(i, 1);
//         }
//     }

//     // ── reposição ──────────────────────────────────────────────────────────────

// // ─── REPOSIÇÃO ────────────────────────────────────────────────────────────────
// // Agenda no máximo 1 spawn por vez, só se o total futuro estiver abaixo de 2

//     const futuros = enemies.length + pendingSpawns;

//     if (futuros < MAX_ENEMIES) {
//         pendingSpawns++;
//         setTimeout(
//             () => spawnEnemy(),
//             1000 + Math.random() * 1500
//         );
//     }
// }