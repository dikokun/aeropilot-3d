// AT-42 "Alis" twin turboprop: articulated surfaces, spinning props, gear.
import * as THREE from 'three';
import { PLANE } from './config.js';

function mat(color, rough = 0.45, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function box(w, h, d, m) { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); return x; }
function cyl(rt, rb, h, m, seg = 14) { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); return x; }

export function buildAircraft(spec) {
  const S = spec || PLANE;
  const g = new THREE.Group();
  const body = mat(S.colorBody), accent = mat(S.colorAccent, 0.4, 0.4),
    tailM = mat(S.colorTail, 0.45, 0.3), dark = mat(0x1c2733, 0.25, 0.5),
    tyre = mat(0x14161a, 0.9, 0), hub = mat(0xb9c0c7, 0.35, 0.7);

  // Fuselage (nose +z), origin at CG
  const fus = cyl(1.9, 1.9, 13.5, body); fus.rotation.x = Math.PI / 2; fus.position.z = 0.6; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 10), body);
  nose.scale.set(1, 0.94, 1.5); nose.position.z = 7.3; g.add(nose);
  const tailCone = cyl(1.85, 0.65, 5.6, body); tailCone.rotation.x = Math.PI / 2; tailCone.position.z = -8.9; g.add(tailCone);
  // Cockpit glass + window band
  const glass = box(2.7, 0.85, 1.7, dark); glass.position.set(0, 1.05, 6.9); glass.rotation.x = 0.35; g.add(glass);
  for (const s of [-1, 1]) {
    const band = box(0.06, 0.5, 9.5, dark); band.position.set(s * 1.88, 0.62, 0.9); g.add(band);
    const cheat = box(0.06, 0.42, 12.6, accent); cheat.position.set(s * 1.9, -0.28, 0.4); g.add(cheat);
  }
  // Wing with slight dihedral (two halves) + ailerons
  const ailerons = [];
  for (const s of [-1, 1]) {
    const half = new THREE.Group();
    const w = box(S.span / 2, 0.32, 2.7, body); w.position.x = s * S.span / 4; half.add(w);
    const ail = box(4.6, 0.16, 0.85, accent); ail.position.set(s * (S.span / 2 - 2.6), 0, -1.65);
    const pivot = new THREE.Group(); pivot.position.set(s * (S.span / 2 - 2.6), 0, -1.25); pivot.add(ail); ail.position.set(0, 0, -0.42);
    half.add(pivot); ailerons.push({ pivot, side: s });
    half.position.set(0, -0.55, 0.6);
    half.rotation.z = s * 0.055;
    g.add(half);
    // Nacelle + prop
    const nac = cyl(0.88, 0.8, 5.6, body); nac.rotation.x = Math.PI / 2; nac.position.set(s * 4.7, -0.62, 1.3); g.add(nac);
    const prop = new THREE.Group(); prop.position.set(s * 4.7, -0.62, 4.25);
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = box(0.3, 2.05, 0.08, dark); b.position.y = 1.0;
      const holder = new THREE.Group(); holder.rotation.z = i * Math.PI / 2; holder.add(b); blades.add(holder);
    }
    prop.add(blades);
    const spinner = cyl(0.05, 0.34, 0.8, tailM); spinner.rotation.x = Math.PI / 2; spinner.position.z = 0.3; prop.add(spinner);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.05, 24),
      new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.10, side: THREE.DoubleSide }));
    disc.position.z = -0.06; prop.add(disc);
    g.add(prop);
    if (!g.userData.props) g.userData.props = [];
    g.userData.props.push({ prop, blades, disc });
  }
  // Tail: fin (orange) + rudder, stab + elevator
  const fin = box(0.32, 3.6, 2.9, tailM); fin.position.set(0, 2.3, -10.6); fin.rotation.x = -0.18; g.add(fin);
  const rudder = box(0.2, 3.0, 1.15, tailM); const rudPivot = new THREE.Group();
  rudPivot.position.set(0, 2.3, -11.9); rudder.position.set(0, 0, -0.55); rudPivot.add(rudder); g.add(rudPivot);
  const stab = box(7.6, 0.26, 1.9, body); stab.position.set(0, 1.15, -11.2); g.add(stab);
  const elev = box(7.2, 0.14, 0.8, accent); const elevPivot = new THREE.Group();
  elevPivot.position.set(0, 1.15, -12.05); elev.position.set(0, 0, -0.4); elevPivot.add(elev); g.add(elevPivot);
  // Gear: nose + 2 mains, slides with gearT
  const gear = new THREE.Group();
  function leg(x, z) {
    const l = new THREE.Group();
    const strut = cyl(0.13, 0.13, 2.2, hub); strut.position.y = -1.9; l.add(strut);
    const wheel = cyl(0.52, 0.52, 0.34, tyre); wheel.rotation.z = Math.PI / 2; wheel.position.y = -3.0; l.add(wheel);
    l.position.set(x, -1.2, z);
    gear.add(l);
    return l;
  }
  leg(0, 6.2); leg(-2.1, -0.4); leg(2.1, -0.4);
  g.add(gear);
  // Wingtip lights
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6),
      new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff3524 : 0x2aff5a }));
    l.position.set(s * S.span / 2, -0.4, 0.6);
    g.add(l);
  }
  g.userData.parts = { ailerons, rudPivot, elevPivot, gear };
  g.scale.setScalar(S.scale || 1);
  return g;
}

export function poseAircraft(g, p, input) {
  g.position.set(p.x, p.y, p.z);
  g.rotation.order = 'YXZ';
  g.rotation.y = Math.PI - p.heading;
  g.rotation.x = -p.pitch * 0.92;
  g.rotation.z = p.bank * 0.95;
  const u = g.userData;
  for (const pr of u.props) {
    pr.prop.rotation.z = p.propPhase * 6;
    pr.blades.visible = p.throttle < 0.92;
    pr.disc.material.opacity = 0.04 + p.throttle * 0.09;
  }
  const parts = u.parts;
  for (const a of parts.ailerons) a.pivot.rotation.x = (input ? input.roll : 0) * 0.5 * a.side;
  parts.elevPivot.rotation.x = (input ? input.pitch : 0) * -0.45;
  parts.rudPivot.rotation.y = (input ? input.roll : 0) * 0.3;
  parts.gear.position.y = (1 - p.gearT) * 2.6;
  parts.gear.visible = p.gearT > 0.04;
}
