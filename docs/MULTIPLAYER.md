# Multiplayer protocol

Online play is implemented with the **`room` capability of claude.ai published artifacts**

**Outside claude.ai** (for example GitHub Pages) the game falls back to `makePeerRoomApi` in `129-net-peerjs.js` (PeerJS over WebRTC, star topology, see D13). Same game code, same 4 KiB presence budget. Not tested with real browsers yet.

(`const room = await claude.use('room')`). There is no custom server.

## Constraints of the platform (important)

* Only signed-in people can connect: members of the owner's organization and invited guests. **Public-link viewers cannot.** The game must keep working without the capability (`netApi()` returns `null`).
* The page must be published with `capabilities: {room: {}}` (and runtime contract `latest`).
* `room.presence(patch)` merges fields into *your* presence object; each peer's merged object must stay **≤ 4 KiB**; presence and events share roughly 40 messages per second. The game sends about 12 per second.
* Publishing a new version of the artifact reloads every open view and empties the room.
* Events (`room.emit/on`) are not used: sending on topics needs editor rights unless declared; presence works for everyone, so **all traffic uses presence**.
* A named room per game: `room = await api.join('cr-' + code.toLowerCase())` (the prefix `cr-` is historical, from the Czech working title).
* The host's browser tab must stay in the foreground; background tabs throttle `requestAnimationFrame` and stall the simulation.

## Roles and lobby

* The player who presses *Create game* becomes the **host** (`r:'h'`), others join with the 6-character code (`r:'c'`).
* The host keeps `ro` (roster: up to 3 peer ids, in arrival order) in its presence; a peer not in the roster for 2.5 s leaves with "game is full".
* The host chooses `md` (`'coop'` or `'tdm'`) and `lv` (mission index) in its presence. Pressing *Start game* runs the mission locally and publishes the **manifest** `go`.
* AI allies fill the team up to 3: `npc = 3 - humans` (max 2).

## Presence fields

Client (and host) common: `n` name, `r` role, `p` player state, `sh` shot ring buffer.

| Field | Content |
|---|---|
| `p` | `[x*10, y*10, z*10, yaw*100, pitch*100, alive]` (integers) |
| `sh` | last 8 shots, each `[id, code, weaponId, ox*10, oy*10, oz*10, dx*1000, dy*1000, dz*1000]`; the host also publishes `[[id,'v']]` as a muzzle-flash signal |

Shot codes: `g` hitscan gun, `m` melee, `b` bayonet, `r` rocket, `n` napalm, `a` arrow, `s` stun cone, `x` grenade throw.

Host only:

| Field | Content |
|---|---|
| `ro` | roster `[peerId,…]` |
| `md`, `lv` | lobby selections |
| `go` | manifest `{id, md, lv, ro, np, en:[[x*10,z*10]], v:[[type,x*10,z*10]], mi:[[x,z]] (mines), ki:[[x,z]] (kits)}` |
| `s` | snapshot (below), about 12 Hz |

### Snapshot `s`

| Key | Meaning |
|---|---|
| `q` | sequence number |
| `e` | enemies by index: `[x*10, z*10, yaw*100, flags]` (flags: 1 alive, 2 muzzle flash) |
| `v` | vehicles by index: `[x*10,y*10,z*10,yaw*100,pitch*100,turretYaw*100,flags]` (1 alive, 2 muzzle flash, 4 visible) |
| `a` | AI allies: `[x*10, z*10, yaw*100, alive]` |
| `pl` | humans by roster index: `[hp, alive, respawnSeconds]` |
| `st` | `[killed, total (0 = endless), over, teamMatchSeconds, botScore]` |
| `mn`, `ki` | strings of `'1'/'0'`: mines still live, kits already used |
| `fx` | last ≤ 10 one-shot effects `[id, kind, …]`, kinds: `e` explosion, `S` smoke, `F` fire, `L` flashbang, `P` projectile visual, `N` grenade visual |
| `m` | last host message `[id, text, seconds]` (shown with `say`) |
| `o` | end of game `[1 win | 2 lose, title, text, Weapoints, medals, XP]` |

## Authority and flow

1. **Client input**: movement is client-authoritative (the host trusts the reported position). Shots are *replayed on the host* (`hostShot`): hitscan, melee, projectiles and grenades use the reported origin and direction.
2. **Damage to humans** is computed on the host (`allyHit`, `hurt`) and reported back in `pl`. The client only adjusts its HUD and splashes blood when its HP drops.
3. **Client mode** replaces game logic by visuals: `dmg/vdmg/hurt/explode/fireDamage` return early after showing feedback; rockets and grenades fired by a client are created by the host and arrive as `fx` visuals.
4. **Ghosts**: clients create enemies/vehicles from the manifest and interpolate them from `e`/`v` (`clientTick`). Avatars of other humans are built from their presence `p`.
5. **Death**: in Team Match players respawn after 6 s; in co-op after 15 s if another human is alive; if all humans are dead the mission fails (`failMission`).
6. **End**: the host sets `NET.endInfo`; clients receive `s.o`, apply rewards locally (`clientEnd`) and show the end overlay.
7. If the host's presence disappears for more than 4 s, clients end the game ("Host left").

## Adding a replicated feature (checklist)

1. Create the entity on the host in `doStart()`; add it to the manifest in `mpStartGame()`; create the ghost in `doStart()`'s `man` branch.
2. Add its dynamic state to `hostSnap()` and apply it in `clientApply()`/`clientTick()`.
3. One-shot effects: call `fxPush([...])` on the host and handle the new kind in `clientFx()`.
4. Make sure client-side damage functions are visual-only for it.
5. Keep presence under 4 KiB (the mock room in `tests/lib/harness.js` throws above that).
6. Extend `tests/multiplayer.test.js`.

## Mission objectives (destroy, hack, rescue, defend)
* Every machine rebuilds the same objects: `placeObjectives()` uses a seeded RNG (`L.seed*53`) and runs on the host and on clients, after the same world generation, so depots, terminal, prisoner, extraction point and zone are at the same places. The prisoner is the last non-remote ally, so the `a` array of the snapshot covers it.
* The host publishes `s.ob = [alarm, prisonerFree, [[progress*1000, done], ...]]` (one entry per objective, same order). Clients apply it in `clientApply`; a depot that becomes `done` plays `depotVis`. The explosion itself comes through the normal `fx` events. Mission end, radio/briefing messages and failure messages reuse `s.o` and `s.m`.
* Clients send `u:1` in their presence while E is held; the host reads it into the remote avatar (`a.use`), which is what `humansNear(..., needUse)` checks for hacking and freeing the prisoner. Stealth alarm, waves, win and fail are host-only.
* Bosses and barrels: the manifest (`go`) marks boss enemies/vehicles with a third/fourth element (`en`, `v`), clients call `makeBoss`/`markBossTank` on their ghosts (scale and colour); the boss health percent travels in `s.ob[3]`; destroyed barrels are the string `s.br` ('1' = dead), applied with `barrelVis`. Armor, stun immunity and double shells are host logic.
* Known gaps: a client's suppressor and damage perks are not applied to its shots on the host (`hostShot`), so a suppressed client shot still alerts enemies; radio messages are replicated as "last message" only.

## The player helicopter (campaign 2)
* One pilot at a time: `NET.heliPilot` is the roster index of the pilot, -1 = nobody. The pilot's machine flies it: the host flies for itself; a client pilot claims the helicopter with presence `hm:1` when it boards (`toggleHeli` checks `heliFree()`), and the host decides in `heliArbitrate` (first claimant within 9 m while nobody flies). The host then copies the pilot's presence position, yaw and pitch onto `pheli` (so the host sim, enemies and vehicles see it) and publishes `s.h = [pilot, x, y, z, yaw, pitch, roll, alive, pods, missiles, hp]`; all other machines run a ghost (`heliApply`, `heliFollow`). The pilot is hidden as a soldier on the other machines.
* A client pilot's shots travel as `sh` entries with the codes `h` (machine gun), `p` (one pod rocket), `t` (anti-tank missile); `hostShot` hands them to `heliShot`, which only accepts the current pilot. Damage to the pilot's avatar goes to the helicopter (`allyHit`), and `crashHeliRemote` destroys it for everybody; a helicopter nobody flies sinks to the ground.
* A client that claims but is not made pilot within 1.5 s is dropped out ("taken by another player").

## Barks and cinematics
* Barks are decided on the host and shown on clients through the one-shot fx event `['b', kind, index, keyIndex, lineIndex]` (`kind` e = enemy, a = non-remote ally, v = vehicle; `keyIndex` indexes `BANTER_KEYS`, so new banter keys must be appended). Purely cosmetic.
* Cinematic scenes (intro, kill-cam, bullet time) run only when `NET.role === 'solo'`: nobody's game freezes online.

## Pause, lobby and rejoin
* **Host pause stops the game for everybody.** The host stops its simulation and publishes `ps:1` in its presence; clients see the "Host paused" screen (`clientPauseSync`, driven by `onPeers`, because the client loop is stopped) and can continue only after the host resumed. A client's own pause menu does not stop the game.
* **Only the host starts a game** (`mpStartGame`); clients enter it only through the host's `go` presence, and only if their peer id is in `go.ro`.
* **Back to the lobby:** death, mission end and the pause menu's "Back to lobby" keep the room (`mpBackToLobby`); `NET.goDone` stops a client re-entering the game it just left. If the host goes back to the lobby (`go` cleared), all clients are taken there too.
* **Rejoin:** while the host's snapshot shows a running game (`s.st[2]` = 0) a client that left sees "Rejoin the game" (`#mpRejoin`). Otherwise the lobby says "Waiting for the host to start the game…" (or that a game is running without you / is over).

## Known limitations

* No anti-cheat; positions and shots are trusted.
* Training, Survival, killstreaks, ally orders, documents, the jeep and Zombie Arena (drafts) are single-player only. Objectives, bosses and barrels: see "Mission objectives" below.
* Latency is about 100–200 ms (12 Hz snapshots with interpolation); there is no lag compensation.
* Tested only with an in-memory mock of the room API, never with real remote players.
