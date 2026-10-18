# Changelog

Format: newest first. Versions describe the browser game unless stated otherwise.

## [Unreleased] – v1.1 extension (being integrated, see `docs/DEVLOG.md`)
**Integrated so far:** online play outside claude.ai via a PeerJS adapter (`129-net-peerjs.js`), GitHub Pages deploy workflow; difficulty levels (Settings > Game), perks and weapon attachments (Store tabs), `failMission(msg)`; tests in `tests/extensions.test.js`.

**Still in drafts** (see `drafts/v1.1/INTEGRATION.md`): briefings and radio messages, mission objectives (rescue, defend, silent infiltration, destroy depots), boss missions,
Zombie Arena, killstreaks (UAV, ammo drop, air strike), perks, weapon attachments, difficulty levels, weather and night, player jeep, ally commands, explosive barrels,
collectible documents, achievements and records.

## [1.0.0] – 2026-10-18 – English repository
* Whole project converted to English; modular source (`web/src`), build script, tests, docs, agent instructions.
* Save key renamed to `blackorder_save` (reads the legacy `cernyrad03` once).
* Weapon "Luk" renamed **Bow**; mission and weapon names translated (see `docs/GLOSSARY.md`).

## [0.9 – 1.0 game features] – 2026-10-17
* Multiplayer: co-op campaign for 1–3 players (humans replace AI allies), Team Match vs bots online.
* Team Match mode in solo; death and respawn system; reorganized menu (Play tabs: Campaign / Quick Games); lobby with game code and roster.
* Fixed: players started facing the map fence.
* Training and Survival available from the start (before the campaign).

## [0.8] – tank
* Tank modeled after the T-14 Armata; explosive shells; tanks in campaign 2 missions.

## [0.7] – APC
* Detailed 8x8 APC (camouflage, turret with machine gun, spinning wheels), charred wreck with fire.

## [0.6] – helicopter rework
* Mi-24-style player helicopter: mouse steering, nose-down flight, chase camera, machine gun / rocket pods / anti-tank missiles; campaign 2 only.

## [0.5] – helicopter and allies
* Player helicopter, two AI allies (Alpha, Bravo), right Shift support.

## [0.4] – campaign 2 "Steel Fist"
* APCs, helicopters, jets, desert maps, new weapons (13 added), equipping melee and grenades, campaign selection.

## [0.3] – 2026-10-16
* Procedural textures, detailed soldiers and weapon view models, terrain, fences, vegetation, scope overlay. Grass removed.

## [0.2] – 2026-10-15
* Blood on screen, walking animation, mines, medkits, minimap, 3 missions, more weapons, awards.

## [0.1] – 2026-10-15
* Menu, Store, first mission, Weapoints.

## Other implementations
* **Godot 0.1** (2026-10-16): archived port of the 0.2/0.3 prototype, 3 missions, 9 weapons.
* **Unreal 0.2** (2026-10-17): C++ project with two campaigns, vehicles, 24 weapons; open editor-loading problem.
