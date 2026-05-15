import * as THREE from 'three';
import { scene, plane_height, plane_width, numTreesPerPlane, minTreeDistance, treeSpawnArea } from './config.js';
import { createAlternativeTree, createTree } from './tree.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const xS = 64;      // segmentos X (potência de 2)
const yS = 64;      // segmentos Z (potência de 2)
const COLS = xS + 1;
const ROWS = yS + 1;
const MAX_HEIGHT =  20;
const MIN_HEIGHT = -20;
const ROUGHNESS  =  0.55;

// ─── Diamond-Square ───────────────────────────────────────────────────────────
// seedRow: Float32Array(COLS) com alturas já fixadas na primeira linha (borda frontal).
// Quando null, gera tudo aleatoriamente.

function diamondSquare(seedRow = null) {
    // Tamanho da grade interna: deve ser 2^n + 1
    // Usamos COLS x ROWS como grade; como xS == yS == 64, a grade é 65x65.
    const N = COLS; // 65
    const map = new Float32Array(N * N);

    const get = (x, y) => map[y * N + x];
    const set = (x, y, v) => { map[y * N + x] = v; };
    const rand = (s) => (Math.random() * 2 - 1) * s;
    const clamp = (v) => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, v));

    // Semear cantos
    if (seedRow) {
        // Primeira linha (y=0) vem do chunk anterior
        for (let x = 0; x < N; x++) set(x, 0, seedRow[x]);
        set(0,   N-1, rand(80));
        set(N-1, N-1, rand(80));
    } else {
        set(0,   0,   rand(80));
        set(N-1, 0,   rand(80));
        set(0,   N-1, rand(80));
        set(N-1, N-1, rand(80));
    }

    let step = N - 1;
    let scale = 80;

    while (step > 1) {
        const half = step >> 1;

        // Diamond step
        for (let y = 0; y < N - 1; y += step) {
            for (let x = 0; x < N - 1; x += step) {
                const avg = (get(x, y) + get(x + step, y) +
                             get(x, y + step) + get(x + step, y + step)) / 4;
                set(x + half, y + half, clamp(avg + rand(scale)));
            }
        }

        // Square step
        for (let y = 0; y < N; y += half) {
            for (let x = (y + half) % step; x < N; x += step) {
                let sum = 0, count = 0;
                if (x - half >= 0) { sum += get(x - half, y); count++; }
                if (x + half <  N) { sum += get(x + half, y); count++; }
                if (y - half >= 0) { sum += get(x, y - half); count++; }
                if (y + half <  N) { sum += get(x, y + half); count++; }

                const val = clamp(sum / count + rand(scale));

                // Não sobrescrever a seedRow fixada
                if (seedRow && y === 0) continue;
                set(x, y, val);
            }
        }

        step = half;
        scale *= ROUGHNESS;
    }

    return map;
}

// ─── Extrai a última linha do heightmap (borda traseira do chunk) ─────────────

function extractLastRow(map) {
    const row = new Float32Array(COLS);
    for (let x = 0; x < COLS; x++) {
        row[x] = map[(ROWS - 1) * COLS + x];
    }
    return row;
}

// ─── Cria a geometria do terreno a partir do heightmap ────────────────────────

function buildGeometry(map) {
    const geo = new THREE.PlaneGeometry(plane_width, plane_height, xS, yS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;

    // PlaneGeometry gera vértices linha por linha em Z crescente (após rotação = Y crescente no plano XZ)
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, map[i]);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Vertex colors por altura
    const colors = new Float32Array(pos.count * 3);
    const low  = new THREE.Color(0x3a6b3a);
    const mid  = new THREE.Color(0x6b8e4e);
    const high = new THREE.Color(0x8b7355);

    for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT);
        const c = t < 0.5
            ? low.clone().lerp(mid,  t * 2)
            : mid.clone().lerp(high, (t - 0.5) * 2);
        colors[i * 3]     = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geo;
}

// ─── Monta o Group (mesh sólido + wireframe) ──────────────────────────────────

function buildTerrainGroup(geo) {
    const solid = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    const wire  = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0x000000, wireframe: true, transparent: true, opacity: 0.07,
    }));
    const group = new THREE.Group();
    group.add(solid);
    group.add(wire);
    return group;
}

// ─── Altura em posição local (x, z) ──────────────────────────────────────────

function getHeightAt(geo, localX, localZ) {
    const pos = geo.attributes.position;
    const u   = Math.min(Math.max((localX + plane_width  / 2) / plane_width,  0), 1);
    const v   = Math.min(Math.max((localZ + plane_height / 2) / plane_height, 0), 1);
    const col = Math.min(Math.floor(u * xS), xS - 1);
    const row = Math.min(Math.floor(v * yS), yS - 1);
    return pos.getY(row * COLS + col);
}

// ─── Scatter de árvores ───────────────────────────────────────────────────────

function samplePositions(count, minDist, area) {
    const out = [];
    let attempts = 0;
    while (out.length < count && attempts < count * 200) {
        const x = Math.random() * (area.maxX - area.minX) + area.minX;
        const z = Math.random() * (area.maxZ - area.minZ) + area.minZ;
        const ok = out.every(p => {
            const dx = x - p.x, dz = z - p.z;
            return dx * dx + dz * dz >= minDist * minDist;
        });
        if (ok) out.push({ x, z });
        attempts++;
    }
    return out;
}

function addTrees(group, geo) {
    samplePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea).forEach(({ x, z }) => {
        const y    = getHeightAt(geo, x, z);
        const tree = Math.random() < 0.5
            ? createTree(x, z)
            : createAlternativeTree(x, z);
        tree.position.y += y;
        group.add(tree);
    });
}

// ─── Criação de chunk ─────────────────────────────────────────────────────────
// seedRow: linha de alturas a fixar na borda frontal (Z mínimo do chunk).
// Retorna { group, lastRow } para encadear o próximo chunk.

function createChunk(zOffset, seedRow = null) {
    const map     = diamondSquare(seedRow);
    const geo     = buildGeometry(map);
    const group   = buildTerrainGroup(geo);
    const lastRow = extractLastRow(map);

    group.position.z = zOffset;
    scene.add(group);
    addTrees(group, geo);

    return { group, lastRow };
}

// ─── Estado dos chunks ────────────────────────────────────────────────────────

const chunk0 = createChunk(0);
const chunk1 = createChunk(plane_height, chunk0.lastRow);

// plane_array armazena { group, lastRow } internamente;
// expõe apenas os groups para compatibilidade com o resto do projeto.
let _chunks = [chunk0, chunk1];

export let plane_array = _chunks.map(c => c.group);

export const speed = 7;

// ─── Update loop ──────────────────────────────────────────────────────────────

export function updatePlane(plane_array, speed) {
    _chunks.forEach(c => { c.group.position.z -= speed; });

    if (_chunks[0].group.position.z < -plane_height) {
        scene.remove(_chunks[0].group);

        const newZ      = _chunks[1].group.position.z + plane_height;
        // A borda frontal do novo chunk == borda traseira do chunk atual
        const newChunk  = createChunk(newZ, _chunks[1].lastRow);

        _chunks.push(newChunk);
        _chunks.shift();

        // Mantém plane_array sincronizado
        plane_array.length = 0;
        _chunks.forEach(c => plane_array.push(c.group));
    }
}