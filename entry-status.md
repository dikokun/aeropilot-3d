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
- Sim proof (`node sim6.mjs`): 3/3 scored missions complete under autopilot —
  island_hopper 158 s, 6/6 rings, BUTTER 157 fpm, stops on Coral RWY;
  canyon_slalom 10/10 rings; final_approach BUTTER 164 fpm in a 15 kt crosswind.
- Screenshots (1280x800, <=256 KiB): 1-menu 106,321 B · 2-takeoff 85,996 B ·
  3-rings 94,520 B · 4-landing 95,609 B. All read firsthand.
- NOT SUBMITTED. Preview delivered Thu 2026-11-26 ~18:56 WIB; awaiting the
  owner's submit word. Submitting moves the final pick off V2 (SKYWARD FURY
  re-submission `01a215d0-f36f-719c-85bf-cc5aa25f3650`).
- Submit command (from `~/workspace/makefun/flight-game/kit`):
  `node cli/makefun.mjs submit --competition best-flight-game-20261126-0057 --source ~/workspace/makefun/flight-game6 --commit 19ad551d0a7202be889704bd833712400c93c59b --bundle ~/workspace/makefun/flight6-bundle.tar.gz --keypair ~/workspace/makefun/makefun-keypair.json`
  then move the final pick to the new submission and verify by read-back.
- Deadline: Sat 2026-11-28 07:57 WIB.
