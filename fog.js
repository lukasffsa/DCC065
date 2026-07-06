// import * as THREE from  'three';
// import { scene, plane_width, plane_height } from './config.js'
// import GUI from '../libs/util/dat.gui.module.js';
// import Stats from '../build/jsm/libs/stats.module.js';

// export const stats = new Stats();

// stats.dom.style.position = 'absolute';
// stats.dom.style.top = '30px';
// stats.dom.style.left = '30px';

// document.body.appendChild( stats.dom );

// const planeSize = Math.max(plane_width, plane_height);

// const fogNear = 200;
// const fogFar = 3000;

// let fogParams = {
//    color: "rgb(175,207,220)",
//    near: fogNear,  
//    far: fogFar    
// };

// scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

// export function buildInterface() {
//    var gui = new GUI();

//    gui.add(fogParams, 'near', 100, fogFar * 0.6)
//       .name("Fog Near")//
//       .onChange(function(value) {
//          scene.fog.near = value;
//       });
// }

import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { scene } from './config.js';
import { CAMERA_FAR } from './terrain.js';

export const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top      = '30px';
stats.dom.style.left     = '30px';
document.body.appendChild(stats.dom);

const SKY_COLOR = new THREE.Color("rgb(175,207,220)");

const FOG_FAR = 3000;

const FOG_NEAR_DEFAULT = 200;
const FOG_NEAR_MIN     = 100;
const FOG_NEAR_MAX     = 2000;

export const fog = new THREE.Fog(SKY_COLOR, FOG_NEAR_DEFAULT, FOG_FAR);
scene.fog = fog;

scene.background = SKY_COLOR;

export function buildInterface() {
    const painel = document.createElement('div');
    painel.style.position     = 'absolute';
    painel.style.top          = '30px';
    painel.style.right        = '30px';
    painel.style.padding      = '8px 10px';
    painel.style.background   = 'rgba(0, 0, 0, 0.55)';
    painel.style.color        = '#fff';
    painel.style.font         = '12px monospace';
    painel.style.borderRadius = '4px';
    painel.style.userSelect   = 'none';
    painel.style.zIndex       = '100';

    const rotulo = document.createElement('div');
    rotulo.innerText = `Fog Near: ${Math.round(fog.near)}`;
    rotulo.style.marginBottom = '4px';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.min   = FOG_NEAR_MIN;
    slider.max   = FOG_NEAR_MAX;
    slider.step  = 10;
    slider.value = fog.near;
    slider.style.width = '160px';

    slider.addEventListener('input', (event) => {
        const valor = parseFloat(event.target.value);
        fog.near = valor;
        rotulo.innerText = `Fog Near: ${Math.round(valor)}`;
    });

    painel.appendChild(rotulo);
    painel.appendChild(slider);
    document.body.appendChild(painel);

    return { painel, slider };
}