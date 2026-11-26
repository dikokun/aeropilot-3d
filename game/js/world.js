// AeroPilot 3D — scenery and ground model.
// Builds the sky/ocean, the island chain with both airfields, and the ring
// course; answers the two spatial queries the rest of the game needs:
// ground elevation at a point (runway slab, else island plateau, else sea)
// and which runway (if any) a point is over.
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
    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0c4a6e, 0.95));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sun.position.set(1800, 2600, 1400);
    this.scene.add(sun);

    // 42 drifting low-poly cloud groups
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    const geo = new THREE.DodecahedronGeometry(45, 1);
    const rnd = Math.random;
    for (let i = 0; i < 42; i++) {
      const grp = new THREE.Group();
      const n = 3 + Math.floor(rnd() * 4);
      for (let p = 0; p < n; p++) {
        const puff = new THREE.Mesh(geo, mat);
        puff.position.set((p - 1.5) * 42, (rnd() - 0.5) * 14, (rnd() - 0.5) * 28);
        puff.scale.set(1.2 + rnd() * 0.8, 0.65, 1.0 + rnd() * 0.6);
        grp.add(puff);
      }
      grp.position.set(-1500 + rnd() * 8500, 360 + rnd() * 420, -4500 + rnd() * 6500);
      this.scene.add(grp);
      this.clouds.push(grp);
    }
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(32000, 32000, 48, 48);
    geo.rotateX(-Math.PI / 2);
    this.ocean = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      color: 0x0369a1, emissive: 0x082f49, specular: 0x7dd3fc, shininess: 65
    }));
    this.scene.add(this.ocean);
  }

  createIsland(x, z, radiusX, radiusZ, peakHeight, hasPeak = true) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });
    const disc = (rTop, rBot, h, squash) => {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, 24);
      g.scale(1, 1, squash);
      return g;
    };
    const beach = new THREE.Mesh(disc(radiusX * 0.92, radiusX * 1.05, 4, radiusZ / radiusX), lambert(0xfde68a));
    beach.position.y = 2;
    grp.add(beach);
    const grass = new THREE.Mesh(disc(radiusX * 0.82, radiusX * 0.9, 3, radiusZ / radiusX), lambert(0x22c55e));
    grass.position.y = 4.2;
    grp.add(grass);
    if (hasPeak) {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(radiusX * 0.42, peakHeight, 12), lambert(0x15803d));
      peak.position.set(radiusX * 0.18, 4 + peakHeight * 0.5, -radiusZ * 0.25);
      grp.add(peak);
    }
    this.scene.add(grp);
    this.islands.push({ x, z, radiusX, radiusZ, elevation: 4 });
    return grp;
  }

  buildAirport(ap) {
    const grp = new THREE.Group();
    grp.position.set(ap.x, ap.elevation + 0.15, ap.z);
    const basic = (c) => new THREE.MeshBasicMaterial({ color: c });
    const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d, material, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.set(x, y, z);
      grp.add(m);
      return m;
    };

    box(ap.length, 0.4, ap.width, lambert(0x1e293b), 0, 0, 0); // runway slab

    const paint = basic(0xf8fafc);
    for (let sx = -ap.length / 2 + 65; sx <= ap.length / 2 - 65; sx += 36) {
      box(18, 0.45, 1.4, paint, sx, 0.05, 0); // centerline dashes
    }
    for (const s of [-1, 1]) { // threshold piano keys, both ends
      const endX = s * (ap.length / 2 - 22);
      for (let kz = -14; kz <= 14; kz += 5.6) box(22, 0.46, 2.2, paint, endX, 0.05, kz);
    }
    const edge = basic(0xfef08a);
    for (let lx = -ap.length / 2 + 10; lx <= ap.length / 2 - 10; lx += 45) {
      for (const s of [-1, 1]) box(1.4, 0.8, 1.4, edge, lx, 0.35, s * (ap.width / 2 + 1.2));
    }
    // PAPI: two white, two red, at the approach end
    const papiW = basic(0xffffff), papiR = basic(0xef4444);
    for (let p = 0; p < 4; p++) {
      box(2.5, 1.4, 2.5, p < 2 ? papiW : papiR, ap.length / 2 - 90, 0.8, -ap.width / 2 - 8 - p * 4);
    }
    // Tower and hangar on the north side
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 28, 8), lambert(0xe2e8f0));
    towerBase.position.set(-40, 14, -46);
    grp.add(towerBase);
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 7, 7, 8),
      new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 90 })
    );
    cab.position.set(-40, 30, -46);
    grp.add(cab);
    box(44, 15, 32, lambert(0x475569), 35, 7.5, -50);

    this.scene.add(grp);
  }

  buildIslandsAndAirports() {
    this.createIsland(120, -40, 780, 480, 140, false); // Emerald Bay home island
    const ridge = new THREE.Mesh(
      new THREE.ConeGeometry(160, 130, 10),
      new THREE.MeshLambertMaterial({ color: 0x166534 })
    );
    ridge.position.set(180, 68, -280);
    this.scene.add(ridge);

    this.createIsland(2150, -1150, 520, 460, 290, true);  // volcanic chain
    this.createIsland(3550, -1850, 420, 390, 220, true);
    this.createIsland(1650, -2100, 360, 340, 190, true);

    this.createIsland(2950, -520, 240, 240, 60, false);   // lighthouse island
    const lh = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 9, 54, 12),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    lh.position.set(2950, 31, -520);
    this.scene.add(lh);
    this.beaconLight = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    this.beaconLight.position.set(2950, 60, -520);
    this.scene.add(this.beaconLight);

    this.createIsland(4200, -2400, 860, 520, 110, false); // Coral Atoll
    for (const ap of window.SIM_CONFIG.AIRPORTS) this.buildAirport(ap);
  }

  setMissionRings(ringConfigs) {
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.rings = ringConfigs.map((cfg, idx) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.radius, 2.4, 12, 36),
        new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x22c55e : 0x38bdf8 })
      );
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      const next = ringConfigs[idx + 1];
      if (next) mesh.lookAt(next.x, next.y, next.z);
      else mesh.rotation.y = Math.PI / 2;
      this.scene.add(mesh);
      return { ...cfg, mesh, passed: false };
    });
  }

  updateRingHighlight(activeIndex) {
    this.rings.forEach((ring, idx) => {
      ring.mesh.visible = !ring.passed;
      if (ring.passed) return;
      const active = idx === activeIndex;
      ring.mesh.material.color.setHex(active ? 0x22c55e : 0x38bdf8);
      const s = active ? 1 + Math.sin(performance.now() * 0.006) * 0.06 : 1;
      ring.mesh.scale.set(s, s, 1);
    });
  }

  getGroundElevationAt(x, z) {
    for (const ap of window.SIM_CONFIG.AIRPORTS) {
      if (Math.abs(x - ap.x) <= ap.length * 0.52 && Math.abs(z - ap.z) <= ap.width * 0.65) {
        return ap.elevation;
      }
    }
    for (const isl of this.islands) {
      const dx = (x - isl.x) / isl.radiusX;
      const dz = (z - isl.z) / isl.radiusZ;
      if (dx * dx + dz * dz <= 1.0) return isl.elevation;
    }
    return 0;
  }

  isOverRunway(x, z) {
    return window.SIM_CONFIG.AIRPORTS.find(ap =>
      Math.abs(x - ap.x) <= ap.length * 0.5 && Math.abs(z - ap.z) <= ap.width * 0.5
    ) || null;
  }

  update(dt) {
    for (const c of this.clouds) {
      c.position.x += 2.2 * dt;
      if (c.position.x > 7500) c.position.x = -2000;
    }
  }
}

window.WorldBuilder = WorldBuilder;
