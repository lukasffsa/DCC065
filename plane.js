import * as THREE from  'three';
import { createGroundPlaneWired } from "../libs/util/util.js";
import { grassColor, meshColor, scene, plane_height, plane_width, numTreesPerPlane, minTreeDistance, treeSpawnArea } from './config.js'
import { createAlternativeTree, createTree } from './tree.js';

function createPlane(plane_width, plane_height) {
    let plane = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
    scene.add(plane);

    let plane2 = createGroundPlaneWired(plane_width, plane_height, 10, 10, 3, grassColor, meshColor);
    scene.add(plane2);
    plane2.position.z = plane_height

    let plane_array = [plane, plane2];
    return plane_array;
}

export let plane_array = createPlane(plane_width, plane_height)

export const speed = 7;

export function updatePlane(plane_array, speed) {
    plane_array[0].position.z -= speed;
    plane_array[1].position.z -= speed;  

    if (plane_array[0].position.z < - plane_height) {
        plane_array[0].position.z = plane_array[1].position.z + plane_height;
        plane_array.push(plane_array.shift());
    }
}

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
