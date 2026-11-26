// Verification harness (not shipped): loads the game's own config/physics/
// world/missions in node and flies every mission with a compact autopilot
// to prove each one is completable with the selected aircraft.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('./game/vendor/three.min.js');

global.THREE = THREE;
global.window = { SIM_CONFIG: null };
global.document = { getElementById: () => ({ textContent: '', style: {} }) };
for (const f of ['config.js', 'physics.js', 'world.js', 'missions.js']) {
  eval(readFileSync('./game/js/' + f, 'utf8'));
}
const CFG = global.window.SIM_CONFIG;
const audioStub = { playTouchdown() {}, playRingPass() {}, playWarning() {}, playGearToggle() {} };

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const D2R = Math.PI / 180;
function angDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

function applyCraft(id) {
  const spec = CFG.AIRCRAFT_FLEET.find(c => c.id === id);
  const flight = Object.assign({}, spec);
  for (const k of ['id', 'name', 'kind', 'desc', 'colorBody', 'colorAccent', 'jet', 'scale']) delete flight[k];
  Object.assign(CFG.AIRCRAFT, flight);
  return spec;
}

function flyMission(missionId, craftId, trace = false) {
  applyCraft(craftId);
  const scene = new THREE.Scene();
  const world = new global.window.WorldBuilder(scene);
  const physics = new global.window.FlightPhysics();
  const missions = new global.window.MissionManager();
  missions.startMission(missionId, world, physics, false);
  const m = CFG.MISSIONS[missionId];
  const wind = { x: m.crosswindX || 0, z: m.crosswindZ || 0 };
  const spec = CFG.AIRCRAFT;
  const dt = 1 / 30;
  const ap = { final: m.type === 'landing_challenge' };

  function steer(tx, ty, tz, speedWantKt, glide = false) {
    const e = physics.getOrientationEuler();
    const heading = e.headingDeg * D2R, pitch = e.pitchDeg * D2R, bank = e.rollDeg * D2R;
    const dx = tx - physics.position.x, dz = tz - physics.position.z;
    const wantH = Math.atan2(dx, -dz);
    const dh = angDiff(wantH, heading);
    const desiredBank = clamp(dh * 1.2, -0.8, 0.8);
    physics.rollInput = clamp((bank - desiredBank) * 2.0, -1, 1);
    const altErr = ty - physics.position.y;
    let desiredPitch;
    if (glide) desiredPitch = clamp(altErr * 0.010, -0.16, 0.06);
    else desiredPitch = clamp(altErr * 0.004 + (speedWantKt - physics.getAirspeedKnots()) * 0.006, -0.30, 0.35);
    physics.pitchInput = clamp((desiredPitch - pitch) * 3.0, -1, 1);
    physics.throttle = clamp(0.55 + (speedWantKt - physics.getAirspeedKnots()) * 0.02 + clamp(altErr * 0.0005, -0.3, 0.25), 0.03, 1);
    return Math.hypot(dx, dz);
  }

  for (let i = 0; i < 30 * 600; i++) {
    const t = i * dt;
    if (physics.crashed) return { ok: false, why: 'CRASHED: ' + physics.crashReason, t };
    if (missions.completed) return { ok: true, score: missions.score, t, vsi: physics.lastTouchdownVsiFpm };
    if (physics.onGround) {
      if (ap.final || missions.ringsPassed >= m.rings.length) { physics.brakes = true; physics.throttle = 0; physics.pitchInput = 0; }
      else { physics.brakes = false; physics.throttle = 1; physics.pitchInput = physics.getAirspeedKnots() >= spec.takeoffSpeedKnots ? 0.4 : 0; physics.rollInput = 0; }
    } else {
      const ringsDone = missions.activeRingIndex >= m.rings.length;
      if (m.type !== 'rings_only' && m.targetAirport && (ringsDone || ap.final)) {
        const tap = CFG.AIRPORTS.find(a => a.id === m.targetAirport);
        const landWest = tap.id === 'coral_atoll';
        const thX = landWest ? tap.x + tap.length / 2 : tap.x - tap.length / 2;
        const dirX = landWest ? -1 : 1;
        const dTh = (physics.position.x - thX) * -dirX;
        const slope = m.type === 'landing_challenge' ? 0.10 : 0.062;
        const aim = m.type === 'landing_challenge' ? 450 : 0;
        if (!ap.final) {
          const fixX = thX - dirX * 2100, fixY = tap.elevation + slope * 2100 + 4;
          const dFix = steer(fixX, fixY, tap.z, 125);
          physics.flaps = dFix < 2600 ? 1 : 0;
          if (dFix < 650) ap.final = true;
        } else {
          physics.gearDown = true;
          physics.flaps = dTh < 1600 ? 2 : 1;
          const stallKt = spec.stallSpeedKnots * (1 - physics.flaps * 0.08);
          const ias = physics.getAirspeedKnots();
          if (m.type === 'landing_challenge' && missions.activeRingIndex < m.rings.length) {
            // The challenge gates are mandatory: fly the ring centres first.
            const r = m.rings[missions.activeRingIndex];
            steer(r.x, r.y, r.z, 105, true);
            physics.flaps = 1;
          } else if (m.type === 'landing_challenge' && ap.align !== false && ias > 95 && dTh + aim >= 600) {
            // Align phase: stay level, bleed speed and centre up before
            // starting the descent (the spawn is fast and offset).
            steer(thX + dirX * 200, physics.position.y, tap.z, 90, true);
            physics.throttle = 0.02;
            if (ias <= 95) ap.align = false;
          } else if (dTh + aim < 200) {
            if (ias > stallKt + 34 && spec.stallSpeedKnots <= 46) {
              // Far too fast to flare: hold height over the runway and bleed.
              steer(physics.position.x + dirX * 300, physics.position.y, tap.z, stallKt + 20, true);
              physics.throttle = 0;
              const e2 = physics.getOrientationEuler();
              physics.pitchInput = clamp((0 - e2.pitchDeg * D2R) * 3.0, -1, 1);
            } else {
              steer(physics.position.x + dirX * 200, tap.elevation + 0.6, tap.z, stallKt + 12, true);
              physics.throttle = 0.05;
              // Short-final flare: below 12 m AGL, fly vertical speed directly.
              const agl = physics.position.y - (tap.elevation + spec.gearHeight);
              if (agl < 7) {
                const e = physics.getOrientationEuler();
                const desP = clamp((-1.4 - physics.verticalSpeedMps) * 0.05, -0.04, 0.24);
                physics.pitchInput = clamp((desP - e.pitchDeg * D2R) * 3.0, -1, 1);
              }
            }
          } else if (m.type === 'landing_challenge') {
            // Post-rings: shallow descent line to a long aim point near the
            // far end of the runway (bleeds speed on the way), with an
            // overshoot correction on the centreline.
            const aimX = thX + dirX * (tap.length - 150);
            const distAim = Math.abs(aimX - physics.position.x);
            const zAim = Math.abs(wind.z) >= 5
              ? tap.z - clamp(wind.z * distAim / Math.max(20, physics.speedMps), -150, 150)
              : tap.z;
            steer(aimX, tap.elevation + 0.6, zAim, stallKt + 14, true);
          } else {
            const cx = physics.position.x + dirX * 320;
            const slopeY = tap.elevation + 3.1 + Math.max(0, dTh + aim) * slope;
            if (slopeY - physics.position.y < -45 && ias < 85) {
              // Low-energy craft far above the slope: descending orbit to
              // shed altitude before continuing the approach.
              const e = physics.getOrientationEuler();
              const h = e.headingDeg * D2R;
              steer(physics.position.x + Math.sin(h + 2.1) * 300, slopeY, physics.position.z - Math.cos(h + 2.1) * 300, stallKt + 14, true);
            } else {
              steer(cx, slopeY, tap.z, stallKt + 18, true);
              if (ias > stallKt + 40) { // far too fast on the slope: level off and bleed
                const e = physics.getOrientationEuler();
                physics.pitchInput = clamp((0 - e.pitchDeg * D2R) * 3.0, -1, 1);
                physics.throttle = 0;
              }
            }
          }
        }
      } else if (missions.activeRingIndex < m.rings.length) {
        const r = m.rings[missions.activeRingIndex];
        steer(r.x, r.y, r.z, 135);
        physics.flaps = 0;
        if (physics.gearDown && physics.position.y > 60) physics.gearDown = false;
      } else {
        steer(0, 300, 0, 120);
      }
    }
    physics.step(dt, world, audioStub, wind);
    missions.update(dt, physics, world, audioStub);
    if (trace && i % 150 === 0) {
      const e = physics.getOrientationEuler();
      console.log(`  t=${t.toFixed(0)} pos=(${physics.position.x.toFixed(0)},${physics.position.y.toFixed(1)},${physics.position.z.toFixed(0)}) spd=${physics.getAirspeedKnots().toFixed(0)} vs=${physics.getVerticalSpeedFpm().toFixed(0)} pitch=${e.pitchDeg.toFixed(1)} thr=${physics.throttle.toFixed(2)} flaps=${physics.flaps} final=${ap.final} rings=${missions.ringsPassed}`);
    }
  }
  return { ok: false, why: 'TIMEOUT', t: 600 };
}

if (process.argv[2]) { const r = flyMission(process.argv[2], process.argv[3] || 'alis', true); console.log(r); process.exit(0); }
const jobs = [
  ['island_hopper', 'alis'], ['canyon_slalom', 'alis'], ['final_approach', 'alis'],
  ['sunset_freight', 'alis'], ['volcano_orbit', 'alis'], ['emb_crosswind', 'alis'],
  ['island_hopper', 'komet'], ['island_hopper', 'banteng'], ['island_hopper', 'rimba'],
  ['canyon_slalom', 'vyper'], ['final_approach', 'lutung']
];
let fails = 0;
for (const [mid, craft] of jobs) {
  const r = flyMission(mid, craft);
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${mid} [${craft}] t=${Math.round(r.t)}s ${r.ok ? 'score=' + r.score + (r.vsi ? ' touchdown=' + r.vsi + 'fpm' : '') : r.why}`);
  if (!r.ok) fails++;
}
console.log(fails === 0 ? '== ALL PASS ==' : `== ${fails} FAILURES ==`);
