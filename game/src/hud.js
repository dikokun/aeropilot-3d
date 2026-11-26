// HUD facade: DOM tapes/cards plus the canvas attitude panel.
import { KT, FPM, FT, AIRPORTS } from './config.js';

const el = {};
export function initHud() {
  for (const id of ['mname', 'timer', 'score', 'obj', 'rings', 'prog', 'spd', 'alt', 'vs', 'hdg',
    'thr', 'thrpct', 'gear', 'flaps', 'brake', 'alert', 'arrow', 'adist', 'wp', 'panel', 'wind', 'radar']) el[id] = document.getElementById('hud-' + id);
  el.ctx = el.panel ? el.panel.getContext('2d') : null;
  el.rctx = el.radar ? el.radar.getContext('2d') : null;
}
const fmt = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, '0');

export function updateHud(st, p, alert, target, brake) {
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
  el.thr.style.height = Math.round(p.throttle * 100) + '%';
  if (el.thrpct) el.thrpct.textContent = Math.round(p.throttle * 100) + '%';
  if (el.brake) {
    el.brake.textContent = brake ? 'BRAKE ON' : 'BRAKE OFF';
    el.brake.className = 'chip ' + (brake ? 'warn' : 'dim');
  }
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
    const dist = Math.hypot(dx, dz, target.y - p.y);
    el.adist.textContent = Math.round(dist) + ' m';
    if (el.wp) el.wp.textContent = 'WP ' + (dist / 1852).toFixed(1) + ' NM';
    el.arrow.style.opacity = '1';
  } else { el.arrow.style.opacity = '0'; if (el.wp) el.wp.textContent = ''; }
  drawRadar(st, p);
  drawPanel(p);
}

// Heading-up radar scope: airports and rings as blips around the aircraft.
function drawRadar(st, p) {
  const c = el.rctx; if (!c) return;
  const S = 150, C = S / 2, R = C - 4, RANGE = 4800;
  c.clearRect(0, 0, S, S);
  c.fillStyle = 'rgba(8, 26, 34, 0.82)';
  c.beginPath(); c.arc(C, C, R, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(110, 200, 236, 0.5)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(C, C, R, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(110, 200, 236, 0.22)'; c.lineWidth = 1;
  for (const f of [0.66, 0.33]) { c.beginPath(); c.arc(C, C, R * f, 0, Math.PI * 2); c.stroke(); }
  const blip = (wx, wz, color, size) => {
    const dx = wx - p.x, dz = wz - p.z;
    const d = Math.hypot(dx, dz); if (d > RANGE) return;
    const rel = Math.atan2(dx, -dz) - p.heading;
    const r = (d / RANGE) * R;
    c.fillStyle = color;
    c.beginPath(); c.arc(C + Math.sin(rel) * r, C - Math.cos(rel) * r, size, 0, Math.PI * 2); c.fill();
  };
  for (const a of AIRPORTS) blip(a.x, a.z, '#ffffff', 3);
  if (st) st.m.rings.forEach((r, i) => { if (i >= st.ringsPassed) blip(r.x, r.z, i === st.ringIdx ? '#ffb340' : 'rgba(127,227,255,0.75)', i === st.ringIdx ? 4 : 2.5); });
  c.fillStyle = '#7fe3ff';
  c.beginPath(); c.moveTo(C, C - 6); c.lineTo(C + 4.5, C + 5); c.lineTo(C - 4.5, C + 5); c.closePath(); c.fill();
  c.fillStyle = 'rgba(234,246,251,0.85)';
  c.font = '700 9px system-ui'; c.textAlign = 'center'; c.fillText('N', C, 12);
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
