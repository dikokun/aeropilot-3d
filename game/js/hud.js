// AeroPilot 3D — HUD: the digital readouts (IAS, ALT, VSI, HDG, waypoint
// distance, throttle bar), the annunciator chips, the GPWS warning banner,
// and two canvas instruments — an artificial horizon with a pitch ladder and
// a heading-up radar scope with islands, runways and the active waypoint.
class FlightHUD {
  constructor() {
    this.horizonCanvas = document.getElementById('horizon-canvas');
    this.hCtx = this.horizonCanvas.getContext('2d');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.rCtx = this.radarCanvas.getContext('2d');

    this.elIas = document.getElementById('hud-ias');
    this.elAlt = document.getElementById('hud-alt');
    this.elVsi = document.getElementById('hud-vsi');
    this.elHdg = document.getElementById('hud-heading');
    this.elWpDist = document.getElementById('hud-waypoint-dist');
    this.elThrFill = document.getElementById('hud-throttle-fill');
    this.elThrVal = document.getElementById('hud-throttle-val');

    this.annGear = document.getElementById('ann-gear');
    this.annFlaps = document.getElementById('ann-flaps');
    this.annBrake = document.getElementById('ann-brake');
    this.annGround = document.getElementById('ann-ground');
    this.warnBanner = document.getElementById('warning-banner');
  }

  update(physics, world, targetPos) {
    const ias = Math.round(physics.getAirspeedKnots());
    const alt = Math.round(physics.getAltitudeFeet());
    const vsi = Math.round(physics.getVerticalSpeedFpm());
    const { pitchDeg, rollDeg, headingDeg } = physics.getOrientationEuler();

    this.elIas.textContent = ias;
    this.elAlt.textContent = alt.toLocaleString();
    this.elVsi.textContent = (vsi >= 0 ? '+' : '') + vsi;
    this.elVsi.style.color = vsi < -650 ? '#f87171' : '#f8fafc';

    const hdgInt = Math.round(headingDeg) % 360;
    this.elHdg.textContent = String(hdgInt).padStart(3, '0') + '°';

    if (targetPos) {
      const dx = targetPos.x - physics.position.x;
      const dz = targetPos.z - physics.position.z;
      const distMeters = Math.hypot(dx, dz);
      const distNm = (distMeters / 1852).toFixed(1);
      this.elWpDist.textContent = `WP ${distNm} NM`;
    } else {
      this.elWpDist.textContent = 'FREE FLIGHT';
    }

    const thrPct = Math.round(physics.throttle * 100);
    this.elThrFill.style.height = `${thrPct}%`;
    this.elThrVal.textContent = `${thrPct}%`;

    // Annunciators
    this.annGear.textContent = physics.gearDown ? 'GEAR DN' : 'GEAR UP';
    this.annGear.className = 'ann ' + (physics.gearDown ? 'active-green' : '');

    this.annFlaps.textContent = `FLAPS ${physics.flaps * 15}°`;
    this.annFlaps.className = 'ann ' + (physics.flaps > 0 ? 'active-cyan' : '');

    this.annBrake.className = 'ann ' + (physics.brakes ? 'active-amber' : '');
    this.annGround.className = 'ann ' + (physics.onGround ? 'active-cyan' : '');

    // GPWS warnings, worst first
    let warning = '';
    if (physics.isStalling) {
      warning = 'STALL WARNING — PITCH DOWN & ADD THROTTLE';
    } else if (!physics.onGround && alt < 350 && vsi < -700) {
      warning = 'SINK RATE — PULL UP!';
    } else if (!physics.onGround && alt < 300 && !physics.gearDown && ias < 135) {
      warning = 'TOO LOW — GEAR! PRESS [G]';
    }

    if (warning) {
      this.warnBanner.textContent = warning;
      this.warnBanner.classList.remove('hidden');
    } else {
      this.warnBanner.classList.add('hidden');
    }

    this.drawArtificialHorizon(pitchDeg, rollDeg);
    this.drawRadar(physics, world, headingDeg, targetPos);
  }

  drawArtificialHorizon(pitchDeg, rollDeg) {
    const ctx = this.hCtx;
    const w = this.horizonCanvas.width;
    const h = this.horizonCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(THREE.MathUtils.degToRad(-rollDeg));

    const pitchOffset = THREE.MathUtils.clamp(pitchDeg * 2.2, -65, 65);

    // Sky & ground halves
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-w, -h + pitchOffset, w * 2, h);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-w, pitchOffset, w * 2, h);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, pitchOffset);
    ctx.lineTo(w, pitchOffset);
    ctx.stroke();

    // Pitch ladder
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    for (let p = -20; p <= 20; p += 10) {
      if (p === 0) continue;
      const y = pitchOffset - p * 2.2;
      ctx.beginPath();
      ctx.moveTo(-22, y);
      ctx.lineTo(22, y);
      ctx.stroke();
    }

    ctx.restore();

    // Fixed aircraft reference wings
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy);
    ctx.lineTo(cx - 12, cy);
    ctx.lineTo(cx - 12, cy + 6);
    ctx.moveTo(cx + 38, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx + 12, cy + 6);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRadar(physics, world, headingDeg, targetPos) {
    const ctx = this.rCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const range = 3600; // meters radius
    const scale = (cx - 8) / range;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#071526';
    ctx.fillRect(0, 0, w, h);

    // Range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(THREE.MathUtils.degToRad(-headingDeg)); // heading-up

    // Islands
    ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
    for (const isl of world.islands) {
      const rx = (isl.x - physics.position.x) * scale;
      const rz = (isl.z - physics.position.z) * scale;
      ctx.beginPath();
      ctx.ellipse(rx, rz, isl.radiusX * scale, isl.radiusZ * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Runways
    ctx.fillStyle = '#e2e8f0';
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      const rx = (ap.x - physics.position.x) * scale;
      const rz = (ap.z - physics.position.z) * scale;
      ctx.fillRect(rx - (ap.length * scale) / 2, rz - 2, ap.length * scale, 4);
    }

    // Active waypoint, clamped to the scope edge
    if (targetPos) {
      const tx = (targetPos.x - physics.position.x) * scale;
      const tz = (targetPos.z - physics.position.z) * scale;
      const dist = Math.hypot(tx, tz);
      const clampedDist = Math.min(dist, cx - 10);
      const angle = Math.atan2(tz, tx);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * clampedDist, Math.sin(angle) * clampedDist, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Own-aircraft triangle at center
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4.5, cy + 5);
    ctx.lineTo(cx + 4.5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }
}

window.FlightHUD = FlightHUD;
