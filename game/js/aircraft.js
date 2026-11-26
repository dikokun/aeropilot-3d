class AircraftModel {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.propellers = [];
    this.gearGroup = new THREE.Group();
    this.leftAileron = null;
    this.rightAileron = null;
    this.elevator = null;
    this.rudder = null;
    this.flaps = [];

    this.buildAirframe();
    this.scene.add(this.root);
  }

  // Aircraft selection: repaint the airframe and resize it for the chosen craft.
  setLivery(bodyColor, stripeColor) {
    if (this.bodyMat) this.bodyMat.color.setHex(bodyColor);
    if (this.stripeMat) this.stripeMat.color.setHex(stripeColor);
  }

  setScale(s) {
    this.root.scale.setScalar(s || 1);
  }

  buildAirframe() {
    // Note: Local aircraft forward axis is -Z (Three.js standard lookAt/quaternion convention)
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xf8fafc, shininess: 70 });
    const stripeMat = new THREE.MeshPhongMaterial({ color: 0x0284c7, shininess: 60 });
    this.bodyMat = bodyMat;
    this.stripeMat = stripeMat;
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 120 });

    // Main Fuselage Cylinder along Z
    const fuseGeo = new THREE.CylinderGeometry(1.45, 1.45, 15.5, 16);
    fuseGeo.rotateX(Math.PI / 2);
    const fuse = new THREE.Mesh(fuseGeo, bodyMat);
    this.root.add(fuse);

    // Nose Cone (-Z)
    const noseGeo = new THREE.ConeGeometry(1.45, 3.6, 16);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = -9.55;
    this.root.add(nose);

    // Cockpit Windshield
    const cockpitGeo = new THREE.BoxGeometry(2.05, 0.85, 2.1);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.85, -7.8);
    cockpit.rotation.x = 0.25;
    this.root.add(cockpit);

    // Tail Cone (+Z)
    const tailConeGeo = new THREE.ConeGeometry(1.45, 4.4, 16);
    tailConeGeo.rotateX(Math.PI / 2);
    const tailCone = new THREE.Mesh(tailConeGeo, stripeMat);
    tailCone.position.z = 9.95;
    this.root.add(tailCone);

    // Main Swept Wings
    const wingGeo = new THREE.BoxGeometry(23.0, 0.34, 2.9);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(0, 0.15, -0.5);
    this.root.add(wing);

    // Wingtip Winglets
    for (const side of [-1, 1]) {
      const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.45, 1.1), stripeMat);
      winglet.position.set(side * 11.5, 0.8, -0.3);
      winglet.rotation.z = -side * 0.25;
      this.root.add(winglet);
    }

    // Animated Ailerons & Flaps
    const ailGeo = new THREE.BoxGeometry(3.4, 0.16, 0.65);
    this.leftAileron = new THREE.Mesh(ailGeo, stripeMat);
    this.leftAileron.position.set(-8.8, 0.15, 1.15);
    this.root.add(this.leftAileron);

    this.rightAileron = new THREE.Mesh(ailGeo, stripeMat);
    this.rightAileron.position.set(8.8, 0.15, 1.15);
    this.root.add(this.rightAileron);

    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 0.75), darkMat);
      flap.position.set(side * 4.2, 0.1, 1.15);
      this.root.add(flap);
      this.flaps.push(flap);
    }

    // Horizontal Stabilizer & Elevator
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.24, 1.5), bodyMat);
    hStab.position.set(0, 0.45, 10.2);
    this.root.add(hStab);

    this.elevator = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.55), stripeMat);
    this.elevator.position.set(0, 0.45, 11.1);
    this.root.add(this.elevator);

    // Vertical Stabilizer & Rudder
    const vStab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 2.3), stripeMat);
    vStab.position.set(0, 2.1, 9.8);
    this.root.add(vStab);

    this.rudder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.7), bodyMat);
    this.rudder.position.set(0, 2.1, 11.15);
    this.root.add(this.rudder);

    // Twin Wing-Mounted Engine Nacelles & Spinning Propellers
    for (const side of [-1, 1]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.58, 3.4, 12), darkMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * 4.5, -0.15, -1.4);
      this.root.add(nacelle);

      const propHub = new THREE.Group();
      propHub.position.set(side * 4.5, -0.15, -3.2);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.06), darkMat);
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.06), darkMat);
      propHub.add(blade1, blade2);
      this.root.add(propHub);
      this.propellers.push(propHub);
    }

    // Retractable Tricycle Landing Gear
    const gearPositions = [
      { x: 0,    y: -1.85, z: -6.8 },  // Nose gear
      { x: -2.6, y: -1.85, z: 0.4 },   // Left main
      { x: 2.6,  y: -1.85, z: 0.4 }    // Right main
    ];

    for (const gp of gearPositions) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.7, 8), darkMat);
      strut.position.set(gp.x, gp.y + 0.4, gp.z);
      this.gearGroup.add(strut);

      const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.position.set(gp.x, gp.y - 0.35, gp.z);
      this.gearGroup.add(wheel);
    }
    this.root.add(this.gearGroup);

    // Wingtip Navigation Lights (Red Left, Green Right)
    const redNav = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    redNav.position.set(-11.5, 0.25, -0.8);
    this.root.add(redNav);

    const greenNav = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    greenNav.position.set(11.5, 0.25, -0.8);
    this.root.add(greenNav);
  }

  updateVisuals(dt, state) {
    // Spin propellers proportional to throttle + airspeed
    const propSpeed = (12 + state.throttle * 48) * dt;
    for (const p of this.propellers) {
      p.rotation.z += propSpeed;
    }

    // Animate control surfaces
    this.leftAileron.rotation.x = state.rollInput * 0.42;
    this.rightAileron.rotation.x = -state.rollInput * 0.42;
    this.elevator.rotation.x = -state.pitchInput * 0.38;
    this.rudder.rotation.y = state.yawInput * 0.35;

    // Flaps deflection (0, 1, 2)
    const flapAngle = state.flaps * 0.28;
    for (const f of this.flaps) {
      f.rotation.x = flapAngle;
    }

    // Smooth landing gear retract/extend
    const targetScaleY = state.gearDown ? 1.0 : 0.01;
    this.gearGroup.scale.y += (targetScaleY - this.gearGroup.scale.y) * Math.min(1, dt * 5);
    this.gearGroup.visible = this.gearGroup.scale.y > 0.05;
  }
}

window.AircraftModel = AircraftModel;
