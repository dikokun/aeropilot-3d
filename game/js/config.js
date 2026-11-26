window.SIM_CONFIG = {
  // Unit scale: 1 world unit = 1 meter
  WORLD_SCALE: 1,
  METERS_TO_FEET: 3.28084,
  MPS_TO_KNOTS: 1.94384,
  MPS_TO_FPM: 196.85,

  AIRCRAFT: {
    mass: 14500,             // kg (Regional Twin-Turboprop Airliner)
    maxThrust: 58000,        // Newtons
    wingArea: 54.0,          // m^2
    airDensity: 1.225,       // kg/m^3 at sea level
    stallSpeedKnots: 64,
    takeoffSpeedKnots: 76,
    maxSpeedKnots: 245,
    gearHeight: 3.1,         // CG height above runway when gear down
    bellyHeight: 1.35,       // CG height when gear up
    pitchAuthority: 1.15,
    rollAuthority: 1.75,
    yawAuthority: 0.65,
    maxSafeLandingVsiFpm: -650,
    maxSafeBankDeg: 18
  },

  AIRPORTS: [
    {
      id: 'emerald_bay',
      name: 'Emerald Bay Intl (RWY 09)',
      code: 'EMB',
      x: 0,
      z: 0,
      elevation: 4,
      headingDeg: 90,        // Aircraft faces +X (East, 090 deg)
      length: 950,
      width: 44
    },
    {
      id: 'coral_atoll',
      name: 'Coral Atoll Regional (RWY 27)',
      code: 'CAT',
      x: 4200,
      z: -2400,
      elevation: 4,
      headingDeg: 270,       // Runway oriented East-West (landing Westbound 270 or Eastbound 090)
      length: 1050,
      width: 46
    }
  ],

  MISSIONS: {
    island_hopper: {
      id: 'island_hopper',
      name: 'MISSION 01: ISLAND HOPPER',
      type: 'full_flight',
      startAirport: 'emerald_bay',
      targetAirport: 'coral_atoll',
      crosswindX: 0,
      crosswindZ: 2.5,
      rings: [
        { x: 750,  y: 95,  z: 0,     radius: 42 },
        { x: 1450, y: 185, z: -320,  radius: 42 },
        { x: 2250, y: 240, z: -850,  radius: 42 },
        { x: 3100, y: 210, z: -1500, radius: 42 },
        { x: 3950, y: 155, z: -2100, radius: 42 },
        { x: 4850, y: 95,  z: -2400, radius: 40 }
      ]
    },
    canyon_slalom: {
      id: 'canyon_slalom',
      name: 'MISSION 02: VOLCANIC SLALOM',
      type: 'rings_only',
      startAirport: 'emerald_bay',
      forceAirStart: true,
      crosswindX: 1.5,
      crosswindZ: -1.5,
      rings: [
        { x: 700,  y: 130, z: -150,  radius: 38 },
        { x: 1350, y: 170, z: -650,  radius: 38 },
        { x: 1850, y: 230, z: -1350, radius: 36 },
        { x: 2300, y: 140, z: -2050, radius: 36 },
        { x: 2950, y: 190, z: -2350, radius: 36 },
        { x: 3550, y: 260, z: -1950, radius: 35 },
        { x: 3900, y: 180, z: -1250, radius: 35 },
        { x: 3400, y: 120, z: -650,  radius: 35 },
        { x: 2650, y: 150, z: -450,  radius: 35 },
        { x: 1950, y: 110, z: -200,  radius: 35 }
      ]
    },
    final_approach: {
      id: 'final_approach',
      name: 'MISSION 03: CROSSWIND FINAL',
      type: 'landing_challenge',
      startAirport: 'coral_atoll',
      targetAirport: 'coral_atoll',
      customSpawn: {
        x: 5650,
        y: 145,
        z: -2340,
        headingDeg: 270,
        speedKnots: 118,
        throttle: 0.45,
        gearDown: true,
        flaps: 1
      },
      crosswindX: 0,
      crosswindZ: 7.5,
      rings: [
        { x: 5150, y: 95, z: -2385, radius: 38 },
        { x: 4720, y: 52, z: -2400, radius: 34 }
      ]
    },
    sunset_freight: {
      id: 'sunset_freight',
      name: 'MISSION 04: SUNSET FREIGHT',
      type: 'full_flight',
      startAirport: 'emerald_bay',
      targetAirport: 'coral_atoll',
      crosswindX: 3,
      crosswindZ: 5,
      rings: [
        { x: 900, y: 70, z: 350, radius: 42 },
        { x: 1900, y: 110, z: -250, radius: 42 },
        { x: 2900, y: 90, z: -1100, radius: 42 },
        { x: 3900, y: 120, z: -1900, radius: 40 }
      ]
    },
    volcano_orbit: {
      id: 'volcano_orbit',
      name: 'MISSION 05: VOLCANO ORBIT',
      type: 'rings_only',
      startAirport: 'emerald_bay',
      forceAirStart: true,
      crosswindX: -1.5,
      crosswindZ: 1.5,
      rings: [
        { x: 1950, y: 110, z: -200, radius: 35 },
        { x: 2650, y: 150, z: -450, radius: 35 },
        { x: 3400, y: 120, z: -650, radius: 35 },
        { x: 3900, y: 180, z: -1250, radius: 35 },
        { x: 3550, y: 260, z: -1950, radius: 35 },
        { x: 2950, y: 190, z: -2350, radius: 36 },
        { x: 2300, y: 140, z: -2050, radius: 36 },
        { x: 1850, y: 230, z: -1350, radius: 36 }
      ]
    },
    emb_crosswind: {
      id: 'emb_crosswind',
      name: 'MISSION 06: EMB CROSSWIND FINAL',
      type: 'landing_challenge',
      startAirport: 'emerald_bay',
      targetAirport: 'emerald_bay',
      customSpawn: {
        x: -1925,
        y: 145,
        z: 60,
        headingDeg: 90,
        speedKnots: 118,
        throttle: 0.45,
        gearDown: true,
        flaps: 1
      },
      crosswindX: 0,
      crosswindZ: 7.5,
      rings: [
        { x: -1450, y: 95, z: 30, radius: 38 },
        { x: -1000, y: 52, z: 10, radius: 34 }
      ]
    },
    free_flight: {
      id: 'free_flight',
      name: 'FREE FLIGHT: ARCHIPELAGO',
      type: 'sandbox',
      startAirport: 'emerald_bay',
      crosswindX: 1.0,
      crosswindZ: 1.5,
      rings: []
    }
  }
};

// Selectable fleet (added on top of the base simulator): each entry carries
// the full flight-spec fields FlightPhysics reads from SIM_CONFIG.AIRCRAFT,
// plus livery/scale for the 3D model. applyAircraft() in main.js copies the
// flight fields into SIM_CONFIG.AIRCRAFT before a mission starts.
window.SIM_CONFIG.AIRCRAFT_FLEET = [
  { id: 'alis', name: 'AT-42 "Alis"', kind: 'Twin Turboprop', desc: 'Balanced all-rounder',
    mass: 14500, maxThrust: 58000, wingArea: 54.0, airDensity: 1.225,
    stallSpeedKnots: 64, takeoffSpeedKnots: 76, maxSpeedKnots: 245,
    gearHeight: 3.1, bellyHeight: 1.35, pitchAuthority: 1.15, rollAuthority: 1.75, yawAuthority: 0.65,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00019,
    scale: 1.0, colorBody: 0xf8fafc, colorAccent: 0x0284c7, jet: false },
  { id: 'komet', name: 'CJ-7 "Komet"', kind: 'Twin Jet', desc: 'Fast jet — long rotation, high cruise',
    mass: 15000, maxThrust: 98000, wingArea: 52.0, airDensity: 1.225,
    stallSpeedKnots: 86, takeoffSpeedKnots: 101, maxSpeedKnots: 320,
    gearHeight: 3.3, bellyHeight: 1.5, pitchAuthority: 1.05, rollAuthority: 1.6, yawAuthority: 0.6,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00016,
    scale: 1.06, colorBody: 0xf5f5f7, colorAccent: 0xb02020, jet: true },
  { id: 'rimba', name: 'ST-9 "Rimba"', kind: 'Bush STOL', desc: 'STOL — hops off the ground in metres',
    mass: 8200, maxThrust: 29500, wingArea: 46.0, airDensity: 1.225,
    stallSpeedKnots: 45, takeoffSpeedKnots: 54, maxSpeedKnots: 175,
    gearHeight: 2.7, bellyHeight: 1.2, pitchAuthority: 1.3, rollAuthority: 2.0, yawAuthority: 0.75,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00024,
    scale: 0.88, colorBody: 0xc9a227, colorAccent: 0x2e4a2a, jet: false },
  { id: 'banteng', name: 'BH-400 "Banteng"', kind: 'Quad Heavy Jet', desc: 'Heavy quad-jet — needs the whole runway',
    mass: 39000, maxThrust: 300000, wingArea: 120.0, airDensity: 1.225,
    stallSpeedKnots: 101, takeoffSpeedKnots: 117, maxSpeedKnots: 340,
    gearHeight: 3.8, bellyHeight: 1.8, pitchAuthority: 0.9, rollAuthority: 1.35, yawAuthority: 0.5,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00015,
    scale: 1.35, colorBody: 0xeef0f2, colorAccent: 0x14467c, jet: true },
  { id: 'lutung', name: 'LA-5 "Lutung"', kind: 'Amphibian', desc: 'Light amphibian — gentle island hopper',
    mass: 7600, maxThrust: 24000, wingArea: 44.0, airDensity: 1.225,
    stallSpeedKnots: 51, takeoffSpeedKnots: 60, maxSpeedKnots: 185,
    gearHeight: 2.9, bellyHeight: 1.3, pitchAuthority: 1.25, rollAuthority: 1.95, yawAuthority: 0.7,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00026,
    scale: 0.92, colorBody: 0x3fa7a0, colorAccent: 0xf2f0ea, jet: false },
  { id: 'vyper', name: 'VX-1 "Vyper"', kind: 'Prop Racer', desc: 'Tiny racer — twitchy slalom weapon',
    mass: 5400, maxThrust: 30500, wingArea: 30.0, airDensity: 1.225,
    stallSpeedKnots: 74, takeoffSpeedKnots: 86, maxSpeedKnots: 290,
    gearHeight: 2.6, bellyHeight: 1.1, pitchAuthority: 1.45, rollAuthority: 2.3, yawAuthority: 0.8,
    maxSafeLandingVsiFpm: -650, maxSafeBankDeg: 18, dragC: 0.00014,
    scale: 0.8, colorBody: 0x23262b, colorAccent: 0x9fd41c, jet: false }
];
