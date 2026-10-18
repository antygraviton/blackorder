# Black Order – Unreal Engine 5.4 project (C++, everything in code)

The same game as the browser version, rebuilt in Unreal Engine 5.4. The project needs **no Blueprints, maps or
model assets**: after compiling, it runs in an empty map and the whole menu, terrain, characters, weapons and
missions are created in code.

> **Naming note.** The Unreal module, class prefix (`CR…`) and file names still use the original working title
> `CernyRad` ("Black Order" in Czech). They are technical identifiers and were intentionally **not** renamed:
> renaming a module changes `.uproject`, `Build.cs`, `Target.cs`, `DefaultEngine.ini` and every `CERNYRAD_API`
> reference, and it must be done together with a successful compile on a machine with Unreal installed.
> All player-visible text, comments and documentation are in English.

## Status
- All source files compile (verified by the owner on Windows with UE 5.4 + VS 2022 Build Tools; last fixes: `PCHUsageMode`, `RenderCore` module).
- **Open problem:** `build_project.bat` reports success, but when the `.uproject` is opened the editor says the module
  `CernyRad` is missing or built with a different engine version and then fails to rebuild
  ("CernyRad could not be compiled. Try rebuilding from source manually."). The next step is to read the editor log
  `Saved/Logs/CernyRad.log` (and `%LOCALAPPDATA%\UnrealBuildTool\Log.txt`) from a failed open and look for the first `error`.
  A clean rebuild (delete `Binaries/` and `Intermediate/`, then run `build_project.bat`) is the first thing to try.
- Feature level: roughly the browser version 0.8 (two campaigns, vehicles, 24 weapons) minus the player helicopter,
  allies, Training/Survival/Team Match and multiplayer. The browser game in `web/` is the reference implementation.

## Requirements
- Unreal Engine **5.4** (Epic Games Launcher).
- **Visual Studio 2022** (or only the 2022 Build Tools) with the workloads *Game development with C++* and *.NET desktop development*.
  Visual Studio 2026 is **not** supported by UE 5.4. Also install the **.NET Framework 4.8 Developer Pack**.
- A GPU with DirectX 12, an SSD and plenty of disk space.

## Run
1. Copy this folder to a path without spaces or special characters, for example `C:\Games\black-order\engines\unreal`.
2. Right-click `CernyRad.uproject` → **Generate Visual Studio project files**.
3. Either open `CernyRad.sln`, choose **Development Editor** + **Win64** and build the `CernyRad` project, or just run `build_project.bat`
   (it finds UE 5.4, builds and writes `build_log.txt`).
4. Double-click `CernyRad.uproject`. On the first start the shaders compile, which takes a while.
5. Press **Play** (green arrow). The menu appears above a slowly rotating landscape.
   If the picture is small, choose **New Editor Window (PIE)** or **Standalone Game** in the Play drop-down.

## Controls
WASD move, Shift sprint, Space jump, left button fire, right button aim, R reload, 1–4 weapons
(primary, secondary, melee, grenade), **5 = RPG** in campaign 2, Esc pause.

## Source map (`Source/CernyRad/`)
| File | Purpose |
|---|---|
| `CRGameMode` | game states (menu, mission, pause, end), lighting and sky, enemy/mine/medkit counts, rewards, explosions |
| `CRWorldActor` | generates hilly terrain with mountains, fences instead of walls, houses, ruins, props, trees, bushes, rocks |
| `CRCharacter` | player, 4 weapon slots, aiming, reloading, health, weapon and hand animation |
| `CRVehicle` | armored personnel carrier, helicopter, jet (air strikes) |
| `CREnemy` | soldier (body from boxes and cylinders, helmet, vest, night vision), simple AI, headshots |
| `CRGun` | weapon models (HK416, AK, MP5, shotgun, SVD, RPG, bow, bayonet rifle, pistols, knives, grenades, …) |
| `CRHUD` | the whole UI: menu, mission selection, settings, store, HUD, blood on screen, minimap, scope, pause |
| `CRFx` | particles (blood, dust, explosions), grenades, rockets, arrows, fire, smoke, props |
| `CRGameInstance`, `CRSaveGame` | progress saving, buying and equipping weapons |
| `CRTypes`, `CRUtil` | weapon and mission data, colored shapes from built-in meshes, sounds generated in code |

## Two campaigns
Weapoints, medals, XP and weapons are shared; missions unlock separately in each campaign.

**Campaign 1 – Black Order** (infantry): The Vanished Village, Base Infiltration, City Under Fire.

**Campaign 2 – Steel Fist** (vehicles). Story: after the mountain base falls, the Order deploys its mechanized division.
Armored personnel carriers, helicopters and jets roll toward the border region and the player's team must stop them
before they reach the town.
1. **Convoy** – desert. Ambush a convoy of 3 APCs. Ordinary bullets are not enough.
2. **Airfield** – the Order took the airfield. 2 helicopters, 2 APCs and a jet that bombs the spot where you stand ("JET STRIKE!").
3. **Steel Fist** – the command post: 4 APCs, 3 helicopters, 2 jets. When the last machine falls, the Order loses its strength on the border.

Vehicles: the **APC** drives toward you and fires a machine gun, the **helicopter** circles above you, the **jet** makes periodic strikes.
They resist bullets (armor); explosions (RPG, grenade, dynamite, napalm) hurt them fully. In campaign 2 the player also has an RPG
with 4 rockets (key 5). Infantry, APCs and helicopters count toward the mission goal; jets do not.

## Weapons (Store)
| Slot | Weapon | Behavior |
|---|---|---|
| Primary | HK416, AK-74M, MP5, Remington 870, SVD | rifles and submachine guns; the SVD has a scope |
| Primary | RPG-7 | rocket, 8 m blast, destroys armor |
| Primary | Bow | silent arrow flying in an arc |
| Primary | Bayonet rifle | stabs at close range (90 damage), otherwise shoots |
| Secondary | Glock 17, Colt Python | pistols |
| Secondary | Dual pistols | rapid fire, large spread |
| Secondary | Napalm | sets the ground on fire for 6 s, the fire damages over time |
| Secondary | Hardbass | bass wave stuns enemies in front of you (15 m cone) |
| Melee | Knife, Machete, Hammer | close combat (fast / very fast / slow and strong) |
| Melee | Crossbow | silent long-range bolt |
| Melee | Shield | blocks bullets from the front, bash stuns |
| Grenade | M67, Dynamite | 7 m blast / bigger 9 m blast with a longer fuse |
| Grenade | Smoke grenade | smoke blocks the enemy line of sight |
| Grenade | Flashbang | stuns everyone within 15 m and blinds you too |

## Limitations
- The look is made of colored boxes and cylinders without textures. Realistic models and materials (Fab/Quixel) can replace them:
  the shape-building functions are in `CRUtil.cpp` (`FCRShapes`), weapons in `CRGun.cpp`, the soldier in `CREnemy.cpp` (`BuildBody`).
- Texts are plain ASCII because the default engine font may lack special characters.
- The code could not be compiled in the authoring environment (no Unreal installed there); every change must be compiled locally.
