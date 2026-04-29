import * as THREE from  'three';
import {onWindowResize} from "../libs/util/util.js";
import { initDefaultBasicLight} from "../libs/util/util.js";
import { airplane } from './airplane.js'
import { scene, renderer } from './config.js';
import { updateAirplane } from './raycast.js'
import { updateCamera, camera } from './camera.js'
import { updatePlane, plane_array, speed } from './plane.js'
import { buildInterface, stats } from './fog.js';


window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

let light = initDefaultBasicLight(scene); 
scene.add(light)

buildInterface();
render();

function render() {
  
  stats.update();
  airplane.propeller.rotation.z += 10;
  updatePlane(plane_array, speed);
  updateAirplane();
  updateCamera();

  requestAnimationFrame(render);
  renderer.render(scene, camera) 
}