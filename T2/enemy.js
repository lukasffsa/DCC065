import * as THREE from 'three';
import { scene } from './config.js';
import { airplane } from './airplane.js';
import { plane_array } from './terrain.js';

let pendingSpawns=0;
const MAX_ENEMIES=1;
export let enemies=[];
export let enemyBullets=[];


//================ INIMIGO =================

function createEnemyMesh(){

    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(2,8,6), new THREE.MeshPhongMaterial({color:0xff00ff}));

    body.rotation.x = -Math.PI/2;
    body.rotation.z = -Math.PI;

    const wing = new THREE.Mesh(new THREE.BoxGeometry(5,.35), new THREE.MeshPhongMaterial({color:0x666666}));
    group.add(body);
    group.add(wing);
    return group;
}

//================ SPAWN =================

function spawnEnemy(side){

    pendingSpawns--;
    let enemy = createEnemyMesh();
    enemy.scale.set(4,4,4);

    enemy.position.set(

        side===-1?-350-Math.random()*150:350+Math.random()*150,
        airplane.position.y+40+Math.random()*10,
        airplane.position.z+1100+Math.random()*300
    );


    enemy.stopZ = airplane.position.z+300;
    enemy.speed=2;
    enemy.stopped=false;
    enemy.box = new THREE.Box3();
    enemy.lastShot = performance.now();
    
    enemy.lookAt(airplane.position);
    scene.add(enemy);

    enemies.push(enemy);

}
//================ CRIA =================

export function createEnemies(){

    // 2 inimigos por plano,
    // porém com tempos diferentes

    plane_array.forEach(()=>{

        // primeiro inimigo

        setTimeout(()=>{
            spawnEnemy(Math.random()<0.5 ? -1 : 1);
        },Math.random()*1500);

        // segundo inimigo

        setTimeout(()=>{
            spawnEnemy(Math.random()<0.5 ? -1 : 1);
        },1500+Math.random()*2500);

    });

}



//================ TIROS =================

const enemyBulletGeo = new THREE.ConeGeometry(0.8,7,8);

enemyBulletGeo.rotateX(Math.PI/2);

const enemyBulletMat = new THREE.MeshPhongMaterial({color:0xff0000});

function shootEnemy(enemy){

    let bullet =
    new THREE.Mesh(enemyBulletGeo, enemyBulletMat);

    bullet.position.copy(enemy.position);


    bullet.direction = new THREE.Vector3().subVectors(airplane.position,enemy.position).normalize();

    bullet.lookAt(airplane.position);

    // guarda dono da bala

    bullet.owner = enemy;

    bullet.box = new THREE.Box3();


    scene.add(bullet);
    enemyBullets.push(bullet);

}

//================ UPDATE =================

export function updateEnemies(){

    const TARGET_ENEMIES=
        plane_array.length*2;


    for(let i=enemies.length-1; i>=0;i--){

        let enemy = enemies[i];

        if(!enemy.stopped){

            enemy.position.z -= enemy.speed;

            if(enemy.position.x<0)
                enemy.position.x+=0.5;
            else
                enemy.position.x-=0.5;


            if(enemy.position.z <= enemy.stopZ){
                enemy.stopped=true;
            }

        }


        enemy.lookAt(airplane.position);

        let t = performance.now();

        // voltou a atirar

        if(t-enemy.lastShot > 999){
            shootEnemy(enemy);
            enemy.lastShot=t;
        }

        // remove inimigo distante

        if(enemy.position.z < -1200){
            // remove balas dele
            for(let k = enemyBullets.length-1; k>=0; k--){
                if(enemyBullets[k].owner === enemy){
                    scene.remove(enemyBullets[k]);
                    enemyBullets.splice(k,1);
                }
            }

            scene.remove(enemy);

            enemies.splice(i,1);

        }

    }



    // atualiza tiros


    for(let i = enemyBullets.length-1; i>=0; i--){

        let b = enemyBullets[i];

        b.position.add(b.direction.clone().multiplyScalar(6));

        if(b.position.distanceTo(airplane.position) > 3000){

            scene.remove(b);
            enemyBullets.splice(i,1);

        }

    }


    // mantém sempre
    // 2 por plano

    const totalFuture=enemies.length + pendingSpawns;


    if(totalFuture < MAX_ENEMIES){

        pendingSpawns++;

        setTimeout(()=>{

            spawnEnemy(Math.random()<0.5 ? -1 : 1);
        },

        1000 + Math.random()*3000);

    }

}