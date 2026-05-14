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

const fogNear = planeSize * 0.1;
const fogFar = planeSize * 0.6;

let fogParams = {
   color: "rgb(175,207,220)",
   near: fogNear,  
   far: fogFar    
};

scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

export function buildInterface() {
   var gui = new GUI();

   gui.add(fogParams, 'near', 0, fogFar * 0.5)
      .name("Fog Near")
      .onChange(function(value) {
         scene.fog.near = value;
      });
}
