import { bullets } from './shooting.js';
import {enemies, enemyBullets} from './enemy.js';
import { scene } from './config.js';

let playerLife = 0;

export function updateCollisions(player){

    if(!player.box){

        player.box=
        new THREE.Box3();

    }


    player.box.setFromObject(player);

    //======================
    // tiro player x inimigo
    //======================

    for(let i = bullets.length-1; i>=0; i--){

        let bullet = bullets[i];

        if(!bullet.box)
            continue;

        bullet.box.setFromObject(bullet);

        for(let j = enemies.length-1; j>=0; j--){

            let enemy = enemies[j];

            if(!enemy.box)
                continue;

            enemy.box.setFromObject(enemy);

            if(bullet.box.intersectsBox(enemy.box)){

                for(let k=enemyBullets.length-1; k>=0; k--){

                    if(enemyBullets[k].owner===enemy){
                        scene.remove(enemyBullets[k]);
                        enemyBullets.splice(k, 1);

                    }
                }

                // scene.remove(enemy);
                enemy.isDead = true;

                scene.remove(bullet);
                bullets.splice(i,1);
                break;
            }

        }

    }



    //======================
    // tiro inimigo x player
    //======================

    for(let i = enemyBullets.length-1; i>=0; i--){

        let shot = enemyBullets[i];

        if(!shot.box)
            continue;

        shot.box.setFromObject(shot);

        if(shot.box.intersectsBox(player.box)){

            player.hit();
            scene.remove(shot);

            enemyBullets.splice(i,1);
        }

    }

}