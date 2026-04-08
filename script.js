import * as THREE from  'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneWired} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
scene.add(camera); // Add camera to the scene
orbit = new OrbitControls( camera, renderer.domElement ); // Enable mouse rotation, pan, zoom etc.

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

const airmaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );

// create the ground plane
let plane = createGroundPlaneWired(100, 100)
scene.add(plane);


// airplane
let airplaneGeometry = new THREE.CylinderGeometry(5, 3, 70, 32);
let airplane = new THREE.Mesh(airplaneGeometry, airmaterial);
airplane.position.set(0.0, 50.0, 0.0);
airplane.rotateX(THREE.MathUtils.degToRad(90));
airplane.rotateZ(THREE.MathUtils.degToRad(180));


let wingShape = new THREE.Shape();
wingShape.ellipse(0, 0, 45, 3.5, 0, Math.PI * 2);
let extrudeSettings = { depth: 5, bevelEnabled: false };
let wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

let wing = new THREE.Mesh(wingGeometry, airmaterial);
wing.position.set(0, 10, 0); 
wing.rotateX(THREE.MathUtils.degToRad(90));
// wing.rotateZ(THREE.MathUtils.degToRad(90));

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



// Use this to show information onscreen
let controls = new InfoBox();
  controls.add("Basic Scene");
  controls.addParagraph();
  controls.add("Use mouse to interact:");
  controls.add("* Left button to rotate");
  controls.add("* Right button to translate (pan)");
  controls.add("* Scroll to zoom in/out.");
  controls.show();

render();
function render()
{
  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}