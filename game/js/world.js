class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
    this.islands = [];
    this.rings = [];
    this.beaconLight = null;
    this.ocean = null;
    this.clouds = [];
    this.buildSkyAndLights();
    this.buildOcean();
    this.buildIslandsAndAirports();
  }

  buildSkyAndLights() {
    this.scene.background = new THREE.Color(0x6ec6ff);
    this.scene.fog = new THREE.FogExp2(0x9bd8ff, 0.00014);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0c4a6e, 0.95);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sun.position.set(1800, 2600, 1400);
    this.scene.add(sun);

    // Decorative Volumetric-style Low-Poly Clouds
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88
    });
    const puffGeo = new THREE.DodecahedronGeometry(45, 1);

    for (let i = 0; i < 42; i++) {
      const group = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const mesh = new THREE.Mesh(puffGeo, cloudMat);
        mesh.position.set((p - 1.5) * 42, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 28);
        mesh.scale.set(1.2 + Math.random() * 0.8, 0.65, 1.0 + Math.random() * 0.6);
        group.add(mesh);
      }
      group.position.set(
        -1500 + Math.random() * 8500,
        360 + Math.random() * 420,
        -4500 + Math.random() * 6500
      );
      this.scene.add(group);
      this.clouds.push(group);
    }
  }

  buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(32000, 32000, 48, 48);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x0369a1,
      emissive: 0x082f49,
      specular: 0x7dd3fc,
      shininess: 65
    });
    this.ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this.scene.add(this.ocean);
  }

  createIsland(x, z, radiusX, radiusZ, peakHeight, hasPeak = true) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Sandy Shoal / Beach Base
    const beachGeo = new THREE.CylinderGeometry(radiusX * 0.92, radiusX * 1.05, 4, 24);
    beachGeo.scale(1, 1, radiusZ / radiusX);
    const beachMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.y = 2;
    group.add(beach);

    // Lush Tropical Grass Plateau
    const grassGeo = new THREE.CylinderGeometry(radiusX * 0.82, radiusX * 0.9, 3, 24);
    grassGeo.scale(1, 1, radiusZ / radiusX);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 4.2;
    group.add(grass);

    if (hasPeak) {
      const peakGeo = new THREE.ConeGeometry(radiusX * 0.42, peakHeight, 12);
      const peakMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
      const peak = new THREE.Mesh(peakGeo, peakMat);
      peak.position.set(radiusX * 0.18, 4 + peakHeight * 0.5, -radiusZ * 0.25);
      group.add(peak);
    }

    this.scene.add(group);
    this.islands.push({ x, z, radiusX, radiusZ, elevation: 4 });
    return group;
  }

  buildAirport(airport) {
    const group = new THREE.Group();
    group.position.set(airport.x, airport.elevation + 0.15, airport.z);

    // Main Asphalt Runway (oriented along X axis)
    const rwyGeo = new THREE.BoxGeometry(airport.length, 0.4, airport.width);
    const rwyMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const rwy = new THREE.Mesh(rwyGeo, rwyMat);
    group.add(rwy);

    // White Centerline Dashes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let sx = -airport.length / 2 + 65; sx <= airport.length / 2 - 65; sx += 36) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(18, 0.45, 1.4), stripeMat);
      dash.position.set(sx, 0.05, 0);
      group.add(dash);
    }

    // Threshold Piano Keys on Both Ends
    for (const endSign of [-1, 1]) {
      const endX = endSign * (airport.length / 2 - 22);
      for (let kz = -14; kz <= 14; kz += 5.6) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(22, 0.46, 2.2), stripeMat);
        key.position.set(endX, 0.05, kz);
        group.add(key);
      }
    }

    // Runway Edge Lights
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let lx = -airport.length / 2 + 10; lx <= airport.length / 2 - 10; lx += 45) {
      for (const side of [-1, 1]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), edgeMat);
        light.position.set(lx, 0.35, side * (airport.width / 2 + 1.2));
        group.add(light);
      }
    }

    // PAPI Glide Slope Lights (Approach End)
    const papiRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const papiWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let p = 0; p < 4; p++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.4, 2.5),
        p < 2 ? papiWhite : papiRed
      );
      box.position.set(airport.length / 2 - 90, 0.8, -airport.width / 2 - 8 - p * 4);
      group.add(box);
    }

    // Control Tower & Hangar
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 8, 28, 8),
      new THREE.MeshLambertMaterial({ color: 0xe2e8f0 })
    );
    towerBase.position.set(-40, 14, -46);
    group.add(towerBase);

    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 7, 7, 8),
      new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 90 })
    );
    towerCab.position.set(-40, 30, -46);
    group.add(towerCab);

    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(44, 15, 32),
      new THREE.MeshLambertMaterial({ color: 0x475569 })
    );
    hangar.position.set(35, 7.5, -50);
    group.add(hangar);

    this.scene.add(group);
  }

  buildIslandsAndAirports() {
    // 1. Emerald Bay Island (Home Base)
    this.createIsland(120, -40, 780, 480, 140, false);
    const ridge1 = new THREE.Mesh(
      new THREE.ConeGeometry(160, 130, 10),
      new THREE.MeshLambertMaterial({ color: 0x166534 })
    );
    ridge1.position.set(180, 68, -280);
    this.scene.add(ridge1);

    // 2. Volcanic Mid-Archipelago Islands (for Mission 01 & Slalom)
    this.createIsland(2150, -1150, 520, 460, 290, true);
    this.createIsland(3550, -1850, 420, 390, 220, true);
    this.createIsland(1650, -2100, 360, 340, 190, true);

    // Lighthouse Island
    this.createIsland(2950, -520, 240, 240, 60, false);
    const lhTower = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 9, 54, 12),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    lhTower.position.set(2950, 31, -520);
    this.scene.add(lhTower);

    this.beaconLight = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    this.beaconLight.position.set(2950, 60, -520);
    this.scene.add(this.beaconLight);

    // 3. Coral Atoll Island (Destination Airport)
    this.createIsland(4200, -2400, 860, 520, 110, false);

    // Build Both Airports
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      this.buildAirport(ap);
    }
  }

  setMissionRings(ringConfigs) {
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
    }
    this.rings = [];

    ringConfigs.forEach((cfg, idx) => {
      const torusGeo = new THREE.TorusGeometry(cfg.radius, 2.4, 12, 36);
      const torusMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x22c55e : 0x38bdf8
      });
      const mesh = new THREE.Mesh(torusGeo, torusMat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);

      // Orient ring toward next waypoint if available
      if (idx < ringConfigs.length - 1) {
        const next = ringConfigs[idx + 1];
        mesh.lookAt(next.x, next.y, next.z);
      } else {
        mesh.rotation.y = Math.PI / 2;
      }

      this.scene.add(mesh);
      this.rings.push({
        ...cfg,
        mesh,
        passed: false
      });
    });
  }

  updateRingHighlight(activeIndex) {
    this.rings.forEach((ring, idx) => {
      if (ring.passed) {
        ring.mesh.visible = false;
      } else if (idx === activeIndex) {
        ring.mesh.visible = true;
        ring.mesh.material.color.setHex(0x22c55e);
        const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.06;
        ring.mesh.scale.set(pulse, pulse, 1);
      } else {
        ring.mesh.visible = true;
        ring.mesh.material.color.setHex(0x38bdf8);
        ring.mesh.scale.set(1, 1, 1);
      }
    });
  }

  getGroundElevationAt(x, z) {
    // Check runways first for crisp flat surface
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      if (Math.abs(x - ap.x) <= ap.length * 0.52 && Math.abs(z - ap.z) <= ap.width * 0.65) {
        return ap.elevation;
      }
    }
    // Check islands
    for (const isl of this.islands) {
      const dx = (x - isl.x) / isl.radiusX;
      const dz = (z - isl.z) / isl.radiusZ;
      if (dx * dx + dz * dz <= 1.0) {
        return isl.elevation;
      }
    }
    // Open ocean
    return 0;
  }

  isOverRunway(x, z) {
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      if (Math.abs(x - ap.x) <= ap.length * 0.5 && Math.abs(z - ap.z) <= ap.width * 0.5) {
        return ap;
      }
    }
    return null;
  }

  update(dt) {
    for (const c of this.clouds) {
      c.position.x += 2.2 * dt;
      if (c.position.x > 7500) c.position.x = -2000;
    }
  }
}

window.WorldBuilder = WorldBuilder;
