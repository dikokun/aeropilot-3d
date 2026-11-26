// AeroPilot 3D — flight physics.
// The stick commands attitude RATES, scaled by an airflow factor, and a
// banked wing yaws the nose around (coordinated turn). Vertical speed is not
// integrated from raw acceleration: it relaxes toward the velocity vector's
// climb plus a lift-margin term, which is what makes the model feel damped
// instead of twitchy. Touchdown is judged on sink rate, bank and gear state.
class FlightPhysics {
  constructor() {
    this.reset();
  }

  reset(spawn = null) {
    const cfg = window.SIM_CONFIG.AIRCRAFT;
    this.position = new THREE.Vector3(
      spawn ? spawn.x : -380,
      spawn ? spawn.y : (4 + cfg.gearHeight),
      spawn ? spawn.z : 0
    );

    // Heading in degrees (0 = North -Z, 90 = East +X, 180 = South +Z, 270 = West -X)
    const headingDeg = spawn && spawn.headingDeg !== undefined ? spawn.headingDeg : 90;
    const yawRad = THREE.MathUtils.degToRad(-headingDeg);

    this.quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yawRad, 0, 'YXZ'));
    this.speedMps = spawn && spawn.speedKnots ? spawn.speedKnots / window.SIM_CONFIG.MPS_TO_KNOTS : 0;
    this.verticalSpeedMps = 0;

    this.throttle = spawn && spawn.throttle !== undefined ? spawn.throttle : 0.0;
    this.gearDown = spawn && spawn.gearDown !== undefined ? spawn.gearDown : true;
    this.flaps = spawn && spawn.flaps !== undefined ? spawn.flaps : 0; // 0 = 0°, 1 = 15°, 2 = 30°
    this.brakes = !spawn || !spawn.speedKnots;

    this.pitchInput = 0;
    this.rollInput = 0;
    this.yawInput = 0;

    this.onGround = this.position.y <= (4 + cfg.gearHeight + 0.35);
    this.isStalling = false;
    this.crashed = false;
    this.crashReason = '';
    this.lastTouchdownVsiFpm = 0;
  }

  getAirspeedKnots() {
    return this.speedMps * window.SIM_CONFIG.MPS_TO_KNOTS;
  }

  getAltitudeFeet() {
    return Math.max(0, this.position.y * window.SIM_CONFIG.METERS_TO_FEET);
  }

  getVerticalSpeedFpm() {
    return this.verticalSpeedMps * window.SIM_CONFIG.MPS_TO_FPM;
  }

  getOrientationEuler() {
    const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
    const pitchDeg = THREE.MathUtils.radToDeg(euler.x);
    const rollDeg = THREE.MathUtils.radToDeg(euler.z);
    let headingDeg = (-THREE.MathUtils.radToDeg(euler.y)) % 360;
    if (headingDeg < 0) headingDeg += 360;
    return { pitchDeg, rollDeg, headingDeg };
  }

  step(dt, world, audio, crosswind = { x: 0, z: 0 }) {
    if (this.crashed) return;

    const cfg = window.SIM_CONFIG.AIRCRAFT;
    const iasKnots = this.getAirspeedKnots();
    const { pitchDeg, rollDeg } = this.getOrientationEuler();

    // Control effectiveness scales with dynamic airflow (plus propwash on ground)
    const airflowFactor = Math.min(1.0, Math.max(0.18, iasKnots / 85));

    // Apply rotational rates in local aircraft axes
    const pitchRate = this.pitchInput * cfg.pitchAuthority * airflowFactor * dt;
    const rollRate = -this.rollInput * cfg.rollAuthority * airflowFactor * dt;
    // Coordinated turn yaw + rudder input
    const bankTurnYaw = -Math.sin(THREE.MathUtils.degToRad(rollDeg)) * 0.42 * airflowFactor * dt;
    const yawRate = (-this.yawInput * cfg.yawAuthority * Math.max(0.3, airflowFactor) * dt) + bankTurnYaw;

    const dq = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.onGround ? Math.max(0, pitchRate) : pitchRate, yawRate, this.onGround ? 0 : rollRate, 'YXZ')
    );
    this.quaternion.multiply(dq).normalize();

    // Forward vector in world space (-Z in local space)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion).normalize();

    // Aerodynamic forces
    const flapLiftBonus = this.flaps * 0.16;
    const effectiveStallSpeed = cfg.stallSpeedKnots * (1 - this.flaps * 0.08);
    this.isStalling = !this.onGround && iasKnots < effectiveStallSpeed;

    // Thrust vs drag (the drag base is per-aircraft: see AIRCRAFT_FLEET)
    const thrustAccel = (this.throttle * cfg.maxThrust) / cfg.mass;
    const baseDragCoeff = (cfg.dragCoeff || 0.00019) + (this.gearDown ? 0.00009 : 0) + (this.flaps * 0.00007);
    const dragAccel = baseDragCoeff * this.speedMps * this.speedMps;
    const brakeAccel = (this.onGround && this.brakes) ? 9.5 : 0;
    const rollingFriction = this.onGround ? 0.45 : 0;
    const pitchGravityAccel = -Math.sin(THREE.MathUtils.degToRad(pitchDeg)) * 9.81;

    this.speedMps += (thrustAccel - dragAccel - brakeAccel - rollingFriction + pitchGravityAccel) * dt;
    const maxMps = cfg.maxSpeedKnots / window.SIM_CONFIG.MPS_TO_KNOTS;
    this.speedMps = THREE.MathUtils.clamp(this.speedMps, 0, maxMps);

    // Lift & vertical motion
    const liftRatio = Math.pow(iasKnots / (cfg.takeoffSpeedKnots * (1 - flapLiftBonus * 0.5)), 2);
    const noseUpFactor = 1 + Math.max(-0.5, pitchDeg / 22);
    const netVerticalAccel = ((Math.min(1.35, liftRatio) * noseUpFactor) - 1.0) * 9.81;

    if (this.onGround) {
      // Lift off when speed & pitch generate positive vertical acceleration
      if (iasKnots >= cfg.takeoffSpeedKnots * (1 - this.flaps * 0.06) && pitchDeg > 3.5) {
        this.onGround = false;
        this.verticalSpeedMps = Math.max(2.2, forward.y * this.speedMps);
      } else {
        this.verticalSpeedMps = 0;
      }
    } else {
      const targetClimbMps = forward.y * this.speedMps + (netVerticalAccel * 0.45);
      if (this.isStalling) {
        this.verticalSpeedMps -= 6.5 * dt;
        // Nose drops gently during stall
        const stallPitch = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35 * dt, 0, 0));
        this.quaternion.multiply(stallPitch).normalize();
      } else {
        this.verticalSpeedMps += (targetClimbMps - this.verticalSpeedMps) * Math.min(1, dt * 3.2);
      }
    }

    // Translate position (crosswind only bites once airborne)
    const horizForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
    this.position.x += (horizForward.x * this.speedMps + (this.onGround ? 0 : crosswind.x)) * dt;
    this.position.z += (horizForward.z * this.speedMps + (this.onGround ? 0 : crosswind.z)) * dt;
    this.position.y += this.verticalSpeedMps * dt;

    // Ground & water contact
    const groundElev = world.getGroundElevationAt(this.position.x, this.position.z);
    const clearance = this.gearDown ? cfg.gearHeight : cfg.bellyHeight;
    const minAllowedY = groundElev + clearance;

    if (this.position.y <= minAllowedY) {
      if (groundElev === 0) {
        this.crashed = true;
        this.crashReason = 'DITCHED IN OCEAN — Maintain altitude above water!';
        return;
      }

      if (!this.onGround) {
        const touchdownVsi = this.getVerticalSpeedFpm();
        this.lastTouchdownVsiFpm = Math.round(touchdownVsi);

        if (!this.gearDown) {
          this.crashed = true;
          this.crashReason = 'GEAR-UP BELLY CRASH — Press [G] to deploy landing gear before touchdown!';
          return;
        }
        if (touchdownVsi < cfg.maxSafeLandingVsiFpm) {
          this.crashed = true;
          this.crashReason = `HARD LANDING (${this.lastTouchdownVsiFpm} FPM) — Flare nose gently before touchdown!`;
          return;
        }
        if (Math.abs(rollDeg) > cfg.maxSafeBankDeg) {
          this.crashed = true;
          this.crashReason = 'WING STRIKE ON TOUCHDOWN — Level wings before landing!';
          return;
        }

        audio.playTouchdown(touchdownVsi < -380);
      }

      this.onGround = true;
      this.position.y = minAllowedY;
      this.verticalSpeedMps = 0;

      // Flatten roll & damp negative pitch on ground
      const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
      euler.z *= Math.max(0, 1 - dt * 8);
      if (euler.x < 0) euler.x = 0;
      this.quaternion.setFromEuler(euler);
    }
  }
}

window.FlightPhysics = FlightPhysics;
