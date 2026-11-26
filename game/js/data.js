// AeroPilot V8 — static game data: fleet, airfields, routes.
// Numbers are the game's design facts (speeds in knots, distances in metres).

window.AERO_DATA = (function () {
  // Each airframe spec carries everything the flight engine reads. The first
  // entry is the reference turboprop the whole route set was tuned around.
  const FLEET = [
    { id: 'alis', label: 'AT-42 "Alis"', type: 'Twin Turboprop', blurb: 'Balanced all-rounder',
      massKg: 14500, thrustN: 58000, stallKt: 64, rotateKt: 76, vmaxKt: 245,
      gearM: 3.1, bellyM: 1.35, pAuth: 1.15, rAuth: 1.75, yAuth: 0.65, dragK: 0.00019,
      size: 1.0, paint: 0xf8fafc, trim: 0x0284c7, jet: false },
    { id: 'komet', label: 'CJ-7 "Komet"', type: 'Twin Jet', blurb: 'Fast jet, long rotation, high cruise',
      massKg: 15000, thrustN: 98000, stallKt: 86, rotateKt: 101, vmaxKt: 320,
      gearM: 3.3, bellyM: 1.5, pAuth: 1.05, rAuth: 1.6, yAuth: 0.6, dragK: 0.00016,
      size: 1.06, paint: 0xf5f5f7, trim: 0xb02020, jet: true },
    { id: 'rimba', label: 'ST-9 "Rimba"', type: 'Bush STOL', blurb: 'Hops off the ground in metres',
      massKg: 8200, thrustN: 29500, stallKt: 45, rotateKt: 54, vmaxKt: 175,
      gearM: 2.7, bellyM: 1.2, pAuth: 1.3, rAuth: 2.0, yAuth: 0.75, dragK: 0.00024,
      size: 0.88, paint: 0xc9a227, trim: 0x2e4a2a, jet: false },
    { id: 'banteng', label: 'BH-400 "Banteng"', type: 'Quad Heavy Jet', blurb: 'Heavy quad-jet, needs the whole runway',
      massKg: 39000, thrustN: 300000, stallKt: 101, rotateKt: 117, vmaxKt: 340,
      gearM: 3.8, bellyM: 1.8, pAuth: 0.9, rAuth: 1.35, yAuth: 0.5, dragK: 0.00015,
      size: 1.35, paint: 0xeef0f2, trim: 0x14467c, jet: true },
    { id: 'lutung', label: 'LA-5 "Lutung"', type: 'Amphibian', blurb: 'Gentle light island hopper',
      massKg: 7600, thrustN: 24000, stallKt: 51, rotateKt: 60, vmaxKt: 185,
      gearM: 2.9, bellyM: 1.3, pAuth: 1.25, rAuth: 1.95, yAuth: 0.7, dragK: 0.00026,
      size: 0.92, paint: 0x3fa7a0, trim: 0xf2f0ea, jet: false },
    { id: 'vyper', label: 'VX-1 "Vyper"', type: 'Prop Racer', blurb: 'Tiny twitchy slalom weapon',
      massKg: 5400, thrustN: 30500, stallKt: 74, rotateKt: 86, vmaxKt: 290,
      gearM: 2.6, bellyM: 1.1, pAuth: 1.45, rAuth: 2.3, yAuth: 0.8, dragK: 0.00014,
      size: 0.8, paint: 0x23262b, trim: 0x9fd41c, jet: false }
  ];

  const AIRFIELDS = [
    { id: 'emb', code: 'EMB', name: 'Emerald Bay Intl', x: 0, z: 0, elev: 4, len: 950, wid: 44 },
    { id: 'cat', code: 'CAT', name: 'Coral Atoll Regional', x: 4200, z: -2400, elev: 4, len: 1050, wid: 46 }
  ];

  // Route kinds: 'full' = depart, fly the rings, land at target.
  // 'rings' = airborne start, rings only. 'landing' = spawn on final, land.
  // 'free' = sandbox.
  const ROUTES = {
    island_hopper: {
      label: 'MISSION 01 · ISLAND HOPPER', kind: 'full', from: 'emb', to: 'cat',
      wind: { x: 0, z: 2.5 },
      rings: [[750, 95, 0, 42], [1450, 185, -320, 42], [2250, 240, -850, 42],
              [3100, 210, -1500, 42], [3950, 155, -2100, 42], [4850, 95, -2400, 40]]
    },
    canyon_slalom: {
      label: 'MISSION 02 · VOLCANIC SLALOM', kind: 'rings', from: 'emb', airStart: true,
      wind: { x: 1.5, z: -1.5 },
      rings: [[700, 130, -150, 38], [1350, 170, -650, 38], [1850, 230, -1350, 36],
              [2300, 140, -2050, 36], [2950, 190, -2350, 36], [3550, 260, -1950, 35],
              [3900, 180, -1250, 35], [3400, 120, -650, 35], [2650, 150, -450, 35],
              [1950, 110, -200, 35]]
    },
    final_approach: {
      label: 'MISSION 03 · CROSSWIND FINAL', kind: 'landing', from: 'cat', to: 'cat',
      spawn: { x: 5650, y: 145, z: -2340, hdg: 270, kt: 118, thr: 0.45, gear: true, flaps: 1 },
      wind: { x: 0, z: 7.5 },
      rings: [[5150, 95, -2385, 38], [4720, 52, -2400, 34]]
    },
    sunset_freight: {
      label: 'MISSION 04 · SUNSET FREIGHT', kind: 'full', from: 'emb', to: 'cat',
      wind: { x: 3, z: 5 },
      rings: [[900, 70, 350, 42], [1900, 110, -250, 42], [2900, 90, -1100, 42], [3900, 120, -1900, 40]]
    },
    volcano_orbit: {
      label: 'MISSION 05 · VOLCANO ORBIT', kind: 'rings', from: 'emb', airStart: true,
      wind: { x: -1.5, z: 1.5 },
      rings: [[1950, 110, -200, 35], [2650, 150, -450, 35], [3400, 120, -650, 35],
              [3900, 180, -1250, 35], [3550, 260, -1950, 35], [2950, 190, -2350, 36],
              [2300, 140, -2050, 36], [1850, 230, -1350, 36]]
    },
    emb_crosswind: {
      label: 'MISSION 06 · EMB CROSSWIND FINAL', kind: 'landing', from: 'emb', to: 'emb',
      spawn: { x: -1925, y: 145, z: 60, hdg: 90, kt: 118, thr: 0.45, gear: true, flaps: 1 },
      wind: { x: 0, z: 7.5 },
      rings: [[-1450, 95, 30, 38], [-1000, 52, 10, 34]]
    },
    free_flight: {
      label: 'FREE FLIGHT · ARCHIPELAGO', kind: 'free', from: 'emb',
      wind: { x: 1.0, z: 1.5 }, rings: []
    }
  };

  return { FLEET, AIRFIELDS, ROUTES };
})();
