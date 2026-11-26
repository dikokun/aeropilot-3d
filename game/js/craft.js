// AeroPilot V8 — aircraft mesh built from primitives, livery per airframe.
// The mesh faces -Z (three.js forward). Gear is a toggleable group; prop
// discs spin with throttle for propeller types, jets get plain nacelles.

(function () {
  function mat(color, opts) {
    return new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
  }

  function buildCraft(spec) {
    const root = new THREE.Group();
    const paint = mat(spec.paint);
    const trim = mat(spec.trim);
    const dark = mat(0x1f2937);
    const metal = mat(0x9ca3af);

    // Fuselage: a tube with a rounded nose and a tapered tail cone.
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.35, 11.5, 14), paint);
    tube.rotation.x = Math.PI / 2;
    root.add(tube);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.55, 14, 10), paint);
    nose.position.z = -5.7;
    nose.scale.set(1, 0.92, 1.15);
    root.add(nose);
    const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.35, 3.6, 12), paint);
    tailCone.rotation.x = Math.PI / 2;
    tailCone.position.set(0, 0.45, 7.4);
    root.add(tailCone);

    // Cockpit glass.
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.28, 12, 8),
      new THREE.MeshPhongMaterial({ color: 0x0e7490, shininess: 120 }));
    glass.position.set(0, 0.62, -5.35);
    glass.scale.set(0.92, 0.55, 0.9);
    root.add(glass);

    // Cheatline stripe down both sides.
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 10.6), trim);
      stripe.position.set(side * 1.53, 0.15, 0.1);
      root.add(stripe);
    }

    // Main wing with trimmed tips.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.28, 2.7), paint);
    wing.position.set(0, -0.55, -0.6);
    root.add(wing);
    for (const side of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 2.5), trim);
      tip.position.set(side * 7.6, -0.55, -0.6);
      root.add(tip);
    }

    // Tail feathers.
    const hstab = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 1.7), paint);
    hstab.position.set(0, 0.95, 8.6);
    root.add(hstab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.9, 2.1), trim);
    fin.position.set(0, 1.9, 8.5);
    root.add(fin);

    // Engines under the wing; props spin, jets are clean nacelles.
    const spinners = [];
    for (const side of [-1, 1]) {
      const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 3.4, 10), metal);
      nac.rotation.x = Math.PI / 2;
      nac.position.set(side * 3.6, -0.85, -1.1);
      root.add(nac);
      if (spec.jet) {
        const intake = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), dark);
        intake.position.set(side * 3.6, -0.85, -2.85);
        intake.rotation.y = Math.PI;
        root.add(intake);
      } else {
        const prop = new THREE.Group();
        prop.position.set(side * 3.6, -0.85, -2.95);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 20),
          new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
        prop.add(disc);
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.9, 0.05), dark);
          blade.rotation.z = b * Math.PI * 2 / 3;
          prop.add(blade);
        }
        root.add(prop);
        spinners.push(prop);
      }
    }

    // Landing gear: nose leg plus two mains, folded away as one group.
    const gearGroup = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.7, 6);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    function leg(x, z) {
      const l = new THREE.Mesh(legGeo, metal);
      l.position.set(x, -2.1, z);
      gearGroup.add(l);
      const w = new THREE.Mesh(wheelGeo, dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -2.95, z);
      gearGroup.add(w);
    }
    leg(0, -4.2); leg(-1.5, 0.6); leg(1.5, 0.6);
    root.add(gearGroup);

    root.scale.setScalar(spec.size);

    return {
      group: root,
      setGear(down) { gearGroup.visible = down; },
      spin(dt, throttle) {
        const rate = 4 + throttle * 55;
        for (const p of spinners) p.rotation.z += rate * dt;
      }
    };
  }

  window.buildCraft = buildCraft;
})();
