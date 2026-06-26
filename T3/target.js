import * as THREE from 'three';
import { renderer } from './config.js';

export function createCrosshair(renderer) {

    // ─── Container principal ──────────────────────────────────────────────────

    const mira = document.createElement("div");

    mira.style.position   = "fixed";
    mira.style.width      = "80px";
    mira.style.height     = "80px";
    mira.style.pointerEvents = "none";
    mira.style.zIndex     = "99999";
    mira.style.left       = "50%";
    mira.style.top        = "50%";
    mira.style.transform  = "translate(-50%,-50%)";

    document.body.appendChild(mira);
    document.body.style.cursor = "none";

    // ─── Cor Star Fox ─────────────────────────────────────────────────────────

    const COLOR  = "#00ff22";
    const OUTLINE = `
        drop-shadow(1px 0 black)
        drop-shadow(-1px 0 black)
        drop-shadow(0 1px black)
        drop-shadow(0 -1px black)
    `;

    const GLOW = `
        ${OUTLINE}
        drop-shadow(0 0 6px #00ff22)
        drop-shadow(0 0 6px #00ff22)
    `;

    const THICK  = "3px";   // espessura do traço
    const CORNER = "12px";  // comprimento de cada canto

    // ─── Fábrica de canto ─────────────────────────────────────────────────────
    // Cada canto é um div com duas bordas visíveis (em L)

    function makeCorner(top, right, bottom, left, borderTop, borderRight, borderBottom, borderLeft) {

        const el = document.createElement("div");

        el.style.position = "absolute";
        el.style.width    = CORNER;
        el.style.height   = CORNER;
        el.style.boxSizing = "border-box";
        el.style.filter = GLOW;

        if (top    !== undefined) el.style.top    = top;
        if (right  !== undefined) el.style.right  = right;
        if (bottom !== undefined) el.style.bottom = bottom;
        if (left   !== undefined) el.style.left   = left;

        el.style.borderTop    = borderTop    ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderRight  = borderRight  ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderBottom = borderBottom ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderLeft   = borderLeft   ? `${THICK} solid ${COLOR}` : "none";

        return el;
    }

    // ─── Quadrado EXTERNO (4 cantos em L) ────────────────────────────────────

    //                     top     right   bottom  left    bT     bR     bB     bL
    mira.appendChild(makeCorner("0px",  undefined, undefined, "0px",  true,  false, false, true ));  // ↖
    mira.appendChild(makeCorner("0px",  "0px",     undefined, undefined, true, true,  false, false));  // ↗
    mira.appendChild(makeCorner(undefined, undefined, "0px", "0px",  false, false, true,  true ));  // ↙
    mira.appendChild(makeCorner(undefined, "0px",  "0px",    undefined, false, true, true,  false));  // ↘

    // ─── Quadrado INTERNO (menor, centralizado) ───────────────────────────────

    const INNER_SIZE   = "36px";   // tamanho do quadrado interno
    const INNER_CORNER = "8px";    // comprimento dos cantos internos
    const INNER_OFFSET = "22px";   // distância do centro até o início do quadrado interno

    function makeInnerCorner(top, right, bottom, left, borderTop, borderRight, borderBottom, borderLeft) {

        const el = document.createElement("div");

        el.style.position  = "absolute";
        el.style.width     = INNER_CORNER;
        el.style.height    = INNER_CORNER;
        el.style.boxSizing = "border-box";
        el.style.filter = GLOW;

        if (top    !== undefined) el.style.top    = top;
        if (right  !== undefined) el.style.right  = right;
        if (bottom !== undefined) el.style.bottom = bottom;
        if (left   !== undefined) el.style.left   = left;

        el.style.borderTop    = borderTop    ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderRight  = borderRight  ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderBottom = borderBottom ? `${THICK} solid ${COLOR}` : "none";
        el.style.borderLeft   = borderLeft   ? `${THICK} solid ${COLOR}` : "none";

        return el;
    }

    const IO = INNER_OFFSET;  // alias curto

    //                          top    right  bottom left   bT     bR     bB     bL
    mira.appendChild(makeInnerCorner(IO, undefined, undefined, IO, true,  false, false, true ));  // ↖
    mira.appendChild(makeInnerCorner(IO, IO,  undefined, undefined, true,  true,  false, false));  // ↗
    mira.appendChild(makeInnerCorner(undefined, undefined, IO, IO, false, false, true,  true ));  // ↙
    mira.appendChild(makeInnerCorner(undefined, IO, IO, undefined, false, true,  true,  false));  // ↘

    // ─── Ponto central ────────────────────────────────────────────────────────

    const dot = document.createElement("div");

    dot.style.position     = "absolute";
    dot.style.left         = "50%";
    dot.style.top          = "50%";
    dot.style.width        = "4px";
    dot.style.height       = "4px";
    dot.style.background   = COLOR;
    dot.style.borderRadius = "50%";
    dot.style.transform    = "translate(-50%,-50%)";
    dot.style.boxShadow    = GLOW;

    mira.appendChild(dot);

    // ─── Mouse tracking com suavização ───────────────────────────────────────

    let mouseX = window.innerWidth  / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // ─── Loop de animação ─────────────────────────────────────────────────────

    let paused = false;

    function update() {

        if (!paused) {

            cursorX += (mouseX - cursorX) * 0.18;
            cursorY += (mouseY - cursorY) * 0.18;

            // pulso suave de escala (Star Fox pisca a mira ao travar alvo)
            const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.04;

            mira.style.left      = cursorX + "px";
            mira.style.top       = cursorY + "px";
            mira.style.transform = `translate(-50%,-50%) scale(${pulse})`;
        }

        requestAnimationFrame(update);
    }

    update();

    // ─── API: pausar/retomar (exibe cursor do sistema ao pausar) ─────────────

    return {
        element: mira,

        pause() {
            paused = true;
            mira.style.display = "none";
            document.body.style.cursor  = "default";
        },

        resume() {
            paused = false;
            mira.style.display = "block";
            document.body.style.cursor = "none";
        }
    };
}