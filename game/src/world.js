// Archipelago world rendering: terrain mesh, runways, PAPI, rings, lighthouse.
// Height/frame math lives in geo.js (shared with the node sim).
import * as THREE from 'three';
import { AIRPORTS } from './config.js';
import { heightAt } from './geo.js';
export { surfaceAt } from './geo.js';

function box(w, h, d, color, rough = 0.8, metal = 0.05) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

export function buildWorld(scene) {
  scene.fog = new THREE.FogExp2(0xc7d8e2, 0.00016);
  const hemi = new THREE.HemisphereLight(0xd8ecff, 0x3d5a4a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.5);
  sun.position.set(-5000, 6500, -3500);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.3);
  fill.position.set(4000, 2600, 3000);
  scene.add(fill);
  // Sky dome
  const skyGeo = new THREE.SphereGeometry(26000, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x3f7fbf) }, mid: { value: new THREE.Color(0xa8c8e0) }, bot: { value: new THREE.Color(0xf2d9b0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;' +
      'void main(){ float h = normalize(vP).y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.65, h)) : mix(bot, mid, smoothstep(-0.08, 0.12, h)); gl_FragColor = vec4(c, 1.0); }'
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Terrain
  const W = 13500, D = 9800, SX = 190, SZ = 140;
  const tg = new THREE.PlaneGeometry(W, D, SX, SZ);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0xd9c491), cGrass = new THREE.Color(0x4d8a4f),
    cForest = new THREE.Color(0x2f6b3a), cRock = new THREE.Color(0x8a7a6c),
    cAsh = new THREE.Color(0x5d5148), cSea = new THREE.Color(0x1d6a8a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 1600, z = pos.getZ(i) - 800;
    pos.setX(i, x); pos.setZ(i, z);
    const h = heightAt(x, z);
    pos.setY(i, h);
    if (h < 1.5) tmp.copy(cSea).lerp(cSand, Math.max(0, (h + 3) / 4.5));
    else if (h < 4.5) tmp.copy(cSand);
    else if (h < 70) tmp.copy(cGrass).lerp(cForest, Math.min(1, h / 80));
    else if (h < 150) tmp.copy(cRock).lerp(cForest, 0.25);
    else tmp.copy(cAsh);
    const jitter = 0.92 + ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.16;
    colors[i * 3] = tmp.r * jitter; colors[i * 3 + 1] = tmp.g * jitter; colors[i * 3 + 2] = tmp.b * jitter;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  scene.add(terrain);
  // Ocean sheen plane
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000),
    new THREE.MeshStandardMaterial({ color: 0x14607a, roughness: 0.22, metalness: 0.4, transparent: true, opacity: 0.86 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = 0.4;
  scene.add(ocean);

  const world = { papi: {}, rings: [], blinkers: [] };

  // Runways + PAPI
  for (const ap of AIRPORTS) {
    const g = new THREE.Group();
    const strip = box(ap.length, 0.3, ap.width, 0x33373c, 0.95);
    strip.position.set(ap.x, ap.elev + 0.15, ap.z);
    strip.rotation.y = Math.PI / 2 - ap.axis; // box length (x) onto the runway axis
    g.add(strip);
    // centreline dashes + threshold bars in runway-local space
    const local = new THREE.Group();
    local.position.set(ap.x, ap.elev + 0.34, ap.z);
    local.rotation.y = Math.PI / 2 - ap.axis;
    for (let d = -ap.length / 2 + 60; d < ap.length / 2 - 40; d += 60) {
      const dash = box(16, 0.06, 1.6, 0xf5f5f0, 0.9);
      dash.position.set(d, 0, 0);
      local.add(dash);
    }
    for (const endSign of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        const bar = box(10, 0.06, 2.4, 0xf5f5f0, 0.9);
        bar.position.set(endSign * (ap.length / 2 - 14), 0, i * 5.4);
        local.add(bar);
      }
    }
    g.add(local);
    // edge lights
    const lightGeo = new THREE.SphereGeometry(0.7, 6, 5);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (let d = -ap.length / 2; d <= ap.length / 2; d += 95) {
      for (const s of [-1, 1]) {
        const l = new THREE.Mesh(lightGeo, lightMat);
        const lx = ap.x + Math.sin(ap.axis) * d + Math.cos(ap.axis) * s * (ap.width / 2 + 3);
        const lz = ap.z - Math.cos(ap.axis) * d + Math.sin(ap.axis) * s * (ap.width / 2 + 3);
        l.position.set(lx, ap.elev + 0.8, lz);
        g.add(l);
      }
    }
    // PAPI: 4 units left of the landing threshold
    const dx = Math.sin(ap.landHeading), dz = -Math.cos(ap.landHeading);
    const tx = ap.x - dx * ap.length / 2, tz = ap.z - dz * ap.length / 2;
    const px = -dz, pz = dx; // left of approach direction
    const units = [];
    for (let i = 0; i < 4; i++) {
      const u = box(1.6, 1.0, 1.0, 0xffffff, 0.6);
      u.position.set(tx + dx * 18 + px * (ap.width / 2 + 7) + dx * i * 4.5, ap.elev + 0.8, tz + dz * 18 + pz * (ap.width / 2 + 7) + dz * i * 4.5);
      g.add(u);
      units.push(u);
    }
    world.papi[ap.id] = units;
    scene.add(g);
  }

  // Lighthouse on Emerald's west point
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.8 }));
  tower.position.y = 8;
  lh.add(tower);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  lamp.position.y = 17;
  lh.add(lamp);
  lh.position.set(-1180, heightAt(-1180, 860), 860);
  scene.add(lh);
  world.blinkers.push(lamp);

  // Clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xf6f9ff, emissive: 0x8ea6bd, emissiveIntensity: 0.5, transparent: true, opacity: 0.92 });
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 46; i++) {
    const cl = new THREE.Group();
    const n = 3 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const s = 60 + rnd() * 130;
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.scale.set(s, s * 0.32, s * 0.7);
      puff.position.set((rnd() - 0.5) * 220, (rnd() - 0.5) * 22, (rnd() - 0.5) * 130);
      cl.add(puff);
    }
    cl.position.set(-3500 + rnd() * 10000, 760 + rnd() * 480, -4200 + rnd() * 6800);
    scene.add(cl);
  }
  return world;
}

// Ring pool: states 'next' (amber), 'future' (faint cyan), 'done' (green dim)
export function setRings(scene, world, rings) {
  for (const m of world.rings) scene.remove(m);
  world.rings = [];
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const mat = new THREE.MeshBasicMaterial({ color: 0x37c8d8, transparent: true, opacity: 0.4, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(new THREE.TorusGeometry(r.r, 1.7, 8, 40), mat);
    m.position.set(r.x, r.y, r.z);
    // Face the ring along the course: normal = direction prev -> next point.
    const a = rings[Math.max(0, i - 1)], b = rings[Math.min(rings.length - 1, i + 1)];
    m.lookAt(r.x + (b.x - a.x), r.y + (b.y - a.y), r.z + (b.z - a.z));
    scene.add(m);
    world.rings.push(m);
  }
}
export function paintRings(world, activeIdx, t) {
  world.rings.forEach((m, i) => {
    if (i < activeIdx) { m.material.color.setHex(0x53d769); m.material.opacity = 0.35; }
    else if (i === activeIdx) { m.material.color.setHex(0xffb340); m.material.opacity = 0.75 + Math.sin(t * 5) * 0.25; }
    else { m.material.color.setHex(0x37c8d8); m.material.opacity = 0.38; }
  });
}
// PAPI: whites count by glide position relative to a 3-degree path to threshold.
export function paintPapi(world, ap, plane) {
  const units = world.papi[ap.id];
  if (!units) return;
  const dx = Math.sin(ap.landHeading), dz = -Math.cos(ap.landHeading);
  const tx = ap.x - dx * ap.length / 2, tz = ap.z - dz * ap.length / 2;
  const along = (plane.x - tx) * -dx + (plane.z - tz) * -dz; // distance before threshold
  const h = plane.y - ap.elev;
  let whites = 2;
  if (along > 30) {
    const glide = Math.atan2(h, along) * 180 / Math.PI;
    whites = glide > 3.6 ? 4 : glide > 3.25 ? 3 : glide > 2.75 ? 2 : glide > 2.4 ? 1 : 0;
  }
  units.forEach((u, i) => {
    u.material.color.setHex(i < whites ? 0xffffff : 0xff2a1a);
  });
}
