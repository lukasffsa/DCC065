import * as THREE from 'three';
import { scene } from './config.js';
import { fogUniforms } from './terrain.js';
import GUI from '../libs/util/dat.gui.module.js';
import Stats from '../build/jsm/libs/stats.module.js';

export const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '30px';
stats.dom.style.left = '30px';
document.body.appendChild(stats.dom);

// Fog do Three.js removida — a névoa é controlada diretamente nos shaders
// do terrain.js via fogUniforms, com distância horizontal (XZ) em vez de
// distância 3D completa (ver terrain.js para o porquê da mudança).
// scene.fog = null garante que nenhum material externo receba fog acidental.
scene.fog = null;

// Parâmetros expostos no GUI — alteram as uniforms do shader diretamente
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

    // Faixas ampliadas: os valores padrão de fogNear/fogFar agora escalam
    // com plane_height (terrain.js), então podem passar dos limites antigos
    // (pensados para os valores fixos 2500/4200).
    gui.add(fogParams, 'near', 500, 10000)
        .name("Fog Near")
        .onChange(value => {
            fogUniforms.fogNear.value = value;
            updateShadowVolume(light);
        });

    gui.add(fogParams, 'far', 1000, 16000)
        .name("Fog Far")
        .onChange(value => {
            fogUniforms.fogFar.value = value;
            updateShadowVolume(light);
        });
}