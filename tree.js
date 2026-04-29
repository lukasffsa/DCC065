import * as THREE from  'three';
import { stem_height, stem_radius } from './config.js'

export function createTree(x, z){
    // stem

    let stemGeometry = new THREE.CylinderGeometry(stem_radius, stem_radius, stem_height, 32);
    const stemMaterial = new THREE.MeshPhongMaterial({color: 0x8B4513,   shininess: 300} );

    let stem = new THREE.Mesh(stemGeometry, stemMaterial);

    stem.position.set(x, z, (stem_height/2));
    stem.rotateX(Math.PI / 2);

    // leaves
    const base_leaf_height = 40;

    const height_variation = (Math.random() * 28) - 5;
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

export function createAlternativeTree(x, z){
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
