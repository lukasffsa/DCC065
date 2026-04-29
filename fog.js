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

let fogParams = {
   color: "rgb(175,207,220)",
   near: planeSize * 0.2,  // começa antes da borda
   far: planeSize * 0.4    // cobre bem a borda
};

scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

export function buildInterface() {
   var gui = new GUI();

   gui.add(fogParams, 'near', 0, 800)
      .name("Fog Near")
      .onChange(function(value) {
         scene.fog.near = value;
      });
}
