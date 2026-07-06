import * as THREE from 'three';
import { scene, plane_height, plane_width, numTreesPerPlane, minTreeDistance, treeSpawnArea } from './config.js';
import { createAlternativeTree, createTree } from './tree.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const xS = 64;
const yS = 64;
const COLS = xS + 1;
const ROWS = yS + 1;
const MAX_HEIGHT =  90;   // mais alto — picos mais dramáticos
const MIN_HEIGHT = -800;   // mais fundo — vales mais profundos

const ROUGHNESS = 0.65;

const SMOOTH_PASSES = 3;

const SEAM_FEATHER_ROWS = 10;

export const CAMERA_FAR = 9000;
export const FOG_NEAR    = plane_height * 2.6;
export const FOG_FAR     = Math.min(plane_height * 9.5, CAMERA_FAR);

const MIN_CHUNKS_FOR_VISIBLE_COVERAGE = Math.ceil(CAMERA_FAR / plane_height);
const EXTRA_BUFFER_CHUNKS = 6;
const NUM_ACTIVE_CHUNKS = MIN_CHUNKS_FOR_VISIBLE_COVERAGE + EXTRA_BUFFER_CHUNKS;

export const WATER_LEVEL = -500;

const SKY_COLOR = new THREE.Color("rgb(175,207,220)");

const sharedUniforms = {
    time:         { value: 0.0 },
    sunDirection: { value: new THREE.Vector3(1.5, 3.0, 1.0).normalize() },
    skyColor:     { value: SKY_COLOR }, 
    fogNear:      { value: FOG_NEAR },  
    fogFar:       { value: FOG_FAR }    
};

const _startTime = performance.now();

const terrainVertexInjection = /* glsl */ `
    varying float vHeight;
    varying vec2  vObjXZ;
    varying float vSlopeRaw;
`;

const terrainVertexBeginReplace = /* glsl */ `
    #include <begin_vertex>

    vHeight   = transformed.y;
    vObjXZ    = transformed.xz;
    vSlopeRaw = normal.y;
`;

const terrainFragmentInjection = /* glsl */ `
    uniform float minHeight;
    uniform float maxHeight;
    uniform float waterLevel;

    varying float vHeight;
    varying vec2  vObjXZ;
    varying float vSlopeRaw;

    float terrainHash(vec2 p) {
        p  = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.1);
        return fract(p.x * p.y);
    }

    float terrainNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(terrainHash(i),                  terrainHash(i + vec2(1.0, 0.0)), f.x),
            mix(terrainHash(i + vec2(0.0, 1.0)), terrainHash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    float terrainFbm(vec2 p) {
        float v = 0.0, amp = 0.5;
        for (int i = 0; i < 6; i++) {
            v   += amp * terrainNoise(p);
            p   *= 2.03;
            amp *= 0.5;
        }
        return v;
    }

    vec3 terrainColorSand(vec2 uv)  { float n = terrainFbm(uv *  7.0); return mix(vec3(0.74,0.66,0.42), vec3(0.91,0.83,0.60), n); }
    vec3 terrainColorGrass(vec2 uv) { float n = terrainFbm(uv * 12.0); return mix(vec3(0.13,0.36,0.07), vec3(0.29,0.57,0.19), n); }
    vec3 terrainColorRock(vec2 uv)  { float n = terrainFbm(uv * 19.0); return mix(vec3(0.34,0.29,0.23), vec3(0.55,0.49,0.41), n); }
    vec3 terrainColorSnow(vec2 uv)  { float n = terrainFbm(uv *  5.0) * 0.07; return vec3(0.89+n, 0.93+n, 0.97); }
`;

const terrainFragmentMapReplace = /* glsl */ `
    #include <map_fragment>

    vec2 tuv = vObjXZ * 0.018;

    float th  = clamp((vHeight - minHeight) / (maxHeight - minHeight), 0.0, 1.0);
    float twh = clamp((waterLevel - minHeight) / (maxHeight - minHeight), 0.0, 1.0);
    float tha = clamp((th - twh) / max(1.0 - twh, 0.001), 0.0, 1.0);

    float tslope = 1.0 - clamp(vSlopeRaw, 0.0, 1.0);

    vec3 tcol = terrainColorSand(tuv);
    tcol = mix(tcol, terrainColorGrass(tuv), smoothstep(0.06, 0.22, tha));
    tcol = mix(tcol, terrainColorRock(tuv),  smoothstep(0.40, 0.60, tha));
    tcol = mix(tcol, terrainColorSnow(tuv),  smoothstep(0.72, 0.88, tha));
    tcol = mix(tcol, terrainColorRock(tuv),  smoothstep(0.30, 0.64, tslope));

    diffuseColor = vec4(tcol, diffuseColor.a);
`;

// ─── GLSL: Vertex Shader da Água ─────────────────────────────────────────────

const waterVertexShader = /* glsl */ `
    uniform float time;

    varying vec3  vNormal;
    varying vec3  vWorldPos;

    void main() {
        vec3 pos = position;

        float w1 = sin(pos.x * 0.12 + time * 1.20) * 2.0;
        float w2 = sin(pos.z * 0.17 + time * 0.85) * 1.5;
        float w3 = sin((pos.x * 0.08 + pos.z * 0.10) + time * 1.50) * 1.0;
        pos.y   += w1 + w2 + w3;

        float dydx = cos(pos.x * 0.12 + time * 1.20) * 0.12 * 2.0
                   + cos((pos.x * 0.08 + pos.z * 0.10) + time * 1.50) * 0.08 * 1.0;
        float dydz = cos(pos.z * 0.17 + time * 0.85) * 0.17 * 1.5
                   + cos((pos.x * 0.08 + pos.z * 0.10) + time * 1.50) * 0.10 * 1.0;

        vNormal    = normalize(normalMatrix * normalize(vec3(-dydx, 1.0, -dydz)));
        vWorldPos  = (modelMatrix * vec4(pos, 1.0)).xyz;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position     = projectionMatrix * mvPosition;
    }
`;

// ─── GLSL: Fragment Shader da Água ───────────────────────────────────────────

const waterFragmentShader = /* glsl */ `
    uniform float time;
    uniform vec3  sunDirection;
    uniform vec3  skyColor;
    uniform float fogNear;
    uniform float fogFar;

    varying vec3  vNormal;
    varying vec3  vWorldPos;

    float hash(vec2 p) {
        p  = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 74.1);
        return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    void main() {
        vec3 sun     = normalize(sunDirection);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 norm    = normalize(vNormal);

        vec3  halfV = normalize(sun + viewDir);
        float spec  = pow(max(dot(norm, halfV), 0.0), 96.0);

        vec2  uvFlow = vWorldPos.xz * 0.038 + vec2(time * 0.012, time * 0.008);
        float n = vnoise(uvFlow)                    * 0.55
                + vnoise(uvFlow * 2.8 + vec2(0.5)) * 0.28
                + vnoise(uvFlow * 5.5 + vec2(1.3)) * 0.17;

        vec3 col = mix(vec3(0.03, 0.18, 0.46), vec3(0.12, 0.54, 0.70), n);
        col += spec * vec3(1.0, 0.97, 0.88) * 0.85;
        col  = mix(col, vec3(0.88, 0.95, 1.0), smoothstep(0.60, 0.78, n) * 0.42);

        float fresnel = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);
        float alpha   = mix(0.52, 0.93, fresnel);

        float fogDist   = length(vWorldPos.xz - cameraPosition.xz);
        float fogFactor = clamp((fogDist - fogNear) / max(fogFar - fogNear, 0.001), 0.0, 1.0);
        col = mix(col, skyColor, fogFactor);

        gl_FragColor = vec4(col, alpha);
    }
`;

// ─── Ruído 2D para o relevo macro (cadeias de montanha) ────────────────────
// Puramente funcional: hashNoise/valueNoise2D são funções determinísticas de
// (x, y) — não dependem de Math.random nem de estado por chunk, então
// amostrar a mesma coordenada de mundo duas vezes (de chunks diferentes)
// sempre dá o mesmo resultado. É isso que garante continuidade perfeita nas
// costuras sem precisar de nenhum "seed" especial para o relevo macro.

function hashNoise(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return s - Math.floor(s);
}

function valueNoise2D(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const u  = xf * xf * (3 - 2 * xf);
    const v  = yf * yf * (3 - 2 * yf);

    const n00 = hashNoise(xi,     yi);
    const n10 = hashNoise(xi + 1, yi);
    const n01 = hashNoise(xi,     yi + 1);
    const n11 = hashNoise(xi + 1, yi + 1);

    const nx0 = n00 + (n10 - n00) * u;
    const nx1 = n01 + (n11 - n01) * u;
    return nx0 + (nx1 - nx0) * v; // 0..1
}

// Ridged fbm: em vez do fbm "suave" comum, cada oitava vira `1 - |2n-1|`,
// o que produz cristas nítidas e vales bem definidos — a assinatura visual
// clássica de cadeias de montanha reais (ridged multifractal), bem diferente
// do aspecto uniforme/ondulado de um fbm normal.
function ridgedFbm2D(x, y, octaves = 5) {
    let sum = 0, amp = 0.5, freq = 1.0, norm = 0;
    for (let i = 0; i < octaves; i++) {
        const n     = valueNoise2D(x * freq, y * freq);
        const ridge = 1.0 - Math.abs(2.0 * n - 1.0); // 0 nos vales, 1 nas cristas
        sum  += ridge * ridge * amp;
        norm += amp;
        amp  *= 0.5;
        freq *= 2.05; // levemente >2 evita repetição de padrão entre oitavas
    }
    return sum / norm; // 0..1
}

// MACRO_FREQ:  controla o "tamanho" das cadeias de montanha no mundo —
//              menor = montanhas mais largas/espaçadas; maior = mais
//              compactas e frequentes.
// MACRO_AMPLITUDE: amplitude vertical total do relevo macro.
// MACRO_BIAS:  desloca o relevo para baixo (0 a 1). Como MIN_HEIGHT é bem
//              mais fundo que MAX_HEIGHT é alto (relevo assimétrico, tipo
//              "muitos vales, poucos picos"), um bias > 0.5 garante que boa
//              parte do terreno fique baixo o bastante para o nível da água
//              aparecer com frequência, reservando os picos (ridge≈1) para
//              os poucos pontos mais altos.
const MACRO_FREQ      = 1 / 1400;
const MACRO_AMPLITUDE = 900;
const MACRO_BIAS      = 0.65;

const GAUSS_K5 = [
     1,  4,  6,  4,  1,
     4, 16, 24, 16,  4,
     6, 24, 36, 24,  6,
     4, 16, 24, 16,  4,
     1,  4,  6,  4,  1,
];

function gaussianBlurPass(map, N) {
    const out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            let sum = 0, total = 0, k = 0;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = Math.min(Math.max(x + dx, 0), N - 1);
                    const ny = Math.min(Math.max(y + dy, 0), N - 1);
                    sum   += map[ny * N + nx] * GAUSS_K5[k];
                    total += GAUSS_K5[k];
                    k++;
                }
            }
            out[y * N + x] = sum / total;
        }
    }
    return out;
}

function diamondSquare(seedRow = null, seedRow2 = null, zOffset = 0) {
    const N   = COLS;
    const map = new Float32Array(N * N);

    const get   = (x, y) => map[y * N + x];
    const set   = (x, y, v) => { map[y * N + x] = v; };
    const rand  = (s) => (Math.random() * 2 - 1) * s;

    // Clamp de verdade — a versão anterior (`MAX_HEIGHT - Math.abs(v - MAX_HEIGHT)`)
    // não cortava valores acima de MAX_HEIGHT, ela os REFLETIA de volta para baixo
    // (dobra/fold). Isso fazia qualquer overshoot do diamond-square virar um vale
    // artificial logo ao lado de um pico, produzindo relevo errático e contribuindo
    // para o aspecto "facetado"/em faixas.
    const clamp = (v) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, v));

    if (seedRow) {
        for (let x = 0; x < N; x++) set(x, 0, seedRow[x]);
        set(0,   N - 1, rand(220));
        set(N-1, N - 1, rand(220));
    } else {
        set(0,   0,     rand(220));
        set(N-1, 0,     rand(220));
        set(0,   N - 1, rand(220));
        set(N-1, N - 1, rand(220));
    }

    let step  = N - 1;
    let scale = 220;

    while (step > 1) {
        const half = step >> 1;

        for (let y = 0; y < N - 1; y += step) {
            for (let x = 0; x < N - 1; x += step) {
                const avg = (get(x,y) + get(x+step,y) + get(x,y+step) + get(x+step,y+step)) / 4;
                set(x + half, y + half, clamp(avg + rand(scale)));
            }
        }

        for (let y = 0; y < N; y += half) {
            for (let x = (y + half) % step; x < N; x += step) {
                let sum = 0, count = 0;
                if (x - half >= 0) { sum += get(x - half, y); count++; }
                if (x + half <  N) { sum += get(x + half, y); count++; }
                if (y - half >= 0) { sum += get(x, y - half); count++; }
                if (y + half <  N) { sum += get(x, y + half); count++; }
                if (seedRow && y === 0) continue;
                set(x, y, clamp(sum / count + rand(scale)));
            }
        }

        step   = half;
        scale *= ROUGHNESS;
    }

    // ─── Relevo macro (cadeias de montanha) ────────────────────────────────
    // Substitui o antigo "perfil 1D * rampa por chunk" — aquela abordagem
    // variava só em X e crescia de 0 até o máximo dentro de CADA chunk,
    // sempre reiniciando na costura seguinte. Visualmente isso aparecia
    // como faixas horizontais repetidas a cada `plane_height`, sem relação
    // com relevo real.
    //
    // Agora o relevo de grande escala vem de um ridged-fbm 2D CONTÍNUO,
    // amostrado em coordenadas de MUNDO (worldX, worldZ). Como worldZ cresce
    // monotonicamente com zOffset (nunca reinicia a cada chunk), a mesma
    // posição de mundo sempre produz o mesmo valor de relevo — a costura
    // entre chunks fica contínua e não há qualquer periodicidade artificial:
    // só picos e vales "de verdade", determinados pela variação real do
    // ruído em X e Z.
    for (let y = 0; y < N; y++) {
        const worldZ = zOffset + (y / (N - 1)) * plane_height;
        for (let x = 0; x < N; x++) {
            const worldX = (x / (N - 1) - 0.5) * plane_width;
            const idx    = y * N + x;

            const ridge = ridgedFbm2D(worldX * MACRO_FREQ, worldZ * MACRO_FREQ);
            const macro = (ridge - MACRO_BIAS) * MACRO_AMPLITUDE;

            map[idx] = clamp(map[idx] + macro);
        }
    }

    let smoothed = map;
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
        smoothed = gaussianBlurPass(smoothed, N);
    }
    smoothed.forEach((v, i) => { map[i] = v; });

    if (seedRow) {
        for (let x = 0; x < N; x++) map[x] = seedRow[x];

        if (seedRow2) {
            const trend = new Float32Array(N);
            for (let x = 0; x < N; x++) trend[x] = seedRow[x] - seedRow2[x];

            const K = Math.min(SEAM_FEATHER_ROWS, N - 1);
            for (let row = 1; row <= K; row++) {
                const t      = row / (K + 1);
                const weight = (1 - t) * (1 - t);
                for (let x = 0; x < N; x++) {
                    const idx    = row * N + x;
                    const target = clamp(seedRow[x] + trend[x] * row);
                    map[idx]     = map[idx] * (1 - weight) + target * weight;
                }
            }
        }
    }

    return map;
}

function extractRow(map, rowIndex) {
    const row = new Float32Array(COLS);
    for (let x = 0; x < COLS; x++) row[x] = map[rowIndex * COLS + x];
    return row;
}

function buildGeometry(map) {
    const geo = new THREE.PlaneGeometry(plane_width, plane_height, xS, yS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, map[i]);
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
}

function buildTerrainGroup(geo) {
    const terrainMat = new THREE.MeshStandardMaterial({
        color:     0xffffff,
        roughness: 1.0,
        metalness: 0.0,
    });

    terrainMat.onBeforeCompile = (shader) => {
        shader.uniforms.minHeight  = { value: MIN_HEIGHT };
        shader.uniforms.maxHeight  = { value: MAX_HEIGHT };
        shader.uniforms.waterLevel = { value: WATER_LEVEL };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${terrainVertexInjection}`)
            .replace('#include <begin_vertex>', terrainVertexBeginReplace);

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\n${terrainFragmentInjection}`)
            .replace('#include <map_fragment>', terrainFragmentMapReplace);

        terrainMat.userData.shader = shader;
    };

    const solid = new THREE.Mesh(geo, terrainMat);
    solid.receiveShadow = true;
    solid.castShadow    = true;

    const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 15),
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 })
    );

    const group = new THREE.Group();
    group.add(solid);
    group.add(wire);
    return group;
}

// ─── Plano de água ────────────────────────────────────────────────────────────
// Água opaca (transparent:false, depthWrite:true) — mas com `fog: true` para
// que o Three.js preencha sozinho fogColor/fogNear/fogFar a cada frame a
// partir de scene.fog, e o fragment shader misture a cor final com a névoa.

function createWaterPlane() {
    const geo = new THREE.PlaneGeometry(plane_width, plane_height, 48, 48);
    geo.rotateX(-Math.PI / 2);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time:         sharedUniforms.time,
            sunDirection: sharedUniforms.sunDirection,
            skyColor:     sharedUniforms.skyColor, 
            fogNear:      sharedUniforms.fogNear,  
            fogFar:       sharedUniforms.fogFar,   
        },
        vertexShader:   waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent:    true,
        depthWrite:     false,
        side:           THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = WATER_LEVEL;
    mesh.renderOrder = 1;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.userData.isWater = true;
    return mesh;
}

function getHeightAt(geo, localX, localZ) {
    const pos = geo.attributes.position;

    const u = Math.min(Math.max((localX + plane_width  / 2) / plane_width,  0), 1);
    const v = Math.min(Math.max((localZ + plane_height / 2) / plane_height, 0), 1);

    const fx = u * xS;
    const fz = v * yS;
    const x0 = Math.min(Math.floor(fx), xS - 1);
    const z0 = Math.min(Math.floor(fz), yS - 1);
    const x1 = Math.min(x0 + 1, xS);
    const z1 = Math.min(z0 + 1, yS);

    const tx = fx - x0;
    const tz = fz - z0;

    const h00 = pos.getY(z0 * COLS + x0);
    const h10 = pos.getY(z0 * COLS + x1);
    const h01 = pos.getY(z1 * COLS + x0);
    const h11 = pos.getY(z1 * COLS + x1);

    return h00 * (1 - tx) * (1 - tz)
         + h10 *      tx  * (1 - tz)
         + h01 * (1 - tx) *      tz
         + h11 *      tx  *      tz;
}

function samplePositions(count, minDist, area) {
    const out = [];
    let attempts = 0;
    while (out.length < count && attempts < count * 200) {
        const x = Math.random() * (area.maxX - area.minX) + area.minX;
        const z = Math.random() * (area.maxZ - area.minZ) + area.minZ;
        if (out.every(p => (x-p.x)**2 + (z-p.z)**2 >= minDist * minDist)) out.push({ x, z });
        attempts++;
    }
    return out;
}

const TREE_EMBED = 0.6;

function addTrees(group, geo) {
    samplePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea).forEach(({ x, z }) => {
        const y = getHeightAt(geo, x, z);
        if (y <= WATER_LEVEL + 4) return;

        const tree = Math.random() < 0.5 ? createTree(x, z) : createAlternativeTree(x, z);
        tree.position.y += y - TREE_EMBED;
        tree.traverse(child => {
            if (child.isMesh) {
                child.castShadow    = true;
                child.receiveShadow = true;
            }
        });
        group.add(tree);
    });
}

function createChunk(zOffset, seedRow = null, seedRow2 = null) {
    const map   = diamondSquare(seedRow, seedRow2, zOffset);
    const geo   = buildGeometry(map);
    const group = buildTerrainGroup(geo);
    group.add(createWaterPlane());
    group.position.z = zOffset;
    scene.add(group);
    addTrees(group, geo);
    return {
        group,
        lastRow:       extractRow(map, ROWS - 1),
        secondLastRow: extractRow(map, ROWS - 2),
    };
}

function createInitialChunks(count) {
    const chunks = [];
    let previous = null;

    for (let i = 0; i < count; i++) {
        const zOffset  = i * plane_height;
        const seedRow  = previous ? previous.lastRow       : null;
        const seedRow2 = previous ? previous.secondLastRow : null;
        const chunk    = createChunk(zOffset, seedRow, seedRow2);
        chunks.push(chunk);
        previous = chunk;
    }

    return chunks;
}

let _chunks = createInitialChunks(NUM_ACTIVE_CHUNKS);

export let plane_array = _chunks.map(c => c.group);
export const speed = 7;

export function updatePlane(plane_array, speed) {
    sharedUniforms.time.value = (performance.now() - _startTime) / 1000;

    _chunks.forEach(c => { c.group.position.z -= speed; });

    if (scene.fog) {
        sharedUniforms.fogNear.value = scene.fog.near;
        sharedUniforms.fogFar.value  = scene.fog.far;
    }

    let changed = false;
    while (_chunks[0].group.position.z < -plane_height) {
        scene.remove(_chunks[0].group);

        const frontChunk = _chunks[_chunks.length - 1];
        const newZ        = frontChunk.group.position.z + plane_height;
        const newChunk     = createChunk(newZ, frontChunk.lastRow, frontChunk.secondLastRow);

        _chunks.push(newChunk);
        _chunks.shift();
        changed = true;
    }

    if (changed) {
        plane_array.length = 0;
        _chunks.forEach(c => plane_array.push(c.group));
    }
}