# Decisions

Short architecture decision records, newest context first within each topic.

## D1. One self-contained HTML file
**Why:** the game was created inside chat conversations where a single file can be previewed, published and shared instantly; no tooling is needed to play it.
**Consequence:** no external assets, everything procedural; large global scope; build step is plain concatenation. **Revisit when:** a bundler (esbuild) is acceptable. Keep the single-file output.

## D2. Procedural everything (textures, models, sounds)
**Why:** no asset pipeline, no licensing issues, small file. **Consequence:** the look is stylized boxes/cylinders; realistic models are a later replacement (Godot supports `res://models/*.glb` overrides; Unreal can use Fab assets).

## D3. Three.js r128 from cdnjs
**Why:** artifact pages may only load scripts from a short allow-list of hosts (cdnjs is on it). r128 is the version known to work; some newer APIs are unavailable (for example `CapsuleGeometry`, `OrbitControls`). Tests pin `three@0.128.0` to match.

## D4. Multiplayer over the artifact `room` capability, host-authoritative, presence only
**Why:** no server is available; presence is the one channel every participant may write to. The host simulates and sends compact snapshots (≤ 4 KiB). Events were rejected because sending on topics needs editor rights.
**Consequence:** public-link viewers cannot play online; host must keep the tab in foreground; no anti-cheat. See `MULTIPLAYER.md`.

## D5. Players replace AI allies (co-op for 3)
**Why (owner request):** "campaign only for 3 instead of NPCs". `npc = 3 - humans`, remote players are represented on the host as ally-like entities so enemies and vehicles already know how to target them.

## D6. Engine strategy: browser prototype first, Unreal for production
The owner leans toward Unreal Engine 5.4 for the real game. A Godot 4.3 port was created when Unreal could not be installed, then Unreal was installed and the project went back to Unreal.
The Godot port is archived. The Unreal C++ project is kept in step with the design but is behind the browser game and has an open editor-loading problem.

## D7. Keep the Unreal module name `CernyRad`
It is an identifier in `.uproject`, `Build.cs`, `Target.cs`, `DefaultEngine.ini` and `CERNYRAD_API`. Renaming without a compile risks breaking a build that was only just made to work. Do it together with a verified compile.

## D8. English-only repository
The project was developed in Czech; it was converted to English on 2026-10-18 so that any developer or agent can continue. `tests/i18n.test.js` enforces it. Original names are listed in `GLOSSARY.md`.

## D9. Stop string-patching, edit modules
Early versions were produced by whole-file Python `replace()` batches. One mismatched anchor aborts the batch (this happened while integrating the 1.1 extension). The repository now has real source files.

## D10. Weapons and balance
Bullets must barely hurt armor so that explosives, RPG and napalm matter (`pm` multipliers). The banana gun was removed on request. A plain "Normal" gun entry from the sketches was dropped as redundant.

## D11. Fences instead of walls, no grass
Owner's visual direction: bounded maps use fences, mountains and cliffs behind them, and no grass.

## D12. Start orientation
Players start at `(0, 70)` and look toward -Z into the map (`yaw = 0`); an early version started facing the fence by mistake.
