// V8 verification harness — NOT shipped. Drives the flight engine ONLY
// through PilotInput (the human path: keys -> smoothed commands), the way
// a player's hands would. If a mission completes here, a human can fly it.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
require('./game/js/data.js');
require('./game/js/engine.js');
require('./game/js/input.js');
require('./game/js/briefing.js');

const DATA = window.AERO_DATA;
const ISLANDS = [
  { x: 120, z: -40, rx: 780, rz: 480 }, { x: 2150, z: -1150, rx: 520, rz: 460 },
  { x: 3550, z: -1850, rx: 420, rz: 390 }, { x: 1650, z: -2100, rx: 360, rz: 340 },
  { x: 2950, z: -520, rx: 240, rz: 240 }, { x: 4200, z: -2400, rx: 860, rz: 520 }
];
const ground = {
  heightAt(x, z) {
    for (const ap of DATA.AIRFIELDS) {
      if (Math.abs(x - ap.x) <= ap.len * 0.52 && Math.abs(z - ap.z) <= ap.wid * 0.65) return ap.elev;
    }
    for (const isl of ISLANDS) {
      const dx = (x - isl.x) / isl.rx, dz = (z - isl.z) / isl.rz;
      if (dx * dx + dz * dz <= 1.0) return 4;
    }
    return 0;
  },
  runwayAt(x, z) {
    for (const ap of DATA.AIRFIELDS) {
      if (Math.abs(x - ap.x) <= ap.len * 0.5 && Math.abs(z - ap.z) <= ap.wid * 0.5) return ap;
    }
    return null;
  },
  markRings() {},
  setRings() {}
};

function wrap180(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function fly(routeId, craftId, maxSec) {
  const spec = DATA.FLEET.find(f => f.id === craftId);
  const e = new window.AeroEngine();
  e.useSpec(spec);
  const input = new window.PilotInput();
  input.mouseOn = false;
  const b = new window.Briefing();
  b.start(routeId, ground, e);
  input.throttle = e.throttle;
  input.brakes = e.brakes;
  const route = b.route;
  const ap = DATA.AIRFIELDS.find(a => a.id === route.to);
  let phase = e.onGround ? 'takeoff' : (b.ringsDone < b.ringsTotal() ? 'nav' : 'final');
  let finalStage = 'join';
  let finalDir = null, finalThrX = 0;
  let steerLatch = 0;
  let gearWanted = e.gear, flapsWanted = e.flaps;
  const dt = 1 / 60;
  let t = 0, touchVsi = null;

  function setKey(code, on) { if (on) input.keys.add(code); else input.keys.delete(code); }
  function steer(tx, ty, tz, spdKt, pitchGain) {
    const dx = tx - e.x, dz = tz - e.z;
    const bearing = Math.atan2(dx, -dz) * 180 / Math.PI;
    const hdgErr = wrap180(bearing - e.hdgDeg());
    const wantBank = clamp(hdgErr * 1.15, -27, 27);
    setKey('ArrowRight', e.bankDeg() < wantBank - 2);
    setKey('ArrowLeft', e.bankDeg() > wantBank + 2);
    let wantPitch = clamp((ty - e.y) * (pitchGain || 0.09), -9, 12);
    if (e.iasKt() < spec.stallKt + 14) wantPitch = Math.min(wantPitch, 1.5);
    setKey('ArrowDown', e.pitchDeg() < wantPitch - 0.8);
    setKey('ArrowUp', e.pitchDeg() > wantPitch + 0.8);
    setKey('KeyW', e.iasKt() < spdKt - 4);
    setKey('KeyS', e.iasKt() > spdKt + 5);
  }

  function finalSteer(thrX, thrZ, dir, ty, spdKt) {
    // Heading-based final: runway heading plus a small intercept angle
    // from lateral error — the way a pilot lines up, not point-chasing.
    const landHdg = dir > 0 ? 90 : 270;
    const wantHdg = landHdg - dir * clamp((e.z - thrZ) * 0.09, -32, 32);
    const hdgErr = wrap180(wantHdg - e.hdgDeg());
    const wantBank = clamp(hdgErr * 1.15, -26, 26);
    setKey('ArrowRight', e.bankDeg() < wantBank - 2);
    setKey('ArrowLeft', e.bankDeg() > wantBank + 2);
    // Altitude: while still turning onto the line, bleed height gently —
    // never climb (at approach speed, pitch 0 already climbs on excess
    // lift, so "hold altitude" has to mean a slightly nose-down target).
    const aligned = Math.abs(e.z - thrZ) < 110 && Math.abs(hdgErr) < 22;
    let err = ty - e.y;
    if (!aligned) err = Math.min(err, -18);
    let wantPitch = clamp(err * 0.16, -9, 11);
    if (err < -2) wantPitch = Math.min(wantPitch, -1.6);
    if (e.iasKt() < spec.stallKt + 14) wantPitch = Math.min(wantPitch, 1.5);
    setKey('ArrowDown', e.pitchDeg() < wantPitch - 0.8);
    setKey('ArrowUp', e.pitchDeg() > wantPitch + 0.8);
    setKey('KeyW', e.iasKt() < spdKt - 4);
    setKey('KeyS', e.iasKt() > spdKt + 5);
  }

  while (t < maxSec) {
    t += dt;
    // gear / flap management through the same toggle events a player makes
    for (const tg of input.takeToggles()) {
      if (tg === 'gear') e.gear = !e.gear;
      if (tg === 'flaps') e.flaps = (e.flaps + 1) % 3;
    }
    if (e.gear !== gearWanted) input.keyDown('KeyG');
    if (e.flaps !== flapsWanted) input.keyDown('KeyF');

    if (phase === 'takeoff') {
      if (input.brakes) input.keyDown('KeyB');
      setKey('KeyW', true); setKey('KeyS', false);
      setKey('ArrowDown', e.iasKt() > spec.rotateKt - 5);
      setKey('ArrowUp', false); setKey('ArrowLeft', false); setKey('ArrowRight', false);
      if (!e.onGround) { phase = 'nav'; gearWanted = false; }
    } else if (phase === 'nav') {
      const tgt = b.targetPos();
      if (!tgt) { phase = 'final'; }
      else if (b.ringsDone < b.ringsTotal()) steer(tgt.x, tgt.y, tgt.z, route.kind === 'landing' ? 112 : 128);
      else phase = 'final';
      if (phase === 'final' && route.kind === 'rings') break;
    } else if (phase === 'final') {
      // Landing direction is latched on entry — recomputing it per tick
      // flips the threshold back and forth as the aircraft crosses it.
      gearWanted = true; flapsWanted = 2;
      if (finalDir === null) {
        finalDir = e.x > ap.x + 200 ? -1 : 1;
        finalThrX = ap.x - finalDir * ap.len / 2;
      }
      const dir = finalDir, thrX = finalThrX, thrZ = ap.z;
      if (finalStage === 'join') {
        // Already lined up on the centreline and pointing the right way?
        // Then skip the pattern and land — a pilot would.
        const landHdg = dir > 0 ? 90 : 270;
        const alignedNow = Math.abs(e.z - thrZ) < 150 &&
          Math.abs(wrap180(landHdg - e.hdgDeg())) < 30 && (thrX - e.x) * dir > 250;
        if (alignedNow) { finalStage = 'glide'; }
        else {
          const jx = thrX - dir * 3400, jy = ap.elev + 200;
          steer(jx, jy, thrZ, 115);
          if (Math.hypot(jx - e.x, thrZ - e.z) < 800) finalStage = 'glide';
        }
      } else {
        // Pure pursuit down the centreline: aim at a point on the line
        // 750 m ahead (the touchdown spot once close). Chasing a point
        // crabs into the crosswind by itself and cannot oscillate the
        // way a heading-error law did.
        const d = Math.hypot(thrX - e.x, thrZ - e.z);
        const pastAim = (e.x - thrX) * dir > 700 && e.y - ap.elev > 25;
        if (pastAim) { finalStage = 'join'; }
        else if (d > 700) {
          // Lateral guidance chases the point ahead; the vertical target
          // is the profile altitude at the aircraft's OWN distance — a
          // point 750 m ahead sits lower, and diving at its altitude
          // compresses the whole descent into the sea.
          const ax = thrX - dir * (d - 750);
          const ay = ap.elev + Math.max(spec.gearM + 1, d * 0.058);
          steer(ax, ay, thrZ, spec.rotateKt + 12, 0.2);
        } else {
          // Short lookahead on short final: the intercept angle has to
          // beat the crosswind crab angle or the pursuit settles at a
          // downwind offset and lands beside the runway.
          const aimX = d < 320 ? thrX + dir * 200 : e.x + dir * Math.max(85, d * 0.22);
          steer(aimX, ap.elev + spec.gearM + 1, thrZ, spec.rotateKt + 12, 0.2);
          // Wings level for the touchdown — no steering in the last stretch.
          if (e.bankDeg() > 6) { setKey('ArrowLeft', true); setKey('ArrowRight', false); }
          else if (e.bankDeg() < -6) { setKey('ArrowRight', true); setKey('ArrowLeft', false); }
          // Short final: fly a sink rate, not an altitude. A proportional
          // altitude chase asymptotes above the runway because excess
          // lift is a constant bias it never quite cancels.
          const lr = Math.pow(e.iasKt() / (spec.rotateKt * (1 - e.flaps * 0.08)), 2);
          const bias = (Math.min(1.35, lr) - 1) * 9.81 * 0.45;
          const aboveProfile = (e.y - ap.elev) - d * 0.058;
          const tgtVS = (e.y - ap.elev > 30 && aboveProfile > 20) ? -3.0 :
            (e.y - ap.elev > 12) ? -2.3 : -1.15;
          const wantPitch = Math.asin(Math.max(-0.3, Math.min(0.3, (tgtVS - bias) / Math.max(20, e.speed)))) * 180 / Math.PI;
          setKey('ArrowDown', e.pitchDeg() < wantPitch - 0.7);
          setKey('ArrowUp', e.pitchDeg() > wantPitch + 0.7);
        }
      }
      if (e.justTouched) { touchVsi = e.touchVsiFpm; console.log('  TD', routeId, craftId, 'at', e.x.toFixed(0), e.z.toFixed(0), 'vsi', touchVsi, 'rwy', ground.runwayAt(e.x, e.z) ? ground.runwayAt(e.x, e.z).id : 'NONE'); }
      if (e.onGround && touchVsi !== null) phase = 'rollout';
    } else if (phase === 'rollout') {
      setKey('KeyW', false); setKey('KeyS', true);
      setKey('ArrowDown', false); setKey('ArrowUp', false);
      // Nose-wheel steering: hold a heading that converges on the
      // centreline and settles on the runway heading — keying directly
      // off lateral error oscillates, because a yawed nose stays yawed.
      if (finalDir !== null) {
        const landHdg = finalDir > 0 ? 90 : 270;
        const wantHdg = landHdg - finalDir * clamp((e.z - ap.z) * 0.05, -12, 12);
        const hdgErr = wrap180(wantHdg - e.hdgDeg());
        setKey('KeyD', hdgErr > 2);
        setKey('KeyA', hdgErr < -2);
      }
      // Brake as soon as the weight is on the wheels — on a short island
      // strip, waiting costs hundreds of metres of runway.
      if (!input.brakes) input.keyDown('KeyB');
      if (e.iasKt() < 5) {
        return { routeId, craftId, ok: b.done, why: b.done ? '' : 'stopped off-runway at ' + e.x.toFixed(0) + ',' + e.z.toFixed(0), score: b.score, touchVsi, t: t.toFixed(0) };
      }
    }

    const cmd = input.update(dt);
    e.inPitch = cmd.pitch; e.inRoll = cmd.roll; e.inYaw = cmd.yaw;
    e.throttle = cmd.throttle; e.brakes = cmd.brakes;
    e.step(dt, ground, route.wind);
    b.update(dt, e, ground, null);
    if (process.env.DEBUG && Math.round(t * 60) % 600 === 0) {
      console.log('t=' + t.toFixed(0), phase, 'pos', e.x.toFixed(0), e.y.toFixed(0), e.z.toFixed(0),
        'ias', e.iasKt().toFixed(0), 'hdg', e.hdgDeg().toFixed(0), 'bank', e.bankDeg().toFixed(0),
        'pitch', e.pitchDeg().toFixed(0), 'vsi', e.vsiFpm().toFixed(0), 'gnd', e.onGround, 'gear', e.gear, 'fl', e.flaps, 'thr', e.throttle.toFixed(2));
    }
    if (e.crashed) return { routeId, craftId, ok: false, why: e.crashWhy, t: t.toFixed(0) };
    if (b.done) return { routeId, craftId, ok: true, score: b.score, touchVsi, t: t.toFixed(0) };
    if (route.kind === 'rings' && b.ringsDone >= b.ringsTotal()) {
      return { routeId, craftId, ok: true, score: b.score, touchVsi, t: t.toFixed(0) };
    }
  }
  return { routeId, craftId, ok: false, why: 'timeout phase=' + phase + ' rings=' + b.ringsDone + '/' + b.ringsTotal(), t: t.toFixed(0) };
}

const jobs = [];
const routes = Object.keys(DATA.ROUTES).filter(r => r !== 'free_flight');
for (const r of routes) jobs.push([r, 'alis']);
jobs.push(['island_hopper', 'komet'], ['island_hopper', 'banteng'], ['canyon_slalom', 'vyper'], ['final_approach', 'lutung'], ['island_hopper', 'rimba']);
let pass = 0;
for (const [r, c] of jobs) {
  const res = fly(r, c, 420);
  console.log((res.ok ? 'PASS' : 'FAIL'), res.routeId, '×', res.craftId, res.ok ? ('score ' + res.score + (res.touchVsi !== null && res.touchVsi !== undefined ? ' touch ' + res.touchVsi + ' fpm' : '') + ' in ' + res.t + 's') : ('— ' + res.why + ' @' + res.t + 's'));
  if (res.ok) pass++;
}
console.log(pass + '/' + jobs.length + ' PASS');
