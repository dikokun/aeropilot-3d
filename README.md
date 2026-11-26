[![make.fun best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=dikokun/aeropilot-3d)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dikokun/aeropilot-3d/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=dikokun/aeropilot-3d)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dikokun/aeropilot-3d/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=repo&utm_campaign=dikokun/aeropilot-3d)

# AeroPilot 3D — Twin Turboprop Flight Simulator

A civilian flight simulator over a tropical archipelago. Fly the AT-42 "Alis"
twin turboprop from Emerald Bay Intl to Coral Atoll Regional: full takeoff
roll and rotation at 76 kt, sky-ring courses, a volcanic slalom, and a
crosswind final graded on touchdown sink rate — with GPWS callouts, PAPI
lights that read your glide path live, articulated control surfaces,
retractable gear and a spinning-prop airframe.

## Missions

1. **Island Hopper** — takeoff RWY 09, 6 sky rings, land RWY 27 at Coral and stop.
2. **Volcanic Slalom** — air start, 10 rings woven around the volcano.
3. **Crosswind Final** — 1.5 km final in a 15 kt crosswind, 2 gates, put it on the numbers.
4. **Free Flight** — the archipelago is yours.

Scoring: 300 per ring, landing bonus by touchdown sink (fpm) and grade
(BUTTER / FIRM / HEAVY / HARD), time bonuses. Best scores persist locally.

## Controls

W/S throttle · ↓/↑ pitch (stick: down = pull up) · ←/→ roll · A/D rudder ·
F flaps · G gear · B brakes (toggle) · M mouse yoke · C camera (chase/cockpit) ·
R restart · Esc menu

## Structure

- `game/src/config.js` — airliner spec, airports, mission data
- `game/src/geo.js` — analytic terrain height + runway frames (shared with the sim)
- `game/src/physics.js` — flight model: stall, flaps, ground effect, touchdown grading
- `game/src/world.js` — terrain, ocean, runways, PAPI, rings, lighthouse
- `game/src/aircraft.js` — the AT-42 mesh: articulated surfaces, props, gear
- `game/src/missions.js` — mission state machine, scoring, GPWS alerts
- `game/src/autopilot.js` — flies every mission end to end (proof + screenshot staging)
- `game/src/hud.js` — tapes, mission card, canvas attitude panel
- `game/src/audio.js` — procedural turboprop bed + GPWS/synth effects
- `game/src/shotDirector.js` — staged screenshot states
- `sim6.mjs` — node proof: `node sim6.mjs` flies all three scored missions (3/3 complete, BUTTER landings)

Three.js is vendored under `game/vendor/`; the game runs fully offline.
