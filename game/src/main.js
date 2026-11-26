// AeroPilot 3D conductor: loop, input, cameras, missions, debrief.
import * as THREE from 'three';
import { MISSIONS, mission, airport, threshold, PLANE } from './config.js';
import { buildWorld, setRings, paintRings, paintPapi, surfaceAt } from './world.js';
import { buildAircraft, poseAircraft } from './aircraft.js';
import { stepPlane } from './physics.js';
import { spawnFor, createMission, updateMission, objectiveText, gpwsAlert } from './missions.js';
import { createAutopilot, autopilotStep, primeFinal } from './autopilot.js';
import { initHud, updateHud } from './hud.js';
import { SHOTS, SHOT_WARP } from './shotDirector.js';
import { Sfx } from './audio.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shot = shotName ? SHOTS[shotName] : null;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.className = 'gl';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 40000);
const world = buildWorld(scene);
const craft = buildAircraft();
scene.add(craft);
initHud();

const BEST_KEY = 'aeropilot-best-v1';
const best = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
let mode = 'menu';
let plane = null, st = null, ap = null, useAutopilot = false;
let camMode = 'chase', frozen = false, debShown = false;
let gpwsLast = 0, simT = 0;
const keys = new Set();
let curInput = { roll: 0, pitch: 0 };

function showMenu() {
  mode = 'menu';
  document.body.classList.remove('flying');
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('debrief').style.display = 'none';
  const m = mission('island_hopper');
  plane = spawnFor(m);
  st = null; ap = null;
  setRings(scene, world, []);
  poseAircraft(craft, plane, null);
}
const TYPE_LABELS = { full_flight: 'FULL FLIGHT', rings_only: 'TIME TRIAL', landing_challenge: 'LANDING CHALLENGE', sandbox: 'SANDBOX · EXPLORATION' };
let selectedId = 'island_hopper';
function buildMenu() {
  const wrap = document.getElementById('menu-cards');
  wrap.innerHTML = '';
  for (const m of MISSIONS) {
    const card = document.createElement('div');
    card.className = 'card' + (m.id === selectedId ? ' selected' : '');
    card.dataset.id = m.id;
    card.innerHTML = `<div class="ctype">${TYPE_LABELS[m.type] || 'MISSION'}</div><h3>${m.name.replace(/^MISSION \d+ — /, '')}</h3><p>${m.brief}</p><div class="best">${best[m.id] ? 'BEST ' + best[m.id] : 'NOT FLOWN YET'}</div>`;
    card.onclick = () => {
      selectedId = m.id;
      wrap.querySelectorAll('.card').forEach((c) => c.classList.toggle('selected', c.dataset.id === selectedId));
      Sfx.init();
    };
    card.ondblclick = () => { Sfx.init(); startMission(m.id, false); };
    wrap.appendChild(card);
  }
}
document.getElementById('btn-launch').onclick = () => { Sfx.init(); startMission(selectedId, false); };
function startMission(id, autopilot) {
  const m = mission(id);
  plane = spawnFor(m);
  st = createMission(m);
  ap = createAutopilot();
  useAutopilot = autopilot;
  if (shot && shot.prime === 'final') primeFinal(ap);
  setRings(scene, world, m.rings);
  mode = 'fly';
  frozen = false; debShown = false;
  document.body.classList.add('flying');
  document.getElementById('menu').style.display = 'none';
  document.getElementById('debrief').style.display = 'none';
  poseAircraft(craft, plane, null);
}
function showDebrief() {
  debShown = true;
  const el = document.getElementById('debrief');
  el.style.display = 'flex';
  const title = document.getElementById('deb-title');
  const body = document.getElementById('deb-body');
  if (plane.crashed) {
    title.textContent = 'Aircraft down';
    body.textContent = `${st.m.name}\nThe airframe did not survive. Score ${st.score}.`;
    return;
  }
  title.textContent = 'Mission complete';
  let lines = `${st.m.name}\nTime ${Math.floor(st.t / 60)}:${String(Math.floor(st.t % 60)).padStart(2, '0')} · Rings ${st.ringsPassed}/${st.m.rings.length}\nScore ${st.score}`;
  if (st.touchdownInfo) lines += `\nTouchdown ${st.touchdownInfo.grade} — sink ${Math.abs(st.touchdownInfo.sinkFpm)} fpm, landing bonus ${st.landingBonus || 0}`;
  body.textContent = lines;
  if (!best[st.m.id] || st.score > best[st.m.id]) {
    best[st.m.id] = st.score;
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  }
}
document.getElementById('deb-refly').onclick = () => startMission(st.m.id, false);
document.getElementById('deb-menu').onclick = () => { buildMenu(); showMenu(); };

addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (mode === 'menu' && e.code === 'Enter') { Sfx.init(); startMission(selectedId, false); return; }
  if (mode !== 'fly' || !plane) return;
  if (e.code === 'KeyF') { plane.flaps = (plane.flaps + 1) % 3; Sfx.servo(); }
  if (e.code === 'KeyG') { plane.gearDown = !plane.gearDown; Sfx.servo(); }
  if (e.code === 'KeyC') camMode = camMode === 'chase' ? 'cockpit' : 'chase';
  if (e.code === 'KeyR') startMission(st.m.id, useAutopilot);
  if (e.code === 'Escape') { buildMenu(); showMenu(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function readInput() {
  const input = { roll: 0, pitch: 0, throttleDelta: 0, brake: keys.has('KeyB') };
  if (keys.has('KeyW') || keys.has('ArrowUp')) input.pitch += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) input.pitch -= 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) input.roll += 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) input.roll -= 1;
  if (keys.has('KeyE')) input.throttleDelta += 0.55;
  if (keys.has('KeyQ')) input.throttleDelta -= 0.55;
  if (keys.has('KeyZ')) input.throttleSet = 1;
  if (keys.has('KeyX')) input.throttleSet = 0;
  return input;
}

function stepOnce(dt) {
  simT += dt;
  if (mode !== 'fly' || !plane || frozen) return;
  const input = useAutopilot ? autopilotStep(ap, st, plane, dt) : readInput();
  curInput = input;
  const evts = stepPlane(plane, input, dt, surfaceAt, st.m.wind);
  for (const e of evts) {
    if (e.type === 'touchdown') Sfx.thud();
  }
  const mEvts = updateMission(st, plane, dt, evts);
  for (const e of mEvts) {
    if (e.type === 'ring') Sfx.ring();
    if (e.type === 'complete') Sfx.chime();
  }
  if ((st.completed || plane.crashed) && !debShown && !shot) setTimeout(showDebrief, 900);
  if (shot && shot.freeze && shot.freeze(st, plane)) frozen = true;
}

function updateCamera(dt) {
  if (!plane) return;
  const h = plane.heading;
  const fx = Math.sin(h), fz = -Math.cos(h);
  if (mode === 'menu') {
    if (shot) {
      camera.position.set(-478, 14, 62);
      camera.lookAt(-400, 7, -4);
    } else {
      const t = simT * 0.07;
      camera.position.set(plane.x + Math.cos(t) * 120, 26, plane.z + Math.sin(t) * 120);
      camera.lookAt(plane.x, 10, plane.z);
    }
    return;
  }
  if (camMode === 'cockpit') {
    const cp = Math.cos(plane.pitch), sp = Math.sin(plane.pitch);
    const eye = new THREE.Vector3(plane.x + fx * 8.4, plane.y + 2.35, plane.z + fz * 8.4);
    camera.position.copy(eye);
    camera.lookAt(eye.x + fx * cp * 60, eye.y + sp * 60, eye.z + fz * cp * 60);
    camera.rotation.z += -plane.bank * 0.55;
    return;
  }
  let back = 34, up = 11.5, side = 0;
  if (shotName === 'takeoff') { back = 36; up = 9; side = 7; }
  if (shotName === 'landing') { back = 27; up = 6.5; side = 11; }
  if (shotName === 'rings') { back = 30; up = 9; side = -9; }
  const rx = fz, rz = -fx; // right vector (forward x up)
  const want = new THREE.Vector3(plane.x - fx * back + rx * side, plane.y + up, plane.z - fz * back + rz * side);
  if (shot || frozen) camera.position.copy(want);
  else camera.position.lerp(want, 1 - Math.exp(-dt * 4.2));
  camera.lookAt(plane.x + fx * 6, plane.y + 2, plane.z + fz * 6);
}

function frame() {
  requestAnimationFrame(frame);
  const steps = shot && !frozen ? SHOT_WARP : 2;
  for (let i = 0; i < steps; i++) stepOnce(1 / 30);
  if (plane) {
    poseAircraft(craft, plane, curInput);
    Sfx.engine(plane.throttle, plane.speed);
  }
  if (world.blinkers.length) {
    const s = 1 + Math.sin(simT * 2.6) * 0.3;
    world.blinkers[0].scale.setScalar(Math.max(0.4, s));
  }
  if (st && mode === 'fly') {
    paintRings(world, st.ringIdx, simT);
    if (st.phase === 'land') paintPapi(world, airport(st.m.targetAirport), plane);
    const alert = gpwsAlert(plane, surfaceAt(plane.x, plane.z));
    if (alert && simT - gpwsLast > 1.4) { gpwsLast = simT; Sfx.gpws(); }
    document.getElementById('hud-obj').textContent = objectiveText(st, plane);
    let target = null;
    if (st.ringIdx < st.m.rings.length) target = st.m.rings[st.ringIdx];
    else if (st.m.targetAirport) { const th = threshold(airport(st.m.targetAirport)); target = { x: th.x, y: airport(st.m.targetAirport).elev + 10, z: th.z }; }
    updateHud(st, plane, alert, target, !!(curInput && curInput.brake));
  }
  updateCamera(1 / 30);
  renderer.render(scene, camera);
}

buildMenu();
if (shot) {
  if (shot.menu) showMenu();
  else {
    startMission(shot.mission, true);
    if (shotName === 'takeoff') {
      // Pre-roll: the staged shot starts mid-roll so rotation happens fast.
      plane.x = -150; plane.groundSpeed = 33; plane.speed = 33; plane.throttle = 1;
    }
    if (shotName === 'rings') {
      // Pre-position on the slalom course, ring 1 ahead.
      plane.x = 250; plane.y = 178; plane.z = -60; plane.speed = 75; plane.throttle = 0.72;
      plane.heading = Math.atan2(700 - 250, -(-150 + 60));
    }
  }
} else showMenu();
frame();
