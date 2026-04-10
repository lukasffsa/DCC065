import * as THREE from  'three';
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
// ================================ CONTADOR DE FPS  ================================ 

let scene, renderer, camera, material, light, orbit;
scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(175,207,220)");
renderer = initRenderer();    
material = setDefaultMaterial(); 
light = initDefaultBasicLight(scene); 


// ================================ Plano ================================ 
const plane_width = 1000;
const plane_height = 1000;

const grassColor = "rgb(34, 139, 34)";
const meshColor = "rgb(50, 50, 50)";
let plane = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
scene.add(plane);

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

// ================================ Avião ================================ 

// airplane
function createAirplane(){
    const airmaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );
    let airplaneGeometry = new THREE.CylinderGeometry(5, 3, 70, 32);
    let airplane = new THREE.Mesh(airplaneGeometry, airmaterial);

    airplane.position.set(0.0, 100, +400);
    airplane.rotateX(THREE.MathUtils.degToRad(90));
    airplane.rotateZ(THREE.MathUtils.degToRad(180));

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

    return airplane
}

let airplane1 = createAirplane();
scene.add(airplane1);

// ================================ Árvores ================================ 
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

// ================================ Camera ================================ 

const cameraBehind = 180;
const cameraHeigth = 90;

camera = initCamera(new THREE.Vector3(0, 100, -600)); 
camera.position.set(
    airplane1.position.x,
    airplane1.position.y + cameraHeigth,
    airplane1.position.z + cameraBehind
);
scene.add(camera); 
camera.lookAt(airplane1.position);;
orbit = new OrbitControls( camera, renderer.domElement ); 

render();
function render()
{
  stats.update();

  // plane.position.z += speed;  
  airplane1.propeller.rotation.z += 10;
  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}
