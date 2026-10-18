# Development log (diary)

Chronological record of the development sessions. Add a dated entry for every working session: what changed, what was verified, what is open.
Dates are the calendar days of the original sessions (2026). Early sessions were reconstructed from the conversation history and file timestamps.
Rules for this file: `AGENTS.md` section 10.

## Current state (keep up to date, overwrite)

* **Version:** 1.0. `npm test` green on `main`.
* **In progress:** integrating the v1.1 drafts (lean plan, 3–4 commits). Nothing integrated yet.
* **Lean plan:**
  1. ~~Clean the drafts~~ DONE: Czech leftovers translated in `drafts/v1.1`, `failMission(msg)` extended. Radio `r.done` reset moves to step 3 (when radio code lands in `doStart()`); `addKit(...,ammo)` (needs pickup logic in `160-main-loop.js`) and `mkEnemy(...,opt.noGun)` move to the deferred killstreaks/Zombie work.
  2. ~~Data, difficulty~~ DONE (perks, attachments, difficulty; code lives in `10-data.js` and `20-menu.js`, hooks in fire/hurt/reload/enemy AI). Still in `drafts/ext_data.js`: `DOCS`, `ACH`, mission edits, `lbase`; in `ext_ui.js`: Archive (`renderExtras`).
  3. Objectives, new missions, briefing, radio, weather (`ext_game.js` -> one `105-extensions.js`).
  4. Bosses and barrels. Then a short `tests/extensions.test.js`, version bump, docs.
* **Deferred:** multiplayer replication (new objective missions solo-only, hidden in the lobby), jeep, Zombie Arena, killstreaks, ally orders, documents/Archive.
* **Next step:** plan step 3 (objectives, new missions, briefing, radio, weather: `ext_game.js` + mission edits from `ext_data.js`; reset `r.done` of radio in `doStart()`).
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
