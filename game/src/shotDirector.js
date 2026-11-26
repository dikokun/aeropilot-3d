// Staged screenshot states (?shot=<name>): the autopilot flies the real
// mission and the frame freezes at the composed moment.
import { airport, threshold } from './config.js';

export const SHOT_WARP = 45;
export const SHOTS = {
  menu: { menu: true },
  takeoff: { mission: 'island_hopper', freeze: (st, p) => !p.onGround && p.y > 16 },
  rings: {
    mission: 'canyon_slalom',
    freeze: (st, p) => {
      const r = st.m.rings[st.ringIdx];
      return r ? Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z) < 300 : true;
    }
  },
  landing: {
    mission: 'final_approach', prime: 'final',
    freeze: (st, p) => {
      const th = threshold(airport('coral_atoll'));
      return Math.hypot(p.x - th.x, p.z - th.z) < 720 || st.t > 26;
    }
  }
};
