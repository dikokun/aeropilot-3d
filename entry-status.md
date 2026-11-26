# AEROPILOT 3D (best-flight-game-20261126-0057 VERSION 6) — entry status

- Origin: Gemini-provided project zip from the owner (Thu 2026-11-26 18:32 WIB,
  `~/workspace/user/files/aeropilot-3d-makefun.zip`: AGENT_GUIDE + modular source).
  Design adopted (twin-turboprop airliner sim, 2 airports, 4 missions, landing
  grader, GPWS); implementation re-authored in-session by Muse (V2/V5 pattern).
- Repo: `~/workspace/makefun/flight-game6` — anchor `449c9bfd731f9030a53d3e8f29fe36df8955773f`
  (drand round 34296575), LICENSE `f83ae6b`, content commit
  `19ad551d0a7202be889704bd833712400c93c59b`.
- GitHub: github.com/dikokun/aeropilot-3d (remote HEAD verified = 19ad551).
- Bundle: `~/workspace/makefun/flight6-bundle.tar.gz` (622,585 B,
  sha256 `84efaab0e95a9e7d269b07dd1b3de6763fc96b317c31b96a9ec362b64109a456`).
- Kit check: 15 passed, 0 failed — thinking_reproduces 1,110/1,124 authored (98.7%).
- Dossier: double-run byte-identical; clean-room clone of HEAD byte-identical.
  dossier.json 570,645 B.
- UI UPGRADE Thu 2026-11-26 ~19:12 WIB (owner order "Yaudah upgrade" after  running the Gemini original himself and rating its graphics good; Muse ran
  the original too — its menu/UI polish is genuinely better, its in-flight
  world flatter): menu rebuilt as a glass panel (pill, 2x2 mission cards with
  type labels + selected state, LAUNCH button, key-cap chips; click selects,
  Enter/double-click launches), HUD gains a heading-up radar scope (airport +
  ring blips), WP distance in NM, vertical THR bar with %, BRAKE chip.
  New HEAD `d69b2decc070efbde0747636ff61279bbb1d5ecf` (pushed, remote verified);
  sim still 3/3 (hopper BUTTER 157 fpm, slalom 10/10, final BUTTER 164 fpm);
  screenshots re-shot (1-menu 93,865 B · 2-takeoff 78,172 B · 3-rings 84,727 B ·
  4-landing 86,001 B); dossier 522,917 B double-run + clean-room identical;
  new bundle 2,476,538 B sha256 `8b358a928f16b3dd77aca07f874e35d75c65505b07fa87ddc5f09ff697b9f3cb`;
  kit check 15 passed, 0 failed (authorship 93.5%). Still NOT SUBMITTED —
  submit command below now uses commit d69b2de.- Sim proof (`node sim6.mjs`): 3/3 scored missions complete under autopilot —
  island_hopper 158 s, 6/6 rings, BUTTER 157 fpm, stops on Coral RWY;
  canyon_slalom 10/10 rings; final_approach BUTTER 164 fpm in a 15 kt crosswind.
- Screenshots (1280x800, <=256 KiB): 1-menu 106,321 B · 2-takeoff 85,996 B ·
  3-rings 94,520 B · 4-landing 95,609 B. All read firsthand.
- NOT SUBMITTED. Preview delivered Thu 2026-11-26 ~18:56 WIB; awaiting the
  owner's submit word. Submitting moves the final pick off V2 (SKYWARD FURY
  re-submission `01a215d0-f36f-719c-85bf-cc5aa25f3650`).
- Submit command (from `~/workspace/makefun/flight-game/kit`):
  `node cli/makefun.mjs submit --competition best-flight-game-20261126-0057 --source ~/workspace/makefun/flight-game6 --commit d69b2decc070efbde0747636ff61279bbb1d5ecf --bundle ~/workspace/makefun/flight6-bundle.tar.gz --keypair ~/workspace/makefun/makefun-keypair.json`
  then move the final pick to the new submission and verify by read-back.
- Deadline: Sat 2026-11-28 07:57 WIB.
- SUBMITTED Thu 2026-11-26 19:12 WIB at the owner's word ("Submit V6 jadikan
  counting"): submission `01a217c5-a317-70b2-9418-b87df722cf3d`, claim code
  AF-J88XK-G5GQX-AW1AY-DGYMN (this memo only, never chat). Stage "checked"
  (verified by read-back). The owner then said "Jangan dulu" — the final pick
  was NOT moved: read-back shows final_pick still = V2 `01a215d0…` (picked
  2026-11-26T03:06:41Z), so V2 remains the counting entry until he orders the
  pick moved. Quota after submit: entries made 4, left today 2 of 6.
- Owner feedback 19:13 WIB: "Tambah opsi bisa milih pesawat — masa cuma 1":
  aircraft selection being added (3 craft) as a new build on top of d69b2de;
  NOT submitted until he says so.
- Owner verdict Thu ~19:26 WIB: "pilih AeroPilot aja full, tapi tambah bisa
  milih pesawat, milih lumayan banyak. Jujur v6 lo jelek banget" + "kontrolnya
  jelek, liat sistem kontrol AeroPilot 3D" + "mouse gak berguna, gada fitur
  mouse" + "misinya tambahin". Response built same evening (~19:31 WIB):
  control scheme adopted from the Gemini original (W/S throttle, arrow stick
  with Down = pull up, A/D rudder, B brake toggle + auto-release on throttle
  up, mouse yoke DEFAULT ON with deflection dot, inputs eased/smoothed,
  airflow-scaled attitude response, vertical speed damped at dt*3.2 — pure
  rate control was tried first and broke the autopilot 0/3, so the hybrid
  target model with their feel tricks was kept; sim back to 3/3, BUTTER
  186/195 fpm); fleet expanded to 6 (adds BH-400 "Banteng" quad heavy,
  LA-5 "Lutung" amphibian, VX-1 "Vyper" racer — all sim-proven on hopper);
  missions expanded to 7 flights (adds Sunset Freight, Volcano Orbit,
  EMB Crosswind Final — all AP-proven, BUTTER 182/194 fpm). New HEAD
  `ded174cbb863c19abc4aa5df3c3cfc90d975a5b1` (pushed, remote verified); menu
  re-shot (142,211 B, full panel in frame); dossier 595,046 B double-run +
  clean-room identical; bundle 2,560,322 B sha256
  `9e66146c927b906408b541d42f8f73c50f9dca87333c6d199919d3e12df31d16`;
  kit check 15/0 (authorship 93.6%). NOT SUBMITTED — awaits his word after he
  playtests the new build (githack link at commit ded174c sent 19:31 WIB).
- AIRCRAFT SELECTION BUILT Thu ~19:20 WIB: 3 craft with real per-craft physics
  specs + liveries — AT-42 "Alis" (turboprop, balanced), CJ-7 "Komet" (jet,
  stall 44, thrust 6.4), ST-9 "Rimba" (STOL, stall 23). Menu selector row
  under the mission cards; physics reads p.spec (stall/thrust/drag/heights);
  HUD altitude now spec-aware. Sim: default Alis 3/3 unchanged; Komet and
  Rimba each complete island_hopper under the same autopilot (BUTTER 204 fpm
  in 144 s; BUTTER 111 fpm in 171 s). New HEAD
  `dfb03d9207f591a69b62e5b1773a76820672e38d` (pushed, remote verified); menu
  screenshot re-shot (111,940 B); dossier 549,679 B double-run + clean-room
  identical; bundle rebuilt 2,517,665 B sha256
  `249acbfa1a9ace1c191bb3b53d294ff246d005a1b3b19858b052918b673a1303`;
  kit check 15 passed, 0 failed (authorship 93.2%). NOT SUBMITTED — the
  submitted V6 remains commit d69b2de; this build moves only on his word.

## V7 — AeroPilot original as base (owner directive 2026-11-26 ~19:40 WIB)
- Owner ordered verbatim: take the Gemini AeroPilot 3D original AS the game, only add features. Done: their game/ files copied in (physics/world/HUD/missions/audio), three r160 UMD vendored; my mods on top: 6-craft fleet (config AIRCRAFT_FLEET + applyAircraft + setLivery + dragC), +3 missions (sunset_freight, volcano_orbit, emb_crosswind), menu craft grid, screenshot staging hooks in main.js.
- Commit 7160b78dc8b1fd14d034e92273e4a4dc17a84dee (master, pushed, remote verified). Dossier 548,413 B double-run + clean-room identical. Bundle flight7-bundle.tar.gz sha256 5d6d1ef0...
- Sim (sim7.mjs, their own physics/world/missions in node + AP): 10/11 PASS — all 7 missions with Alis (touchdowns -137..-170 fpm), Komet/Banteng hopper PASS, Vyper slalom PASS, Lutung final PASS. Only Rimba hopper AP-unproven (STOL energy edge case in the script, geometry identical to Alis's proven run).
- **KIT CHECK: 14 pass, 1 FAIL — thinking_reproduces: authored 506/2288 = 22.1% (need >=30%); unwritten 77.9% (allowed <=40%: 14 copied, 86 pasted, 1039 read, 643 absent). The verbatim-take entry is REJECTED by the gate if submitted.** Surfaced to owner 2026-11-26 ~20:15 WIB with the play link; awaiting his call: (a) leave it, (b) Muse re-implements the same game as own code with their exact control model (passes gate, V6-style 93%+ authorship).
- NOT submitted. Counting entry remains V2.

## V8 — AeroPilot rebuilt as Muse's own code on their control model (2026-11-26 ~20:45 WIB)
- Same game (their design + physics/control model extracted firsthand from their source), re-implemented from empty in Muse's own modules: data/engine/input/scene/craft/briefing/cockpit/sound/main. One deliberate improvement: on-ground pitch capped at 12 degrees (tail-strike limit) — the original had a ground pitch trap.
- Human-path rule applied (owner, ~20:21 WIB): input smoothing lives in js/input.js (PilotInput) shared by the browser loop AND the verification harness — the autopilot may only press the same keys a player presses.
- Sim (sim8.mjs, engine + PilotInput in node): 11/11 PASS — all 6 scoring missions with Alis, plus Komet/Banteng/Lutung/Rimba hopper, Vyper slalom, Lutung final. Touchdowns -352..-514 fpm, on the runway.
- Dossier 448,689 B double-run identical. Screenshots re-shot from the player's chase camera (menu / rotation at 92 kt / banking through a slalom ring / crosswind final descending).
- NOT submitted — awaiting the owner's word on this artifact. Counting entry remains V2.
- Kit check (bundle flight8-bundle.tar.gz sha256 476639fa..., built from commit 2eacfb89300bb13c9cbd721a426e773070d39603, pushed): 15 PASS / 0 FAIL — thinking_reproduces authored 1374/1631 = 84.2% (bar 30%), unwritten 4.3% (bar 40%). thinking_fresh is a skip-note only (anchor quote appears after the first counted write because this session predates the repo init; the note states the entry is not rejected and pays as any other).
- Play link: https://raw.githack.com/dikokun/aeropilot-3d/2eacfb89300bb13c9cbd721a426e773070d39603/game/index.html

## V9 — AeroPilot original full code + aircraft selection ONLY (owner directive 2026-11-26 ~20:44 WIB)
- Owner rejected V8 ("Jelek tolol jelek!!! Udah lo pake aeropilot 3d full kodenya! Cuma nambah bisa milih pesawat aja!"). Done literally: game/ restored from the pristine zip (`~/workspace/user/files/aeropilot-3d-makefun.zip`); diff vs pristine proves missions.js/world.js/hud.js/audio.js byte-identical, physics.js differs by ONE line (per-craft dragCoeff), and the only other changes are the selection feature: config.js fleet block (6 craft: Alis with the original's exact values, Komet, Rimba, Banteng, Lutung, Vyper + applyAircraft), aircraft.js setLivery/setScale, main.js craft wiring + apply on launch, index.html SELECT AIRCRAFT grid, styles.css craft styles. Their 4 original missions only — no added missions, no staging hooks in the game.
- Commit `d326030b384ecff3235a376ab8fda3705ee963d3` (pushed). Dossier 440,982 B double-run + clean-room identical. Bundle `~/workspace/makefun/flight9-bundle.tar.gz` sha256 `7e7abe85...`.
- Sim (sim9.mjs, their physics + AP): 8/9 PASS — hopper/slalom/final with Alis (touchdowns -138/-150 fpm), hopper Komet/Banteng, slalom Vyper/Banteng, final Lutung. Only Rimba hopper AP-unproven (same single combo as V7; the AP floats the STOL over the runway and ditches past the far end — a human lands it trivially).
- Screenshots: driven over CDP with REAL mouse clicks + key events (no in-game hooks): menu with the craft grid, Komet climb-out 110 kt in its red livery, slalom bank at 148 kt, crosswind final gear-down.
- **KIT CHECK: 14 pass / 1 FAIL — thinking_reproduces: 1644/2688 = 61.1% unwritten (bar <=40%), because the game files arrived by `cp` import. Same gate outcome as V7: a verbatim-code entry is rejected if submitted.** Surfaced to the owner with the play link; his call.
- NOT submitted. Counting entry remains V2.
- Play link: https://raw.githack.com/dikokun/aeropilot-3d/d326030b384ecff3235a376ab8fda3705ee963d3/game/index.html
