import * as THREE from  'three';
import GUI from '../libs/util/dat.gui.module.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
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

// camera
const cameraBehind = 400;
const cameraHeight = 150;
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
   near: planeSize * 0.05,  // começa antes da borda
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
    const greyMaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );
    const orangeMaterial = new THREE.MeshBasicMaterial({color: "orange"});
    const blackMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
    let extrudeSettings = { depth: 5, bevelEnabled: false };  


    // geometrias
    let airplaneGeometry = new THREE.CylinderGeometry(7, 2, 100, 32);
    let headGeometry = new THREE.SphereGeometry( 7, 32, 16, 0, Math.PI*2, 0, Math.PI*0.5 );
    let upWingGeometry = new THREE.TetrahedronGeometry(4,0);
    let windowGeometry = new THREE.SphereGeometry( 4, 32, 16, 0, Math.PI*2, 0, Math.PI*0.5 );
    let hubGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
    let bladeGeometry = new THREE.BoxGeometry(1, 20, 0.5);

    let wingShape = new THREE.Shape();
    wingShape.ellipse(0, 0, 45, 3.5, 0, Math.PI * 2);
    let wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    let tailShape = new THREE.Shape();
    tailShape.ellipse(0, 0, 20, 3.5, 0, Math.PI * 2);
    let tailGeometry = new THREE.ExtrudeGeometry(tailShape, extrudeSettings)
    tailGeometry.scale(0.6, 0.5, 0.6);
    
    // meshes
    let airplane = new THREE.Mesh(airplaneGeometry, greyMaterial);
    let head = new THREE.Mesh( headGeometry, orangeMaterial );
    const wing = new THREE.Mesh(wingGeometry, orangeMaterial);
    let tail = new THREE.Mesh(tailGeometry, orangeMaterial);
    let planeWindow = new THREE.Mesh( windowGeometry, blackMaterial);
    let upWing = new THREE.Mesh(upWingGeometry, orangeMaterial);
    let hub = new THREE.Mesh(hubGeometry, blackMaterial);
    let bladeMaterial = new THREE.MeshBasicMaterial({ color: 'white' });
    let propellerGroup = new THREE.Group();

    // estrutura principal
    airplane.position.set(0.0, 100, -550);
    airplane.rotateX(THREE.MathUtils.degToRad(90));

    const bodyEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(airplaneGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    airplane.add(bodyEdges);

    // asas
    wing.position.set(0, 10, 0); 
    wing.rotateX(THREE.MathUtils.degToRad(90));
    
    const wingEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(wingGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    wing.add(wingEdges);

    // cabeça
    head.position.set(0,50,0);

    const headEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(headGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    head.add(headEdges);

    // cauda
    tail.position.set(0,-48,0);
    tail.rotateX(THREE.MathUtils.degToRad(90));
    
    const tailEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(tailGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    tail.add(tailEdges);
    
    upWing.position.set(0,-49,-3)
    upWing.rotateZ(-Math.PI/4)
    
    const upWingEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(upWingGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    upWing.add(upWingEdges);

    // cabine/janela
    windowGeometry.scale(1,1,2);
    planeWindow.position.set(0,40,-5);
    planeWindow.rotateX(THREE.MathUtils.degToRad(-90));
    
    const windowEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(windowGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    planeWindow.add(windowEdges);

    // hélices
    const hubEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(hubGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    hub.add(hubEdges);


    let blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    const blade1Edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bladeGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    blade1.add(blade1Edges);

    let blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    const blade2Edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bladeGeometry),
        new THREE.LineBasicMaterial({ color: 'black' })
    );
    blade2.add(blade2Edges);
    blade2.rotateZ(Math.PI / 2);

    // adiciona tudo ao grupo
    propellerGroup.add(hub);
    propellerGroup.add(blade1);
    propellerGroup.add(blade2);
    propellerGroup.rotateZ(THREE.MathUtils.degToRad(90));
    propellerGroup.rotateY(THREE.MathUtils.degToRad(90));
    propellerGroup.position.set(0, 60, 0);
    airplane.propeller = propellerGroup;
    
    airplane.add(propellerGroup);
    airplane.add(planeWindow);
    airplane.add(tail);
    airplane.add(head);
    airplane.add(wing);
    airplane.add(upWing);
    scene.add(airplane);

    const airplaneAxesHelper = new THREE.AxesHelper(100); 
    airplane.add(airplaneAxesHelper);

    return airplane
}

let airplane = createAirplane();

function updateAirplane() {
  updateRaycast();

  targetPosition.set(
    THREE.MathUtils.clamp(intersectionPoint.x, -400, 400),
    THREE.MathUtils.clamp(intersectionPoint.y, 140, 260),
    airplane.position.z
  );

  const deltaX = targetPosition.x - airplane.position.x;
  const targetRoll = -(deltaX * 0.01);
  const clampedRoll = THREE.MathUtils.clamp(targetRoll, -maxRoll, maxRoll);

  airplane.position.lerp(targetPosition, alpha);

  airplane.rotation.y = THREE.MathUtils.lerp(
    airplane.rotation.y, 
    clampedRoll, 
    rotationSpeed
  );
}
// ================================ CAMERA ================================ 
camera = initCamera(new THREE.Vector3(0, 100, -600)); 
camera.position.set(
    airplane.position.x,
    airplane.position.y + cameraHeight,
    airplane.position.z - cameraBehind
);

// camera.position.set(0, 0, 0);
scene.add(camera); 
camera.lookAt(0,0,0);
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
  airplane.propeller.rotation.z += 10;
  updatePlane(plane_array, speed);
  updateAirplane();
  
  requestAnimationFrame(render);
  renderer.render(scene, camera) 
}