// AeroPilot 3D — data: airliner spec, airports, missions.
// World convention: x east, z south, heading 0 = -z (north), PI/2 = +x (east).
export const KT = 1.94384;      // m/s -> knots
export const FPM = 196.85;      // m/s -> feet per minute
export const FT = 3.28084;      // m -> feet

export const AIRCRAFT = [
  { id: 'alis', name: 'AT-42 "Alis"', kind: 'Twin Turboprop', tag: 'Seimbang — andalan segala misi',
    stall: 33, rotate: 39, thrust: 4.35, drag: 0.0038,
    gearHeight: 3.1, bellyHeight: 1.35, bodyLen: 19, span: 24.5, scale: 1,
    colorBody: 0xf2f0ea, colorAccent: 0x0e7d8a, colorTail: 0xe2703a },
  { id: 'komet', name: 'CJ-7 "Komet"', kind: 'Twin Jet', tag: 'Jet cepat — rotasi panjang, jelajah tinggi',
    stall: 44, rotate: 52, thrust: 6.4, drag: 0.0029,
    gearHeight: 3.3, bellyHeight: 1.5, bodyLen: 21, span: 22, scale: 1.06,
    colorBody: 0xf5f5f7, colorAccent: 0xb02020, colorTail: 0x22262e },
  { id: 'rimba', name: 'ST-9 "Rimba"', kind: 'Bush STOL', tag: 'STOL — lepas landas super pendek',
    stall: 23, rotate: 28, thrust: 3.5, drag: 0.0048,
    gearHeight: 2.7, bellyHeight: 1.2, bodyLen: 16, span: 21, scale: 0.88,
    colorBody: 0xc9a227, colorAccent: 0x2e4a2a, colorTail: 0x2e4a2a }
];
export function craftSpec(id) { return AIRCRAFT.find(a => a.id === id) || AIRCRAFT[0]; }
export const PLANE = AIRCRAFT[0];

// headingRad: the direction the runway strip runs (its long axis).
// landHeading: the heading flown when landing on the named runway.
export const AIRPORTS = [
  { id: 'emerald_bay', code: 'EMB', name: 'Emerald Bay Intl', runway: 'RWY 09',
    x: 0, z: 0, elev: 4, axis: Math.PI / 2, landHeading: Math.PI / 2, length: 950, width: 44 },
  { id: 'coral_atoll', code: 'CAT', name: 'Coral Atoll Regional', runway: 'RWY 27',
    x: 4200, z: -2400, elev: 4, axis: Math.PI / 2, landHeading: -Math.PI / 2, length: 1050, width: 46 }
];
export function airport(id) { return AIRPORTS.find(a => a.id === id); }

// Landing threshold point for an airport's named runway: the upwind end you
// cross first when flying landHeading. For EMB (land +x): west end.
// For CAT (land -x): east end.
export function threshold(ap) {
  const dx = Math.sin(ap.landHeading), dz = -Math.cos(ap.landHeading);
  return { x: ap.x - dx * ap.length / 2, z: ap.z - dz * ap.length / 2 };
}

export const MISSIONS = [
  { id: 'island_hopper', name: 'MISSION 01 — ISLAND HOPPER', type: 'full_flight',
    startAirport: 'emerald_bay', targetAirport: 'coral_atoll',
    wind: { x: 0, z: 2.5 },
    brief: 'Take off from Emerald Bay RWY 09, thread all 6 sky rings, land at Coral Atoll RWY 27 and stop.',
    rings: [
      { x: 750, y: 95, z: 0, r: 42 }, { x: 1450, y: 185, z: -320, r: 42 },
      { x: 2250, y: 240, z: -850, r: 42 }, { x: 3100, y: 210, z: -1500, r: 42 },
      { x: 3950, y: 155, z: -2100, r: 42 }, { x: 4850, y: 95, z: -2400, r: 40 }
    ] },
  { id: 'canyon_slalom', name: 'MISSION 02 — VOLCANIC SLALOM', type: 'rings_only',
    startAirport: 'emerald_bay', forceAirStart: true,
    wind: { x: 1.5, z: -1.5 },
    brief: 'Air start. Weave all 10 rings around the volcano and back. Fastest clean run wins.',
    rings: [
      { x: 700, y: 130, z: -150, r: 38 }, { x: 1350, y: 170, z: -650, r: 38 },
      { x: 1850, y: 230, z: -1350, r: 36 }, { x: 2300, y: 140, z: -2050, r: 36 },
      { x: 2950, y: 190, z: -2350, r: 36 }, { x: 3550, y: 260, z: -1950, r: 35 },
      { x: 3900, y: 180, z: -1250, r: 35 }, { x: 3400, y: 120, z: -650, r: 35 },
      { x: 2650, y: 150, z: -450, r: 35 }, { x: 1950, y: 110, z: -200, r: 35 }
    ] },
  { id: 'final_approach', name: 'MISSION 03 — CROSSWIND FINAL', type: 'landing_challenge',
    startAirport: 'coral_atoll', targetAirport: 'coral_atoll',
    wind: { x: 0, z: 7.5 },
    brief: 'You are on a 1.5 km final to Coral Atoll RWY 27 with a 15 kt crosswind. Two gates, then put it on the numbers.',
    customSpawn: { x: 5650, y: 145, z: -2340, heading: -Math.PI / 2, speed: 61, throttle: 0.45, gearDown: true, flaps: 1 },
    rings: [
      { x: 5150, y: 95, z: -2385, r: 38 }, { x: 4720, y: 52, z: -2400, r: 34 }
    ] },
  { id: 'free_flight', name: 'FREE FLIGHT — ARCHIPELAGO', type: 'sandbox',
    startAirport: 'emerald_bay',
    wind: { x: 1.0, z: 1.5 },
    brief: 'Explore the archipelago or practice touch-and-go landings.',
    rings: [] }
];
export function mission(id) { return MISSIONS.find(m => m.id === id); }
