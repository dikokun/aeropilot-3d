// AeroPilot 3D — data: airliner spec, airports, missions.
// World convention: x east, z south, heading 0 = -z (north), PI/2 = +x (east).
export const KT = 1.94384;      // m/s -> knots
export const FPM = 196.85;      // m/s -> feet per minute
export const FT = 3.28084;      // m -> feet

export const PLANE = {
  name: 'AT-42 "Alis" Twin Turboprop',
  stall: 33,            // m/s, clean (64 kt)
  rotate: 39,           // m/s (76 kt)
  thrust: 4.35,         // m/s^2 at full throttle, sea level
  drag: 0.0038,
  mass: 14500,
  gearHeight: 3.1,      // CG height on gear
  bellyHeight: 1.35,    // CG height gear-up
  bodyLen: 19, span: 24.5,
  colorBody: 0xf2f0ea, colorAccent: 0x0e7d8a, colorTail: 0xe2703a
};

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
