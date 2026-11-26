// HUD facade: DOM tapes/cards plus the canvas attitude panel.
import { KT, FPM, FT } from './config.js';

const el = {};
export function initHud() {
  for (const id of ['mname', 'timer', 'score', 'obj', 'rings', 'prog', 'spd', 'alt', 'vs', 'hdg',
    'thr', 'gear', 'flaps', 'alert', 'arrow', 'adist', 'panel', 'wind']) el[id] = document.getElementById('hud-' + id);
  el.ctx = el.panel ? el.panel.getContext('2d') : null;
}
const fmt = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, '0');

export function updateHud(st, p, alert, target) {
  if (!el.mname) return;
  el.mname.textContent = st ? st.m.name : '';
  if (st) {
    const mins = String(Math.floor(st.t / 60)).padStart(2, '0');
    const secs = String(Math.floor(st.t % 60)).padStart(2, '0');
    el.timer.textContent = `${mins}:${secs}`;
    el.score.textContent = fmt(st.score, 5);
    el.rings.textContent = st.m.rings.length ? `RINGS ${st.ringsPassed}/${st.m.rings.length}` : '';
    const total = st.m.rings.length + (st.m.targetAirport ? 1 : 0);
    const done = st.ringsPassed + (st.phase === 'land' ? 0.6 : 0) + (st.completed ? 0.4 : 0);
    el.prog.style.width = (total ? Math.min(100, done / total * 100) : 100) + '%';
    el.wind.textContent = `WIND ${Math.round(Math.hypot(st.m.wind.x, st.m.wind.z) * KT)} KT`;
  }
  el.spd.textContent = fmt(p.speed * KT, 3);
  el.alt.textContent = fmt(Math.max(0, (p.y - 3.1)) * FT, 5);
  const vs = p.onGround ? 0 : p.vy * FPM;
  el.vs.textContent = (vs >= 0 ? '+' : '−') + fmt(Math.abs(vs), 4);
  let hdg = Math.round(p.heading * 180 / Math.PI) % 360; if (hdg < 0) hdg += 360;
  el.hdg.textContent = fmt(hdg, 3) + '°';
  el.thr.style.width = Math.round(p.throttle * 100) + '%';
  el.gear.textContent = p.gearT > 0.85 ? 'GEAR DOWN' : p.gearT < 0.15 ? 'GEAR UP' : 'GEAR MOVING';
  el.gear.className = 'chip ' + (p.gearT > 0.85 ? 'ok' : p.gearT < 0.15 ? 'dim' : 'warn');
  el.flaps.textContent = 'FLAPS ' + ['UP', '1', 'FULL'][p.flaps];
  el.flaps.className = 'chip ' + (p.flaps ? 'ok' : 'dim');
  el.alert.textContent = alert || '';
  el.alert.style.opacity = alert ? '1' : '0';
  if (target) {
    const dx = target.x - p.x, dz = target.z - p.z;
    const bearing = Math.atan2(dx, -dz);
    let rel = bearing - p.heading;
    el.arrow.style.transform = `rotate(${rel * 180 / Math.PI}deg)`;
    el.adist.textContent = Math.round(Math.hypot(dx, dz, target.y - p.y)) + ' m';
    el.arrow.style.opacity = '1';
  } else el.arrow.style.opacity = '0';
  drawPanel(p);
}

function drawPanel(p) {
  const c = el.ctx; if (!c) return;
  const W = 300, H = 190, cx = W / 2, cy = H / 2;
  c.clearRect(0, 0, W, H);
  c.save();
  c.beginPath(); c.arc(cx, cy, 86, 0, Math.PI * 2); c.clip();
  c.translate(cx, cy);
  c.rotate(-p.bank);
  const pitchPx = Math.max(-52, Math.min(52, -p.pitch * 130));
  c.translate(0, pitchPx);
  c.fillStyle = '#2f7fc4'; c.fillRect(-120, -160, 240, 160);
  c.fillStyle = '#8a6a42'; c.fillRect(-120, 0, 240, 160);
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-120, 0); c.lineTo(120, 0); c.stroke();
  c.fillStyle = '#fff'; c.font = 'bold 10px Inter, sans-serif'; c.textAlign = 'left';
  for (const d of [-20, -10, 10, 20]) {
    const y = d * 2.6 * (Math.PI / 18) * 4.33;
    const yy = -d * 1.44;
    c.beginPath(); c.moveTo(-26, yy); c.lineTo(26, yy); c.stroke();
    c.fillText(Math.abs(d) + '', 30, yy + 3);
  }
  c.restore();
  // fixed aircraft symbol + bank pointer
  c.strokeStyle = '#ffb340'; c.lineWidth = 3.5;
  c.beginPath(); c.moveTo(cx - 44, cy); c.lineTo(cx - 12, cy); c.lineTo(cx - 12, cy + 9);
  c.moveTo(cx + 44, cy); c.lineTo(cx + 12, cy); c.lineTo(cx + 12, cy + 9); c.stroke();
  c.fillStyle = '#ffb340';
  c.beginPath(); c.arc(cx, cy, 3.4, 0, Math.PI * 2); c.fill();
  c.save();
  c.translate(cx, cy); c.rotate(-p.bank);
  c.beginPath(); c.moveTo(0, -80); c.lineTo(-6, -68); c.lineTo(6, -68); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
  c.beginPath(); c.arc(cx, cy, 86, 0, Math.PI * 2); c.stroke();
}
