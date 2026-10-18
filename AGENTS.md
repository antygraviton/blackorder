# AGENTS.md – instructions for AI coding agents

This file is for any coding agent (Claude Code, Codex, Cursor, …). Read it fully before changing anything.
**Then read the "Current state" section at the top of `docs/DEVLOG.md`**: it says what is in progress, what is next and which decisions are open.
Project summary: **Black Order**, a single-file browser FPS (Three.js r128) with host-authoritative co-op multiplayer.
Owner's working language was Czech, but **everything in this repository must be English** (code, comments, UI text, docs, commit messages).

## 1. Commands

```bash
npm install                 # once; installs jsdom and three@0.128.0 (tests only)
npm run build               # python3 tools/build.py -> web/dist/black-order.html
npm test                    # build + all tests (about 1–2 minutes)
node tests/solo-campaign.test.js     # one test file
python3 tools/build.py --out /tmp/x.html   # build somewhere else
```

Never edit `web/dist/black-order.html` by hand: it is generated from `web/src/`. Always rebuild and commit both.

## 2. Repository map

* `web/src/template.html`  – HTML shell (menu, play, multiplayer, settings, store, game screens). Contains the placeholders `@@CSS@@` and `@@JS@@`.
* `web/src/styles.css`     – all CSS.
* `web/src/js/NN-name.js`  – JavaScript modules, **concatenated in numeric order into one `<script>`**. They are NOT ES modules:
  they share one global scope (function declarations, `let`/`const` globals). Order matters only for top-level statements that run at load time.
  See `docs/ARCHITECTURE.md` for the module table.
* `tests/`                 – headless tests; `tests/lib/harness.js` is the shared harness.
* `engines/unreal`, `engines/godot` – secondary implementations. Do not touch them unless asked.
* `drafts/v1.1`            – finished-but-unintegrated extension modules; see `drafts/v1.1/INTEGRATION.md`.

## 3. Hard rules

1. **English only.** `tests/i18n.test.js` fails if any Czech diacritics appear in a text file. UI strings, comments and docs must be English.
   Czech words without diacritics are also forbidden; grep for them when you translate. The only exceptions are `README.md` and `docs/GLOSSARY.md`, which quote the original Czech names (allow-list in the test).
2. **Do not introduce external runtime dependencies or assets.** The game is one file; textures, models and sounds are generated procedurally.
   Only Three.js r128 from cdnjs is loaded (plus PeerJS 1.5.4 from jsDelivr, loaded lazily and only for online play outside claude.ai; see D13). No images, no audio files, no web fonts other than the Google Fonts already in the template.
3. **Never use `localStorage` keys other than `blackorder_save`** (legacy `cernyrad03` is read once for migration).
4. **Keep the host-authoritative multiplayer invariants** (section 5). Single-player behavior must not change when `NET.role === 'solo'`.
5. **Presence payloads must stay under 4096 bytes** (the room API limit). The test harness fails above that.
6. **Run `npm test` before every commit** and add or extend a test for each behavior you add (see `docs/TESTING.md`).
7. **Do not rename the Unreal module `CernyRad`** without compiling on a machine with Unreal 5.4 (see `engines/unreal/README.md`).
8. When you change the version, update: `<title>` and the menu subtitle in `template.html`, `package.json`, `CHANGELOG.md`, `docs/DEVLOG.md`.

## 4. Coding conventions

* Plain modern JavaScript, no transpiler, no framework. Two-space indentation. Dense one-liners exist in old code; new code should be readable.
* Section banners look like `/* ============ NAME ============ */`. The build tool relies only on file names, not on banners.
* Data tables (`WEAPONS`, `LEVELS`, `MODES`, `CAMPS`, `DEF`) live in `10-data.js` and `120-…`/`110-…`; add content there first.
* All strings shown to the player are plain English literals (no i18n framework yet; see ROADMAP if localization is needed).
* Use `rng(seed)` for anything that must be identical on every machine (world generation); use `Math.random` only for host-side decisions and visuals.
* Prefer small pure helpers; avoid new global variables unless they are game state (declare them in the state `let` line in `60-enemies.js`/`70-world.js`).

## 5. Multiplayer invariants (read `docs/MULTIPLAYER.md`)

* Roles: `NET.role` is `'solo' | 'host' | 'client'`. Only the host simulates enemies, vehicles, AI allies, projectiles, fires, mines, kits and scoring.
* Clients never change enemy/vehicle state. In client mode `dmg()`, `vdmg()`, `hurt()`, `explode()` and `fireDamage()` are visual-only.
* Clients send their position (`p`) and shots (`sh`) in their presence; the host replays the shots with `hostShot()`.
* The host publishes world state in its presence field `s` (about 12 Hz); effects are one-shot events in `s.fx`.
* World generation must stay deterministic from `L.seed` (`build()` uses a seeded RNG). Mines, kits, enemies and vehicles are sent in the `go` manifest.
* When you add an entity type that exists in missions, you must add it to the manifest (`go`), to the snapshot (`hostSnap`), to `clientApply`/`clientTick`, and to `tests/multiplayer.test.js`.
* The helicopter, Training, Survival and the 1.1 drafts are solo-only today.

## 6. Known pitfalls

* `canAct` is a `const` in the game; the test harness rewrites it to `let` so tests can override it. Do not rely on that in game code.
* `scene.updateMatrixWorld(true)` is needed before raycasting in headless tests (the harness does it inside `step`).
* Pointer lock does not exist in jsdom; the game falls back to `fallback=true` after 700 ms.
* The old string-patching approach (many `python replace()` calls against the whole file) was abandoned because one mismatched anchor aborts the whole batch. Edit the modules directly.
* In the artifact runtime the page is an iframe; `window.claude.use('room')` returns `null` for signed-out users and public links. The game must keep working without it.
* Do not call `room.presence` more than ~12 times per second; the shared budget is about 40 events per second.

## 7. How to verify a change

1. `npm test` is green.
2. For visual changes, open `web/dist/black-order.html` in a browser; tests do not render anything.
3. For multiplayer changes, run `tests/multiplayer.test.js`, and if possible test with two real browsers on the published artifact.

## 8. Definition of done

Code + tests + docs updated (`CHANGELOG.md`, relevant `docs/*.md`) + `web/dist` rebuilt + English-only check passes + `docs/DEVLOG.md` updated (section 10).

## 9. Working economically (limited token budget)

The owner works on a low subscription tier; unfinished work from a session that ran out of budget is expensive. Therefore:

* Do not read whole large files; locate code with `grep -n` and read only the needed line ranges.
* No exploratory sub-agents unless the owner asks for them.
* Batch related edits; avoid many tiny edit/test cycles.
* While iterating, run only the affected test files (`node tests/<name>.test.js` after `npm run build`). Run the full `npm test` once before each commit.
* Prefer deferring a feature over half-integrating it. If the budget may run out, first leave the tree in a working state and update the devlog (section 10).
* Keep answers short.

## 10. Development log and handoff

`docs/DEVLOG.md` is how a newly attached agent or instance gets oriented. It has two parts:

1. **Current state** (at the top, always kept up to date, overwrite it): version, what is in progress, the next concrete step, open decisions/questions for the owner, known broken things. Keep it under about 20 lines.
2. **Session entries** (dated, newest at the bottom): what changed, what was verified, what is open.

Update both at the end of every working session **and** before stopping for any reason (finished, blocked, budget running out). A half-done step must be described precisely enough (files, functions, what remains) that another agent can continue without re-reading the code.
