// AeroPilot V8 — the archipelago: ocean, islands, two airfields, rings.
// Also owns the ground model the flight engine queries (heightAt), so the
// world you see is exactly the world the physics believes in.

(function () {
  class AeroWorld {
    constructor(scene) {
      this.scene = scene;
      this.islands = [];
      this.ringMeshes = [];
      this.clouds = [];
      this.beacon = null;
      this.sky();
      this.sea();
      this.land();
    }

    sky() {
      this.scene.background = new THREE.Color(0x6ec6ff);
      this.scene.fog = new THREE.FogExp2(0x9bd8ff, 0.00014);
      const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0c4a6e, 0.95);
      this.scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
      sun.position.set(1800, 2600, 1400);
      this.scene.add(sun);

      const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const puffGeo = new THREE.DodecahedronGeometry(45, 1);
      for (let i = 0; i < 42; i++) {
        const cluster = new THREE.Group();
        const n = 3 + Math.floor(Math.random() * 4);
        for (let p = 0; p < n; p++) {
          const puff = new THREE.Mesh(puffGeo, puffMat);
          puff.position.set((p - 1.5) * 42, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 28);
          puff.scale.set(1.2 + Math.random() * 0.8, 0.65, 1.0 + Math.random() * 0.6);
          cluster.add(puff);
        }
        cluster.position.set(-1500 + Math.random() * 8500, 360 + Math.random() * 420, -4500 + Math.random() * 6500);
        this.scene.add(cluster);
        this.clouds.push(cluster);
      }
    }

    sea() {
      const geo = new THREE.PlaneGeometry(32000, 32000, 48, 48);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshPhongMaterial({ color: 0x0369a1, emissive: 0x082f49, specular: 0x7dd3fc, shininess: 65 });
      this.scene.add(new THREE.Mesh(geo, mat));
    }

    island(x, z, rx, rz, peakH) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const beachGeo = new THREE.CylinderGeometry(rx * 0.92, rx * 1.05, 3.2, 24);
      beachGeo.scale(1, 1, rz / rx);
      const beach = new THREE.Mesh(beachGeo, new THREE.MeshLambertMaterial({ color: 0xfde68a }));
      beach.position.y = 2.0;
      g.add(beach);
      const grassGeo = new THREE.CylinderGeometry(rx * 0.82, rx * 0.9, 2.2, 24);
      grassGeo.scale(1, 1, rz / rx);
      const grass = new THREE.Mesh(grassGeo, new THREE.MeshLambertMaterial({ color: 0x22c55e }));
      grass.position.y = 3.2;
      g.add(grass);
      if (peakH) {
        const peak = new THREE.Mesh(
          new THREE.ConeGeometry(rx * 0.42, peakH, 12),
          new THREE.MeshLambertMaterial({ color: 0x15803d }));
        peak.position.set(rx * 0.18, 4 + peakH * 0.5, -rz * 0.25);
        g.add(peak);
      }
      this.scene.add(g);
      this.islands.push({ x, z, rx, rz, elev: 4 });
      return g;
    }

    airfield(ap) {
      const g = new THREE.Group();
      g.position.set(ap.x, ap.elev + 0.45, ap.z);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(ap.len, 0.4, ap.wid),
        new THREE.MeshLambertMaterial({ color: 0x1e293b }));
      g.add(slab);

      const paint = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      for (let sx = -ap.len / 2 + 65; sx <= ap.len / 2 - 65; sx += 36) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(18, 0.45, 1.4), paint);
        dash.position.set(sx, 0.05, 0);
        g.add(dash);
      }
      for (const endSign of [-1, 1]) {
        const endX = endSign * (ap.len / 2 - 22);
        for (let kz = -14; kz <= 14; kz += 5.6) {
          const key = new THREE.Mesh(new THREE.BoxGeometry(22, 0.46, 2.2), paint);
          key.position.set(endX, 0.05, kz);
          g.add(key);
        }
      }
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (let lx = -ap.len / 2 + 10; lx <= ap.len / 2 - 10; lx += 45) {
        for (const side of [-1, 1]) {
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.4), edgeMat);
          lamp.position.set(lx, 0.35, side * (ap.wid / 2 + 1.2));
          g.add(lamp);
        }
      }
      const papiRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const papiWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let p = 0; p < 4; p++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 2.5), p < 2 ? papiWhite : papiRed);
        box.position.set(ap.len / 2 - 90, 0.8, -ap.wid / 2 - 8 - p * 4);
        g.add(box);
      }
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 8, 28, 8),
        new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
      tower.position.set(-40, 14, -46);
      g.add(tower);
      const cab = new THREE.Mesh(
        new THREE.CylinderGeometry(10, 7, 7, 8),
        new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 90 }));
      cab.position.set(-40, 30, -46);
      g.add(cab);
      const hangar = new THREE.Mesh(
        new THREE.BoxGeometry(44, 15, 32),
        new THREE.MeshLambertMaterial({ color: 0x475569 }));
      hangar.position.set(35, 7.5, -50);
      g.add(hangar);
      this.scene.add(g);
    }

    land() {
      this.island(120, -40, 780, 480, 0);
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(185, 100, 10),
        new THREE.MeshLambertMaterial({ color: 0x166534 }));
      ridge.position.set(180, 53, -280);
      this.scene.add(ridge);

      this.island(2150, -1150, 520, 460, 290);
      this.island(3550, -1850, 420, 390, 220);
      this.island(1650, -2100, 360, 340, 190);

      this.island(2950, -520, 240, 240, 0);
      const lh = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 9, 54, 12),
        new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
      lh.position.set(2950, 31, -520);
      this.scene.add(lh);
      this.beacon = new THREE.Mesh(
        new THREE.SphereGeometry(5.5, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      this.beacon.position.set(2950, 60, -520);
      this.scene.add(this.beacon);

      this.island(4200, -2400, 860, 520, 0);
      for (const ap of window.AERO_DATA.AIRFIELDS) this.airfield(ap);
    }

    // --- ground model shared with the flight engine ---
    heightAt(x, z) {
      for (const ap of window.AERO_DATA.AIRFIELDS) {
        if (Math.abs(x - ap.x) <= ap.len * 0.52 && Math.abs(z - ap.z) <= ap.wid * 0.65) return ap.elev;
      }
      for (const isl of this.islands) {
        const dx = (x - isl.x) / isl.rx, dz = (z - isl.z) / isl.rz;
        if (dx * dx + dz * dz <= 1.0) return isl.elev;
      }
      return 0;
    }

    runwayAt(x, z) {
      for (const ap of window.AERO_DATA.AIRFIELDS) {
        if (Math.abs(x - ap.x) <= ap.len * 0.5 && Math.abs(z - ap.z) <= ap.wid * 0.5) return ap;
      }
      return null;
    }

    // --- mission rings ---
    setRings(ringList) {
      for (const r of this.ringMeshes) this.scene.remove(r);
      this.ringMeshes = [];
      ringList.forEach((r, idx) => {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(r[3], 2.4, 12, 36),
          new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x22c55e : 0x38bdf8 }));
        mesh.position.set(r[0], r[1], r[2]);
        if (idx < ringList.length - 1) {
          const n = ringList[idx + 1];
          mesh.lookAt(n[0], n[1], n[2]);
        } else {
          mesh.rotation.y = Math.PI / 2;
        }
        this.scene.add(mesh);
        this.ringMeshes.push(mesh);
      });
    }

    markRings(activeIdx, passedCount) {
      this.ringMeshes.forEach((mesh, idx) => {
        if (idx < passedCount) { mesh.visible = false; return; }
        mesh.visible = true;
        if (idx === activeIdx) {
          mesh.material.color.setHex(0x22c55e);
          const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.06;
          mesh.scale.set(pulse, pulse, 1);
        } else {
          mesh.material.color.setHex(0x38bdf8);
          mesh.scale.set(1, 1, 1);
        }
      });
    }

    update(dt) {
      for (const c of this.clouds) {
        c.position.x += 2.2 * dt;
        if (c.position.x > 7500) c.position.x = -2000;
      }
      if (this.beacon) {
        const s = 1 + Math.sin(performance.now() * 0.004) * 0.25;
        this.beacon.scale.set(s, s, s);
      }
    }
  }

  window.AeroWorld = AeroWorld;
})();
