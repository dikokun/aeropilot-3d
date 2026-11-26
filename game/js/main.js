// AeroPilot 3D — bootstrap and game loop.
// Wires the menu (mission cards + aircraft grid) to the mission manager,
// turns held keys and the optional mouse yoke into physics inputs each
// frame, drives the three cameras, and ends flights on the result screen.
(function () {
  const el = (id) => document.getElementById(id);
  const renderer = new THREE.WebGLRenderer({ canvas: el('game-canvas'), antialias: true });
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

  let state = 'MENU';               // MENU | PLAYING | PAUSED | RESULT
  let missionId = 'island_hopper';
  let craftIndex = 0;
  let camMode = 0;                  // 0 chase, 1 cockpit, 2 orbit
  const CAM_LABELS = ['CAM: CHASE', 'CAM: COCKPIT', 'CAM: ORBIT'];
  let mouseYoke = false;
  let mouseX = 0, mouseY = 0;
  let orbit = 0.4;
  const held = {};

  const menuEl = el('menu-screen'), hudEl = el('hud');
  const pauseEl = el('pause-screen'), resultEl = el('result-screen');
  const reticleEl = el('mouse-reticle'), reticleDot = el('reticle-dot');

  // Selection cards: one delegated pattern for both grids.
  function wireGrid(selector, attr, onPick) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(selector).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onPick(btn.dataset[attr]);
      });
    });
  }
  wireGrid('.mission-btn', 'mission', (id) => { missionId = id; });
  wireGrid('.craft-btn', 'craft', (i) => { craftIndex = parseInt(i, 10) || 0; });

  function launch() {
    audio.setEnabled(el('opt-sound').checked);
    if (el('opt-sound').checked) audio.init();
    const craft = window.applyAircraft(craftIndex);
    aircraft.setLivery(craft.bodyColor, craft.stripeColor);
    aircraft.setScale(craft.scale);
    missions.startMission(missionId, world, physics, el('opt-airstart').checked);
    syncModel();
    menuEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    state = 'PLAYING';
  }

  function fmtTime(sec) {
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
  }

  function showResult(won) {
    state = 'RESULT';
    hudEl.classList.add('hidden');
    resultEl.classList.remove('hidden');
    const badge = el('result-badge');
    badge.textContent = won ? 'MISSION ACCOMPLISHED' : 'AIRCRAFT DAMAGED';
    badge.className = won ? 'badge' : 'badge danger';
    el('result-title').textContent = won ? 'EXCELLENT FLYING, CAPTAIN!' : 'FLIGHT TERMINATED';
    el('result-desc').textContent = won
      ? 'All objectives completed safely.'
      : (physics.crashReason || 'Aircraft exceeded structural limits.');
    el('stat-time').textContent = fmtTime(missions.elapsedTime);
    el('stat-vsi').textContent = physics.lastTouchdownVsiFpm ? `${physics.lastTouchdownVsiFpm} FPM` : 'N/A';
    el('stat-rings').textContent = `${missions.ringsPassed} / ${missions.totalRings}`;
    el('stat-score').textContent = won ? missions.score.toLocaleString() : '0';
  }

  function togglePause() {
    if (state === 'PLAYING') { state = 'PAUSED'; pauseEl.classList.remove('hidden'); }
    else if (state === 'PAUSED') { state = 'PLAYING'; pauseEl.classList.add('hidden'); }
  }

  function cycleCamera() {
    camMode = (camMode + 1) % 3;
    el('btn-cam').textContent = CAM_LABELS[camMode];
    aircraft.root.visible = camMode !== 1;
  }

  function toggleMouseYoke() {
    mouseYoke = !mouseYoke;
    el('btn-mouse').textContent = mouseYoke ? 'MOUSE: ON' : 'MOUSE: OFF';
    reticleEl.classList.toggle('hidden', !mouseYoke);
    mouseX = 0; mouseY = 0;
  }

  function backToMenu() {
    state = 'MENU';
    hudEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    menuEl.classList.remove('hidden');
    aircraft.root.visible = true;
  }

  el('btn-launch').addEventListener('click', launch);
  el('btn-resume').addEventListener('click', togglePause);
  el('btn-restart-pause').addEventListener('click', launch);
  el('btn-retry').addEventListener('click', launch);
  el('btn-menu-pause').addEventListener('click', backToMenu);
  el('btn-menu-end').addEventListener('click', backToMenu);
  el('btn-cam').addEventListener('click', cycleCamera);
  el('btn-mouse').addEventListener('click', toggleMouseYoke);
  el('btn-pause').addEventListener('click', togglePause);

  const TOGGLES = {
    KeyG: () => { physics.gearDown = !physics.gearDown; audio.playGearToggle(); },
    KeyF: () => { physics.flaps = (physics.flaps + 1) % 3; },
    KeyB: () => { physics.brakes = !physics.brakes; },
    KeyC: cycleCamera,
    KeyM: toggleMouseYoke
  };
  window.addEventListener('keydown', (e) => {
    held[e.code] = true;
    if (state === 'PLAYING') {
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      else if (TOGGLES[e.code]) TOGGLES[e.code]();
    } else if (state === 'PAUSED' && (e.code === 'KeyP' || e.code === 'Escape')) {
      togglePause();
    }
  });
  window.addEventListener('keyup', (e) => { held[e.code] = false; });

  window.addEventListener('mousemove', (e) => {
    if (!mouseYoke || state !== 'PLAYING') return;
    const clamp = THREE.MathUtils.clamp;
    mouseX = clamp(((e.clientX / window.innerWidth) - 0.5) * 2.4, -1, 1);
    mouseY = clamp(((e.clientY / window.innerHeight) - 0.5) * 2.4, -1, 1);
    reticleDot.style.transform = `translate(calc(-50% + ${mouseX * 60}px), calc(-50% + ${mouseY * 60}px))`;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function readInputs(dt) {
    if (held['KeyW']) physics.throttle = Math.min(1, physics.throttle + 0.55 * dt);
    if (held['KeyS']) physics.throttle = Math.max(0, physics.throttle - 0.55 * dt);
    if (physics.onGround && physics.throttle > 0.35 && held['KeyW']) physics.brakes = false;

    let pitch = (held['ArrowDown'] ? 1 : 0) - (held['ArrowUp'] ? 1 : 0);
    let roll = (held['ArrowRight'] ? 1 : 0) - (held['ArrowLeft'] ? 1 : 0);
    let yaw = (held['KeyD'] ? 1 : 0) - (held['KeyA'] ? 1 : 0);
    if (mouseYoke) { pitch += mouseY; roll += mouseX; }

    const clamp = THREE.MathUtils.clamp;
    physics.pitchInput = clamp(pitch, -1, 1);
    physics.rollInput = clamp(roll, -1, 1);
    physics.yawInput = clamp(yaw, -1, 1);
  }

  function syncModel() {
    aircraft.root.position.copy(physics.position);
    aircraft.root.quaternion.copy(physics.quaternion);
  }

  function placeCamera(dt) {
    if (state === 'MENU') {
      orbit += dt * 0.14;
      camera.position.set(-220 + Math.cos(orbit) * 160, 48, Math.sin(orbit) * 160);
      camera.lookAt(-350, 10, 0);
      return;
    }
    const q = physics.quaternion, p = physics.position;
    if (camMode === 0) {
      const want = p.clone().add(new THREE.Vector3(0, 6.2, 24).applyQuaternion(q));
      camera.position.lerp(want, Math.min(1, dt * 8));
      camera.lookAt(p.clone().add(new THREE.Vector3(0, 1.5, -35).applyQuaternion(q)));
    } else if (camMode === 1) {
      camera.position.copy(p).add(new THREE.Vector3(0, 1.25, -7.2).applyQuaternion(q));
      camera.lookAt(p.clone().add(new THREE.Vector3(0, 0.8, -60).applyQuaternion(q)));
    } else {
      orbit += dt * 0.25;
      camera.position.copy(p).add(new THREE.Vector3(Math.cos(orbit) * 34, 10, Math.sin(orbit) * 34));
      camera.lookAt(p);
    }
  }

  // Hook for automated playtests/screenshots.
  window.__GAME_DEBUG__ = {
    startMission: (id, airStart = false) => {
      missionId = id || 'island_hopper';
      el('opt-airstart').checked = airStart;
      launch();
    },
    getState: () => ({
      gameState: state,
      airspeedKnots: Math.round(physics.getAirspeedKnots()),
      altitudeFeet: Math.round(physics.getAltitudeFeet()),
      ringsPassed: missions.ringsPassed,
      completed: missions.completed,
      crashed: physics.crashed
    })
  };

  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    world.update(dt);
    if (state === 'PLAYING') {
      readInputs(dt);
      const m = missions.currentMission;
      physics.step(dt, world, audio, m ? { x: m.crosswindX, z: m.crosswindZ } : { x: 0, z: 0 });
      syncModel();
      aircraft.updateVisuals(dt, physics);
      missions.update(dt, physics, world, audio);
      hud.update(physics, world, missions.getActiveTargetPosition());
      audio.update(physics.throttle, physics.getAirspeedKnots(), false);
      if (physics.isStalling || (!physics.onGround && physics.getAltitudeFeet() < 350 && physics.getVerticalSpeedFpm() < -700)) {
        audio.playWarning();
      }
      if (physics.crashed || missions.completed) {
        audio.update(0, 0, true);
        showResult(missions.completed && !physics.crashed);
      }
    } else {
      syncModel();
      audio.update(0, 0, true);
    }
    placeCamera(dt);
    renderer.render(scene, camera);
  }

  syncModel();
  requestAnimationFrame(frame);
})();
