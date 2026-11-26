// AeroPilot V8 — flight engine.
//
// The feel this implements, deliberately: stick inputs command rotation
// RATES, and those rates are scaled by how much air is moving over the
// wings, so the aircraft answers sluggishly at low speed and crisply at
// cruise. Vertical speed is not set directly — it relaxes toward where
// the nose and the lift curve say it should be, which is what makes
// approaches settle instead of porpoising. State is kept in plain scalars
// (no scene-graph math) so the same file can be driven headlessly by the
// verification autopilot.

(function () {
  const KT_PER_MPS = 1.94384;
  const FPM_PER_MPS = 196.85;
  const FT_PER_M = 3.28084;
  const GRAV = 9.81;
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  class AeroEngine {
    constructor() {
      this.spec = null;
      this.x = 0; this.y = 0; this.z = 0;
      this.hdg = 90 * D2R;      // radians, 0 = north (-Z), +east of north
      this.pitch = 0;           // radians, + nose up
      this.bank = 0;            // radians, + right wing down
      this.speed = 0;           // m/s forward
      this.vs = 0;              // m/s vertical
      this.throttle = 0;
      this.gear = true;
      this.flaps = 0;           // 0, 1, 2
      this.brakes = true;
      this.inPitch = 0;         // pilot commands, -1..1 (+ pitch = pull)
      this.inRoll = 0;          // + = bank right
      this.inYaw = 0;           // + = nose right
      this.onGround = true;
      this.stalling = false;
      this.crashed = false;
      this.crashWhy = '';
      this.touchVsiFpm = 0;     // last touchdown sink rate, for grading
      this.justTouched = false; // true for the step that lands
    }

    useSpec(spec) { this.spec = spec; }

    reset(spawn) {
      const s = this.spec;
      this.x = spawn && spawn.x !== undefined ? spawn.x : -390;
      this.z = spawn && spawn.z !== undefined ? spawn.z : 0;
      this.y = spawn && spawn.y !== undefined ? spawn.y : 4 + s.gearM;
      this.hdg = (spawn && spawn.hdg !== undefined ? spawn.hdg : 90) * D2R;
      this.pitch = 0;
      this.bank = 0;
      this.speed = spawn && spawn.kt ? spawn.kt / KT_PER_MPS : 0;
      this.vs = 0;
      this.throttle = spawn && spawn.thr !== undefined ? spawn.thr : 0;
      this.gear = !spawn || spawn.gear === undefined ? true : !!spawn.gear;
      this.flaps = spawn && spawn.flaps !== undefined ? spawn.flaps : 0;
      this.brakes = !(spawn && spawn.kt);
      this.inPitch = 0; this.inRoll = 0; this.inYaw = 0;
      this.stalling = false;
      this.crashed = false;
      this.crashWhy = '';
      this.touchVsiFpm = 0;
      this.justTouched = false;
      this.onGround = this.y <= 4 + s.gearM + 0.35;
    }

    iasKt() { return this.speed * KT_PER_MPS; }
    altFt() { return Math.max(0, this.y * FT_PER_M); }
    vsiFpm() { return this.vs * FPM_PER_MPS; }
    pitchDeg() { return this.pitch * R2D; }
    bankDeg() { return this.bank * R2D; }
    hdgDeg() { let d = this.hdg * R2D % 360; if (d < 0) d += 360; return d; }

    step(dt, ground, wind) {
      if (this.crashed || !this.spec) return;
      const s = this.spec;
      this.justTouched = false;
      const ias = this.iasKt();

      // Airflow over the wings decides how much authority the stick has.
      const airflow = clamp(ias / 85, 0.18, 1);

      // --- rotation: rate control around the aircraft's own axes ---
      let dPitch = this.inPitch * s.pAuth * airflow * dt;
      if (this.onGround) dPitch = Math.max(0, dPitch);
      this.pitch += dPitch;
      this.pitch = clamp(this.pitch, -0.62, 0.72);
      // On the gear the tail limits how far the nose can come up; without
      // this cap a hard pull at low speed just parks the nose in the air
      // and bleeds the speed away against gravity.
      if (this.onGround) this.pitch = clamp(this.pitch, 0, 0.21);

      if (!this.onGround) {
        this.bank += this.inRoll * s.rAuth * airflow * dt;
        this.bank = clamp(this.bank, -1.15, 1.15);
      }
      // A banked wing turns the nose; the rudder adds its own yaw.
      const turnRate = Math.sin(this.bank) * 0.42 * airflow;
      const rudderRate = this.inYaw * s.yAuth * Math.max(0.3, airflow);
      this.hdg += (turnRate + rudderRate) * dt;

      // --- longitudinal: thrust against drag, brakes, slope of the climb ---
      const flapLift = this.flaps * 0.16;
      const stallKt = s.stallKt * (1 - this.flaps * 0.08);
      this.stalling = !this.onGround && ias < stallKt;

      const thrustAcc = this.throttle * s.thrustN / s.massKg;
      const dragCoeff = s.dragK + (this.gear ? 0.00009 : 0) + this.flaps * 0.00007;
      const dragAcc = dragCoeff * this.speed * this.speed;
      const brakeAcc = this.onGround && this.brakes ? 9.5 : 0;
      const rollFriction = this.onGround ? 0.45 : 0;
      const slopeAcc = -Math.sin(this.pitch) * GRAV;
      this.speed += (thrustAcc - dragAcc - brakeAcc - rollFriction + slopeAcc) * dt;
      this.speed = clamp(this.speed, 0, s.vmaxKt / KT_PER_MPS);

      // --- vertical: lift curve versus gravity, relaxed not snapped ---
      const liftRatio = Math.pow(ias / (s.rotateKt * (1 - flapLift * 0.5)), 2);
      const noseFactor = 1 + clamp(this.pitchDeg() / 22, -0.5, 1);
      const netVertAcc = (Math.min(1.35, liftRatio) * noseFactor - 1) * GRAV;
      const noseY = Math.sin(this.pitch);

      if (this.onGround) {
        const rotateNow = ias >= s.rotateKt * (1 - this.flaps * 0.06) && this.pitchDeg() > 3.5;
        if (rotateNow) {
          this.onGround = false;
          this.vs = Math.max(2.2, noseY * this.speed);
        } else {
          this.vs = 0;
        }
      } else if (this.stalling) {
        this.vs -= 6.5 * dt;
        this.pitch -= 0.35 * dt; // the nose gives up and drops
      } else {
        const vsTarget = noseY * this.speed + netVertAcc * 0.45;
        this.vs += (vsTarget - this.vs) * Math.min(1, dt * 3.2);
      }

      // --- translation (crosswind only bites once airborne) ---
      const fwdX = Math.sin(this.hdg), fwdZ = -Math.cos(this.hdg);
      this.x += (fwdX * this.speed + (this.onGround ? 0 : wind.x)) * dt;
      this.z += (fwdZ * this.speed + (this.onGround ? 0 : wind.z)) * dt;
      this.y += this.vs * dt;

      // --- ground contact and touchdown judging ---
      const elev = ground.heightAt(this.x, this.z);
      const clearance = this.gear ? s.gearM : s.bellyM;
      const floorY = elev + clearance;
      if (this.y <= floorY) {
        if (elev === 0) {
          this.crashed = true;
          this.crashWhy = 'DITCHED IN THE OCEAN — keep altitude above the water';
          return;
        }
        if (!this.onGround) {
          const sink = Math.round(this.vsiFpm());
          this.touchVsiFpm = sink;
          this.justTouched = true;
          if (!this.gear) {
            this.crashed = true;
            this.crashWhy = 'GEAR-UP BELLY CRASH — press G to lower the gear before touchdown';
            return;
          }
          if (sink < -650) {
            this.crashed = true;
            this.crashWhy = 'HARD LANDING (' + sink + ' FPM) — flare gently before touchdown';
            return;
          }
          if (Math.abs(this.bankDeg()) > 18) {
            this.crashed = true;
            this.crashWhy = 'WING STRIKE ON TOUCHDOWN — level the wings before landing';
            return;
          }
        }
        this.onGround = true;
        this.y = floorY;
        this.vs = 0;
        this.bank *= Math.max(0, 1 - dt * 8);
        if (this.pitch < 0) this.pitch = 0;
      }
    }
  }

  window.AeroEngine = AeroEngine;
})();
