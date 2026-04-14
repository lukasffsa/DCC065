import * as THREE from  'three';
import { FlyControls } from '../build/jsm/controls/FlyControls.js';
import GUI from '../libs/util/dat.gui.module.js';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneWired} from "../libs/util/util.js";

// ================================ CONTADOR DE FPS  ================================ 
import Stats from '../build/jsm/libs/stats.module.js';
const stats = new Stats();

// isso é pra não ficar pra fora da tela 
stats.dom.style.position = 'absolute';
stats.dom.style.top = '30px';
stats.dom.style.left = '30px';

// pra não ter que mexer com o html
document.body.appendChild( stats.dom );
// ================================ INICIANDO VARIÁVEIS  ================================ 

let scene, renderer, camera, material, light, orbit;
scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(175,207,220)");
renderer = initRenderer();    
material = setDefaultMaterial(); 
light = initDefaultBasicLight(scene); 
scene.add(light)

// ================================ Plano ================================ 
const plane_width = 2000;
const plane_height = 2000;

const grassColor = "rgb(34, 139, 34)";
const red = "rgb(255, 0, 0)";
const meshColor = "rgb(50, 50, 50)";

let plane = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
scene.add(plane);

let plane2 = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, red, meshColor);
scene.add(plane2);
plane2.position.z = plane_height
// ================================ AJUSTE DE FOG  ================================ 

const planeSize = Math.max(plane_width, plane_height);

// parâmetros iniciais estratégicos
let fogParams = {
   color: "rgb(175,207,220)",
   near: planeSize * 0.3,  // começa antes da borda
   far: planeSize * 0.8    // cobre bem a borda
};

scene.fog = new THREE.Fog(fogParams.color, fogParams.near, fogParams.far);

function buildInterface() {
   var gui = new GUI();


   gui.add(fogParams, 'near', 0, 800)
      .name("Fog Near")
      .onChange(function(value) {
         scene.fog.near = value;
      });

}

buildInterface();

// // pra não ter que mexer com o html
// document.body.appendChild( statsFog.dom );
// scene.fog = new THREE.Fog( 0xcccccc, 700, 1000);

// visualização de eixos (comentar tudo depois)
const axesHelper = new THREE.AxesHelper(100); 
scene.add(axesHelper);

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

// ================================ AVIÃO ================================ 

function createAirplane(){
    const airmaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );
    let airplaneGeometry = new THREE.CylinderGeometry(5, 3, 70, 32);
    let airplane = new THREE.Mesh(airplaneGeometry, airmaterial);

    airplane.position.set(0.0, 100, -800);
    airplane.rotateX(THREE.MathUtils.degToRad(90));

    let wingMaterial = new THREE.MeshBasicMaterial({color: "orange"});
    let wingShape = new THREE.Shape();
    wingShape.ellipse(0, 0, 45, 3.5, 0, Math.PI * 2);
    let extrudeSettings = { depth: 5, bevelEnabled: false };
    let wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(0, 10, 0); 
    wing.rotateX(THREE.MathUtils.degToRad(90));

    let headGeometry = new THREE.SphereGeometry( 5, 32, 16, 0, Math.PI*2, 0, Math.PI*0.5 );
    let headMaterial = new THREE.MeshBasicMaterial( { color: 'orange' } );
    let head = new THREE.Mesh( headGeometry, headMaterial );
    head.position.set(0,35,0);

    let tailGeometry = new THREE.ConeGeometry( 5, 20, 32 );
    let necklace = new THREE.Mesh(tailGeometry, headMaterial );
    necklace.position.set(0,-10,0);
    let tail = new THREE.Mesh(tailGeometry, headMaterial );
    tail.position.set(0,-35,0);

    let windowGeometry = new THREE.SphereGeometry( 3, 32, 16, 0, Math.PI*2, 0, Math.PI*0.5 );
    windowGeometry.scale(1,1,2);
    let windowMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
    let planeWindow = new THREE.Mesh( windowGeometry, windowMaterial );
    planeWindow.position.set(0,28,-3);
    planeWindow.rotateX(THREE.MathUtils.degToRad(-90));

    let propellerGroup = new THREE.Group();

    // eixo central
    let hubGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
    let hubMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
    let hub = new THREE.Mesh(hubGeometry, hubMaterial);

    // pá da hélice
    let bladeGeometry = new THREE.BoxGeometry(1, 20, 0.5);
    let bladeMaterial = new THREE.MeshBasicMaterial({ color: 'white' });

    // primeira pá
    let blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);

    // segunda pá (cruzada)
    let blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotateZ(Math.PI / 2);

    // adiciona tudo ao grupo
    propellerGroup.add(hub);
    propellerGroup.add(blade1);
    propellerGroup.add(blade2);
    propellerGroup.rotateZ(THREE.MathUtils.degToRad(90));
    propellerGroup.rotateY(THREE.MathUtils.degToRad(90));
    propellerGroup.position.set(0, 41, 0);
    airplane.propeller = propellerGroup;
    
    airplane.add(propellerGroup);
    airplane.add(planeWindow);
    airplane.add(tail);
    airplane.add(necklace);
    airplane.add(head);
    airplane.add(wing);
    scene.add(airplane);

    const airplaneAxesHelper = new THREE.AxesHelper(100); 
    airplane.add(airplaneAxesHelper);

    return airplane
}

let airplane1 = createAirplane();
scene.add(airplane1);

// ================================ ÁRVORES ================================ 
function createTree(x, z){
    // stem
    const stem_height = 10;
    const stem_radius = 2;
    let stemGeometry = new THREE.CylinderGeometry(stem_radius, stem_radius, stem_height, 32);
    const stemMaterial = new THREE.MeshBasicMaterial({color: 0x8B4513});

    let stem = new THREE.Mesh(stemGeometry, stemMaterial);

    stem.position.set(x, z, (stem_height/2));
    stem.rotateX(Math.PI / 2);

    // leaves
    const base_leaf_height = 15;

    const height_variation = (Math.random() * 10) - 5;
    const leaf_height = base_leaf_height + height_variation

    const leaf_radius = leaf_height / 3;

    let leafGeometry = new THREE.ConeGeometry(leaf_radius, leaf_height, 32);
    let leafMaterial = new THREE.MeshBasicMaterial({color:0x228B22});

    let leaf1 = new THREE.Mesh(leafGeometry, leafMaterial);

    let leaf2 = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf2.scale.set(0.9, 1, 0.9);

    let leaf3 = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf3.scale.set(0.8, 1, 0.8);

    stem.add(leaf1);
    leaf1.position.y = (stem_height/2) + (leaf_height/2) - 3;

    leaf1.add(leaf2);
    leaf2.position.y = (leaf_height/2) - 1;

    leaf2.add(leaf3);
    leaf3.position.y = (leaf_height/2) - 1;

    return stem
}

// ================================ CENÁRIO  ================================ 

for (let i = 0; i < 12; i++) {
    const minX = -plane_width / 2
    const maxX = plane_width / 2

    const minZ = -plane_height / 2
    const maxZ = plane_height / 2

    const x = Math.random() * (maxX - minX) + minX;
    const z = Math.random() *  (maxZ - minZ) + minZ;

    const tree = createTree(x, z);
    
    plane.add(tree)
}

// Use this to show information onscreen
// let controls = new InfoBox();
//   controls.add("Basic Scene");
//   controls.addParagraph();
//   controls.add("Use mouse to interact:");
//   controls.add("* Left button to rotate");
//   controls.add("* Right button to translate (pan)");
//   controls.add("* Scroll to zoom in/out.");
//   controls.show();

const speed = 5.0;

// ================================ CAMERA ================================ 

const cameraBehind = 210;
const cameraHeigth = 90;

let plane_array = [plane, plane2];

camera = initCamera(new THREE.Vector3(0, 100, -600)); 
camera.position.set(
    airplane1.position.x,
    airplane1.position.y + cameraHeigth,
    airplane1.position.z - cameraBehind
);
scene.add(camera); 
camera.lookAt(0,0,0);

// ================================ MOVIMENTO DO AVIÃO ================================ 

var flyCamera = new FlyControls( airplane1, renderer.domElement );

  flyCamera.movementSpeed = 10
  flyCamera.domElement = renderer.domElement;
  flyCamera.rollSpeed = -20;
  flyCamera.autoForward = true;
  flyCamera.dragToLook = false;
  const clock = new THREE.Clock();

// Obter coordenadas do mouse
let mouse = new THREE.Vector2();
let prevMouse = new THREE.Vector2();
let stationaryFrames = 0;
const stationaryThreshold = 3;

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    stationaryFrames = 0;
});

const raycaster = new THREE.Raycaster();

// plano horizontal (altura do avião)
const planeY = airplane1.position.y;
const movementPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);

const lerpConfig = {
    destination: new THREE.Vector3(mouse.x, airplane1.position.y ,airplane1.position.z),
    alpha: 0.1,
    move: true
  }

function updateMove() {
    let delta = clock.getDelta();

    // ================= ALVO =================
    raycaster.setFromCamera(mouse, camera);

    let targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(movementPlane, targetPoint);

    if (!targetPoint) return;

    if (mouse.equals(prevMouse)) {
        stationaryFrames++;
    } else {
        stationaryFrames = 0;
    }
    prevMouse.copy(mouse);

    // se o mouse está sobre o avião, não atualiza yaw/roll
    let intersectsAirplane = raycaster.intersectObject(airplane1, true);
    if (intersectsAirplane.length > 0) {
        lerpConfig.destination.copy(targetPoint);
        if (stationaryFrames >= stationaryThreshold) {
            airplane1.rotation.y = THREE.MathUtils.lerp(airplane1.rotation.y, 0, 0.08);
            airplane1.rotation.z = THREE.MathUtils.lerp(airplane1.rotation.z, 0, 0.08);
            lerpConfig.destination.copy(airplane1.position);
        }
        return;
    }

    // ================= DIREÇÃO (MUNDO) =================
    let direction = targetPoint.clone().sub(airplane1.position);

    // ================= YAW (somente eixo Y) =================
    let targetAngle = Math.atan2(-direction.x, direction.z);

    // suavização (menos sensível a pequenos movimentos do mouse)
    let currentAngle = airplane1.rotation.y;
    airplane1.rotation.y += (targetAngle - currentAngle) * 0.02;

    // ================= ESPAÇO LOCAL =================
    let localTarget = airplane1.worldToLocal(targetPoint.clone());

    // ================= ROLL (somente eixo Z) =================
    let maxRoll = Math.PI / 10; // 15 graus
    let rollSensitivity = 0.0005;
    let deadZone = 10;
    let targetRoll = 0;

    if (Math.abs(localTarget.x) > deadZone) {
        targetRoll = THREE.MathUtils.clamp(-localTarget.x * rollSensitivity, -maxRoll, maxRoll);
    }

    // suavização do roll e retorno gradual à posição neutra
    airplane1.rotation.z = THREE.MathUtils.lerp(airplane1.rotation.z, -targetRoll, 1);

    if (targetPoint) {
        lerpConfig.destination.copy(targetPoint);
    }
}

 // ================================ RENDERER ================================  

render();
function render()
{
  stats.update();
  plane_array[0].position.z -= speed;
  plane_array[1].position.z -= speed;  

  if (plane_array[0].position.z < - plane_height) {
    plane_array[0].position.z = plane_array[1].position.z + plane_height;
    plane_array.push(plane_array.shift());
  }
  updateMove();
  
  airplane1.propeller.rotation.z += 10;

  airplane1.position.lerp(lerpConfig.destination, lerpConfig.alpha);
  airplane1.position.z = -800;
  airplane1.position.y = 100;

  if (airplane1.position.x >= 200){
    airplane1.position.x = 200;
  }
  else if (airplane1.position.x <= -200){
    airplane1.position.x = -200;
  }
  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}
