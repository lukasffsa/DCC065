import * as THREE from 'three';
import { scene, plane_height, plane_width, numTreesPerPlane, minTreeDistance, treeSpawnArea } from './config.js';
import { createAlternativeTree, createTree } from './tree.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const xS = 64;
const yS = 64;
const COLS = xS + 1;
const ROWS = yS + 1;
const MAX_HEIGHT =  90;   // mais alto — picos mais dramáticos
const MIN_HEIGHT = -1000;   // mais fundo — vales mais profundos
const ROUGHNESS  =  0.55;  // menor = transições mais suaves entre picos e vales

export const WATER_LEVEL = -800;

// ─── Uniforms compartilhados ──────────────────────────────────────────────────

const sharedUniforms = {
    time:         { value: 0.0 },
    sunDirection: { value: new THREE.Vector3(1.5, 3.0, 1.0).normalize() },
};

// Cor do céu — deve ser idêntica ao scene.background e ao fogColor
// para que a transição de chunks seja invisível
const SKY_COLOR = new THREE.Color("rgb(175,207,220)");

const _startTime = performance.now();

// ─── GLSL: Vertex Shader do Terreno ──────────────────────────────────────────
// vFogDepth: distância euclideana do vértice à câmera em espaço de câmera.
// Usando length(mvPosition.xyz) em vez de apenas -mvPos.z porque a câmera
// olha de cima (cameraHeight=180), então vértices distantes têm componente Y
// significativa — a distância Z subestima a distância real e a fog não aparece
// onde deveria.

const terrainVertexShader = /* glsl */ `
    varying float vHeight;
    varying vec3  vNormal;
    varying vec3  vNormalView;
    varying vec2  vObjXZ;
    varying float vFogDepth;

    void main() {
        vHeight     = position.y;
        vNormal     = normalize(normal);
        vNormalView = normalize(normalMatrix * normal);
        vObjXZ      = position.xz;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Distância euclideana — correta para câmera aérea inclinada
        vFogDepth   = length(mvPosition.xyz);

        gl_Position = projectionMatrix * mvPosition;
    }
`;

const terrainFragmentShader = /* glsl */ `
    varying float vHeight;
    varying vec3  vNormal;
    varying vec3  vNormalView;
    varying vec2  vObjXZ;
    varying float vFogDepth;

    uniform float minHeight;
    uniform float maxHeight;
    uniform float waterLevel;
    uniform vec3  sunDirection;
    uniform vec3  skyColor;
    uniform float fogNear;
    uniform float fogFar;

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
            mix(hash(i),                  hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
        );
    }

    float fbm(vec2 p) {
        float v = 0.0, amp = 0.5;
        for (int i = 0; i < 6; i++) {
            v   += amp * vnoise(p);
            p   *= 2.03;
            amp *= 0.5;
        }
        return v;
    }

    vec3 colorSand(vec2 uv)  { float n = fbm(uv *  7.0); return mix(vec3(0.74,0.66,0.42), vec3(0.91,0.83,0.60), n); }
    vec3 colorGrass(vec2 uv) { float n = fbm(uv * 12.0); return mix(vec3(0.13,0.36,0.07), vec3(0.29,0.57,0.19), n); }
    vec3 colorRock(vec2 uv)  { float n = fbm(uv * 19.0); return mix(vec3(0.34,0.29,0.23), vec3(0.55,0.49,0.41), n); }
    vec3 colorSnow(vec2 uv)  { float n = fbm(uv *  5.0) * 0.07; return vec3(0.89+n, 0.93+n, 0.97); }

    void main() {
        vec2 uv = vObjXZ * 0.018;

        float h  = clamp((vHeight  - minHeight) / (maxHeight - minHeight), 0.0, 1.0);
        float wh = clamp((waterLevel - minHeight) / (maxHeight - minHeight), 0.0, 1.0);
        float ha = clamp((h - wh) / max(1.0 - wh, 0.001), 0.0, 1.0);

        float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);

        vec3 col = colorSand(uv);
        col = mix(col, colorGrass(uv), smoothstep(0.06, 0.22, ha));
        col = mix(col, colorRock(uv),  smoothstep(0.40, 0.60, ha));
        col = mix(col, colorSnow(uv),  smoothstep(0.72, 0.88, ha));
        col = mix(col, colorRock(uv),  smoothstep(0.30, 0.64, slope));

        float diff = max(dot(normalize(vNormalView), normalize(sunDirection)), 0.0);
        col *= 0.28 + 0.72 * diff;

        // Fog: mistura com a cor do céu (mesma do scene.background)
        // usando distância euclideana — invisível ao jogador
        float fogFactor = clamp((vFogDepth - fogNear) / max(fogFar - fogNear, 0.001), 0.0, 1.0);
        col = mix(col, skyColor, fogFactor);

        gl_FragColor = vec4(col, 1.0);
    }
`;

// ─── GLSL: Vertex Shader da Água ─────────────────────────────────────────────

const waterVertexShader = /* glsl */ `
    uniform float time;

    varying vec3  vNormal;
    varying vec3  vWorldPos;
    varying float vFogDepth;

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
        vFogDepth       = length(mvPosition.xyz);
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
    varying float vFogDepth;

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

        // Fog só no RGB, alpha da água preservado
        float fogFactor = clamp((vFogDepth - fogNear) / max(fogFar - fogNear, 0.001), 0.0, 1.0);
        col = mix(col, skyColor, fogFactor);

        gl_FragColor = vec4(col, alpha);
    }
`;

// ─── Diamond-Square ───────────────────────────────────────────────────────────

function diamondSquare(seedRow = null) {
    const N   = COLS;
    const map = new Float32Array(N * N);

    const get   = (x, y) => map[y * N + x];
    const set   = (x, y, v) => { map[y * N + x] = v; };
    const rand  = (s) => (Math.random() * 2 - 1) * s;
    const clamp = (v) => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, v));

    function generateMountainProfile() {
        const profile   = new Float32Array(N);
        // baseShift maior = cristas e vales mais deslocados verticalmente
        const baseShift = (Math.random() - 0.5) * 120;
        profile[0]      = rand(200) + baseShift;
        profile[N - 1]  = rand(160) + baseShift;

        // disp maior e decaimento mais lento = variações mais amplas e longas
        function midpoint(left, right, disp) {
            if (right - left <= 1) return;
            const mid    = Math.floor((left + right) / 2);
            profile[mid] = (profile[left] + profile[right]) / 2 + rand(disp);
            midpoint(left, mid,   disp * 0.72);  // decaimento mais lento = mais rugosidade
            midpoint(mid,  right, disp * 0.72);
        }
        midpoint(0, N - 1, 130);
        return profile;
    }

    const mountains = generateMountainProfile();

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
    let scale = 220;  // amplitude inicial maior = ondulações mais dramáticas

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

    // Perfil de montanhas com mais influência — oscilações mais dramáticas
    for (let y = 0; y < N; y++) {
        const factor = y / (N - 1);
        for (let x = 0; x < N; x++) {
            const idx = y * N + x;
            map[idx]  = clamp(map[idx] + mountains[x] * factor * 7.0);
        }
    }

    // Suavização gaussiana 5×5 — elimina arestas pontudas sem achatar picos
    const k5 = [
         1,  4,  6,  4,  1,
         4, 16, 24, 16,  4,
         6, 24, 36, 24,  6,
         4, 16, 24, 16,  4,
         1,  4,  6,  4,  1,
    ];
    const smooth = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            let sum = 0, total = 0, k = 0;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = Math.min(Math.max(x + dx, 0), N - 1);
                    const ny = Math.min(Math.max(y + dy, 0), N - 1);
                    sum   += map[ny * N + nx] * k5[k];
                    total += k5[k];
                    k++;
                }
            }
            smooth[y * N + x] = sum / total;
        }
    }
    smooth.forEach((v, i) => { map[i] = v; });

    // Re-fixar seedRow após suavização: a gaussiana 5×5 com padding espelhado
    // altera levemente os vértices da linha 0, fazendo a borda do chunk
    // divergir do seedRow que o chunk anterior exportou.
    // Sobrescrever aqui garante costura perfeita independente do kernel.
    if (seedRow) {
        for (let x = 0; x < N; x++) map[x] = seedRow[x];
    }

    return map;
}

// ─── Extrai última linha do heightmap ────────────────────────────────────────

function extractLastRow(map) {
    const row = new Float32Array(COLS);
    for (let x = 0; x < COLS; x++) row[x] = map[(ROWS - 1) * COLS + x];
    return row;
}

// ─── Geometria do terreno ─────────────────────────────────────────────────────

function buildGeometry(map) {
    const geo = new THREE.PlaneGeometry(plane_width, plane_height, xS, yS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, map[i]);
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
}

// ─── Uniforms de fog — atualizadas em runtime pelo fog.js ────────────────────
// Exportadas para que fog.js possa ajustá-las via GUI sem recompilar shaders.

export const fogUniforms = {
    skyColor: { value: SKY_COLOR },
    fogNear:  { value: 2500 },   // começa a ~62% do chunk (4000 * 0.62)
    fogFar:   { value: 4200 },   // cobre a costura
};

// ─── Group do terreno ─────────────────────────────────────────────────────────

function buildTerrainGroup(geo) {
    const terrainMat = new THREE.ShaderMaterial({
        uniforms: {
            minHeight:    { value: MIN_HEIGHT },
            maxHeight:    { value: MAX_HEIGHT },
            waterLevel:   { value: WATER_LEVEL },
            sunDirection: sharedUniforms.sunDirection,
            skyColor:     fogUniforms.skyColor,
            fogNear:      fogUniforms.fogNear,
            fogFar:       fogUniforms.fogFar,
        },
        vertexShader:   terrainVertexShader,
        fragmentShader: terrainFragmentShader,
    });

    const solid = new THREE.Mesh(geo, terrainMat);
    solid.receiveShadow = true;

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

function createWaterPlane() {
    const geo = new THREE.PlaneGeometry(plane_width, plane_height, 48, 48);
    geo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: {
            time:         sharedUniforms.time,
            sunDirection: sharedUniforms.sunDirection,
            skyColor:     fogUniforms.skyColor,
            fogNear:      fogUniforms.fogNear,
            fogFar:       fogUniforms.fogFar,
        },
        vertexShader:   waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent:    true,
        depthWrite:     false,
        side:           THREE.DoubleSide,
    }));
    mesh.position.y = WATER_LEVEL;
    return mesh;
}

// ─── Altura em posição local ──────────────────────────────────────────────────

function getHeightAt(geo, localX, localZ) {
    const pos = geo.attributes.position;

    // Coordenadas normalizadas [0,1]
    const u = Math.min(Math.max((localX + plane_width  / 2) / plane_width,  0), 1);
    const v = Math.min(Math.max((localZ + plane_height / 2) / plane_height, 0), 1);

    // Índices dos quatro vértices vizinhos
    const fx = u * xS;
    const fz = v * yS;
    const x0 = Math.min(Math.floor(fx), xS - 1);
    const z0 = Math.min(Math.floor(fz), yS - 1);
    const x1 = Math.min(x0 + 1, xS);
    const z1 = Math.min(z0 + 1, yS);

    // Pesos de interpolação
    const tx = fx - x0;
    const tz = fz - z0;

    // Alturas dos quatro cantos
    const h00 = pos.getY(z0 * COLS + x0);
    const h10 = pos.getY(z0 * COLS + x1);
    const h01 = pos.getY(z1 * COLS + x0);
    const h11 = pos.getY(z1 * COLS + x1);

    // Interpolação bilinear — altura exata no ponto (localX, localZ)
    return h00 * (1 - tx) * (1 - tz)
         + h10 *      tx  * (1 - tz)
         + h01 * (1 - tx) *      tz
         + h11 *      tx  *      tz;
}

// ─── Scatter de árvores ───────────────────────────────────────────────────────

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

function addTrees(group, geo) {
    samplePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea).forEach(({ x, z }) => {
        const y = getHeightAt(geo, x, z);
        if (y <= WATER_LEVEL + 4) return;

        // Amostrar os 4 vizinhos imediatos e usar o máximo local —
        // evita que a árvore afunde em encostas íngremes onde o ponto
        // exato cai entre dois vértices com grande diferença de altura.
        const offset = plane_width / xS;  // tamanho de uma célula
        const yN  = getHeightAt(geo, x,          z - offset);
        const yS_ = getHeightAt(geo, x,          z + offset);
        const yW  = getHeightAt(geo, x - offset, z);
        const yE  = getHeightAt(geo, x + offset, z);
        const yBase = Math.max(y, yN, yS_, yW, yE);

        const tree = Math.random() < 0.5 ? createTree(x, z) : createAlternativeTree(x, z);
        tree.position.y += yBase;
        tree.traverse(child => { if (child.isMesh) child.castShadow = true; });
        group.add(tree);
    });
}

// ─── Criação de chunk ─────────────────────────────────────────────────────────

function createChunk(zOffset, seedRow = null) {
    const map   = diamondSquare(seedRow);
    const geo   = buildGeometry(map);
    const group = buildTerrainGroup(geo);
    group.add(createWaterPlane());
    group.position.z = zOffset;
    scene.add(group);
    addTrees(group, geo);
    return { group, lastRow: extractLastRow(map) };
}

// ─── Estado ───────────────────────────────────────────────────────────────────

const chunk0 = createChunk(0);
const chunk1 = createChunk(plane_height, chunk0.lastRow);
let _chunks = [chunk0, chunk1];

export let plane_array = _chunks.map(c => c.group);
export const speed = 7;

// ─── Update loop ──────────────────────────────────────────────────────────────

export function updatePlane(plane_array, speed) {
    sharedUniforms.time.value = (performance.now() - _startTime) / 1000;

    _chunks.forEach(c => { c.group.position.z -= speed; });

    if (_chunks[0].group.position.z < -plane_height) {
        scene.remove(_chunks[0].group);
        const newZ     = _chunks[1].group.position.z + plane_height;
        const newChunk = createChunk(newZ, _chunks[1].lastRow);
        _chunks.push(newChunk);
        _chunks.shift();
        plane_array.length = 0;
        _chunks.forEach(c => plane_array.push(c.group));
    }
}