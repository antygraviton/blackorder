# Development guide

## Setup

```bash
git clone <repo> && cd black-order
npm install          # jsdom + three@0.128.0 for the tests
npm run build        # builds web/dist/black-order.html
open web/dist/black-order.html    # any static file works; no server needed
```

Edit `web/src/**`, rebuild, reload the browser. Use the browser developer console: all game variables are globals,
so you can inspect and call things such as `enemies`, `P`, `S`, `startMission(5)`, `startMode('survival')`, `explode(new THREE.Vector3(0,1,60),8,200)` directly.

## Adding things

### A weapon
1. Add an entry to `WEAPONS` in `web/src/js/10-data.js`: `{name, cat:'primary|secondary|melee|grenade', dmg, rate, mag, res, auto, spread, price (or medals), zoom, rel, desc}`.
   Special behavior is selected with `kind`: `rocket`, `arrow`, `napalm`, `stun`, `melee`, `shield`, `frag|dyn|smoke|flash`; or the flags `bayonet`, `pellets`, `scoped`, `melee`.
2. Add a model branch in `gunModel(k, detail)` in `50-weapon-models.js` (boxes `B`, cylinders `C`; the firing direction is -Z; set `ud={muzzle, rh, lh, sy}` hand and muzzle positions).
3. Add its first-person offset to the `pos` table in `buildView()` (`80-effects.js`).
4. The Store lists it automatically by `cat`. New firing behavior goes into `fire()` (`100-shooting.js`); if the weapon is not a plain hitscan, also handle it in `hostShot()` (`130-multiplayer.js`) so remote players can use it.
5. Run the tests: `solo-campaign.test.js` fires every weapon.

### A mission
Add an object to `LEVELS` (`10-data.js`): `camp` (0|1), `n`, `txt`, `en` (infantry), `mines`, `kits`, `houses`, `ruins`, `seed` (changes the map), `reward`, `medals`, `xp`, `acc`, `hp`,
a palette `pal{grass,dirt,road,rock,rock2}` and sky/fog/sun values (copy an existing level). Optional: `apcs`, `tanks`, `helis`, `jets`, `desert`, `runway`.
Missions unlock sequentially inside their campaign (position in the array among levels with the same `camp`). The count shown in menus and the multiplayer mission list update automatically.
Note the `MODES` table in `110-…` copies palettes from `LEVELS[0..2]`; keep those three at the start of the array or update `MODES`.

### A game mode
1. Add an entry to `MODES` (`110-modes-training-survival.js`; copy palette fields from a level) and a card in `renderPlay()` (`20-menu.js`).
2. Add `initX()`/`updateX(dt)` functions and call them from `doStart()` (`90-mission-start.js`) and the simulation block of `loop()` (`160-main-loop.js`). Endless modes use `total = 1e9`.
3. Decide what ends the mode (`over = true`, overlay text in `endT`/`endP`) and pay out rewards once.
4. If it should be multiplayer-capable, follow the checklist in `MULTIPLAYER.md`.

### A vehicle
`mkVehicle(type, x, z, k)` in `100-shooting.js` builds the mesh from primitives (every mesh gets `userData.vehicle` so bullets can hit it), sets `hp`, `pm`, `rad`.
Behavior lives in `updateVehicles(dt)`. Add the type to `explode()` handling (generic), to the manifest and snapshot code (`hostSnap`, `mpStartGame`) and to `vkill()`.

## Publishing as a claude.ai artifact

The playable online version is a *published artifact*. A published page must be one self-contained HTML file; publishing needs the artifact tooling inside a claude.ai conversation
(for example: attach `web/dist/black-order.html` and ask Claude to publish it with `capabilities: {room: {}}` and `contract: "latest"`).
Updating an existing artifact keeps its link (currently <https://claude.ai/artifact/8XE7Jw8VNY6rUzxVdT6UZP>). Share the artifact with the people who should play online (Share menu).
A plain static host also works for single-player, but `window.claude` does not exist there, so multiplayer is disabled.

## Debugging tips

* Mission does not complete: check `killed` vs `total` and whether a vehicle of type `jet` is counted (it must not be).
* Everything stuck at "Loading map…": an exception in `doStart()`; open the console.
* Multiplayer desync: compare `enemies.length`, `vehicles.length` on both sides first; then `NET.snap`. `hostSnap()` size: `JSON.stringify(hostSnap()).length` must stay far below 4096.
* Raycasts in headless tests return nothing until `scene.updateMatrixWorld(true)` has run.
* Performance: reduce `S.q` (quality 1–3) for fewer shadows and trees; large Survival waves are the heaviest case.

## Engines

* Unreal: see `engines/unreal/README.md` (build steps and the open "module could not be compiled" problem).
* Godot: see `engines/godot/README.md` (archived, includes a headless smoke test).

## Commit conventions

English imperative messages, one logical change per commit, for example `Add flashbang stun to hostShot`. Always commit `web/dist/black-order.html` together with the source change.
