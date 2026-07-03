import * as THREE from 'three';
import { scene, plane_height, plane_width, numTreesPerPlane, minTreeDistance, treeSpawnArea } from './config.js';
import { createAlternativeTree, createTree } from './tree.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const xS = 64;
const yS = 64;
const COLS = xS + 1;
const ROWS = yS + 1;
const MAX_HEIGHT =  90;   // mais alto — picos mais dramáticos
const MIN_HEIGHT = -500;   // mais fundo — vales mais profundos

// Roughness do diamond-square (persistência da amplitude a cada subdivisão).
// Valores muito baixos (ex.: 0.05) fazem a amplitude do ruído colapsar já nas
// primeiras 1-2 subdivisões, deixando o relevo definido só pelos vértices
// grosseiros iniciais — sem ruído fino para suavizar as junções entre eles,
// o que produz o aspecto "facetado"/blocado com arestas abruptas.
// 0.55 mantém detalhe em várias escalas (grosseira + média + fina), gerando
// um relevo com transições orgânicas mesmo mantendo a mesma amplitude total.
const ROUGHNESS = 0.55;

// Quantas passadas de blur gaussiano 5×5 aplicar no final. Cada passada extra
// remove ruído de alta frequência (o "serrilhado" fino) preservando as
// ondulações de média/grande escala — é isso que dá a sensação de "montanha
// suave" em vez de "rocha facetada", sem achatar os picos e vales.
const SMOOTH_PASSES = 3;

// Quantas linhas, a partir da costura entre chunks, recebem um blend com a
// extrapolação da inclinação do chunk anterior (feathering). Isso garante
// não só que a altura bata exatamente na borda (como já acontecia), mas que
// a inclinação também seja contínua, eliminando a "dobra" visível na costura.
const SEAM_FEATHER_ROWS = 10;

// Quantos chunks ficam carregados e visíveis simultaneamente à frente da
// câmera. Com apenas 2 (valor antigo), o próximo chunk só existia quando o
// mais antigo já estava quase saindo de cena — na prática só havia um chunk
// realmente à frente em boa parte do tempo, o que limitava a sensação de
// profundidade/movimento e fazia o terreno seguinte "aparecer" de repente
// saindo da neblina. Com mais chunks encadeados (mesma costura suave), há
// sempre um trecho bem maior de terreno real carregado à frente.
const NUM_ACTIVE_CHUNKS = 5;

export const WATER_LEVEL = -400;

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
    varying vec2  vWorldXZ;

    void main() {
        vHeight     = position.y;
        vNormal     = normalize(normal);
        vNormalView = normalize(normalMatrix * normal);
        vObjXZ      = position.xz;

        // Posição no mundo (XZ) — usada para a fog baseada em distância
        // horizontal até a câmera, em vez de distância 3D completa.
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldXZ = worldPosition.xz;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const terrainFragmentShader = /* glsl */ `
    varying float vHeight;
    varying vec3  vNormal;
    varying vec3  vNormalView;
    varying vec2  vObjXZ;
    varying vec2  vWorldXZ;

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

        // Fog baseada em distância HORIZONTAL (XZ) até a câmera, não em
        // distância 3D completa. A versão anterior (length(mvPosition.xyz))
        // incluía a diferença de altura entre vértice e câmera — como a
        // câmera é elevada, picos altos "ganhavam" distância extra só por
        // subirem em direção à altura da câmera, fazendo a neblina se colar
        // especificamente nas encostas mais altas (a "parede" visível).
        // Distância horizontal ignora a elevação do relevo e dá uma neblina
        // uniforme, baseada só em quão longe o terreno está no plano do chão.
        float fogDist   = length(vWorldXZ - cameraPosition.xz);
        float fogFactor = clamp((fogDist - fogNear) / max(fogFar - fogNear, 0.001), 0.0, 1.0);
        col = mix(col, skyColor, fogFactor);

        gl_FragColor = vec4(col, 1.0);
    }
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

        // Fog baseada em distância horizontal (XZ) até a câmera — mesma
        // lógica do terreno, evita qualquer viés de altura/ondulação da água.
        float fogDist   = length(vWorldPos.xz - cameraPosition.xz);
        float fogFactor = clamp((fogDist - fogNear) / max(fogFar - fogNear, 0.001), 0.0, 1.0);
        col = mix(col, skyColor, fogFactor);

        gl_FragColor = vec4(col, alpha);
    }
`;

// ─── Blur gaussiano 5×5 (uma passada) ────────────────────────────────────────
// Extraído para função separada para poder ser aplicado múltiplas vezes —
// múltiplas passadas de um kernel pequeno aproximam um kernel maior e mais
// suave, removendo o ruído de alta frequência responsável pelo aspecto
// "facetado" sem achatar as ondulações de média/grande escala.

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

// ─── Diamond-Square ───────────────────────────────────────────────────────────
// seedRow:  última linha do chunk anterior — garante altura idêntica na costura.
// seedRow2: penúltima linha do chunk anterior — usada para extrapolar a
//           inclinação e alimentar o feathering, garantindo que a costura
//           também seja suave em derivada (sem "dobra" visível).

function diamondSquare(seedRow = null, seedRow2 = null) {
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

    // Múltiplas passadas de blur gaussiano 5×5 — elimina o serrilhado fino
    // (arestas abruptas) preservando picos e vales de maior escala.
    let smoothed = map;
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
        smoothed = gaussianBlurPass(smoothed, N);
    }
    smoothed.forEach((v, i) => { map[i] = v; });

    // Re-fixar seedRow após o blur: o kernel com padding espelhado altera
    // levemente os vértices da linha 0, fazendo a borda do chunk divergir do
    // seedRow que o chunk anterior exportou. Sobrescrever aqui garante
    // costura com altura idêntica, independente do kernel.
    if (seedRow) {
        for (let x = 0; x < N; x++) map[x] = seedRow[x];

        // Feathering da costura: além de bater a altura na linha 0, as
        // próximas SEAM_FEATHER_ROWS linhas são misturadas com a extrapolação
        // linear da inclinação que o chunk anterior tinha ao chegar na borda
        // (seedRow - seedRow2 = tendência). Isso garante continuidade também
        // na derivada, eliminando a "dobra"/crista visível na transição entre
        // planos. O peso decai suavemente, então o relevo volta a ser
        // totalmente independente (variado) longe da costura.
        if (seedRow2) {
            const trend = new Float32Array(N);
            for (let x = 0; x < N; x++) trend[x] = seedRow[x] - seedRow2[x];

            const K = Math.min(SEAM_FEATHER_ROWS, N - 1);
            for (let row = 1; row <= K; row++) {
                const t      = row / (K + 1);
                const weight = (1 - t) * (1 - t); // decaimento quadrático suave
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

// ─── Extrai uma linha do heightmap ───────────────────────────────────────────

function extractRow(map, rowIndex) {
    const row = new Float32Array(COLS);
    for (let x = 0; x < COLS; x++) row[x] = map[rowIndex * COLS + x];
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

// fogNear/fogFar agora são calculados em função de plane_height (em vez de
// valores fixos pensados para um mundo de 2 chunks). Com NUM_ACTIVE_CHUNKS
// chunks carregados, a neblina pode se estender por mais de um chunk de
// distância — aumentando a sensação de escala do cenário — mas ainda
// termina com folga antes do último chunk carregado, então o jogador nunca
// vê o "pop" de um chunk sendo criado na borda da névoa.
export const fogUniforms = {
    skyColor: { value: SKY_COLOR },
    fogNear:  { value: plane_height * 1.5 },   // início da névoa bem além de 1 chunk
    fogFar:   { value: plane_height * 2.6 },   // cobertura ampla, ainda dentro da área carregada
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

// Pequeno "encaixe" vertical: a base da árvore fica ligeiramente abaixo da
// altura exata da malha, garantindo que nunca haja um gap visível (flutuando)
// mesmo com pequenas imprecisões do modelo 3D — sem enterrar o tronco.
const TREE_EMBED = 0.6;

function addTrees(group, geo) {
    samplePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea).forEach(({ x, z }) => {
        const y = getHeightAt(geo, x, z);
        if (y <= WATER_LEVEL + 4) return;

        // Altura exata no ponto onde a árvore será plantada — a mesma usada
        // pela malha visual, então a base do tronco coincide com a superfície.
        // (O terreno agora é suave o bastante para que amostrar vizinhos e
        // usar o máximo, como antes, não seja mais necessário — aquela
        // abordagem overcorrigia e fazia as árvores flutuarem em encostas.)
        const tree = Math.random() < 0.5 ? createTree(x, z) : createAlternativeTree(x, z);
        tree.position.y += y - TREE_EMBED;
        tree.traverse(child => { if (child.isMesh) child.castShadow = true; });
        group.add(tree);
    });
}

// ─── Criação de chunk ─────────────────────────────────────────────────────────

function createChunk(zOffset, seedRow = null, seedRow2 = null) {
    const map   = diamondSquare(seedRow, seedRow2);
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

// ─── Estado ───────────────────────────────────────────────────────────────────
// Cria a cadeia inicial de NUM_ACTIVE_CHUNKS chunks, cada um encadeado ao
// anterior via seedRow/seedRow2 (mesma costura suave usada na reposição em
// runtime), então a cadeia inteira já nasce sem "dobras" nas junções.

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

// ─── Update loop ──────────────────────────────────────────────────────────────

export function updatePlane(plane_array, speed) {
    sharedUniforms.time.value = (performance.now() - _startTime) / 1000;

    _chunks.forEach(c => { c.group.position.z -= speed; });

    if (_chunks[0].group.position.z < -plane_height) {
        scene.remove(_chunks[0].group);

        // O novo chunk sempre continua a partir do chunk mais à frente da
        // cadeia atual (o último do array), não de uma posição fixa — assim
        // o número de chunks ativos permanece constante em NUM_ACTIVE_CHUNKS
        // independente de quantos existirem.
        const frontChunk = _chunks[_chunks.length - 1];
        const newZ        = frontChunk.group.position.z + plane_height;
        const newChunk     = createChunk(newZ, frontChunk.lastRow, frontChunk.secondLastRow);

        _chunks.push(newChunk);
        _chunks.shift();
        plane_array.length = 0;
        _chunks.forEach(c => plane_array.push(c.group));
    }
}