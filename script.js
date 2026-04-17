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

let scene, renderer, camera, material, light, orbit;
scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(175,207,220)");
renderer = initRenderer();    
material = setDefaultMaterial(); 
light = initDefaultBasicLight(scene); 
scene.add(light)

// =================================== CONSTANTES ==================================
// plano
const plane_width = 2000;
const plane_height = 2000;
const grassColor = "rgb(34, 139, 34)";
const meshColor = "rgb(50, 50, 50)";

// velocidade e rotacao do aviao
const alpha = 0.075;
const targetPosition = new THREE.Vector3();
const maxRoll = Math.PI / 4; 
const rotationSpeed = 0.1;

// posicao aviao
const boundMaxX = 300;
const boundMinX = -boundMaxX;

// camera
const cameraBehind = 400;
const cameraHeight = 150;
const camTiltIntensity = 1;
const camLerpSpeed = 0.05;
const maxCamOffset = 200;
// ================================================================================== 


// ================================ CONTADOR DE FPS  ================================ 
import Stats from '../build/jsm/libs/stats.module.js';
const stats = new Stats();

stats.dom.style.position = 'absolute';
stats.dom.style.top = '30px';
stats.dom.style.left = '30px';

document.body.appendChild( stats.dom );
// ================================================================================== 

// ================================ PLANO ================================ 
function createPlane(plane_width, plane_height) {
    let plane = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
    scene.add(plane);

    let plane2 = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
    scene.add(plane2);
    plane2.position.z = plane_height

    let plane_array = [plane, plane2];
    return plane_array;
}

let plane_array = createPlane(plane_width, plane_height)

const speed = 10;

function updatePlane(plane_array, speed) {
    plane_array[0].position.z -= speed;
    plane_array[1].position.z -= speed;  

    if (plane_array[0].position.z < - plane_height) {
        plane_array[0].position.z = plane_array[1].position.z + plane_height;
        plane_array.push(plane_array.shift());
    }
}

function createTree(x, z){
    // stem
    const stem_height = 20;
    const stem_radius = 5;
    let stemGeometry = new THREE.CylinderGeometry(stem_radius, stem_radius, stem_height, 32);
    const stemMaterial = new THREE.MeshBasicMaterial({color: 0x8B4513});

    let stem = new THREE.Mesh(stemGeometry, stemMaterial);

    stem.position.set(x, z, (stem_height/2));
    stem.rotateX(Math.PI / 2);

    // leaves
    const base_leaf_height = 40;

    const height_variation = (Math.random() * 10) - 5;
    const leaf_height = base_leaf_height + height_variation

    const leaf_radius = leaf_height / 2;

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

function createAlternativeTree(x, z){
  const stem_height = 40;
  const stem_radius = 3;
  
  let stemGeometry = new THREE.CylinderGeometry(stem_radius, stem_radius, stem_height, 32);
  const stemMaterial = new THREE.MeshBasicMaterial({color: 0x8B4513});

  let stem = new THREE.Mesh(stemGeometry, stemMaterial);

  stem.position.set(x, z, (stem_height/2));
  stem.rotateX(Math.PI / 2);

  const roundLeafGeometry = new THREE.SphereGeometry(20);
  let leafMaterial = new THREE.MeshBasicMaterial({color:0x228B22});

  let roundLeaf = new THREE.Mesh(roundLeafGeometry, leafMaterial)

  stem.add(roundLeaf)
  roundLeaf.translateY(stem_height / 2)

  return stem;
}

for (let i = 0; i < 30; i++) {
  const luck = Math.round(Math.random());

  const minX = -plane_width / 4
  const maxX = plane_width / 2

  const minZ = -plane_height / 4
  const maxZ = plane_height / 4

  const x = Math.random() * (maxX - minX) + minX;
  const z = Math.random() *  (maxZ - minZ) + minZ;

  let tree;
  let tree2;

  if (luck == 0) {
    tree = createTree(x, z);
    tree2 = createTree(z, x);
  }

  else {
    tree = createAlternativeTree(x, z);
    tree2 = createAlternativeTree(z, x);
  }
  
  plane_array[0].add(tree)
  plane_array[1].add(tree2)
}

// ====================================================================== 

// ================================ FOG ================================ 
const planeSize = Math.max(plane_width, plane_height);

let fogParams = {
   color: "rgb(175,207,220)",
   near: planeSize * 0.2,  // começa antes da borda
   far: planeSize * 0.4    // cobre bem a borda
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
// ==================================================================== 

// ============================= AIRPLANE ===============================
function createAirplane(){
    // constantes
    const airplaneRadius = 8;
    const airplaneLength = 100;
    const noseLength = 40;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0, 60);
    wingShape.lineTo(80, 5);
    wingShape.lineTo(80, 0);
    wingShape.lineTo(0, 0);
    const depth = 3;

    const extrudeSettings = { 
      depth: depth, 
      bevelEnabled: false 
    };

    // materiais
    const airplaneMaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );
    const redMaterial = new THREE.MeshBasicMaterial( {color: 'red'} );
    const blueMaterial = new THREE.MeshBasicMaterial( {color: 'blue'} );
    const blackMaterial = new THREE.MeshBasicMaterial( {color: 'black'} );

    // geometrias
    let airplaneGeometry = new THREE.CylinderGeometry(airplaneRadius, airplaneRadius, airplaneLength, 32);
    let airplaneNoseGeometry = new THREE.ConeGeometry(airplaneRadius, noseLength, 32);
    let pilotCabinGeometry = new THREE.CapsuleGeometry(airplaneRadius / 1.25, airplaneLength / 8, 4, 32, 1)
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    // meshes
    let airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
    let airplaneNose = new THREE.Mesh(airplaneNoseGeometry, redMaterial)
    let pilotCabin = new THREE.Mesh(pilotCabinGeometry, blackMaterial)
    let r_wing = new THREE.Mesh(wingGeometry, redMaterial);
    let l_wing = new THREE.Mesh(wingGeometry, redMaterial);
    let r_winglet = new THREE.Mesh(wingGeometry, redMaterial)
    let l_winglet = new THREE.Mesh(wingGeometry, redMaterial)

    airplane.add(airplaneNose);
    airplaneNose.position.y += (airplaneLength / 2) + (noseLength / 2);

    airplane.add(pilotCabin);
    pilotCabin.position.z -= (airplaneRadius / 1.5)

    airplane.position.set(0.0, 50, -550);
    airplane.rotateX(THREE.MathUtils.degToRad(90));  

    airplane.add(r_wing);
    r_wing.position.y -= (airplaneLength / 4);
    r_wing.position.z += depth;
    r_wing.rotateY(THREE.MathUtils.degToRad(180));

    airplane.add(l_wing);
    l_wing.position.y -= (airplaneLength / 4);

    airplane.add(r_winglet);
    r_winglet.position.y -= (airplaneLength / 2.1);
    r_winglet.scale.set(0.3, 0.3, 0.3);
    r_winglet.position.z += depth;
    r_winglet.rotateY(THREE.MathUtils.degToRad(180))

    airplane.add(l_winglet);
    l_winglet.position.y -= (airplaneLength / 2.1);
    l_winglet.scale.set(0.3, 0.3, 0.3);

    scene.add(airplane);

    const airplaneAxesHelper = new THREE.AxesHelper(100); 
    airplane.add(airplaneAxesHelper);

    return airplane
}

let airplane1 = createAirplane();

function updateAirplane() {
  updateRaycast();

  targetPosition.set(
    THREE.MathUtils.clamp(intersectionPoint.x, boundMinX, boundMaxX),
    THREE.MathUtils.clamp(intersectionPoint.y, 40, 200),
    airplane1.position.z
  );

  const deltaX = targetPosition.x - airplane1.position.x;
  const targetRoll = -(deltaX * 0.01);
  const clampedRoll = THREE.MathUtils.clamp(targetRoll, -maxRoll, maxRoll);

  airplane1.position.lerp(targetPosition, alpha);

  airplane1.rotation.y = THREE.MathUtils.lerp(
    airplane1.rotation.y, 
    clampedRoll, 
    rotationSpeed
  );
}
// ================================ CAMERA ================================ 
camera = initCamera(new THREE.Vector3(0, 100, -600)); 
camera.position.set(
    airplane1.position.x,
    airplane1.position.y + cameraHeight,
    airplane1.position.z - cameraBehind
);

// camera.position.set(0, 0, 0);
scene.add(camera); 
camera.lookAt(0,0,0);

function updateCamera() {
  let excessX = 0;
  const bound = boundMaxX * 0.8

  if (intersectionPoint.x > bound) {
    excessX = intersectionPoint.x - bound;
  } else if (intersectionPoint.x < -bound) {
    excessX = intersectionPoint.x + bound;
  }

  let targetCamX = excessX * camTiltIntensity;
  targetCamX = THREE.MathUtils.clamp(targetCamX, -maxCamOffset, maxCamOffset);

  camera.position.x = THREE.MathUtils.lerp(
    camera.position.x,
    targetCamX,
    camLerpSpeed
  );
}
// =========================================================================

// ================================ RAYCASTER ================================= 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const planeXY = new THREE.Plane(new THREE.Vector3(0, 0, 1), 550);
const intersectionPoint = new THREE.Vector3();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
})

function updateRaycast() {
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeXY, intersectionPoint);
}
// ============================================================================ 

render();
function render()
{
  stats.update();
  updatePlane(plane_array, speed);
  updateAirplane();
  updateCamera();
  
  requestAnimationFrame(render);
  renderer.render(scene, camera) 
}
