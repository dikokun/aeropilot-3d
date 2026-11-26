// AeroPilot V8 — mission briefing/state: spawns, ring progress, scoring.
// Rendering lives in the cockpit module; this file only keeps the truth
// about where the mission stands.

(function () {
  class Briefing {
    constructor() {
      this.route = null;
      this.routeId = null;
      this.elapsed = 0;
      this.ringsDone = 0;
      this.done = false;
      this.score = 0;
    }

    start(routeId, world, engine) {
      const data = window.AERO_DATA;
      const route = data.ROUTES[routeId];
      this.route = route;
      this.routeId = routeId;
      this.elapsed = 0;
      this.ringsDone = 0;
      this.done = false;
      this.score = 0;
      world.setRings(route.rings);

      if (route.spawn) {
        engine.reset(route.spawn);
      } else if (route.airStart) {
        engine.reset({ x: -200, y: 260, z: 0, hdg: 90, kt: 145, thr: 0.72, gear: false, flaps: 0 });
      } else {
        const ap = data.AIRFIELDS.find(a => a.id === route.from);
        engine.reset({
          x: ap.x - ap.len / 2 + 85, y: ap.elev + engine.spec.gearM, z: ap.z,
          hdg: 90, kt: 0, thr: 0, gear: true, flaps: 0
        });
      }
    }

    ringsTotal() { return this.route ? this.route.rings.length : 0; }

    targetPos() {
      if (!this.route) return null;
      if (this.ringsDone < this.ringsTotal()) {
        const r = this.route.rings[this.ringsDone];
        return { x: r[0], y: r[1], z: r[2] };
      }
      if (this.route.to) {
        const ap = window.AERO_DATA.AIRFIELDS.find(a => a.id === this.route.to);
        if (ap) return { x: ap.x, y: ap.elev + 10, z: ap.z };
      }
      return null;
    }

    objective(engine) {
      const r = this.route;
      if (!r) return '';
      if (r.kind === 'free') return 'Explore the archipelago, or practise touch-and-go landings.';
      if (this.ringsDone < this.ringsTotal()) {
        if (engine.onGround && this.ringsDone === 0 && r.kind === 'full') {
          return 'Brakes off [B], throttle up [W], pull back at rotate speed';
        }
        return 'Fly through sky ring ' + (this.ringsDone + 1) + ' of ' + this.ringsTotal();
      }
      if (r.kind === 'rings') return 'All rings flown — mission complete';
      const ap = window.AERO_DATA.AIRFIELDS.find(a => a.id === r.to);
      return 'Gear down [G], land at ' + ap.name + ' and brake [B] to a stop';
    }

    progress(engine) {
      const r = this.route;
      if (!r || r.kind === 'free') return r ? 1 : 0;
      const steps = this.ringsTotal() + (r.kind === 'rings' ? 0 : 1);
      if (this.done) return 1;
      if (this.ringsDone < this.ringsTotal()) return this.ringsDone / steps;
      return this.ringsTotal() / steps;
    }

    update(dt, engine, world, sound) {
      if (!this.route || this.done || engine.crashed) return;
      this.elapsed += dt;
      const total = this.ringsTotal();

      if (this.ringsDone < total) {
        const r = this.route.rings[this.ringsDone];
        const dx = engine.x - r[0], dy = engine.y - r[1], dz = engine.z - r[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= r[3] + 8) {
          this.ringsDone++;
          this.score += 300;
          if (sound) sound.ring();
        }
      }
      world.markRings(this.ringsDone, this.ringsDone);

      if (this.ringsDone >= total) {
        if (this.route.kind === 'rings') {
          this.done = true;
          this.score += Math.max(200, Math.round(1500 - this.elapsed * 8));
        } else if (this.route.kind !== 'free' && this.route.to) {
          const landed = world.runwayAt(engine.x, engine.z);
          if (engine.onGround && landed && landed.id === this.route.to && engine.iasKt() < 6) {
            this.done = true;
            const landingBonus = Math.max(300, 1200 - Math.abs(engine.touchVsiFpm));
            const timeBonus = Math.max(100, Math.round(1200 - this.elapsed * 4));
            this.score += landingBonus + timeBonus;
          }
        }
      }
    }
  }

  window.Briefing = Briefing;
})();
