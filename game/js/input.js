// AeroPilot V8 — pilot input: the ONE path every control command takes,
// whether it comes from a person at the keyboard/mouse or from the
// verification autopilot in the test harness. Commands are targets that
// the hands reach at human speed (smoothed), never instant steps — so a
// mission the autopilot completes through this module is a mission a
// person can actually fly, and a control scheme that feels broken shows
// up in the tests instead of only in the player's hands.

(function () {
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  // Exponential approach: fast enough to feel responsive, slow enough
  // that a jabbed key does not snap the aircraft.
  function approach(cur, target, rate, dt) {
    return cur + (target - cur) * Math.min(1, dt * rate);
  }

  class PilotInput {
    constructor() {
      this.keys = new Set();
      this.mouseOn = true;        // mouse yoke, on by default
      this.mouseX = 0;            // -1..1, right positive
      this.mouseY = 0;            // -1..1, DOWN positive (pull back)
      this.pitch = 0;
      this.roll = 0;
      this.yaw = 0;
      this.throttle = 0;
      this.brakes = true;
      this.toggles = [];          // edge events: 'gear', 'flaps'
    }

    keyDown(code) {
      if (code === 'KeyB') this.brakes = !this.brakes;
      if (code === 'KeyG') this.toggles.push('gear');
      if (code === 'KeyF') this.toggles.push('flaps');
      if (code === 'KeyM') this.mouseOn = !this.mouseOn;
      this.keys.add(code);
    }
    keyUp(code) { this.keys.delete(code); }
    setMouse(nx, ny) { this.mouseX = clamp(nx, -1, 1); this.mouseY = clamp(ny, -1, 1); }
    takeToggles() { const t = this.toggles; this.toggles = []; return t; }

    update(dt) {
      const k = this.keys;
      // Stick targets from the arrow keys.
      let tPitch = 0, tRoll = 0;
      if (k.has('ArrowDown')) tPitch += 1;    // pull back = climb
      if (k.has('ArrowUp')) tPitch -= 1;      // push = descend
      if (k.has('ArrowRight')) tRoll += 1;
      if (k.has('ArrowLeft')) tRoll -= 1;

      // Mouse yoke fills in only where the keys are silent, so a player
      // can blend both without the two fighting.
      if (this.mouseOn && tPitch === 0 && Math.abs(this.mouseY) > 0.05) tPitch = this.mouseY;
      if (this.mouseOn && tRoll === 0 && Math.abs(this.mouseX) > 0.05) tRoll = this.mouseX;

      let tYaw = 0;
      if (k.has('KeyD')) tYaw += 1;
      if (k.has('KeyA')) tYaw -= 1;

      this.pitch = approach(this.pitch, clamp(tPitch, -1, 1), 6.0, dt);
      this.roll = approach(this.roll, clamp(tRoll, -1, 1), 6.5, dt);
      this.yaw = approach(this.yaw, tYaw, 7.0, dt);

      // Throttle lever: W/S walk it up and down like a hand on the quadrant.
      if (k.has('KeyW')) this.throttle = clamp(this.throttle + dt * 0.55, 0, 1);
      if (k.has('KeyS')) this.throttle = clamp(this.throttle - dt * 0.7, 0, 1);
      // Pushing the power to the stop lets the parking brake go by itself.
      if (this.throttle > 0.92) this.brakes = false;

      return {
        pitch: this.pitch, roll: this.roll, yaw: this.yaw,
        throttle: this.throttle, brakes: this.brakes
      };
    }
  }

  window.PilotInput = PilotInput;
})();
