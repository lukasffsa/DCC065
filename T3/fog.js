// fog.js
// ─────────────────────────────────────────────────────────────────────────
// Neblina (THREE.Fog) aplicada à cena do terrain.js, seguindo a mesma lógica
// usada no main.js: a cor da névoa é idêntica à cor do céu (scene.background)
// para que o desaparecimento dos chunks ao longe seja imperceptível — sem
// isso, o horizonte teria uma "parede" visível onde o terreno some.
//
// Este arquivo também assume o papel do módulo de stats do exemplo original,
// exportando `stats` (painel de FPS) junto com `buildInterface` (agora usado
// para o HUD de controle da fog), mantendo o mesmo contrato de import usado
// no main.js: `import { stats, buildInterface } from './fog.js'`.
// ─────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import Stats from '../build/jsm/libs/stats.module.js';
import { scene } from './config.js';
import { CAMERA_FAR } from './terrain.js';

// ─── Painel de FPS (Stats.js) ──────────────────────────────────────────────
// Mesmo padrão do exemplo original: instanciado no topo do módulo e já
// anexado ao body, posicionado com CSS absoluto no canto da tela.
export const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top      = '30px';
stats.dom.style.left     = '30px';
document.body.appendChild(stats.dom);

// Mesma cor de céu usada no terrain.js (deve ficar sempre idêntica àquela,
// e ao scene.background, para a névoa "combinar" com o horizonte).
const SKY_COLOR = new THREE.Color("rgb(175,207,220)");

// ─── Valores padrão de near/far ────────────────────────────────────────────
// far = CAMERA_FAR: a névoa termina de cobrir tudo exatamente onde a câmera
// deixaria de renderizar de qualquer forma — evita desperdiçar range de fog
// em distância que nunca seria visível.
// near = uma fração de CAMERA_FAR: começa a névoa relativamente longe, para
// não "engolir" o terreno logo à frente da câmera.
const FOG_FAR = CAMERA_FAR;
// Aumentado de 0.15 para 0.22: com o relevo agora bem mais profundo/alto
// (vales até -800, cadeias de montanha com bastante amplitude), um near
// muito próximo escondia vales e a água atrás de neblina cedo demais. Isso
// não muda a "força" da fog no horizonte (far continua = CAMERA_FAR), só
// adia um pouco onde ela começa a agir.
const FOG_NEAR_DEFAULT = CAMERA_FAR * 0.22;
const FOG_NEAR_MIN     = CAMERA_FAR * 0.02;
const FOG_NEAR_MAX     = CAMERA_FAR * 0.85;

// ─── Aplica a névoa e a cor de fundo na cena ────────────────────────────────
// THREE.Fog é linear (near/far) — mais previsível e barato que FogExp2, e
// combina melhor com o controle direto de "onde a névoa começa" que o HUD
// oferece.
export const fog = new THREE.Fog(SKY_COLOR, FOG_NEAR_DEFAULT, FOG_FAR);
scene.fog = fog;

// Garante que o fundo da cena seja idêntico à cor da névoa — mesmo motivo
// documentado no terrain.js: transição invisível entre terreno e céu.
scene.background = SKY_COLOR;

// ─── HUD de controle da fog (DOM puro, sem dat.GUI) ────────────────────────
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