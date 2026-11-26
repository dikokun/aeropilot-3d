class MissionManager {
  constructor() {
    this.currentMission = null;
    this.elapsedTime = 0;
    this.ringsPassed = 0;
    this.totalRings = 0;
    this.activeRingIndex = 0;
    this.completed = false;
    this.score = 0;

    this.elName = document.getElementById('hud-mission-name');
    this.elTimer = document.getElementById('hud-timer');
    this.elObjText = document.getElementById('hud-objective-text');
    this.elProgress = document.getElementById('hud-progress-fill');
  }

  startMission(missionId, world, physics, airStartOpt) {
    const mission = window.SIM_CONFIG.MISSIONS[missionId];
    this.currentMission = mission;
    this.elapsedTime = 0;
    this.ringsPassed = 0;
    this.totalRings = mission.rings.length;
    this.activeRingIndex = 0;
    this.completed = false;
    this.score = 0;

    this.elName.textContent = mission.name;
    world.setMissionRings(mission.rings);

    if (mission.customSpawn) {
      physics.reset(mission.customSpawn);
    } else if (airStartOpt || mission.forceAirStart) {
      physics.reset({
        x: -200,
        y: 260,
        z: 0,
        headingDeg: 90,
        speedKnots: 145,
        throttle: 0.72,
        gearDown: false,
        flaps: 0
      });
    } else {
      physics.reset({
        x: -390,
        y: 4 + window.SIM_CONFIG.AIRCRAFT.gearHeight,
        z: 0,
        headingDeg: 90,
        speedKnots: 0,
        throttle: 0,
        gearDown: true,
        flaps: 0
      });
    }
  }

  getActiveTargetPosition() {
    if (!this.currentMission) return null;
    if (this.activeRingIndex < this.totalRings) {
      const r = this.currentMission.rings[this.activeRingIndex];
      return new THREE.Vector3(r.x, r.y, r.z);
    }
    if (this.currentMission.targetAirport) {
      const ap = window.SIM_CONFIG.AIRPORTS.find(a => a.id === this.currentMission.targetAirport);
      if (ap) return new THREE.Vector3(ap.x, ap.elevation + 10, ap.z);
    }
    return null;
  }

  update(dt, physics, world, audio) {
    if (!this.currentMission || this.completed || physics.crashed) return;

    this.elapsedTime += dt;
    const mins = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(this.elapsedTime % 60)).padStart(2, '0');
    this.elTimer.textContent = `${mins}:${secs}`;

    // Check Sky Ring Passes
    if (this.activeRingIndex < this.totalRings) {
      const ring = world.rings[this.activeRingIndex];
      const dist = physics.position.distanceTo(ring.mesh.position);
      if (dist <= ring.radius + 8) {
        ring.passed = true;
        this.ringsPassed++;
        this.activeRingIndex++;
        this.score += 300;
        audio.playRingPass();
      }
    }

    world.updateRingHighlight(this.activeRingIndex);

    // Objective Text & Completion Evaluation
    const m = this.currentMission;
    if (m.type === 'sandbox') {
      this.elObjText.textContent = 'Explore the archipelago or practice touch-and-go landings.';
      this.elProgress.style.width = '100%';
      return;
    }

    if (this.activeRingIndex < this.totalRings) {
      if (physics.onGround && this.ringsPassed === 0) {
        this.elObjText.textContent = 'Release Brakes [B], Throttle [W] to 100%, rotate at 76 KTS';
      } else {
        this.elObjText.textContent = `Fly through Sky Ring ${this.ringsPassed + 1} of ${this.totalRings}`;
      }
      const totalSteps = this.totalRings + (m.targetAirport ? 1 : 0);
      this.elProgress.style.width = `${(this.ringsPassed / totalSteps) * 100}%`;
    } else if (m.type === 'rings_only') {
      this.completed = true;
      this.score += Math.max(200, Math.round(1500 - this.elapsedTime * 8));
      this.elProgress.style.width = '100%';
    } else if (m.targetAirport) {
      const targetAp = window.SIM_CONFIG.AIRPORTS.find(a => a.id === m.targetAirport);
      this.elObjText.textContent = `Deploy Gear [G], land on ${targetAp.name}, and brake [B] to a full stop`;
      this.elProgress.style.width = '90%';

      const landedAp = world.isOverRunway(physics.position.x, physics.position.z);
      if (physics.onGround && landedAp && landedAp.id === m.targetAirport && physics.getAirspeedKnots() < 6) {
        this.completed = true;
        this.elProgress.style.width = '100%';
        const landingBonus = Math.max(300, 1200 - Math.abs(physics.lastTouchdownVsiFpm));
        const timeBonus = Math.max(100, Math.round(1200 - this.elapsedTime * 4));
        this.score += landingBonus + timeBonus;
      }
    }
  }
}

window.MissionManager = MissionManager;
