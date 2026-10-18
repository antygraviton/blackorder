# Architecture

## 1. Big picture

The browser game is **one HTML document**: markup + CSS + one `<script>` that loads Three.js r128 from cdnjs.
For maintainability the source is split into a template, a stylesheet and 17 numbered JavaScript files;
`tools/build.py` concatenates them (in numeric order) into `web/dist/black-order.html`. The split is purely textual:

```
template.html  --@@CSS@@-->  styles.css
               --@@JS@@--->  js/00-…js + js/10-…js + … + js/160-…js   (one shared global scope)
```

There is no bundler, no ES module system and no transpiler. All JavaScript files share one global scope, exactly as if they
were one file. This is deliberate (see `DECISIONS.md`) but it is also the main piece of technical debt (see section 9).

Rendering is done with Three.js (WebGL). **No external assets exist**: textures are drawn on canvases at start-up (`40-textures.js`),
weapons, characters and vehicles are assembled from primitives, sounds are synthesized with WebAudio (`beep()`), and the world is generated from a seed.

## 2. Module table (`web/src/js/`)

| File | Responsibility | Key symbols |
|---|---|---|
| `00-save-data.js` | persistent profile (`localStorage` key `blackorder_save`) | `DEF`, `S`, `save()` |
| `10-data.js` | static game data | `WEAPONS`, `CAMPS`, `LEVELS`, `getMax/setMax`, `idxIn`, `nextInCamp`, `unlocked` |
| `20-menu.js` | menu screens and Store UI | `show`, `refresh`, `renderPlay`, `renderStore` |
| `30-helpers.js` | math, noise, terrain height, canvas helpers, instancing | `rng`, `hash2`, `vnoise`, `fbm`, `H(x,z)`, `mkTex`, `Inst` |
| `40-textures.js` | procedural textures and gun materials | `initTex`, `TX`, `GM` |
| `50-weapon-models.js` | weapon and glove meshes, first-person view model | `gunModel`, `glove`, `viewModel` |
| `60-enemies.js` | soldier model with simple IK arms | `mkEnemy`, `ikArm` |
| `70-world.js` | world state declarations, audio, level geometry | `beep`, `boom`, `build`, `mkTerrain`, `house`, `spot`, `addBlock`, `inObst` |
| `75-cabin.js` | the cabin landmark (log-clad upper room on a plastered base and open garage, outside stairs, brick chimney with fireplace) and `groundAt` for raised walkable floors | `cabin`, `cabinMats`, `groundAt`, `updateCabin` |
| `80-effects.js` | blood, dust, messages, HUD refresh, view model | `splat`, `bloodBurst`, `dustBurst`, `say`, `hud`, `buildView` |
| `90-mission-start.js` | mission start, pointer lock, pause, weapon switching, reload | `startMission`, `doStart`, `sw`, `reload` |
| `100-shooting.js` | firing, damage, explosions, projectiles, fire, smoke, vehicles | `fire`, `dmg`, `vdmg`, `explode`, `hurt`, `win`, `spawnProj`, `mkVehicle`, `updateVehicles` |
| `110-modes-training-survival.js` | Training and Survival, `MODES` table | `startMode`, `spawnTraining`, `updateSurvival`, `survPay`, `addKit` |
| `120-team-match-death-respawn.js` | Team Match, death/respawn, targeting helpers | `initTdm`, `updateTDM`, `playerDown`, `failMission`, `pickTarget`, `allyHit`, `addMine` |
| `105-objectives.js` | mission objectives (destroy, hack, rescue, defend, boss), bosses, explosive barrels, stealth alarm, briefing buttons, radio, weather and night | `placeObjectives`, `updateObjectives`, `objText`, `objHit`, `raiseAlarm`, `applyWx`, `initWx`, `updateWx`, `updateRadio`, `beginLoad` |
| `129-net-peerjs.js` | PeerJS implementation of the `room` API for online play outside claude.ai | `loadPeerJs`, `makePeerRoomApi` |
| `130-multiplayer.js` | lobby, host and client logic, replication | `NET`, `mpPeers`, `mpStartGame`, `hostSnap`, `hostShot`, `clientApply`, `clientTick`, `netTick` |
| `140-allies-helicopter.js` | AI allies and the player helicopter | `mkAlly`, `updateAllies`, `mkPlayerHeli`, `flyHeli`, `heliFire` |
| `150-minimap.js` | circular minimap | `drawMap` |
| `160-main-loop.js` | collision, line of sight, the per-frame `loop()` | `collide`, `los`, `loop` |
| `165-touch.js` | touch overlay for phones/tablets: stick, look, action buttons; only feeds the desktop input paths | `initTouch`, `touchWanted` |

The files are numbered with gaps so a new module can be inserted without renumbering (for example `105-…`).

## 3. Global state

All game state lives in globals. The most important ones:

| Variable | Meaning |
|---|---|
| `S` | persistent profile (name, XP, Weapoints, medals, owned weapons, equipped items, settings, unlocked missions) |
| `L` | the current level or mode definition (an element of `LEVELS` or `MODES`) |
| `curLevel`, `curMode` | index of the campaign mission, or the mode name (`'training' | 'survival' | 'tdm'`, `null` in campaigns) |
| `P` | the local player `{x,y,z,yaw,pitch,hp,vy,ground}`; camera forward is `(-sin yaw, -cos yaw)` |
| `enemies`, `vehicles`, `allies`, `projs`, `nades`, `fires`, `clouds`, `mines`, `kits` | live entity lists |
| `slots`, `wp`, `cur` | weapon ids in the 4(5) slots, their ammo state, the selected slot |
| `killed`, `total`, `over`, `run` | mission counters and loop flags (`total` is `1e9` in endless modes) |
| `pDead`, `respT`, `tdm`, `wave` | death/respawn timer, team match state, survival wave |
| `mounted`, `pheli` | player helicopter state |
| `NET` | multiplayer state (see `MULTIPLAYER.md`) |

Entities are plain objects:

* **enemy / ally / avatar** (`mkEnemy`): `{g (THREE.Group), hp, x, z, alive, alerted, cd, strafe, parts, legs, mf, mfT, dt, flinch, walk, stun, head, …}`;
  allies additionally have `marker`, remote players have `remote:true, name, px,py,pz,pyaw, respT`.
* **vehicle** (`mkVehicle`): `{type:'apc'|'tank'|'heli'|'jet', g, parts, alive, hp, pm (bullet multiplier), rad, turret, wheels, rotor, mf, …}`.
  `pm` is how much of a **bullet's** damage gets through (APC 0.06, tank 0.03, helicopter 0.22, jet 0.02); explosions use `vdmg(v, amount, true)` and ignore `pm`.

## 4. Main loop (`160-main-loop.js`)

`loop()` runs once per animation frame with `dt = min(0.05, elapsed)`.

1. Player movement, camera placement, weapon animation, reload timer, HUD messages, particles.
2. **Simulation block, skipped for `NET.role === 'client'`**: grenades, mines, kits, enemy AI, survival/team-match logic,
   `updateVehicles`, `updateAllies`, `updateHeliIdle`, `updateProjs`, `updateFires`, `updateClouds`.
   For clients `clientTick(dt)` interpolates snapshot data instead.
3. `netTick(dt)` (all roles except solo): publish presence, read peers.
4. HUD (`hud()`), minimap (`drawMap()`), `renderer.render`.

## 5. World generation and determinism

`build()` constructs the level from `L.seed` using a seeded generator `R = rng(seed*101)`; terrain height is `H(x,z)` (deterministic noise).
Houses, fences, props, trees, rocks, bushes and instanced vegetation use `R` only, so **every machine builds an identical world**.
Things placed with `Math.random` (mines, kits, enemies, vehicles) are decided by the host and transferred in the multiplayer manifest.
The world is a square of about 156 m bounded by fences, with mountains behind the fences; the player starts at `(0, 70)` looking toward -Z (into the map).
Desert levels (`L.desert`) swap houses for hangars, add a runway and use fewer trees.

## 6. Combat model

* Hitscan weapons raycast against `obstMesh` (invisible proxy boxes that also give cover), enemy body parts (`userData.enemy`, `userData.tag` = `'head'|'body'`)
  and vehicle parts (`userData.vehicle`). Head multiplier is 2.5. Shotguns fire `pellets` rays.
* Rockets, napalm canisters and arrows are projectiles (`spawnProj` / `updateProjs`) with gravity; tank shells are projectiles of type `'shell'` that only hurt humans and allies.
* Explosions (`explode(p, radius, damage)`) hurt enemies (full), vehicles (`damage * 1.6`), the local player and remote players (reduced).
* Fire zones (napalm) tick every 0.25 s. Smoke clouds block line of sight (`smokeBlocks`). Flashbang and Hardbass set `e.stun`.
* Enemy AI: wanders until alerted (by sight within 60 m, by being hit, or by a shot within 50 m), then approaches to 8–16 m, strafes and shoots with `L.acc` distance-based accuracy.
  Enemies target the nearest of: the player and any ally/avatar they can see. Vehicles use `pickTarget` (nearest living human).

## 7. Save data schema (`S`)

`name, xp, wp (Weapoints), medals, kills, missions, deaths, maxLevel, maxLevel2 (highest unlocked mission index in campaign 1 and 2), bestWave,
owned {weaponId:1}, primary, secondary, melee, grenade, vol, sens, fov, q`. Level is `1 + floor(xp / 100)`.
Old saves are read from the legacy key `cernyrad03` once and then written under `blackorder_save`.

## 8. Multiplayer in one paragraph

Host-authoritative over the claude.ai artifact `room` capability. Everything travels in **presence** objects (≤ 4 KiB each, about 12 Hz).
Clients send position and shots; the host simulates and publishes a compact snapshot plus one-shot effects. Details and the exact schema are in `MULTIPLAYER.md`.

## 9. Known technical debt

* One global scope across 17 files; names can collide silently. A proper fix is ES modules plus a bundler (esbuild) while keeping the single-file output.
* Large functions (`fire`, `loop`, `doStart`, `hostSnap`) and dense one-line code written for speed of authoring.
* The code base was extended by repeated whole-file string patching early on; some modules contain remnants of that style.
* No automated visual or performance tests; no per-frame budget guards for many enemies plus particles.
* UI strings are hard-coded English literals; there is no i18n layer.
* Remote shots from clients ignore weapon attachments/perks (those are drafts, not integrated).
