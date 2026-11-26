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

// === Aircraft selection (added feature) ===
// The first entry reproduces the original SIM_CONFIG.AIRCRAFT values exactly.
window.AIRCRAFT_FLEET = [
  { id: 'alis',    name: 'ALIS — Twin Turboprop',   type: 'REGIONAL AIRLINER', mass: 14500, maxThrust: 58000,  wingArea: 54,  stallSpeedKnots: 64,  takeoffSpeedKnots: 76,  maxSpeedKnots: 245, gearHeight: 3.1, bellyHeight: 1.35, pitchAuthority: 1.15, rollAuthority: 1.75, yawAuthority: 0.65, dragCoeff: 0.00019, scale: 1.0,  bodyColor: 0xf8fafc, stripeColor: 0x0284c7, blurb: 'The original Island Wings airliner. Balanced, forgiving, honest.' },
  { id: 'komet',   name: 'KOMET — Regional Jet',    type: 'JET AIRLINER',      mass: 15000, maxThrust: 98000,  wingArea: 52,  stallSpeedKnots: 86,  takeoffSpeedKnots: 101, maxSpeedKnots: 320, gearHeight: 3.2, bellyHeight: 1.4,  pitchAuthority: 1.0,  rollAuthority: 1.5,  yawAuthority: 0.55, dragCoeff: 0.00016, scale: 1.02, bodyColor: 0xe2e8f0, stripeColor: 0xdc2626, blurb: 'Jet thrust, jet speeds. Needs the whole runway and a steady hand.' },
  { id: 'rimba',   name: 'RIMBA — Bush STOL',       type: 'STOL / BUSH',       mass: 8200,  maxThrust: 29500,  wingArea: 46,  stallSpeedKnots: 45,  takeoffSpeedKnots: 54,  maxSpeedKnots: 175, gearHeight: 2.9, bellyHeight: 1.25, pitchAuthority: 1.3,  rollAuthority: 2.0,  yawAuthority: 0.75, dragCoeff: 0.00024, scale: 0.88, bodyColor: 0xfde68a, stripeColor: 0x16a34a, blurb: 'Lifts off in a breath and lands on a dime. Slow, nimble, joyful.' },
  { id: 'banteng', name: 'BANTENG — Heavy Freighter', type: 'HEAVY CARGO',     mass: 39000, maxThrust: 300000, wingArea: 118, stallSpeedKnots: 101, takeoffSpeedKnots: 117, maxSpeedKnots: 340, gearHeight: 3.6, bellyHeight: 1.6,  pitchAuthority: 0.85, rollAuthority: 1.25, yawAuthority: 0.45, dragCoeff: 0.00015, scale: 1.45, bodyColor: 0xf1f5f9, stripeColor: 0x7c3aed, blurb: 'Thirty-nine tonnes of freight. Plan every move two moves early.' },
  { id: 'lutung',  name: 'LUTUNG — Amphibian',      type: 'AMPHIBIAN',         mass: 7600,  maxThrust: 24000,  wingArea: 40,  stallSpeedKnots: 51,  takeoffSpeedKnots: 60,  maxSpeedKnots: 185, gearHeight: 3.0, bellyHeight: 1.3,  pitchAuthority: 1.2,  rollAuthority: 1.85, yawAuthority: 0.7,  dragCoeff: 0.00026, scale: 0.85, bodyColor: 0xccfbf1, stripeColor: 0x0d9488, blurb: 'A boat with wings. Light, draggy, and charming on short hops.' },
  { id: 'vyper',   name: 'VYPER — Sport Racer',     type: 'SPORT / RACER',     mass: 5400,  maxThrust: 30500,  wingArea: 30,  stallSpeedKnots: 74,  takeoffSpeedKnots: 86,  maxSpeedKnots: 290, gearHeight: 2.7, bellyHeight: 1.15, pitchAuthority: 1.45, rollAuthority: 2.3,  yawAuthority: 0.8,  dragCoeff: 0.00014, scale: 0.78, bodyColor: 0xfecaca, stripeColor: 0x111827, blurb: 'A scalpel for the slalom. Twitchy, slippery, very fast.' }
];

window.SELECTED_AIRCRAFT = 0;

window.applyAircraft = function (index) {
  const craft = window.AIRCRAFT_FLEET[index] || window.AIRCRAFT_FLEET[0];
  const a = window.SIM_CONFIG.AIRCRAFT;
  a.mass = craft.mass;
  a.maxThrust = craft.maxThrust;
  a.wingArea = craft.wingArea;
  a.stallSpeedKnots = craft.stallSpeedKnots;
  a.takeoffSpeedKnots = craft.takeoffSpeedKnots;
  a.maxSpeedKnots = craft.maxSpeedKnots;
  a.gearHeight = craft.gearHeight;
  a.bellyHeight = craft.bellyHeight;
  a.pitchAuthority = craft.pitchAuthority;
  a.rollAuthority = craft.rollAuthority;
  a.yawAuthority = craft.yawAuthority;
  a.dragCoeff = craft.dragCoeff;
  window.SELECTED_AIRCRAFT = index;
  return craft;
};
