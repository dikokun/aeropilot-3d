// Flight model: arcade-true aerodynamics for a twin turboprop airliner.
// Lift/stall with flap stages, ground effect, ground roll and rotation,
// wind, touchdown grading by sink rate (fpm) and centreline offset.
import { PLANE, FPM } from './config.js';

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export function angDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stallSpeed(p) {
  const flapFactor = [1, 0.93, 0.85][p.flaps] || 1;
  return PLANE.stall * flapFactor * (1 + p.damage * 0.002);
}

export function createPlane(spawn) {
  return {
    x: spawn.x, y: spawn.y, z: spawn.z,
    heading: spawn.heading || 0, pitch: 0, bank: 0,
    speed: spawn.speed || 0, vy: 0, groundSpeed: spawn.speed || 0,
    throttle: spawn.throttle || 0, flaps: spawn.flaps || 0,
    gearDown: spawn.gearDown !== false, gearT: spawn.gearDown === false ? 0 : 1,
    onGround: !!spawn.onGround, damage: 0, crashed: false,
    brake: false, t: 0, touchdown: null, stopped: false,
    propPhase: 0
  };
}

// groundYAt(x, z) returns the terrain/runway surface height.
export function stepPlane(p, input, dt, groundYAt, wind) {
  const ev = [];
  if (p.crashed) return ev;
  p.t += dt;
  const stall = stallSpeed(p);
  p.throttle = clamp(p.throttle + (input.throttleDelta || 0) * dt, 0, 1);
  if (input.throttleSet !== undefined) p.throttle = clamp(input.throttleSet, 0, 1);
  p.gearT = clamp(p.gearT + (p.gearDown ? dt / 2.2 : -dt / 2.2), 0, 1);
  const gearOut = p.gearT > 0.85;
  const clearance = gearOut ? PLANE.gearHeight : PLANE.bellyHeight;
  const groundY = groundYAt(p.x, p.z) + clearance;

  if (p.onGround) {
    const thrustA = PLANE.thrust * p.throttle * (1 - p.damage * 0.004);
    const dragA = PLANE.drag * p.groundSpeed * p.groundSpeed * 0.06 + (input.brake ? 5.2 : 0.3);
    p.groundSpeed = Math.max(0, p.groundSpeed + (thrustA - dragA * Math.sign(p.groundSpeed || 1)) * dt);
    if (p.throttle < 0.03 && p.groundSpeed < 0.05) p.groundSpeed = 0;
    p.speed = p.groundSpeed;
    const fx = Math.sin(p.heading), fz = -Math.cos(p.heading);
    p.x += fx * p.groundSpeed * dt + (wind ? wind.x * 0 : 0);
    p.z += fz * p.groundSpeed * dt;
    p.y = groundYAt(p.x, p.z) + clearance;
    p.vy = 0;
    // Steering on the ground at low speed
    if (p.groundSpeed > 1 && p.groundSpeed < 18) p.heading += input.roll * -0.35 * dt * (p.groundSpeed / 18);
    // Rotation
    if (p.groundSpeed > stall * 0.94 && input.pitch > 0.22) {
      p.onGround = false;
      p.pitch = 0.10;
      ev.push({ type: 'liftoff' });
    }
    p.pitch = lerp(p.pitch, 0, dt * 3);
    p.bank = lerp(p.bank, 0, dt * 3);
    if (p.groundSpeed === 0 && p.throttle < 0.05) {
      if (!p.stopped) { p.stopped = true; ev.push({ type: 'stopped' }); }
    } else p.stopped = false;
    p.propPhase += dt * (4 + p.throttle * 46);
    return ev;
  }

  // Airborne
  p.stopped = false;
  const turnRate = Math.sin(p.bank) * 1.55;
  p.heading += turnRate * dt * clamp(p.speed / 40, 0.35, 1.3);
  const targetBank = clamp(input.roll * -1.02, -1.05, 1.05);
  p.bank += clamp(targetBank - p.bank, -2.6 * dt, 2.6 * dt);
  const liftFrac = clamp(p.speed / stall, 0, 1.14);
  const targetPitch = clamp(input.pitch * 0.40, -0.40, 0.42);
  const pitchAuth = clamp(liftFrac, 0.25, 1);
  p.pitch += clamp(targetPitch - p.pitch, -1.7 * pitchAuth * dt, 1.7 * pitchAuth * dt);
  if (liftFrac < 0.86) p.pitch -= (0.86 - liftFrac) * 0.55 * dt; // stall nose-drop

  const thrustA = PLANE.thrust * p.throttle * (1 - p.damage * 0.004);
  const dragK = PLANE.drag * (1 + p.flaps * 0.38) * (gearOut ? 1.22 : 1);
  const accel = thrustA - dragK * p.speed * p.speed * 0.055 - Math.sin(p.pitch) * 9.81 * clamp(liftFrac, 0, 1);
  p.speed = Math.max(0, p.speed + accel * dt);

  let vy = Math.sin(p.pitch) * p.speed * Math.min(1, liftFrac)
    - 9.81 * (1 - Math.min(1, liftFrac)) * 0.94;
  if (liftFrac < 1) vy -= (1 - liftFrac) * (1 - liftFrac) * 13; // stall sink
  const agl = p.y - groundY;
  if (agl < 13 && vy < 0) vy *= 0.5 + 0.5 * (agl / 13); // ground effect cushion
  p.vy = vy;
  const fx = Math.sin(p.heading), fz = -Math.cos(p.heading);
  p.x += (fx * p.speed + (wind ? wind.x : 0)) * dt;
  p.z += (fz * p.speed + (wind ? wind.z : 0)) * dt;
  p.y += vy * dt;
  p.propPhase += dt * (4 + p.throttle * 46);

  if (p.y <= groundY) {
    p.y = groundY;
    const sink = -vy;
    const gearOk = gearOut;
    const severity = sink * (gearOk ? 1 : 2.1);
    let grade = 'BUTTER';
    if (severity > 3.4) grade = 'FIRM';
    if (severity > 5.2) grade = 'HEAVY';
    if (severity > 7.6) grade = 'HARD';
    p.touchdown = { sinkFpm: Math.round(sink * FPM), grade, gearOk, x: p.x, z: p.z, t: p.t };
    ev.push({ type: 'touchdown', sink, grade, gearOk });
    if (severity > 9.8 || p.speed > 118) {
      p.crashed = true;
      p.damage = 100;
      ev.push({ type: 'crash' });
      return ev;
    }
    if (!gearOk) p.damage = Math.min(100, p.damage + 26);
    else p.damage = Math.min(100, p.damage + Math.max(0, (severity - 3.4)) * 5);
    p.onGround = true;
    p.groundSpeed = p.speed;
    p.pitch = 0;
  }
  return ev;
}
