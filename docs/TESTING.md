# Testing

All tests are headless: **jsdom + the real three.js r128 + stubs**, no browser and no GPU. They check game **logic**; they cannot judge looks, feel or speed.

```bash
npm test                              # build + every tests/*.test.js
node tests/solo-campaign.test.js      # a single file (needs a built web/dist)
```

## What each test covers

| File | Covers |
|---|---|
| `solo-campaign.test.js` | every mission builds; all 22 weapons fire/reload/switch; enemy and vehicle AI runs; player helicopter (boarding, pitch-controlled flight, three weapons, chase camera, landing, exit, destruction) in campaign 2; every mission is completable |
| `modes.test.js` | menu rendering; Training (targets, invincibility, respawn, weapon cycling, stats not polluted); Survival (10 waves, vehicle schedule, death payout); Team Match (bots respawn, player respawn, win condition) |
| `multiplayer.test.js` | lobby and the 3-player limit; co-op mission with 3 instances (same world, position replication, enemy/kill sync, remote shooting, damage and HP replication, death/respawn, explosion effects, 4 KiB presence budget, mission end and rewards, leaving); Team Match with 2 players (NPC count, scoring, respawn, victory overlay) |
| `net-peerjs.test.js` | the PeerJS room adapter against an in-memory fake PeerJS (`tests/lib/fakepeer.js`): hub election, relay between members, `null` deletes keys, leave, late joiners, room isolation, silent members are dropped |
| `lobby.test.js` | online lobby with three game instances over the real PeerJS adapter and a fake PeerJS: joining, duplicate Join clicks, same-name players, English labels, back to the lobby after a game, restarting |
| `touch.test.js` | the touch overlay: stick -> W/A/S/D and sprint, look drag, fire/aim/reload/jump/use/swap/grenade/pause buttons (plain events with `changedTouches`; no real device) |
| `i18n.test.js` | no Czech diacritics anywhere in the repository |

## The harness (`tests/lib/harness.js`)

```js
const { createGame, makeRoomBus, makeChecker, sleep } = require('./lib/harness');
const g = createGame({ name: 'solo' });            // one game instance (one "tab")
g.E('LEVELS.length');                              // evaluate in the game's script scope (direct eval, sees all globals)
g.step(60, 16);                                    // run 60 frames of 16 ms
g.$('endT').textContent; g.click('mpCreate');      // DOM helpers
```

* Multiplayer: create a shared bus with `makeRoomBus()` and pass `{bus, id}` to each `createGame`; the bus mocks `claude.use('room')` (join, presence, peers, onPeers, leave) and records the largest presence size.
* Time is fake: `performance.now` is controlled by `step`. `requestAnimationFrame` is a no-op, so the loop only advances when you call `step`.
* `canAct` is rewritten from `const` to `let` so tests can override it; `THREE.WebGLRenderer` is stubbed; `scene.updateMatrixWorld(true)` runs after every frame so raycasts work.
* Prefer `g.E(...)` snippets that return plain data; avoid asserting on random values (enemy positions are random; compare host vs client instead).

## Writing a new test

1. Create `tests/<topic>.test.js` ending in `.test.js`; `run-all.js` picks it up automatically.
2. Use `makeChecker('<name>')`, call `check(cond, 'what is expected')`, finish with `process.exit(check.done() ? 0 : 1)`.
3. Keep each file under about 30 seconds; multiplayer tests need `await sleep(...)` because map generation takes tens of milliseconds per instance.

## What is NOT verified

* Rendering, colors, proportions, animation quality, audio and frame rate.
* Real network behavior (latency, packet loss, reconnects) and the real `room` API.
* Mobile/touch devices (the game is mouse-and-keyboard only).
* Unreal (never compiled by the authoring environment) and Godot (only its own headless smoke test).
