// AeroPilot V8 — boot, menu, main loop, camera, and the screenshot bot.
// The loop feeds the engine ONLY through PilotInput (the human path):
// keys and mouse move the same smoothed commands the autopilot test uses.

(function () {
  const data = window.AERO_DATA;
  let renderer, scene, camera, world, engine, input, briefing, sound, hud;
  let craft = null, craftSpec = data.FLEET[0];
  let selectedRoute = 'island_hopper';
  let flying = false, camMode = 0; // 0 chase, 1 nose
  const camPos = new THREE.Vector3(-430, 30, 60);
  let lastTouchFlag = false;

  function $(id) { return document.getElementById(id); }

  function buildMenu() {
    const mlist = $('mission-list');
    for (const id of Object.keys(data.ROUTES)) {
      const r = data.ROUTES[id];
      const btn = document.createElement('button');
      btn.className = 'mission-btn' + (id === selectedRoute ? ' sel' : '');
      btn.dataset.route = id;
      const kindName = { full: 'FULL FLIGHT', rings: 'RING COURSE', landing: 'LANDING', free: 'SANDBOX' }[r.kind];
      btn.innerHTML = '<span class="m-name">' + r.label.split('· ')[1] + '</span><span class="m-kind">' + kindName + '</span>';
      btn.onclick = () => {
        selectedRoute = id;
        for (const b of mlist.children) b.classList.toggle('sel', b.dataset.route === id);
        sound.ensure();
      };
      mlist.appendChild(btn);
    }
    const grid = $('craft-grid');
    for (const spec of data.FLEET) {
      const btn = document.createElement('button');
      btn.className = 'craft-btn' + (spec.id === craftSpec.id ? ' sel' : '');
      btn.dataset.craft = spec.id;
      btn.innerHTML = '<span class="c-name">' + spec.label + '</span><span class="c-kind">' + spec.type + '</span><span class="c-desc">' + spec.blurb + '</span>';
      btn.onclick = () => {
        craftSpec = spec;
        for (const b of grid.children) b.classList.toggle('sel', b.dataset.craft === spec.id);
        sound.ensure();
      };
      grid.appendChild(btn);
    }
    $('btn-launch').onclick = () => { sound.ensure(); startMission(selectedRoute); };
  }

  function mountCraft() {
    if (craft) scene.remove(craft.group);
    craft = window.buildCraft(craftSpec);
    scene.add(craft.group);
  }

  function startMission(routeId) {
    engine.useSpec(craftSpec);
    mountCraft();
    input = new window.PilotInput();
    wireInput();
    briefing.start(routeId, world, engine);
    input.throttle = engine.throttle;
    input.brakes = engine.brakes;
    craft.setGear(engine.gear);
    $('menu').style.display = 'none';
    $('hud').style.display = 'block';
    $('banner').style.display = 'none';
    flying = true;
    camPos.set(engine.x - 30, engine.y + 9, engine.z + 14);
  }

  function endToMenu() {
    flying = false;
    sound.silence();
    $('menu').style.display = 'flex';
    $('hud').style.display = 'none';
    $('banner').style.display = 'none';
  }

  function showBanner(title, lines) {
    $('banner-title').textContent = title;
    $('banner-body').innerHTML = lines.join('<br>');
    $('banner').style.display = 'flex';
  }

  let wired = false;
  function wireInput() {
    if (wired) return;
    wired = true;
    window.addEventListener('keydown', (ev) => {
      if (!flying) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(ev.code)) ev.preventDefault();
      if (ev.code === 'KeyC') { camMode = (camMode + 1) % 2; return; }
      if (ev.code === 'Escape') { endToMenu(); return; }
      if (ev.code === 'KeyR' && (engine.crashed || briefing.done)) { startMission(briefing.routeId); return; }
      input.keyDown(ev.code);
    });
    window.addEventListener('keyup', (ev) => { if (flying) input.keyUp(ev.code); });
    window.addEventListener('mousemove', (ev) => {
      if (!flying || !input) return;
      input.setMouse((ev.clientX / window.innerWidth) * 2 - 1, (ev.clientY / window.innerHeight) * 2 - 1);
    });
    $('banner').addEventListener('click', () => {
      if (engine.crashed || briefing.done) startMission(briefing.routeId);
    });
  }

  const _euler = new THREE.Euler();
  const _quat = new THREE.Quaternion();
  const _fwd = new THREE.Vector3();
  const _want = new THREE.Vector3();
  const _look = new THREE.Vector3();

  function syncVisual(dt) {
    craft.group.position.set(engine.x, engine.y + 0.28, engine.z);
    _euler.set(engine.pitch, -engine.hdg, -engine.bank, 'YXZ');
    _quat.setFromEuler(_euler);
    craft.group.quaternion.copy(_quat);
    craft.setGear(engine.gear);
    craft.spin(dt, engine.throttle);

    _fwd.set(Math.sin(engine.hdg), 0, -Math.cos(engine.hdg));
    if (camMode === 1) {
      camera.position.set(engine.x + _fwd.x * 6, engine.y + 2.2, engine.z + _fwd.z * 6);
      _look.copy(camera.position).addScaledVector(_fwd, 60);
      camera.lookAt(_look);
    } else {
      _want.set(engine.x - _fwd.x * 27, engine.y + 8.5, engine.z - _fwd.z * 27);
      camPos.lerp(_want, Math.min(1, dt * 3.2));
      camera.position.copy(camPos);
      _look.set(engine.x + _fwd.x * 34, engine.y + 1.5, engine.z + _fwd.z * 34);
      camera.lookAt(_look);
    }
  }

  let prev = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (dt <= 0) dt = 0.016;

    if (flying) {
      const cmd = input.update(dt);
      for (const t of input.takeToggles()) {
        if (t === 'gear') engine.gear = !engine.gear;
        if (t === 'flaps') engine.flaps = (engine.flaps + 1) % 3;
      }
      engine.inPitch = cmd.pitch;
      engine.inRoll = cmd.roll;
      engine.inYaw = cmd.yaw;
      engine.throttle = cmd.throttle;
      engine.brakes = cmd.brakes;
      const wind = briefing.route ? briefing.route.wind : { x: 0, z: 0 };
      engine.step(dt, world, wind);
      briefing.update(dt, engine, world, sound);
      sound.setEngine(engine.throttle, engine.iasKt());
      sound.warn(engine.stalling);
      if (engine.justTouched && !lastTouchFlag) sound.touchdown(engine.touchVsiFpm < -380);
      lastTouchFlag = engine.justTouched;
      syncVisual(dt);
      hud.update(engine, briefing, input);
      if (engine.crashed) {
        flying = false;
        sound.silence();
        showBanner('FLIGHT ENDED', [engine.crashWhy, '', 'Click or press R to fly it again · Esc for the menu']);
      } else if (briefing.done) {
        flying = false;
        sound.silence();
        showBanner('MISSION COMPLETE', [
          briefing.route.label,
          'Time ' + $('v-clock').textContent + ' · Score ' + briefing.score.toLocaleString('en-US'),
          'Touchdown ' + engine.touchVsiFpm + ' FPM',
          '', 'Click or press R to fly again · Esc for the menu'
        ]);
      }
    }
    world.update(dt);
    renderer.render(scene, camera);
  }

  function boot() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    $('stage').appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 40000);
    camera.position.copy(camPos);
    world = new window.AeroWorld(scene);
    engine = new window.AeroEngine();
    engine.useSpec(craftSpec);
    briefing = new window.Briefing();
    sound = new window.SoundFX();
    input = new window.PilotInput();
    hud = new window.Cockpit();
    mountCraft();
    engine.reset({ x: -390, y: 4 + craftSpec.gearM, z: 0, hdg: 90 });
    buildMenu();
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.__V8__ = { engine, world, briefing, startMission, get input() { return input; } };
    maybeShot();
    requestAnimationFrame(loop);
  }

  // Screenshot staging: ?shot=<route>&craft=<id>&ff=<seconds> starts the
  // mission and pre-flies it through the same PilotInput a player uses
  // (headless renderers advance game time too slowly to stage live), then
  // keeps flying on the render loop.
  function maybeShot() {
    const q = new URLSearchParams(window.location.search);
    const routeId = q.get('shot');
    if (!routeId || !data.ROUTES[routeId]) return;
    const cid = q.get('craft');
    if (cid) { const s = data.FLEET.find(f => f.id === cid); if (s) craftSpec = s; }
    startMission(routeId);
    input.mouseOn = false;
    if (engine.onGround) input.keyDown('KeyB'); // brakes off
    input.keys.add('KeyW');

    function botTick() {
      if (briefing.route && briefing.route.kind === 'landing') {
        // Approach profile: power back, gentle descent on the line.
        input.keys.delete('KeyW');
        if (engine.throttle > 0.42) input.keys.add('KeyS'); else input.keys.delete('KeyS');
        if (engine.pitchDeg() > -1) { input.keys.add('ArrowUp'); input.keys.delete('ArrowDown'); }
        else if (engine.pitchDeg() < -5) { input.keys.add('ArrowDown'); input.keys.delete('ArrowUp'); }
        else { input.keys.delete('ArrowDown'); input.keys.delete('ArrowUp'); }
        return;
      }
      if (engine.onGround) {
        if (engine.iasKt() > engine.spec.rotateKt - 5) input.keys.add('ArrowDown');
      } else {
        // Steer for the active ring/target the way the verification
        // autopilot does — bank toward the bearing, pitch to its height.
        const tgt = briefing.targetPos();
        if (tgt) {
          const bearing = Math.atan2(tgt.x - engine.x, -(tgt.z - engine.z)) * 180 / Math.PI;
          let hdgErr = bearing - engine.hdgDeg();
          while (hdgErr > 180) hdgErr -= 360;
          while (hdgErr < -180) hdgErr += 360;
          const wantBank = Math.max(-25, Math.min(25, hdgErr * 1.1));
          if (engine.bankDeg() < wantBank - 2) { input.keys.add('ArrowRight'); input.keys.delete('ArrowLeft'); }
          else if (engine.bankDeg() > wantBank + 2) { input.keys.add('ArrowLeft'); input.keys.delete('ArrowRight'); }
          else { input.keys.delete('ArrowLeft'); input.keys.delete('ArrowRight'); }
          const wantPitch = Math.max(-8, Math.min(11, (tgt.y - engine.y) * 0.08));
          if (engine.pitchDeg() < wantPitch - 0.8) { input.keys.add('ArrowDown'); input.keys.delete('ArrowUp'); }
          else if (engine.pitchDeg() > wantPitch + 0.8) { input.keys.add('ArrowUp'); input.keys.delete('ArrowDown'); }
          else { input.keys.delete('ArrowDown'); input.keys.delete('ArrowUp'); }
        }
      }
    }
    const ff = parseFloat(q.get('ff') || '0');
    if (ff > 0) {
      const step = 1 / 60;
      for (let t = 0; t < ff; t += step) {
        botTick();
        const cmd = input.update(step);
        for (const tg of input.takeToggles()) {
          if (tg === 'gear') engine.gear = !engine.gear;
          if (tg === 'flaps') engine.flaps = (engine.flaps + 1) % 3;
        }
        engine.inPitch = cmd.pitch; engine.inRoll = cmd.roll; engine.inYaw = cmd.yaw;
        engine.throttle = cmd.throttle; engine.brakes = cmd.brakes;
        engine.step(step, world, briefing.route.wind);
        briefing.update(step, engine, world, null);
        if (engine.crashed || briefing.done) break;
      }
      syncVisual(0.5);
      hud.update(engine, briefing, input);
    }
    setInterval(() => { if (flying) botTick(); }, 90);
  }

  window.addEventListener('DOMContentLoaded', boot);
})();
