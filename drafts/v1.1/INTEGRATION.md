# Integrating the v1.1 extension

The files in this folder are complete, translated modules that were **never run in the real game**. They were written to be applied on top of version 1.0.
Integrate them into `web/src/js` as proper modules, one feature at a time, with a test for each.

| Draft file | Suggested target |
|---|---|
| `ext_data.js` | data in `10-data.js` (difficulties, perks, attachments, documents, achievements, new/changed missions, `lbase()` helper; call `LEVELS.splice(3,0,...)` after the level table and before `MODES`) |
| `ext_game.js` | new module `105-extensions.js`: weather, briefing/radio, objectives, killstreaks, ally orders, barrels, documents, jeep |
| `ext_zombie.js` | new module `115-zombie.js` |
| `ext_ui.js` | `20-menu.js` (perk and attachment Store tabs, Archive/achievements screen, difficulty setting) |
| `veh2.js`, `idle2.js` | replace `toggleHeli` and `updateHeliIdle` in `140-allies-helicopter.js` (vehicle-aware: helicopter and jeep) |

## Edits needed in existing modules

* **Template/HTML**: Archive screen (`#extras` with tabs `data-xt`), Store tabs `perks` and `att`, difficulty select `#setDiff`, briefing overlay `#brief` (`#briefT`, `#briefP`, `#briefGo`, `#briefBack`), main-menu button for the Archive, extra rows in the Controls table.
* **`00-save-data.js`**: new `DEF` fields `diff, perks, att, attOwned, ach, docs, heads, apcKills, rec, flag`.
* **`60-enemies.js`**: `mkEnemy(x,z,opt)` with `opt.noGun` (zombie arms forward); enemy hit points multiplied by `DIFF().hp`.
* **`70-world.js`**: `barrel()` registers destructible barrels (`userData.barrel`); `build()` reset line adds `barrels, objs, docsList, pjeep`; `addKit(x,z,ammo)` supports ammo crates.
* **`90-mission-start.js`**: `startMission(idx, skipBrief)` shows the briefing; `beginLoad()`; `doStart()` applies weather (`applyWx`), `initWx()`, resets new globals, spawns objectives (`placeObjectives`), boss (`makeBoss`, `markBossTank`), documents, jeep; `total = 1e9` for non-kill objectives; ammo uses `magOf(k)`; extra grenades from the perk.
* **`100-shooting.js`**: `fire()` uses `spreadMul/dmgMul/silent`; bullets can hit barrels (`barrelHit`) and depots (`objHit`) in `fire`, `hitscanFrom`, `heliFire`; `dmg()` boss armor, headshot counter, `streakKill()`; `vkill()` counts APC/tank kills; `hurt()` applies difficulty/armor perk, jeep branch; `failMission(msg)`; `explode()` chains barrels and damages depots; `alertNear()` stealth/alarm; tank boss fires double shells.
* **`110-…`/`120-…`**: `MODES` built with `lbase(_L[n])`; `zombie` mode; `survPay`/`endMatch` call `achCheck()`.
* **`130-multiplayer.js`**: manifest gets objectives and boss flags (`ob`, third element of `en`/`v`); snapshot gets `ob`, `br`, `bp`, ally `free` flag; presence `u` (use key held); `clientApply` updates objectives and barrels.
* **`160-main-loop.js`**: call `updateRadio`, `updateObjectives`, `updateTimers`, `updateDocs`, `updateZombie`, `updateWx`; zombie AI hook `zombieTick`; boss stun/flinch immunity; stealth sight range; `mountedKind` branches for helicopter/jeep; keys `G`, `Z`, `X`, `C`, `F`.
* **`150-minimap.js`**: UAV range.

## Known issue found while drafting
The batch integration script stopped on one mismatch in `heliFire`: its closing branch is indented differently than the script expected. Edit the module by hand.

## Multiplayer note
Objectives, bosses and barrels need replication (see `docs/MULTIPLAYER.md`, "Adding a replicated feature"). Killstreaks, documents, the jeep, Zombie Arena and ally commands are solo-only in the draft.

## Test plan
Add `tests/extensions.test.js`: each objective type completes and fails correctly, boss mission completes, perks/attachments change values, zombie waves, difficulty multipliers, and extend `multiplayer.test.js` for objectives and barrels.
