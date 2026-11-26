// Pure geometry: terrain height + runway frames. No three.js — the node
// sim harness imports this file directly.
import { AIRPORTS } from './config.js';

const gauss = (d, s) => Math.exp(-((d / s) * (d / s)));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function rawHeight(x, z) {
  let h = -3;
  h = Math.max(h, 55 * gauss(Math.hypot(x, z), 1500));                       // Emerald island
  h = Math.max(h, 30 * gauss(Math.hypot(x - 4200, z + 2400), 1000));         // Coral atoll
  h = Math.max(h, 150 * gauss(Math.hypot(x - 2760, z + 1105), 460));         // volcano (slalom centrepiece)
  h = Math.max(h, 60 * gauss(Math.hypot(x - 2760, z + 1105), 1100));
  h = Math.max(h, 20 * gauss(Math.hypot(x - 2600, z - 600), 520));
  h = Math.max(h, 26 * gauss(Math.hypot(x + 2200, z + 1800), 720));
  h = Math.max(h, 18 * gauss(Math.hypot(x - 5200, z + 600), 560));
  h = Math.max(h, 15 * gauss(Math.hypot(x + 1500, z - 2200), 620));
  return h;
}

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  for (const ap of AIRPORTS) {
    const d = Math.hypot(x - ap.x, z - ap.z);
    const R = ap.length * 0.85 + 190;
    const t = smooth(R * 0.55, R, d);
    h = h * t + ap.elev * (1 - t);
  }
  return h;
}

export function runwayFrame(ap, x, z) {
  const dirx = Math.sin(ap.axis), dirz = -Math.cos(ap.axis);
  const dx = x - ap.x, dz = z - ap.z;
  return { along: dx * dirx + dz * dirz, cross: dx * -dirz + dz * dirx };
}
export function overRunway(ap, x, z, pad = 12) {
  const f = runwayFrame(ap, x, z);
  return Math.abs(f.along) <= ap.length / 2 + pad && Math.abs(f.cross) <= ap.width / 2 + pad;
}
export function surfaceAt(x, z) {
  for (const ap of AIRPORTS) if (overRunway(ap, x, z)) return ap.elev;
  return Math.max(heightAt(x, z), 0);
}
