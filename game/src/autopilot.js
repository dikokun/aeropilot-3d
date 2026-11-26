// Autopilot: flies the missions end to end (takeoff, ring course, final,
// touchdown, rollout). Used by the node sim proof and the shot director.
import { airport, threshold } from './config.js';
import { angDiff, clamp, stallSpeed } from './physics.js';

export function createAutopilot() {
  return { phase: 'roll', leg: 'course', targetIdx: 0 };
}
export function primeFinal(ap) { ap.phase = 'final'; }

function steerTo(p, input, tx, ty, tz, speedWant, opts = {}) {
  const dx = tx - p.x, dz = tz - p.z;
  const dist = Math.hypot(dx, dz);
  const wantH = Math.atan2(dx, -dz);
  const dh = angDiff(wantH, p.heading);
  input.roll = clamp(-dh * 1.25, -0.85, 0.85);
  const altErr = ty - p.y;
  let pitch = altErr * 0.006 + (speedWant - p.speed) * 0.012;
  if (opts.glide) {
    const altTerm = clamp(altErr * 0.03, (opts.flare && altErr > -12) ? -0.22 : -0.85, 0.06);
    const spdTerm = altErr < -8 ? 0 : clamp((p.speed - speedWant) * 0.03, -0.12, opts.flare ? 0 : 0.12);
    pitch = altTerm + spdTerm;
  }
  input.pitch = clamp(pitch, -1, 1);
  input.throttleSet = clamp(0.52 + (speedWant - p.speed) * 0.022 + clamp(altErr * 0.0006, -0.3, 0.25), 0.05, 1);
  if (opts.glide && altErr < -25) input.throttleSet = 0.05; // high on the slope: engines to idle, come down
  return dist;
}

export function autopilotStep(ap, st, p, dt) {
  const input = { roll: 0, pitch: 0, throttleSet: p.throttle, brake: false };
  const m = st.m;
  if (p.crashed || st.completed) { input.throttleSet = 0; input.brake = true; return input; }
  const stall = stallSpeed(p);

  if (p.onGround) {
    if (st.phase === 'land' && st.touchdownInfo) { // rollout
      input.throttleSet = 0; input.brake = true; input.pitch = 0;
      ap.phase = 'rollout';
      return input;
    }
    // takeoff roll
    ap.phase = 'roll';
    input.throttleSet = 1;
    input.pitch = p.speed > 40 ? 0.55 : 0;
    return input;
  }
  if (ap.phase === 'roll') ap.phase = 'climb';

  // Landing final has priority once the mission says land
  if (st.phase === 'land' || ap.phase === 'final') {
    const tap = airport(m.targetAirport);
    const th = threshold(tap);
    const dx = Math.sin(tap.landHeading), dz = -Math.cos(tap.landHeading);
    // approach fix: 2100 m before threshold, 250 m up
    const fixX = th.x - dx * 2100, fixZ = th.z - dz * 2100;
    const dTh = (p.x - th.x) * -dx + (p.z - th.z) * -dz; // distance before threshold along approach
    const slope = m.type === 'landing_challenge' ? 0.10 : 0.062;
    if (ap.phase !== 'final') {
      const dFix = steerTo(p, input, fixX, tap.elev + slope * 2100 + 14, fixZ, 62);
      p.flaps = dFix < 2600 ? 1 : 0;
      if (dFix < 420) ap.phase = 'final';
      return input;
    }
    // FINAL: centreline carrot + glide slope. The slope line is anchored at
    // the aim point: for the crosswind challenge the ring line crosses the
    // threshold at 52 m and touches down ~450 m in; full flights aim at the
    // threshold itself.
    const aim = m.type === 'landing_challenge' ? 450 : 0;
    if (dTh < -(aim + 420) && !st.touchdownInfo) { ap.phase = 'approach'; return input; } // overshot: go around
    p.gearDown = true;
    p.flaps = dTh < 1200 ? 2 : 1;
    if (dTh + aim < 200) {
      // FLARE: engines idle, aim below the surface, let it settle through
      // ground effect instead of floating on the cushion.
      p.flaps = 2;
      const fx2 = th.x - dx * (dTh - 200), fz2 = th.z - dz * (dTh - 200);
      steerTo(p, input, fx2, tap.elev + 0.6, fz2, stall + 4, { glide: true, flare: true });
      input.throttleSet = 0.05;
      return input;
    }
    const cx = th.x - dx * (dTh - 320), cz = th.z - dz * (dTh - 320);
    const slopeY = tap.elev + 3.1 + Math.max(0, dTh + aim) * slope;
    steerTo(p, input, cx, slopeY, cz, stall + 9, { glide: true, flare: dTh + aim < 200 });
    if (dTh < 260) { input.throttleSet = clamp(0.3 + (stall + 8 - p.speed) * 0.02, 0.08, 0.6); }
    return input;
  }

  // Ring course / climb
  let tx, ty, tz;
  if (st.ringIdx < m.rings.length) {
    const r = m.rings[st.ringIdx];
    tx = r.x; ty = r.y; tz = r.z;
  } else if (m.type === 'rings_only') {
    tx = 0; ty = 300; tz = 0;
  } else {
    const tap = airport(m.targetAirport);
    tx = tap.x; ty = 320; tz = tap.z;
  }
  const speedWant = ap.phase === 'climb' ? 56 : 63;
  const dist = steerTo(p, input, tx, Math.max(ty, 90), tz, speedWant);
  if (dist < 4000 && ap.phase === 'climb') ap.phase = 'course';
  p.flaps = 0;
  if (p.gearDown && p.y > 60) p.gearDown = false;
  return input;
}
