import * as THREE from  'three';
import { scene, plane_width, plane_height } from './config.js'
import GUI from '../libs/util/dat.gui.module.js';
import Stats from '../build/jsm/libs/stats.module.js';

export const stats = new Stats();

stats.dom.style.position = 'absolute';
stats.dom.style.top = '30px';
stats.dom.style.left = '30px';

document.body.appendChild( stats.dom );

const planeSize = Math.max(plane_width, plane_height);

const fogNear = 200;
const fogFar = 2000;

let fogParams = {
   color: "rgb(175,207,220)",
   near: fogNear,  
   far: fogFar    
};

scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

function updateShadowVolume(light){

    const visibleDistance = (scene.fog.far - scene.fog.near) * 3;

    const size = 1500 + visibleDistance;

    light.shadow.camera.left   = -size;
    light.shadow.camera.right  = size;

    light.shadow.camera.top    = size;
    light.shadow.camera.bottom = -size;

    light.shadow.camera.updateProjectionMatrix();
}

export function buildInterface(light) {
   var gui = new GUI();

   gui.add(fogParams, 'near', 0, 700)
      .name("Fog Near")
      .onChange(function(value) {
         scene.fog.near = value;
         console.log("GUI:", value);
         updateShadowVolume(light);
      });
}
1