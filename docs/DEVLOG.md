# Development log (diary)

Chronological record of the development sessions. Add a dated entry for every working session: what changed, what was verified, what is open.
Dates are the calendar days of the original sessions (2026). Early sessions were reconstructed from the conversation history and file timestamps.
Rules for this file: `AGENTS.md` section 10.

## Current state (keep up to date, overwrite)

* **Version:** 1.2.0 (released 2026-10-18). `npm test` green on `main`.
* **In progress:** nothing; v1.1 core is done. Remaining draft features (`drafts/v1.1`): Zombie Arena, killstreaks, ally orders, jeep, documents/achievements/Archive. Wanted by the owner and not started: look-and-feel check of the cabin and mobile layout on real devices.
* **Lean plan:**
  1. ~~Clean the drafts~~ DONE: Czech leftovers translated in `drafts/v1.1`, `failMission(msg)` extended. Radio `r.done` reset moves to step 3 (when radio code lands in `doStart()`); `addKit(...,ammo)` (needs pickup logic in `160-main-loop.js`) and `mkEnemy(...,opt.noGun)` move to the deferred killstreaks/Zombie work.
  2. ~~Data, difficulty~~ DONE (perks, attachments, difficulty; code lives in `10-data.js` and `20-menu.js`, hooks in fire/hurt/reload/enemy AI). Still in `drafts/ext_data.js`: `DOCS`, `ACH`, mission edits, `lbase`; in `ext_ui.js`: Archive (`renderExtras`).
  3. ~~Objectives, new missions, briefing, radio, weather~~ DONE (`105-objectives.js`, data in `10-data.js`, `lbase()` keeps game modes clean). (Co-op: now replicated, see the 2026-10-18 'objectives in co-op' entry.)
  4. Bosses and barrels. Then a short `tests/extensions.test.js`, version bump, docs.
* **Deferred:** jeep, Zombie Arena, killstreaks, ally orders, documents/Archive.
* **Hosting/online:** PeerJS adapter integrated (D13) and Pages workflow added (`.github/workflows/pages.yml`); needs a public repo (or paid plan) and Settings > Pages > Source = GitHub Actions. Real two-browser test still open.
* **Flaky tests were stabilised** (2026-10-18): co-op/Team Match ends in `multiplayer.test.js` and the Team Match checks in `modes.test.js` now wait for conditions (polling) instead of fixed sleeps/frame counts and no longer rely on one particular random bot. If a test still fails once, re-run that file alone before suspecting the code.
* **Next step:** ask the owner what to do next (candidates: owner feedback from playtests, remaining drafts, more missions, replace the cabin interior stairs, localisation, performance on weak phones).
* **Owner decisions:** keep the draft balance numbers; commit straight to `main`. Bosses are only partly drafted: `makeBoss`/`markBossTank`/`bossDead`/`bossHpPct` exist but nothing calls them; spawning in `doStart()`, armor in `dmg()`, stun/flinch immunity and double tank shells must be written.
* **Tip:** macOS `sed -i` needs `sed -i ''`; prefer small python3 replace scripts with `assert` on the anchor.

---

## 2026-10-15 – Concept and first browser prototypes (v0.1, v0.2)
* The owner described the game and supplied **hand-drawn sketches** of the menus (main menu, play, multiplayer, settings, store).
* Decisions: realistic first-person war game, 2015 setting, Nazis re-emerging, story-focused campaign of 5+ hours, Unreal Engine as the likely target, one finished game first, extra modes later.
* **v0.1** (browser): menu, Store, mission 1 (12 enemies), weapons AK / SVD / Glock / knife / M67, Weapoints currency.
* **v0.2**: blood splatter on screen, humanoid enemies with walk animation, mines with a warning LED, medkits, minimap, MP5 / shotgun / revolver, 3 missions (12/18/24 enemies; 8/14/20 mines), awards.
* Verified: headless logic runs. Visuals were judged by the owner.

## 2026-10-16 – Visual upgrade and first engine ports (v0.3, Godot 0.1, Unreal 0.1)
* **v0.3**: procedural textures (plaster, brick, camouflage, gunmetal), detailed soldiers (night-vision helmets, vests, faces), detailed gun view models (HK416 with M-LOK, AK, SVD scope), terrain with hills and mountains, fences instead of walls, vegetation, vehicles as props, smoke columns, scope overlay. Grass removed on request. Published as a claude.ai artifact.
* The owner could not install Unreal Engine through the Epic launcher, so a **Godot 4.3 port** was written (all GDScript, nothing to set up in the editor, headless smoke test, optional `.glb` model overrides for Sketchfab/Mixamo assets).
* Later the same day Unreal worked, and the first **Unreal 5.4 C++ project** (everything in code) was started.

## 2026-10-17 – Unreal v0.2, build troubleshooting, browser v0.4 – v1.0
* **Unreal v0.2**: two campaigns, APCs/helicopters/jets, 24 weapons, mission list with vehicle counts, all UI on the Canvas. Could not be compiled in the authoring environment.
* **Build troubleshooting on the owner's machine** (Windows, VS 2026 installed, which UE 5.4 does not support): installed VS 2022 Build Tools; `PCHUsageType` → `PCHUsageMode`; .NET Framework 4.8 Developer Pack for `NetFxSDK`; linker error `GWhiteTexture` fixed by adding the `RenderCore` module. `build_project.bat` now succeeds. **Open:** the editor refuses to open the project ("module could not be compiled").
* A Godot **Windows executable** was exported (`.exe` with embedded PCK) as a quick playable build.
* The owner asked for the latest version inside the chat; development moved to the browser game:
  * **v0.4** campaign 2 *Steel Fist* in the browser: APCs, helicopters, jets, desert maps, new weapons (RPG, bow, bayonet rifle, dual pistols, napalm, Hardbass, machete, hammer, crossbow, shield, dynamite, smoke, flashbang), melee/grenade equipping, campaign selector.
  * **v0.5** player helicopter and two AI allies; right Shift now works like left Shift.
  * **v0.6** helicopter rework: mouse-steered, nose-down flight, chase camera, three weapons, Mi-24 look from the owner's photo; helicopter only in campaign 2.
  * **v0.7** detailed 8x8 APC with spinning wheels, charred wrecks.
  * **v0.8** tank in the style of the T-14 Armata from the owner's photo, explosive shells, tanks in campaign 2.
  * **v0.9** Training and Survival unlocked from the start.
  * **v1.0** multiplayer (co-op for up to 3 players, Team Match vs bots) over the artifact `room` capability, Team Match in solo, reorganized menu, and a fix for the player starting out facing the fence.
* Verified: headless suites for all missions and weapons, for Training/Survival/Team Match, and for multiplayer with three simulated instances.
* A larger extension (v1.1: objectives, briefings, bosses, Zombie Arena, killstreaks, perks, attachments, difficulty levels, weather/night, jeep, ally commands, barrels, documents, achievements) was written as modules, but the batch integration failed on one mismatched text anchor and was **not** applied.

## 2026-10-18 – English conversion and repository
* The owner asked to convert **everything to English** and to prepare documentation, a diary and project files so that development can continue in Claude Code or with another agent.
* Done: translated the browser game (all UI text, data, comments), the Godot port, the Unreal sources and the 1.1 draft modules; split the browser game into `web/src` modules with a build script (output verified byte-identical to the translated single file before and after the split); rewrote the headless tests as a reusable harness with English expectations and added a guard against Czech text; wrote this documentation set; added `AGENTS.md` / `CLAUDE.md`.
* Verified: `npm test` green (solo campaign, modes, multiplayer, English-only guard); the Godot smoke test (`ALL OK`) still passes after translation. The Unreal sources contain only translated string/comment content (ASCII), but were **not compiled**.
* Open items are in `ROADMAP.md`.

---

### Entry template

```
## YYYY-MM-DD – short title
* What changed
* What was verified (and how)
* Open questions / next steps
```

## 2026-10-18 – v1.1 integration planning, working rules
* Reviewed `drafts/v1.1` against the current modules. Found leftover Czech words without diacritics (not caught by `i18n.test.js`), radio messages that never replay after a restart, and signature mismatches (`failMission`, `addKit`, `mkEnemy`); `hitscanFrom` lives in `130-multiplayer.js`.
* Agreed a lean integration plan (see "Current state"); multiplayer replication and secondary features are deferred.
* Added rules for working on a limited token budget (`AGENTS.md` section 9) and for keeping this log as a handoff document (section 10, "Current state" section above).
* Verified: `tests/i18n.test.js` after the doc changes. No game code changed.

## 2026-10-18 (cont.) – step 1 of the lean plan
* Committed the working rules. Translated leftover Czech words in `drafts/v1.1` (`Ghost`, `Remove`, `Select`, `Buy`, `Equip`, `Equipped`, `Found`, `Correspondence`, `ALARM!`, `of`). `failMission(msg)` now accepts a custom message (title `Mission failed`).
* Verified: `i18n` and `solo-campaign` tests pass; full `npm test` green (4 files).
* Open: steps 2-4 of the lean plan.

## 2026-10-18 (cont.) – step 2 of the lean plan
* Integrated difficulty (`DIFFS`, `DIFF()`; Settings > Game select `#setDiff`), perks (`PERKS`, `hasPerk`) and attachments (`ATT`, `attOf`, `magOf`, `spreadMul`, `dmgMul`, `silent`) into `10-data.js`; Store tabs `perks`/`att` in `20-menu.js`/`template.html`; new `DEF` fields `diff, perks, att, attOwned`.
* Hooks: enemy hp x `DIFF().hp`, enemy accuracy x `DIFF().acc`, player damage x `DIFF().dmg` and armor perk in `hurt()`, ghost perk shrinks sight range, sprint perk, quick-reload perk, grenadier perk, magazine size via `magOf()` in reload/start/training, suppressor skips `alertNear`, laser and damage multipliers in `fire()`.
* Not hooked (hitscanFrom/MP and heli/jeep fire ignore damage and spread multipliers).
* Verified: new `tests/extensions.test.js` (19 checks) and full `npm test`.

## 2026-10-18 (cont.) – online play outside claude.ai
* Owner wants to try the prototype quickly: chose GitHub Pages + own network layer (variant C), then finish steps 3 and 4. Owner agreed to make the repo public (not yet done).
* Added `129-net-peerjs.js` (`loadPeerJs`, `makePeerRoomApi`), `netApi()` fallback and a new offline message, `tests/net-peerjs.test.js` (13 checks), `.github/workflows/pages.yml`, D13, docs.
* Verified: adapter test and full `npm test`. **Not verified:** real PeerJS broker, real browsers, NAT traversal (no TURN).

## 2026-10-18 (cont.) – step 3 of the lean plan
* New `105-objectives.js` (from `ext_game.js`, boss/killstreak/jeep/barrel/document parts left out); mission data and `lbase()` appended to `10-data.js` (existing missions get briefings, radio, weather; Base Infiltration became *Silent Infiltration* (hack, night, stealth), Airfield now asks to destroy 4 fuel depots; new campaign-1 missions *Rescue the Prisoner* and *Base Defense*). Documents (`docs:`) were stripped from the data for now.
* Hooks: `doStart` (weather, resets, objectives, `total=1e9` for objective missions), loop (`updateRadio/updateObjectives/updateWx`), HUD objective text, bullets and explosions damage depots, hostage handled in `updateAllies`, stealth sight range 22 m (also for allies), briefing overlay in the template, F toggles the flashlight, minimap markers.
* Trade-off: Silent Infiltration and Airfield are no longer available in co-op (objective state is not replicated). Replication is the deferred item in the plan.
* Verified: `tests/extensions.test.js` now has 40 checks (each objective type, failure by prisoner death, alarm, explosions vs depots, weather, briefing, radio reset, modes unaffected); `solo-campaign` skips the kill-all check for objective missions.
* Gotcha: `LEVELS.splice(3,0,...)` shifts global level indexes (campaign 2 now starts at index 5); tests must look levels up by name (`multiplayer.test.js` now does).

## 2026-10-18 (cont.) – touch controls
* New `165-touch.js` + CSS block at the end of `styles.css`: left stick (W/A/S/D, edge = sprint), right-side look, buttons Fire (also looks), Aim (toggle), Jump, Reload, Swap, Nade, Use (hold E), Pause; portrait hint; fullscreen and landscape lock attempted on the first touch. It dispatches synthetic key/mouse events, so no game logic changed. Enabled on `(pointer:coarse)`, `?touch=1` forces it, `?touch=0` disables it. In touch mode the minimap is smaller and the ammo readout moves under it; the viewport meta disables pinch zoom.
* Verified: `tests/touch.test.js` (22 checks). **Not verified:** real phones (feel, button size and position, performance, iOS fullscreen/audio). Helicopter: stick up/down = climb/descend, look = steer, Aim button cycles weapons; jeep is still a draft.
* Open: tune button layout after a real-device test; menus are only lightly responsive (one `max-width:700px` rule).

## 2026-10-18 (cont.) – mobile canvas size fix
* Bug reported from a real phone (landscape): the 3D view filled only the left part of the screen, the rest was black, while HUD and touch controls spanned the full width. Cause: `ren.setSize(innerWidth, innerHeight)` writes fixed pixel sizes into the canvas style, and `innerWidth` can be stale after rotation or fullscreen. Fix: `setSize(...,false)` so CSS (`100%` of `#game`) sizes the canvas, new `fitRenderer()` sizes the drawing buffer and camera aspect from `#game.clientWidth/Height`, called on `resize`, `orientationchange` (twice) and by a `ResizeObserver`.
* Verified: 2 new checks in `tests/touch.test.js`; **not yet verified on the phone**.

## 2026-10-18 (cont.) – first real multiplayer test: lobby fixes
* Reported from a real test (host + 2 players): the lobby list showed the host plus 2x `Anty_graviton` (names nobody had entered), joining players were thrown back to the Multiplayer start page, and dying/finishing sent players to the main menu.
* Findings: a simulated 3-instance lobby worked, so the cause was real-world behaviour. (1) Repeated clicks on Join opened several connections; the extra ones stayed in the room as ghost players (same saved name), filled the 3 slots and the real player got "The game is full" after 2.5 s and was bounced. Reproduced in `tests/lobby.test.js` by removing the guard. (2) Players that vanish without a clean close (reload, locked phone) could stay in the room. (3) Lobby labels still had Czech words (`(hostitel)`, `(ty)`).
* Fixes: `mpEnter` ignores clicks while joining or already in a room (`NET.joining`); the PeerJS hub drops members that are silent for 12 s (clients ping every 3 s; `makePeerRoomApi(Peer,{pingMs,timeoutMs})`); duplicate names are numbered in the lobby list (`lobbyName`, also HTML-escaped); labels are `(host)` / `(you)`; browser autofill is switched off on the nickname and code inputs; **after a game (death, victory or pause menu) players return to the lobby of the same room** (`mpBackToLobby`, `NET.goDone` stops clients re-entering the finished game) and the button says "Back to lobby".
* Where `Anty_graviton` came from is unknown: most likely the nickname saved in those devices (`S.name`) or browser autofill; both are now covered (names are shown with numbers, autofill is off). **Ask the testers what names they saw after the update.**
* Verified: `tests/lobby.test.js` (17 checks), `tests/net-peerjs.test.js` (16), full `npm test`. Not verified with real devices.

## 2026-10-18 (cont.) – host pause, lobby states, rejoin
* Owner feedback after the lobby fixes: after leaving a running game a player could not get back in; wanted the host's pause to stop everybody, and players to start only when the host really started.
* Done: host pause freezes the host and every client (`ps` presence flag, "Host paused" overlay, Continue enabled after the host resumes); host "Back to lobby" takes all clients to the lobby; a client that left a live game gets a "Rejoin the game" button; lobby texts: "Waiting for the host to start the game…", "A game is running without you…", "The game is over…"; clients cannot start games (`go` from the host is the only way in, and only if the client's peer id is in `go.ro`). Details in `docs/MULTIPLAYER.md` ("Pause, lobby and rejoin").
* Verified: `tests/lobby.test.js` now 31 checks (pause, resume, rejoin, host closing the game, client cannot start). Not verified with real devices. Open: the host's own avatar of a client that is in the lobby stays frozen in the game; clients do not freeze their world when the host loses connection (only the existing "Host left" screen after 4 s).

## 2026-10-18 (cont.) – the cabin
* New landmark modelled on the owner's real cabin (photos in the git-ignored `temp/`, which must never be committed: the repo is public). Spec from the owner: about 10 m long, flat roof, natural materials, entrance from the south, stairs up to one big room, central chimney with a large fireplace where players gather, garage = open space on two posts under the main volume. Seen in the photos: horizontal half-log cladding, dark vertical-board fascia, 5 big windows on the south side, 2 on the north, 1 per short end (shingled), plastered base with a glass-block window, copper drain pipe.
* `75-cabin.js`: 10 x 6.4 m upper volume, floor 2.5 m above the ground, plastered base under the west half, garage on two log posts in the east half, stairs (9 steps + landing) in front of the south door, brick chimney with hearth, flickering fire light (`updateCabin`), rug, two benches and a table. Placed by a seeded RNG at the flattest spot found (`L.cabin`; set for Vanished Village and Rescue the Prisoner; `lbase` strips it for game modes), so every machine builds the same cabin; houses avoid it.
* Engine additions: `floors` (walkable raised surfaces, absolute top y) and `groundAt(x,z,feet)` used by the player's vertical movement (step up at most 0.55 m, so stairs work and the upper floor cannot be reached from below); obstacles may have `y0/y1` and `collide()` skips them when the entity's feet or head are outside that range (that is what lets you walk under the building and collide with walls upstairs). Enemies and allies stay on the terrain (they use `H`), so nobody follows the player upstairs; walls and floor are solid for bullets and sight.
* Verified: 13 new checks in `tests/extensions.test.js` (53 total): stairs to the upper floor, walls and chimney block, garage walk-through, base blocks, sight blocked by wall and floor, doorway open, deterministic placement, no cabin elsewhere. **Not verified: how it looks** (no renderer in tests): proportions, textures and the fire effect need a look in the browser; adjust the constants at the top of `cabin()`.
* Open ideas: furnishing, enemies capturing the cabin, a mission that uses it as a base, interior stairs inside the base as in the real cabin (now the stairs are outside).

## 2026-10-18 (cont.) – cannot turn a full circle
* Reported while playing: the character cannot turn 360 degrees. There is no yaw limit in the code. Cause: without pointer lock the mouse cursor hits the screen edge and `mousemove` stops. The lock is only granted after a user gesture, and games that start from a network event (co-op clients, `mpGo`) have none, so the game falls back to `fallback=true` without the lock.
* Fix: a mouse click in the running game re-requests the lock when it is not held (`mousedown` handler in `90-mission-start.js`, not on the end screen, not in touch mode), and a message tells the player to click the game. Touch controls were not changed: the look area only covers the right 55% of the screen, so a full turn takes two swipes; raise `Sensitivity` in settings or tell me if that feels bad.
* Verified: 4 checks in `tests/extensions.test.js` (lock re-request, no repeated requests, none on the end screen, yaw beyond 2 pi with the lock held). Not verified in real browsers.

## 2026-10-18 (cont.) – objective missions in co-op
* Reported: not all campaigns/missions are in the multiplayer lobby (I had hidden the four objective missions because they were not replicated). Now replicated and all missions are offered again. Design in `docs/MULTIPLAYER.md` ("Mission objectives"): clients rebuild the objectives deterministically, the host sends `s.ob` (alarm, prisoner free, per-objective progress and done), clients send `u` (E held).
* Also fixed: weather (rain, storm flashes) and the fireplace animation now run on clients too (`updateWx`, `updateCabin` in `clientTick`).
* Verified: `tests/lobby.test.js` (42 checks): same depots/prisoner on all machines, depot destroyed for clients, HUD progress on clients, mission ends for everybody, prisoner freed, a client holding E hacks the terminal on the host and the other client sees it. Not verified with real devices.
* Stabilised the flaky tests: CI had failed repeatedly on the Team Match end (`match ended on both machines`, `Victory`, reward) because the host's end snapshot did not arrive within a fixed 900 ms on the slower runner; the checks now poll (up to 8 s). `modes.test.js` Team Match checks no longer depend on a specific random bot (respawn, death point as `red0 + 1`, respawn wait, kill limit with an alive bot). Verified: multiplayer 3x, modes 5x in a row.
* More flake fixes in `multiplayer.test.js` (found by repeating it 8-10 times): the co-op test heals players during long waits (`safeStep`) because random enemy fire sometimes killed everybody and ended the mission with a defeat (`You died` instead of `Mission complete`); the client's dummy target now stands straight ahead of the client (the old fixed x gave a random hit rate); the host's avatar HP is clamped at 0 like the client's; bot respawn is polled. 10 consecutive green runs.

## 2026-10-18 (cont.) – step 4 of the lean plan: bosses and barrels, release 1.1
* Integrated from the drafts: `makeBoss`, `markBossTank`, `bossDead`, `bossHpPct`, barrels (`barrelHit/Vis/Boom`), new missions *Commander of the Order* (end of campaign 1) and *Armata* (end of campaign 2). Written new: boss spawning in `doStart` and in the client manifest branch, armor in `dmg(e,v,head,ex)` (body shots x0.2, headshots and explosions full; `explode` passes `ex=true`), no flinch and no stun for bosses, tank boss second shell 0.6 s after each shell (`v.shell2`), barrels registered in `barrel()` with a bullet proxy (`userData.barrel`), chain reaction through `explode()`, barrel hits in `fire`, `hitscanFrom`, `heliFire`.
* Replication: manifest boss flags, `s.ob[3]` boss percent, `s.br` barrel string. Documented in `docs/MULTIPLAYER.md`.
* Version bumped to 1.1.0 (`package.json`, title, menu subtitle, CHANGELOG, this log). ROADMAP statuses updated.
* Verified: `tests/extensions.test.js` 74 checks (barrels, chain, bullets, armor values, no flinch/stun, HUD percent, both boss missions complete, tank 3.5x HP and 1.25x size, two shells per volley), `tests/lobby.test.js` 49 checks (boss and barrels replicated in co-op). Not verified: difficulty and balance of the boss fights (numbers are from the drafts, as agreed) and the look of the boss models.

## 2026-10-18 (cont.) – helicopter in co-op
* Reported: no helicopter in Steel Fist in multiplayer. It was created only when `NET.role==='solo'`. Now it exists on every machine in campaign 2; design in `docs/MULTIPLAYER.md` ("The player helicopter"): pilot arbitration on the host, position of a client pilot copied from its presence, `s.h` in the snapshot, ghost on the other machines, client weapon shots as `h`/`p`/`t`, damage via `allyHit`, crash for everybody.
* Verified: `tests/lobby.test.js` 65 checks (client and host as pilot, taken helicopter, shots, landing, second pilot, crash). Not verified with real devices; open: no AI allies in the helicopter, jets and enemy fire do not distinguish the helicopter from the soldier avatar (damage reaches the helicopter via the avatar).

## 2026-10-18 (cont.) – making the campaign more fun: barks and cinematic scenes, release 1.2
* Owner request: make the campaign more entertaining (NPCs shouting when hit, funny lines from enemies, cinematic shots). Delivered as a first slice; the owner can steer from here.
* `118-banter.js` + `BANTER` in `10-data.js`: speech bubbles (canvas sprites) above allies, enemies, bosses and the tank with a short synthesized voice; chances, a global 1.1 s and a per-speaker 7 s cooldown, 34 m distance limit; hooks in `dmg`, `allyDmg`, `allyHit`, `hurt`, objective events, boss health tiers, barrels; replicated to clients as `b` fx. `119-cinematics.js`: intro fly-over (frozen world, title card, `CAPS` caption per mission, skip with any key), boss and tank kill-cam in slow motion, bullet time after headshot kills (solo only; `S.cine`, default on, Settings > Game). `canAct` is false during scenes; the loop scales `dt` by `timeScale`.
* Test hooks: the harness sets `S.cine = 0; banterRate = 0` so other tests are unaffected.
* Verified: `tests/banter.test.js` (28 checks), `tests/lobby.test.js` (68). **Not verified: how it feels** (bubble size/readability, camera path, humour, voice blips); everything is data or constants (`BANTER`, `CAPS`, the camera numbers in `cineCam`).
* Ideas for the next slice: per-mission scripted lines and funny radio exchanges, ally banter with each other, enemy panic/surrender, boss entrance scene, post-mission statistics with jokes ("Friendly fire incidents: 0"), kill-cam for the last enemy of a mission, optional camera shake/zoom on explosions, real voice or sound effects.

## 2026-10-18 (cont.) – speech bubbles made readable
* Owner asked to check for a bug and make the bubbles stand out. Findings: no logic bug, but the bubbles were hard to see: they shrank with distance (about 20 px high and tiny text at 20 m), and fog and tone mapping dimmed them. Now: constant on-screen size (`sizeAttenuation: false`, about 6-8% of the screen height), `fog: false`, `toneMapped: false`, bigger font with outline, rounded opaque box with a thick coloured border (allies blue, enemies red, bosses gold), a name line (ALPHA, BRAVO, PRISONER, COMMANDER, ARMATA CREW), a short pop-in, linear filtering for crisp text, a little longer life; barks are somewhat more frequent (hit .4, alert .45, buddy down .6, ally kill/hit .6, warning .45, cooldowns 0.9 s / 6 s). The prisoner is called `Prisoner`, not `Bravo`.
* Verified: `tests/banter.test.js` 31 checks (constant size, no fog/tone mapping, sensible scale, named allies). Not verified: the actual look (no renderer in tests); tune `bubbleSprite` (font size, `sy` = 0.1 for a one-line bubble) and the chances at the top of `118-banter.js` if needed.
