# Black Order – Godot 4.3 port (archived, version 0.1)

A playable port of the early browser prototype: main menu, Store, settings, 3 missions, first-person
shooting, enemies, mines, medkits, minimap and blood on screen. Open it and play; nothing else needs to be downloaded.

> **Status: archived.** This port reflects the browser prototype at version 0.2/0.3. The browser game in
> `web/` and the Unreal project in `engines/unreal/` are further ahead. The Godot port is kept as a
> reference and as a starting point if the project returns to Godot.

## Run
1. Download **Godot 4.3** (standard build, not .NET) from `godotengine.org`. It is a single file and needs no installation.
2. Unzip the project to a path without special characters, for example `C:\Games\black-order\engines\godot`.
3. Start Godot → **Import** → choose `project.godot` → **Import & Edit**.
4. Press **F5** (or the play icon at the top right). The game starts in the main menu.

The first start of a map takes a few seconds because the terrain is generated.

## Controls
WASD move, Shift sprint, Space jump, left button fire, right button aim, R reload,
1–4 weapons (primary, secondary, knife, grenade), Esc pause.

## What is in the project
| File | Purpose |
|---|---|
| `scripts/game.gd` | weapon and mission data, progress saving, input, sounds (autoload `Game`) |
| `scripts/menu.gd` | main menu, mission selection, Multiplayer (visuals only), Settings, Store |
| `scripts/mission.gd` | builds terrain, fences, houses, ruins, vegetation, mines, enemies and enforces the rules |
| `scripts/player.gd` | player, 4 weapon slots, aiming, reloading, health |
| `scripts/enemy.gd` | Order soldier (character, AI, animation) |
| `scripts/gunmodel.gd` | weapon models |
| `scripts/hud.gd`, `minimap.gd` | health, ammo, blood on screen, scope, minimap |
| `scripts/tex.gd` | procedural textures (plaster, brick, camouflage, …) |
| `tests/smoke.gd` | headless smoke test (menu, three missions, shooting, mines, grenades, victory) |

Everything else is created in code, so the project can be edited through scripts alone.

## Adding your own models (Sketchfab, Blender, Mixamo)
1. Download a model from Sketchfab (check the license) as **glTF/GLB**, or edit it in Blender and export via
   *File → Export → glTF 2.0 (.glb)*.
2. Characters and animations: upload the model to **mixamo.com**, pick animations (Idle, Walking), download as FBX,
   combine them in Blender and export to `.glb`.
3. Rename the file according to the table in `models/README.txt` (for example `soldier.glb`, `hk416.glb`) and put it into `models/`.
4. Godot imports it the next time the project opens and the game uses it instead of the box model.
   Scale: the soldier should be 1.8 m tall, a weapon 0.8–1 m, the face looking along −Z.

## Windows executable
In Godot: **Project → Export → Add → Windows Desktop**, install the offered *export templates* and click **Export Project**.
The preset `export_presets.cfg` is already included (output `../export/BlackOrder.exe`).

## Tests
```
godot --headless --path . -s res://tests/smoke.gd
```
Prints `ALL OK` when the menu, all three missions, shooting, mines, grenades and the victory condition work.
The test checks logic only; look and performance have to be checked by running the game.

## Known gaps
- No realistic character models or animations (boxes and cylinders only).
- No story scenes, no online multiplayer, no Training / Survival / Zombie Arena.
- Still contains the early "Banana gun"; it was removed in later versions.
