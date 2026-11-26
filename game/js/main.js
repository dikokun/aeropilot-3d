// AeroPilot 3D — entry point: renderer/scene setup, the menu wiring
// (mission buttons + the aircraft-selection grid), keyboard and mouse-yoke
// input with per-frame easing into the physics inputs, the three cameras,
// and the main loop (step physics, sync the model, run missions, draw HUD).
(function () {
  const canvas = document.getElementById('game-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 25000);

  const world = new WorldBuilder(scene);
  const aircraft = new AircraftModel(scene);
  const physics = new FlightPhysics();
  const hud = new FlightHUD();
  const missions = new MissionManager();
  const audio = new FlightAudioEngine();

  // Game & input state
  let gameState = 'MENU'; // MENU | PLAYING | PAUSED | RESULT
  let selectedMissionId = 'island_hopper';
  let cameraMode = 0; // 0: Chase, 1: Cockpit, 2: Wide Scenic
  const cameraLabels = ['CAM: CHASE', 'CAM: COCKPIT', 'CAM: ORBIT'];
  let mouseYokeEnabled = false;
  let mouseNormX = 0;
  let mouseNormY = 0;
  let orbitAngle = 0.4;

  const keys = {};

  // UI elements
  const menuScreen = document.getElementById('menu-screen');
  const hudEl = document.getElementById('hud');
  const pauseScreen = document.getElementById('pause-screen');
  const resultScreen = document.getElementById('result-screen');
  const reticleEl = document.getElementById('mouse-reticle');
  const reticleDot = document.getElementById('reticle-dot');

  // Mission selection buttons
  document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mission-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMissionId = btn.dataset.mission;
    });
  });

  // Aircraft selection buttons
  let selectedAircraftIndex = 0;
  document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.craft-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedAircraftIndex = parseInt(btn.dataset.craft, 10) || 0;
    });
  });

  function startSelectedMission() {
    const airStart = document.getElementById('opt-airstart').checked;
    const soundOn = document.getElementById('opt-sound').checked;
    audio.setEnabled(soundOn);
    if (soundOn) audio.init();

    // Aircraft selection: load the chosen craft's physics + livery.
    const craft = window.applyAircraft(selectedAircraftIndex);
    aircraft.setLivery(craft.bodyColor, craft.stripeColor);
    aircraft.setScale(craft.scale);

    missions.startMission(selectedMissionId, world, physics, airStart);
    syncAircraftTransform();

    menuScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');
    gameState = 'PLAYING';
  }

  function showResult(success) {
    gameState = 'RESULT';
    hudEl.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    const badge = document.getElementById('result-badge');
    const title = document.getElementById('result-title');
    const desc = document.getElementById('result-desc');

    if (success) {
      badge.textContent = 'MISSION ACCOMPLISHED';
      badge.className = 'badge';
      title.textContent = 'EXCELLENT FLYING, CAPTAIN!';
      desc.textContent = 'All objectives completed safely.';
    } else {
      badge.textContent = 'AIRCRAFT DAMAGED';
      badge.className = 'badge danger';
      title.textContent = 'FLIGHT TERMINATED';
      desc.textContent = physics.crashReason || 'Aircraft exceeded structural limits.';
    }

    const mins = String(Math.floor(missions.elapsedTime / 60)).padStart(2, '0');
    const secs = String(Math.floor(missions.elapsedTime % 60)).padStart(2, '0');
    document.getElementById('stat-time').textContent = `${mins}:${secs}`;
    document.getElementById('stat-vsi').textContent = physics.lastTouchdownVsiFpm
      ? `${physics.lastTouchdownVsiFpm} FPM`
      : 'N/A';
    document.getElementById('stat-rings').textContent = `${missions.ringsPassed} / ${missions.totalRings}`;
    document.getElementById('stat-score').textContent = success ? missions.score.toLocaleString() : '0';
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseScreen.classList.remove('hidden');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      pauseScreen.classList.add('hidden');
    }
  }

  function cycleCamera() {
    cameraMode = (cameraMode + 1) % 3;
    document.getElementById('btn-cam').textContent = cameraLabels[cameraMode];
    aircraft.root.visible = cameraMode !== 1;
  }

  function toggleMouseYoke() {
    mouseYokeEnabled = !mouseYokeEnabled;
    document.getElementById('btn-mouse').textContent = mouseYokeEnabled ? 'MOUSE: ON' : 'MOUSE: OFF';
    reticleEl.classList.toggle('hidden', !mouseYokeEnabled);
    mouseNormX = 0;
    mouseNormY = 0;
  }

  // Button wiring
  document.getElementById('btn-launch').addEventListener('click', startSelectedMission);
  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-restart-pause').addEventListener('click', startSelectedMission);
  document.getElementById('btn-retry').addEventListener('click', startSelectedMission);

  function returnToMenu() {
    gameState = 'MENU';
    hudEl.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    aircraft.root.visible = true;
  }

  document.getElementById('btn-menu-pause').addEventListener('click', returnToMenu);
  document.getElementById('btn-menu-end').addEventListener('click', returnToMenu);
  document.getElementById('btn-cam').addEventListener('click', cycleCamera);
  document.getElementById('btn-mouse').addEventListener('click', toggleMouseYoke);
  document.getElementById('btn-pause').addEventListener('click', togglePause);

  // Keyboard: held keys live in `keys`; one-shot toggles fire on keydown.
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (gameState === 'PLAYING') {
      if (e.code === 'KeyG') {
        physics.gearDown = !physics.gearDown;
        audio.playGearToggle();
      } else if (e.code === 'KeyF') {
        physics.flaps = (physics.flaps + 1) % 3;
      } else if (e.code === 'KeyB') {
        physics.brakes = !physics.brakes;
      } else if (e.code === 'KeyC') {
        cycleCamera();
      } else if (e.code === 'KeyM') {
        toggleMouseYoke();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
      }
    } else if (gameState === 'PAUSED' && (e.code === 'KeyP' || e.code === 'Escape')) {
      togglePause();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!mouseYokeEnabled || gameState !== 'PLAYING') return;
    mouseNormX = THREE.MathUtils.clamp(((e.clientX / window.innerWidth) - 0.5) * 2.4, -1, 1);
    mouseNormY = THREE.MathUtils.clamp(((e.clientY / window.innerHeight) - 0.5) * 2.4, -1, 1);
    reticleDot.style.transform = `translate(calc(-50% + ${mouseNormX * 60}px), calc(-50% + ${mouseNormY * 60}px))`;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function processInputs(dt) {
    // Throttle W / S
    if (keys['KeyW']) physics.throttle = Math.min(1, physics.throttle + 0.55 * dt);
    if (keys['KeyS']) physics.throttle = Math.max(0, physics.throttle - 0.55 * dt);

    // Brakes auto-release once the throttle comes up for takeoff
    if (physics.onGround && physics.throttle > 0.35 && keys['KeyW']) {
      physics.brakes = false;
    }

    // Pitch (ArrowUp = nose down / dive, ArrowDown = nose up / pull back)
    let pitch = 0;
    if (keys['ArrowDown']) pitch += 1;
    if (keys['ArrowUp']) pitch -= 1;
    if (mouseYokeEnabled) pitch += mouseNormY;

    // Roll (ArrowLeft / ArrowRight)
    let roll = 0;
    if (keys['ArrowRight']) roll += 1;
    if (keys['ArrowLeft']) roll -= 1;
    if (mouseYokeEnabled) roll += mouseNormX;

    // Yaw (A / D)
    let yaw = 0;
    if (keys['KeyD']) yaw += 1;
    if (keys['KeyA']) yaw -= 1;

    physics.pitchInput = THREE.MathUtils.clamp(pitch, -1, 1);
    physics.rollInput = THREE.MathUtils.clamp(roll, -1, 1);
    physics.yawInput = THREE.MathUtils.clamp(yaw, -1, 1);
  }

  function syncAircraftTransform() {
    aircraft.root.position.copy(physics.position);
    aircraft.root.quaternion.copy(physics.quaternion);
  }

  function updateCamera(dt) {
    if (gameState === 'MENU') {
      // Scenic slow orbit around Emerald Bay airport
      orbitAngle += dt * 0.14;
      camera.position.set(
        -220 + Math.cos(orbitAngle) * 160,
        48,
        Math.sin(orbitAngle) * 160
      );
      camera.lookAt(-350, 10, 0);
      return;
    }

    if (cameraMode === 0) {
      // Smooth chase camera
      const offset = new THREE.Vector3(0, 6.2, 24).applyQuaternion(physics.quaternion);
      const desiredPos = physics.position.clone().add(offset);
      camera.position.lerp(desiredPos, Math.min(1, dt * 8));

      const lookAhead = new THREE.Vector3(0, 1.5, -35).applyQuaternion(physics.quaternion);
      camera.lookAt(physics.position.clone().add(lookAhead));
    } else if (cameraMode === 1) {
      // Cockpit view
      const eyeOffset = new THREE.Vector3(0, 1.25, -7.2).applyQuaternion(physics.quaternion);
      camera.position.copy(physics.position).add(eyeOffset);
      const lookTarget = new THREE.Vector3(0, 0.8, -60).applyQuaternion(physics.quaternion);
      camera.lookAt(physics.position.clone().add(lookTarget));
    } else {
      // Wide cinematic orbit
      orbitAngle += dt * 0.25;
      const offset = new THREE.Vector3(Math.cos(orbitAngle) * 34, 10, Math.sin(orbitAngle) * 34);
      camera.position.copy(physics.position).add(offset);
      camera.lookAt(physics.position);
    }
  }

  // Debug helper for automated screenshot & playtest scripts
  window.__GAME_DEBUG__ = {
    startMission: (id, airStart = false) => {
      selectedMissionId = id || 'island_hopper';
      document.getElementById('opt-airstart').checked = airStart;
      startSelectedMission();
    },
    getState: () => ({
      gameState,
      airspeedKnots: Math.round(physics.getAirspeedKnots()),
      altitudeFeet: Math.round(physics.getAltitudeFeet()),
      ringsPassed: missions.ringsPassed,
      completed: missions.completed,
      crashed: physics.crashed
    })
  };

  let lastTime = performance.now();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    world.update(dt);

    if (gameState === 'PLAYING') {
      processInputs(dt);
      const cw = missions.currentMission
        ? { x: missions.currentMission.crosswindX, z: missions.currentMission.crosswindZ }
        : { x: 0, z: 0 };

      physics.step(dt, world, audio, cw);
      syncAircraftTransform();
      aircraft.updateVisuals(dt, physics);
      missions.update(dt, physics, world, audio);

      const targetPos = missions.getActiveTargetPosition();
      hud.update(physics, world, targetPos);
      audio.update(physics.throttle, physics.getAirspeedKnots(), false);

      if (physics.isStalling || (!physics.onGround && physics.getAltitudeFeet() < 350 && physics.getVerticalSpeedFpm() < -700)) {
        audio.playWarning();
      }

      if (physics.crashed) {
        audio.update(0, 0, true);
        showResult(false);
      } else if (missions.completed) {
        audio.update(0, 0, true);
        showResult(true);
      }
    } else {
      syncAircraftTransform();
      audio.update(0, 0, true);
    }

    updateCamera(dt);
    renderer.render(scene, camera);
  }

  syncAircraftTransform();
  requestAnimationFrame(animate);
})();
