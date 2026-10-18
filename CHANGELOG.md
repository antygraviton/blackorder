# Changelog

Format: newest first. Versions describe the browser game unless stated otherwise.

## [1.2.0] – 2026-10-18 – banter, cinematic scenes, co-op helicopter
**Added**
* Barks: speech bubbles with a short mumbled "voice" above allies (hit, kill, down, warning the player, freed prisoner, hacked terminal, destroyed depot), enemies (alert, hit, dying, buddy down, barrels) and the bosses (taunts at 75/50/25/10 % health, last words, the Armata crew). Visible to all players in co-op. Text tables: `BANTER` in `10-data.js`.
* Cinematic scenes (solo play, Settings > Game > Cinematic scenes): an intro fly-over to the main objective with a title card and a funny caption per mission (any key skips it), a slow-motion kill-cam when a boss dies, and bullet time after a headshot kill.
* The player helicopter works in co-op (Steel Fist and Armata): one pilot at a time, host or client, with weapons.

## [1.1.0] – 2026-10-18 – new missions, online play anywhere, touch controls
**Added**
* Difficulty levels (Settings > Game), perks and weapon attachments (Store tabs).
* Mission objectives: destroy fuel depots, hack a terminal in a stealth mission, rescue the prisoner, defend a zone; briefing screens, radio messages, weather and night (rain, fog, storm, flashlight on F). New missions *Rescue the Prisoner*, *Base Defense*; *Base Infiltration* became *Silent Infiltration*, *Airfield* asks to destroy depots. All of it works in co-op.
* Bosses: *Commander of the Order* (armored soldier: aim for the head or use explosives) ends campaign 1, *Armata* (tank boss with double shells) ends campaign 2.
* Explosive barrels with chain reactions.
* The player helicopter works in co-op (Steel Fist and Armata): one pilot at a time, host or client, with weapons.
* The cabin landmark: enterable (stairs, upper room, fireplace) with an open garage; raised walkable floors and height-aware collisions.
* Online play outside claude.ai (PeerJS over WebRTC, `129-net-peerjs.js`), GitHub Pages deployment; lobby fixes (duplicate joins, ghost players, back to the lobby after a game, rejoin, host pause stops everybody, host-only start).
* Touch controls for phones and tablets (`165-touch.js`, `?touch=1` / `?touch=0`), canvas that follows the real window size, click to re-capture the mouse so the camera can turn freely.

**Still in drafts** (`drafts/v1.1`): Zombie Arena, killstreaks, ally orders, the player jeep, collectible documents, achievements and the Archive.

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
