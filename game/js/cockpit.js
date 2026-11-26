// AeroPilot V8 — cockpit: renders engine + mission state into the HUD.
// Read-only view; it never feeds anything back into the simulation.

(function () {
  function $(id) { return document.getElementById(id); }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  class Cockpit {
    constructor() {
      this.ias = $('v-ias'); this.alt = $('v-alt'); this.vsi = $('v-vsi'); this.hdg = $('v-hdg');
      this.thr = $('v-thr'); this.gear = $('chip-gear'); this.flap = $('chip-flap');
      this.brake = $('chip-brake'); this.mouse = $('chip-mouse'); this.warn = $('v-warn');
      this.mission = $('v-mission'); this.clock = $('v-clock'); this.obj = $('v-obj');
      this.prog = $('v-prog'); this.arrow = $('v-arrow'); this.dist = $('v-dist');
      this.score = $('v-score'); this.rings = $('v-rings');
    }

    update(e, b, input) {
      this.ias.textContent = Math.round(e.iasKt());
      this.alt.textContent = Math.round(e.altFt()).toLocaleString('en-US');
      const v = Math.round(e.vsiFpm());
      this.vsi.textContent = (v > 0 ? '+' : '') + v.toLocaleString('en-US');
      this.hdg.textContent = pad(Math.round(e.hdgDeg()) % 360, 3);
      this.thr.style.width = Math.round(e.throttle * 100) + '%';

      this.gear.textContent = e.gear ? 'GEAR DOWN' : 'GEAR UP';
      this.gear.className = 'chip ' + (e.gear ? 'ok' : 'alert');
      this.flap.textContent = 'FLAPS ' + (e.flaps * 15) + '°';
      this.flap.className = 'chip' + (e.flaps ? ' on' : '');
      this.brake.textContent = e.brakes ? 'BRAKE ON' : 'BRAKE OFF';
      this.brake.className = 'chip' + (e.brakes ? ' on' : '');
      this.mouse.textContent = input.mouseOn ? 'MOUSE YOKE' : 'KEYS ONLY';
      this.mouse.className = 'chip' + (input.mouseOn ? ' on' : '');

      let warn = '';
      if (e.stalling) warn = 'STALL';
      else if (!e.onGround && !e.gear && e.y < 130) warn = 'GEAR';
      else if (!e.onGround && e.vsiFpm() < -1450 && e.y < 260) warn = 'SINK RATE';
      this.warn.textContent = warn;
      this.warn.style.display = warn ? 'block' : 'none';

      if (b.route) {
        this.mission.textContent = b.route.label;
        const mins = Math.floor(b.elapsed / 60), secs = Math.floor(b.elapsed % 60);
        this.clock.textContent = pad(mins, 2) + ':' + pad(secs, 2);
        this.obj.textContent = b.done ? 'Mission complete — well flown.' : b.objective(e);
        this.prog.style.width = Math.round(b.progress(e) * 100) + '%';
        this.score.textContent = b.score.toLocaleString('en-US');
        this.rings.textContent = b.ringsTotal() ? (b.ringsDone + ' / ' + b.ringsTotal()) : '—';

        const t = b.targetPos();
        if (t && !b.done) {
          const dx = t.x - e.x, dz = t.z - e.z;
          const distM = Math.sqrt(dx * dx + dz * dz);
          const bearing = Math.atan2(dx, -dz) * 180 / Math.PI;
          let rel = bearing - e.hdgDeg();
          while (rel > 180) rel -= 360;
          while (rel < -180) rel += 360;
          this.arrow.style.transform = 'rotate(' + rel + 'deg)';
          this.dist.textContent = (distM / 1852).toFixed(1) + ' NM';
        } else {
          this.dist.textContent = '—';
        }
      }
    }
  }

  window.Cockpit = Cockpit;
})();
