// AeroPilot 3D — head-up display.
// Digital tapes (IAS / ALT / VSI / HDG / waypoint range / throttle), the
// annunciator row, GPWS banner, plus two canvas dials drawn every frame:
// the attitude ball and the heading-up radar scope.
class FlightHUD {
  constructor() {
    const byId = (id) => document.getElementById(id);
    this.ball = byId('horizon-canvas');
    this.ballCtx = this.ball.getContext('2d');
    this.scope = byId('radar-canvas');
    this.scopeCtx = this.scope.getContext('2d');
    this.iasEl = byId('hud-ias');
    this.altEl = byId('hud-alt');
    this.vsiEl = byId('hud-vsi');
    this.hdgEl = byId('hud-heading');
    this.wpEl = byId('hud-waypoint-dist');
    this.thrFillEl = byId('hud-throttle-fill');
    this.thrValEl = byId('hud-throttle-val');
    this.gearChip = byId('ann-gear');
    this.flapChip = byId('ann-flaps');
    this.brakeChip = byId('ann-brake');
    this.groundChip = byId('ann-ground');
    this.banner = byId('warning-banner');
  }

  update(physics, world, targetPos) {
    const knots = Math.round(physics.getAirspeedKnots());
    const feet = Math.round(physics.getAltitudeFeet());
    const fpm = Math.round(physics.getVerticalSpeedFpm());
    const e = physics.getOrientationEuler();

    this.iasEl.textContent = knots;
    this.altEl.textContent = feet.toLocaleString();
    this.vsiEl.textContent = (fpm >= 0 ? '+' : '') + fpm;
    this.vsiEl.style.color = fpm < -650 ? '#f87171' : '#f8fafc';
    this.hdgEl.textContent = String(Math.round(e.headingDeg) % 360).padStart(3, '0') + '°';

    if (targetPos) {
      const nm = Math.hypot(targetPos.x - physics.position.x, targetPos.z - physics.position.z) / 1852;
      this.wpEl.textContent = `WP ${nm.toFixed(1)} NM`;
    } else {
      this.wpEl.textContent = 'FREE FLIGHT';
    }

    const pct = Math.round(physics.throttle * 100);
    this.thrFillEl.style.height = pct + '%';
    this.thrValEl.textContent = pct + '%';

    this.gearChip.textContent = physics.gearDown ? 'GEAR DN' : 'GEAR UP';
    this.gearChip.className = 'ann' + (physics.gearDown ? ' active-green' : '');
    this.flapChip.textContent = `FLAPS ${physics.flaps * 15}°`;
    this.flapChip.className = 'ann' + (physics.flaps > 0 ? ' active-cyan' : '');
    this.brakeChip.className = 'ann' + (physics.brakes ? ' active-amber' : '');
    this.groundChip.className = 'ann' + (physics.onGround ? ' active-cyan' : '');

    // Warning priority: stall, then sink rate, then gear.
    let warn = '';
    if (physics.isStalling) warn = 'STALL WARNING — PITCH DOWN & ADD THROTTLE';
    else if (!physics.onGround && feet < 350 && fpm < -700) warn = 'SINK RATE — PULL UP!';
    else if (!physics.onGround && feet < 300 && !physics.gearDown && knots < 135) warn = 'TOO LOW — GEAR! PRESS [G]';
    this.banner.textContent = warn;
    this.banner.classList.toggle('hidden', !warn);

    this.paintBall(e.pitchDeg, e.rollDeg);
    this.paintScope(physics, world, e.headingDeg, targetPos);
  }

  paintBall(pitchDeg, rollDeg) {
    const g = this.ballCtx, W = this.ball.width, H = this.ball.height;
    const cx = W / 2, cy = H / 2;
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath();
    g.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    g.clip();
    g.translate(cx, cy);
    g.rotate(THREE.MathUtils.degToRad(-rollDeg));
    const off = THREE.MathUtils.clamp(pitchDeg * 2.2, -65, 65);
    g.fillStyle = '#0284c7';
    g.fillRect(-W, -H + off, W * 2, H);
    g.fillStyle = '#78350f';
    g.fillRect(-W, off, W * 2, H);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-W, off);
    g.lineTo(W, off);
    g.stroke();
    g.font = '9px sans-serif';
    g.fillStyle = '#e2e8f0';
    for (let p = -20; p <= 20; p += 10) {
      if (!p) continue;
      const y = off - p * 2.2;
      g.beginPath();
      g.moveTo(-22, y);
      g.lineTo(22, y);
      g.stroke();
    }
    g.restore();
    // Fixed symbol: two wing bars and the center dot, in amber.
    g.strokeStyle = '#facc15';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(cx - 38, cy); g.lineTo(cx - 12, cy); g.lineTo(cx - 12, cy + 6);
    g.moveTo(cx + 38, cy); g.lineTo(cx + 12, cy); g.lineTo(cx + 12, cy + 6);
    g.stroke();
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(cx, cy, 3, 0, Math.PI * 2);
    g.fill();
  }

  paintScope(physics, world, headingDeg, targetPos) {
    const g = this.scopeCtx, W = this.scope.width;
    const cx = W / 2, cy = this.scope.height / 2;
    const scale = (cx - 8) / 3600; // 3.6 km scope radius
    g.clearRect(0, 0, W, this.scope.height);
    g.fillStyle = '#071526';
    g.fillRect(0, 0, W, this.scope.height);
    g.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    g.lineWidth = 1;
    for (const rr of [0.45, 0.85]) {
      g.beginPath();
      g.arc(cx, cy, cx * rr, 0, Math.PI * 2);
      g.stroke();
    }
    g.save();
    g.translate(cx, cy);
    g.rotate(THREE.MathUtils.degToRad(-headingDeg));
    const rel = (x, z) => [(x - physics.position.x) * scale, (z - physics.position.z) * scale];
    g.fillStyle = 'rgba(34, 197, 94, 0.35)';
    for (const isl of world.islands) {
      const [rx, rz] = rel(isl.x, isl.z);
      g.beginPath();
      g.ellipse(rx, rz, isl.radiusX * scale, isl.radiusZ * scale, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e2e8f0';
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      const [rx, rz] = rel(ap.x, ap.z);
      g.fillRect(rx - (ap.length * scale) / 2, rz - 2, ap.length * scale, 4);
    }
    if (targetPos) {
      const [tx, tz] = rel(targetPos.x, targetPos.z);
      const d = Math.min(Math.hypot(tx, tz), cx - 10);
      const a = Math.atan2(tz, tx);
      g.fillStyle = '#4ade80';
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 4.5, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    g.fillStyle = '#38bdf8';
    g.beginPath();
    g.moveTo(cx, cy - 6);
    g.lineTo(cx - 4.5, cy + 5);
    g.lineTo(cx + 4.5, cy + 5);
    g.closePath();
    g.fill();
  }
}

window.FlightHUD = FlightHUD;
