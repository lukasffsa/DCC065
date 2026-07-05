import * as THREE from 'three';
import { scene } from './config.js';
import { fogUniforms, FOG_NEAR, FOG_FAR, CAMERA_FAR } from './terrain.js';
import GUI from '../libs/util/dat.gui.module.js';
import Stats from '../build/jsm/libs/stats.module.js';

export const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '30px';
stats.dom.style.left = '30px';
document.body.appendChild(stats.dom);

// Fog do Three.js removida — a névoa é controlada diretamente nos shaders
// do terrain.js via fogUniforms, com distância euclideana em vez de Z puro.
// scene.fog = null garante que nenhum material externo receba fog acidental.
scene.fog = new THREE.Fog(
    0xbfdfff,
    fogUniforms.fogNear.value,
    fogUniforms.fogFar.value
);

// Parâmetros expostos no GUI — alteram as uniforms do shader diretamente.
// Antes eram inicializados só a partir de fogUniforms.fogNear.value, sem
// nenhum controle sobre fogFar. Agora ambos ficam disponíveis, e os limites
// dos sliders vêm de FOG_NEAR/FOG_FAR/CAMERA_FAR (exportados por terrain.js)
// em vez de números fixos (500–4000) — se o multiplicador ou o plane_height
// mudarem no terrain.js, o GUI se recalibra sozinho em vez de ficar com um
// range que não faz mais sentido para a escala atual do mundo.
const fogParams = {
    near: fogUniforms.fogNear.value,
    far:  fogUniforms.fogFar.value,
};

function updateShadowVolume(light) {
    const visibleDistance = fogUniforms.fogFar.value;
    const size = 1500 + visibleDistance;
    light.shadow.camera.left   = -size;
    light.shadow.camera.right  =  size;
    light.shadow.camera.top    =  size;
    light.shadow.camera.bottom = -size;
    light.shadow.camera.updateProjectionMatrix();
}

export function buildInterface(light) {
    const gui = new GUI();

    // Folgas mínimas (100 unidades) para que near nunca alcance ou ultrapasse
    // far arrastando o slider — evitaria uma faixa de transição de fog com
    // largura zero ou negativa (o mix() do shader ficaria instável perto de
    // fogNear == fogFar).
    gui.add(fogParams, 'near', 2000, FOG_FAR - 100)
        .name("Fog Near")
        .onChange(value => {
            fogUniforms.fogNear.value = Math.min(value, fogUniforms.fogFar.value - 100);
            updateShadowVolume(light);
        });


}