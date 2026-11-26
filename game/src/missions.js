// Mission state machine, scoring and GPWS alerts.
import { airport, threshold } from './config.js';
import { createPlane, stallSpeed } from './physics.js';
import { overRunway } from './geo.js';

export function spawnFor(m, spec) {
  if (m.customSpawn) {
    const s = m.customSpawn;
    return createPlane({ x: s.x, y: s.y, z: s.z, heading: s.heading, speed: s.speed, throttle: s.throttle, gearDown: s.gearDown, flaps: s.flaps, onGround: false }, spec);
  }
  const ap = airport(m.startAirport);
  if (m.forceAirStart) {
    return createPlane({ x: -200, y: 260, z: 0, heading: Math.PI / 2, speed: 75, throttle: 0.72, gearDown: false, flaps: 0, onGround: false }, spec);
  }
  const dx = Math.sin(ap.landHeading), dz = -Math.cos(ap.landHeading);
  return createPlane({
    x: ap.x - dx * (ap.length / 2 - 60), y: ap.elev + (spec ? spec.gearHeight : 3.1), z: ap.z - dz * (ap.length / 2 - 60),
    heading: ap.landHeading, speed: 0, throttle: 0, gearDown: true, flaps: 0, onGround: true
  }, spec);
}

export function createMission(m) {
  return { m, t: 0, ringIdx: 0, ringsPassed: 0, score: 0, completed: false, failed: false, touchdownInfo: null, phase: 'rings' };
}

export function objectiveText(st, p) {
  const m = st.m;
  if (st.completed) return 'Mission complete — well flown.';
  if (m.type === 'sandbox') return 'Explore the archipelago or practice touch-and-go landings.';
  if (st.ringIdx < m.rings.length) {
    if (p.onGround && st.ringsPassed === 0 && m.type === 'full_flight') return 'Throttle up, rotate at 76 kt, climb out east.';
    return `Fly through sky ring ${st.ringsPassed + 1} of ${m.rings.length}`;
  }
  if (m.type === 'rings_only') return 'Final ring — hold on…';
  const ap = airport(m.targetAirport);
  return `Gear down, land on ${ap.name} ${ap.runway} and brake to a full stop`;
}

export function updateMission(st, p, dt, evts) {
  const out = [];
  if (st.completed || p.crashed) { if (p.crashed) st.failed = true; return out; }
  st.t += dt;
  const m = st.m;
  for (const e of evts) {
    if (e.type === 'touchdown') st.touchdownInfo = { ...e, sinkFpm: Math.round(Math.abs(e.sink) * 196.85) };
  }
  if (st.ringIdx < m.rings.length) {
    const r = m.rings[st.ringIdx];
    const d = Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z);
    if (d <= r.r + 8) {
      st.ringIdx++; st.ringsPassed++;
      st.score += 300;
      out.push({ type: 'ring' });
    }
  }
  if (m.type === 'rings_only' && st.ringIdx >= m.rings.length && m.rings.length > 0) {
    st.completed = true;
    st.score += Math.max(200, Math.round(1500 - st.t * 8));
    out.push({ type: 'complete' });
    return out;
  }
  if ((m.type === 'full_flight' || m.type === 'landing_challenge') && st.ringIdx >= m.rings.length) {
    st.phase = 'land';
    const ap = airport(m.targetAirport);
    if (p.onGround && st.touchdownInfo && overRunway(ap, p.x, p.z) && p.speed < 3) {
      st.completed = true;
      const sink = Math.abs(st.touchdownInfo.sinkFpm || 900);
      let bonus = Math.max(300, 1200 - sink);
      if (m.type === 'landing_challenge') {
        bonus = { BUTTER: 1500, FIRM: 900, HEAVY: 450, HARD: 150 }[st.touchdownInfo.grade] || 300;
      } else {
        bonus += Math.max(100, Math.round(1200 - st.t * 4));
      }
      st.score += bonus;
      st.landingBonus = bonus;
      out.push({ type: 'complete' });
    }
  }
  return out;
}

export function gpwsAlert(p, surfaceY) {
  if (p.onGround || p.crashed) return '';
  const agl = p.y - surfaceY;
  const stall = stallSpeed(p);
  if (p.vy < -15 && agl < 320) return 'PULL UP';
  if (p.speed < stall * 1.03) return 'STALL';
  if (p.vy > 1) return ''; // climbing: no configuration alerts
  if (p.vy < -10.5 && agl < 170) return 'SINK RATE';
  if (!p.gearDown && agl < 130 && p.speed < 56) return 'TOO LOW — GEAR';
  if (p.gearDown && p.flaps === 0 && agl < 130 && p.speed < 56) return 'TOO LOW — FLAPS';
  return '';
}
export { threshold };
