import * as THREE from "three";
import { scene, boundMaxX } from "./config.js";

const hitCounterDOM = document.createElement('div');
hitCounterDOM.style.position = 'absolute';
hitCounterDOM.style.top = '30px';

// ─── CENTRALIZAÇÃO HORIZONTAL PERFEITA ───
hitCounterDOM.style.left = '50%';
hitCounterDOM.style.transform = 'translateX(-50%)';
// ─────────────────────────────────────────
hitCounterDOM.style.backgroundColor = '#000000';
hitCounterDOM.style.padding = '20px';
hitCounterDOM.style.borderRadius ='20px';
hitCounterDOM.style.color = '#ff0000';
hitCounterDOM.style.fontFamily = 'monospace';
hitCounterDOM.style.fontSize = '24px';
hitCounterDOM.style.fontWeight = 'bold';
hitCounterDOM.style.pointerEvents = 'none';
hitCounterDOM.style.zIndex = '100';
hitCounterDOM.innerHTML = 'Tiros Sofridos: 0';

document.body.appendChild(hitCounterDOM);


function createAirplane() {
  // constantes
  const greyMaterial = new THREE.MeshPhongMaterial({
    color: "grey",
    shininess: 300,
  });
  const orangeMaterial = new THREE.MeshPhongMaterial({
    color: "orange",
    shininess: 500,
  });
  const blackMaterial = new THREE.MeshBasicMaterial({ color: "black" });
  let extrudeSettings = { depth: 5, bevelEnabled: false };

  // geometrias
  let airplaneGeometry = new THREE.CylinderGeometry(7, 2, 100, 32);
  let headGeometry = new THREE.SphereGeometry(
    7,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5,
  );
  let upWingGeometry = new THREE.TetrahedronGeometry(4, 0);
  let windowGeometry = new THREE.SphereGeometry(
    4,
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.5,
  );
  let hubGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
  let bladeGeometry = new THREE.BoxGeometry(1, 20, 0.5);

  let wingShape = new THREE.Shape();
  wingShape.ellipse(0, 0, 45, 3.5, 0, Math.PI * 2);
  let wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

  let tailShape = new THREE.Shape();
  tailShape.ellipse(0, 0, 20, 3.5, 0, Math.PI * 2);
  let tailGeometry = new THREE.ExtrudeGeometry(tailShape, extrudeSettings);
  tailGeometry.scale(0.6, 0.5, 0.6);

  // meshes
  let airplane = new THREE.Mesh(airplaneGeometry, greyMaterial);
  let head = new THREE.Mesh(headGeometry, orangeMaterial);
  const wing = new THREE.Mesh(wingGeometry, orangeMaterial);
  let tail = new THREE.Mesh(tailGeometry, orangeMaterial);
  let planeWindow = new THREE.Mesh(windowGeometry, blackMaterial);
  let upWing = new THREE.Mesh(upWingGeometry, orangeMaterial);
  let hub = new THREE.Mesh(hubGeometry, blackMaterial);
  let bladeMaterial = new THREE.MeshBasicMaterial({ color: "white" });
  let propellerGroup = new THREE.Group();

  // estrutura principal
  airplane.position.set(0.0, 100, -550);
  airplane.rotateX(THREE.MathUtils.degToRad(90));

  // asas
  wing.position.set(0, 10, 0);
  wing.rotateX(THREE.MathUtils.degToRad(90));

  // cabeça
  head.position.set(0, 50, 0);

  // cauda
  tail.position.set(0, -48, 0);
  tail.rotateX(THREE.MathUtils.degToRad(90));

  upWing.position.set(0, -49, -3);
  upWing.rotateZ(-Math.PI / 4);

  // cabine/janela
  windowGeometry.scale(1, 1, 2);
  planeWindow.position.set(0, 40, -5);
  planeWindow.rotateX(THREE.MathUtils.degToRad(-90));

  // hélices
  const hubEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hubGeometry),
    new THREE.LineBasicMaterial({ color: "black" }),
  );
  hub.add(hubEdges);

  let blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
  const blade1Edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bladeGeometry),
    new THREE.LineBasicMaterial({ color: "black" }),
  );
  blade1.add(blade1Edges);

  let blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
  const blade2Edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bladeGeometry),
    new THREE.LineBasicMaterial({ color: "black" }),
  );
  blade2.add(blade2Edges);
  blade2.rotateZ(Math.PI / 2);

  // adiciona tudo ao grupo
  propellerGroup.add(hub);
  propellerGroup.add(blade1);
  propellerGroup.add(blade2);
  propellerGroup.rotateZ(THREE.MathUtils.degToRad(90));
  propellerGroup.rotateY(THREE.MathUtils.degToRad(90));
  propellerGroup.position.set(0, 58, 0);
  airplane.propeller = propellerGroup;

  airplane.add(propellerGroup);
  airplane.add(planeWindow);
  airplane.add(tail);
  airplane.add(head);
  airplane.add(wing);
  airplane.add(upWing);
  scene.add(airplane);

  airplane.box = new THREE.Box3();
  airplane.castShadow = true;

  //================ DANO / PISCAR =================
  airplane.hits = 0;
  airplane.isHit = false;
  airplane.hit = function () {
    airplane.hits++;
    hitCounterDOM.innerHTML = `Tiros Sofridos: ${airplane.hits}`;

    if (airplane.isHit) return;
    
    airplane.isHit = true;

    const originalMaterials = [];

    airplane.traverse((obj) => {
      if (obj.isMesh) {
        originalMaterials.push({ mesh: obj, material: obj.material });
      }
    });

    let count = 0;

    const interval = setInterval(() => {
      airplane.traverse((obj) => {
        if (obj.isMesh) {
          if (count % 2 === 0) {
            obj.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          } else {
            let original = originalMaterials.find((m) => m.mesh === obj);
            obj.material = original.material;
          }
        }
      });

      count++;

      if (count > 8) {
        clearInterval(interval);
        originalMaterials.forEach((m) => {
          m.mesh.material = m.material;
        });
        airplane.isHit = false;
      }
    }, 100);
  };
  return airplane;
}

export const airplane = createAirplane();
