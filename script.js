import * as THREE from  'three';
import GUI from '../libs/util/dat.gui.module.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        createGroundPlaneWired} from "../libs/util/util.js";

let scene, renderer, camera, light;
scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(175,207,220)");
renderer = initRenderer();    
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
const rotationSpeed = 1;
const boundMaxX = 300;

// camera
const cameraBehind = 400;
const cameraHeight = 180;
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

const speed = 7;

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
    const stemMaterial = new THREE.MeshPhongMaterial({color: 0x8B4513,   shininess: 300} );

    let stem = new THREE.Mesh(stemGeometry, stemMaterial);

    stem.position.set(x, z, (stem_height/2));
    stem.rotateX(Math.PI / 2);

    // leaves
    const base_leaf_height = 40;

    const height_variation = (Math.random() * 10) - 5;
    const leaf_height = base_leaf_height + height_variation

    const leaf_radius = leaf_height / 2;

    let leafGeometry = new THREE.ConeGeometry(leaf_radius, leaf_height, 32);
    let leafMaterial = new THREE.MeshPhongMaterial({color:0x228B22 ,  shininess: 300} );

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
  const stemMaterial = new THREE.MeshPhongMaterial({color: 0x8B4513, shininess: 300});

  let stem = new THREE.Mesh(stemGeometry, stemMaterial);

  stem.position.set(x, z, (stem_height/2));
  stem.rotateX(Math.PI / 2);

  const roundLeafGeometry = new THREE.SphereGeometry(20);
  let leafMaterial = new THREE.MeshPhongMaterial({color:0x228B22 ,  shininess: 10});

  let roundLeaf = new THREE.Mesh(roundLeafGeometry, leafMaterial)

  stem.add(roundLeaf)
  roundLeaf.translateY(stem_height / 2)

  return stem;
}

const numTreesPerPlane = 150;
const minTreeDistance = 100;
const treeSpawnArea = {
  minX: -700,
  maxX: 700,
  minZ: -plane_height / 2,
  maxZ: plane_height / 2
};

function sampleTreePositions(count, minDistance, area) {
  const positions = [];
  const maxAttempts = count * 200;
  let attempts = 0;

  while (positions.length < count && attempts < maxAttempts) {
    const x = Math.random() * (area.maxX - area.minX) + area.minX;
    const z = Math.random() * (area.maxZ - area.minZ) + area.minZ;

    const tooClose = positions.some(p => {
      const dx = x - p.x;
      const dz = z - p.z;
      return (dx * dx + dz * dz) < (minDistance * minDistance);
    });

    if (!tooClose) {
      positions.push({ x, z });
    }

    attempts++;
  }

  return positions;
}

const plane1TreePositions = sampleTreePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea);
const plane2TreePositions = sampleTreePositions(numTreesPerPlane, minTreeDistance, treeSpawnArea);

plane1TreePositions.forEach(position => {
  const tree = Math.random() < 0.5
    ? createTree(position.x, position.z)
    : createAlternativeTree(position.x, position.z);
  plane_array[0].add(tree);
});

plane2TreePositions.forEach(position => {
  const tree = Math.random() < 0.5
    ? createTree(position.x, position.z)
    : createAlternativeTree(position.x, position.z);
  plane_array[1].add(tree);
});

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
    const greyMaterial = new THREE.MeshPhongMaterial( { color: 'grey', shininess: 300 } );
    const orangeMaterial = new THREE.MeshPhongMaterial({color: "orange", shininess: 500});
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

    // asas
    wing.position.set(0, 10, 0); 
    wing.rotateX(THREE.MathUtils.degToRad(90));    

    // cabeça
    head.position.set(0,50,0);

    // cauda
    tail.position.set(0,-48,0);
    tail.rotateX(THREE.MathUtils.degToRad(90));
    
    upWing.position.set(0,-49,-3)
    upWing.rotateZ(-Math.PI/4)
    
    // cabine/janela
    windowGeometry.scale(1,1,2);
    planeWindow.position.set(0,40,-5);
    planeWindow.rotateX(THREE.MathUtils.degToRad(-90));
    
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


    return airplane
}

let airplane = createAirplane();

function updateAirplane() {
  updateRaycast();

  targetPosition.set(
    THREE.MathUtils.clamp(intersectionPoint.x, -boundMaxX, boundMaxX),
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

// ===========================================================================

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
  updateCamera();

  requestAnimationFrame(render);
  renderer.render(scene, camera) 
}