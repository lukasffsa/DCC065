import * as THREE from  'three';
import { initRenderer } from '../libs/util/util.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color("rgb(175,207,220)");

export let renderer = initRenderer()

export const plane_width = 2000;
export const plane_height = 2000;
export const grassColor = "rgb(34, 139, 34)";
export const meshColor = "rgb(50, 50, 50)";

// velocidade e rotacao do aviao
export const alpha = 0.075;
export const targetPosition = new THREE.Vector3();
export const maxRoll = Math.PI / 4; 
export const rotationSpeed = 1;
export const boundMaxX = 300;

// camera
export const cameraBehind = 400;
export const cameraHeight = 180;
export const camTiltIntensity = 1;
export const camLerpSpeed = 0.05;
export const maxCamOffset = 200;

// raycaster
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();
export const planeXY = new THREE.Plane(new THREE.Vector3(0, 0, 1), 550);
export const intersectionPoint = new THREE.Vector3();

// arvore
export const stem_height = 20;
export const stem_radius = 5;
export const numTreesPerPlane = 150;
export const minTreeDistance = 100;
export const treeSpawnArea = {
  minX: -700,
  maxX: 700,
  minZ: -plane_height / 2,
  maxZ: plane_height / 2
};