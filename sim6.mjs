// Node sim proof: the autopilot flies each scored mission end to end.
import { mission } from './game/src/config.js';
import { surfaceAt } from './game/src/geo.js';
import { stepPlane } from './game/src/physics.js';
import { spawnFor, createMission, updateMission } from './game/src/missions.js';
import { createAutopilot, autopilotStep, primeFinal } from './game/src/autopilot.js';

function fly(id, maxT = 900) {
  const m = mission(id);
  const p = spawnFor(m);
  const st = createMission(m);
  const ap = createAutopilot();
  if (id === 'final_approach') primeFinal(ap);
  const dt = 1 / 30;
  let steps = 0;
  while (!st.completed && !p.crashed && st.t < maxT) {
    const input = autopilotStep(ap, st, p, dt);
    const evts = stepPlane(p, input, dt, surfaceAt, m.wind);
    updateMission(st, p, dt, evts);
    steps++;
    if (steps > maxT * 30 * 1.2) break;
  }
  const td = st.touchdownInfo;
  console.log(`${st.completed ? 'PASS' : 'FAIL'} ${id} t=${st.t.toFixed(0)}s rings=${st.ringsPassed}/${m.rings.length} score=${st.score}` +
    (td ? ` touchdown=${td.grade} sink=${Math.abs(td.sinkFpm)}fpm` : '') +
    (p.crashed ? ' CRASHED' : '') + ` end=(${p.x.toFixed(0)},${p.z.toFixed(0)}) speed=${p.speed.toFixed(0)}`);
  return st.completed;
}
let ok = 0, n = 0;
for (const id of ['island_hopper', 'canyon_slalom', 'final_approach']) { n++; if (fly(id)) ok++; }
console.log(`== ${ok}/${n} missions complete ==`);
