import * as THREE from  'three';
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
// ================================ CONTADOR DE FPS  ================================ 

let scene, renderer, camera, material, light, orbit; 
scene = new THREE.Scene();    
renderer = initRenderer();    
material = setDefaultMaterial(); 
light = initDefaultBasicLight(scene); 
camera = initCamera(new THREE.Vector3(0, 100, -600)); 
scene.add(camera); 
camera.lookAt(0, 100, 0);
orbit = new OrbitControls( camera, renderer.domElement ); 

// ================================ FOG  ================================ 
scene.fog = new THREE.Fog( 0xcccccc, 300, 700)
// ================================ FOG  ================================ 

// visualização de eixos (comentar tudo depois)
const axesHelper = new THREE.AxesHelper(100); 
scene.add(axesHelper);

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

// ================================ Plano  ================================ 
const plane_width = 1000;
const plane_height = 1000;

const grassColor = "rgb(34, 139, 34)";
const meshColor = "rgb(50, 50, 50)";
let plane = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
scene.add(plane);
// ================================ Avião  ================================ 

// airplane
function createAirplane(){
    const airmaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );
    let airplaneGeometry = new THREE.CylinderGeometry(5, 3, 70, 32);
    let airplane = new THREE.Mesh(airplaneGeometry, airmaterial);

    airplane.position.set(0.0, 50.0, +400);
    airplane.rotateX(THREE.MathUtils.degToRad(90));
    airplane.rotateZ(THREE.MathUtils.degToRad(180));

    let wingShape = new THREE.Shape();
    wingShape.ellipse(0, 0, 45, 3.5, 0, Math.PI * 2);
    let extrudeSettings = { depth: 5, bevelEnabled: false };
    let wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    let wing = new THREE.Mesh(wingGeometry, airmaterial);
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

    airplane.add(planeWindow);
    airplane.add(tail);
    airplane.add(necklace);
    airplane.add(head);
    airplane.add(wing);
    scene.add(airplane);

    return airplane
}

let airplane1 = createAirplane();
scene.add(airplane1);

// ================================ Árvores  ================================ 
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

// ================================ Cenário  ================================ 

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
let controls = new InfoBox();
  controls.add("Basic Scene");
  controls.addParagraph();
  controls.add("Use mouse to interact:");
  controls.add("* Left button to rotate");
  controls.add("* Right button to translate (pan)");
  controls.add("* Scroll to zoom in/out.");
  controls.show();

const speed = -1.0;

render();
function render()
{
  stats.update();

  // plane.position.z += speed;  

  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}
