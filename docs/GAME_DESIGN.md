# Game design

## 1. Vision (from the project owner)

* A realistic-looking **3D first-person war game with a strong story**, planned campaign length **5+ hours** (currently about 20–30 minutes of missions exist).
* Setting: **2015**. A secret organization descended from Nazi structures, the **Black Order**, re-emerges. The player is a special-forces soldier.
* Reference look: realistic soldiers, weapons and landscape (the owner supplied reference screenshots). The map is bounded by **fences, not walls**; **no grass** (it was removed on request).
* One finished game first; extra modes come later. Target engine for a production version: **Unreal Engine 5.4**. The browser version is the fast prototype and reference implementation.
* Menu structure and Store follow the owner's hand-drawn sketches (`UI_SKETCHES.md`).

## 2. Story and campaigns

**Campaign 1 – Black Order (infantry).** A mountain village stops broadcasting. The player investigates, discovers an abandoned mine occupied by the Order, and fights through a border town.
Intro text in game: *"The year is 2015. A secret organization descended from Nazi structures emerges from its mountain bases. As a special-forces soldier you investigate a vanished village and uncover the army of the Black Order."*

**Campaign 2 – Steel Fist (armored warfare).** After the mountain base falls the Order deploys its mechanized division: armored personnel carriers, tanks, helicopters and jets roll toward the border region and the player's team must stop them before they reach the town. Desert maps. The player gets a helicopter and an RPG.

### Missions (generated from the data tables)

| # | Campaign | Mission | Infantry | Mines | Medkits | APC | Tanks | Helis | Jets | Reward (WP / medals / XP) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | The Vanished Village | 12 | 8 | 3 | 0 | 0 | 0 | 0 | 150 / 20 / 60 |
| 2 | 1 | Base Infiltration | 18 | 14 | 3 | 0 | 0 | 0 | 0 | 250 / 30 / 90 |
| 3 | 1 | City Under Fire | 24 | 20 | 4 | 0 | 0 | 0 | 0 | 400 / 40 / 120 |
| 4 | 2 | Convoy | 6 | 6 | 4 | 3 | 1 | 0 | 0 | 300 / 30 / 100 |
| 5 | 2 | Airfield | 8 | 6 | 4 | 2 | 1 | 2 | 1 | 450 / 40 / 140 |
| 6 | 2 | Steel Fist | 8 | 8 | 5 | 4 | 2 | 3 | 2 | 650 / 60 / 200 |

Mission order inside a campaign unlocks sequentially (`S.maxLevel` for campaign 1, `S.maxLevel2` for campaign 2). Multiplayer co-op ignores the lock: the host can pick any mission.
`L.hp` is the enemy hit points, `L.acc` the base enemy accuracy. Campaign 2 missions are in desert style (hangars, runway, few trees).

## 3. Game modes

| Mode | Where | Rules |
|---|---|---|
| Campaign mission | Play → Campaign | Kill every infantry, APC, tank and helicopter (jets do not count). Rewards on victory; 10 Weapoints on defeat. |
| Training | Play → Quick Games | Shooting range with 8 respawning infantry targets plus an APC and a tank target. Unlimited ammo, invincible; `Q` cycles through **all** weapons of the current slot (owned or not). Vehicle targets cannot be destroyed and show the damage that gets through armor. |
| Survival | Play → Quick Games | Endless waves. Wave n has `min(30, 6 + 3n)` infantry with +7% hit points per wave and rising accuracy. APCs from wave 3 (every 3rd wave), a helicopter every 5th wave from 5, a tank every 4th wave from 8. After each wave: partial ammo resupply, +30 HP, two medkits, 8 s break. Reward when you die or leave: 40 Weapoints per completed wave + 3 per kill, 1 medal per 3 waves, 10 XP per wave; the record (`S.bestWave`) is stored. |
| Team Match vs Bots | Play → Quick Games, Multiplayer | Team of players (plus AI allies up to 3) versus 6 bots that respawn after 4 s. First to 25 kills (or more kills after 6 minutes). Humans respawn after 6 s; a death scores for the bots. Reward: 200 Weapoints + 4 per kill + 10 medals on a win, 80 + 4 per kill on a loss. |
| Co-op campaign | Multiplayer | 1–3 humans on a campaign mission; humans replace AI allies. |
| Zombie Arena | not implemented | planned (see `drafts/v1.1`). |

## 4. Weapons

Four slots: **primary (1)**, **secondary (2)**, **melee (3)**, **grenade (4)**; in campaign 2 an extra **RPG on key 5** with 3 rockets unless the RPG is the primary.
Currencies: **Weapoints (WP)** buy most things; **medals** buy the SVD sniper rifle. Starting inventory: HK416, AK-74M, Glock 17, Combat knife, M67 grenade.
Enemy-carried weapons are randomly HK416/AK/MP5 models. Killing an enemy refunds half a magazine of reserve ammo for the primary weapon.

| Id | Name | Slot | Kind | Damage | Fire interval (s) | Magazine / reserve | Price | Notes |
|---|---|---|---|---|---|---|---|---|
| hk416 | HK416 (desert) | primary | hitscan | 24 | 0.085 | 30 / 150 | 0 WP | Assault rifle |
| ak | AK-74M | primary | hitscan | 27 | 0.1 | 30 / 150 | 0 WP | Assault rifle |
| mp5 | MP5 submachine gun | primary | hitscan | 19 | 0.07 | 30 / 180 | 80 WP | Fast submachine gun |
| shotgun | Remington 870 | primary | shotgun | 15 x8 | 0.85 | 6 / 36 | 120 WP | Shotgun |
| svd | SVD sniper rifle | primary | hitscan | 95 | 0.9 | 10 / 40 | 50 medals | Scope, powerful hit |
| rpg | RPG-7 | primary | rocket | 220 | 1.2 | 1 / 5 | 250 WP | Rocket, 8 m blast. Destroys armor |
| bow | Bow | primary | arrow | 85 | 0.9 | 1 / 14 | 150 WP | Silent, the arrow flies in an arc |
| bayonet | Bayonet rifle | primary | gun+bayonet | 25 | 0.1 | 30 / 150 | 90 WP | Stabs at close range (90), otherwise shoots |
| glock | Glock 17 | secondary | hitscan | 22 | 0.2 | 17 / 85 | 0 WP | Pistol |
| revolver | Colt Python | secondary | hitscan | 62 | 0.6 | 6 / 36 | 60 WP | Powerful revolver |
| dpistol | Dual pistols | secondary | hitscan | 17 | 0.1 | 34 / 170 | 70 WP | Rapid fire, large spread |
| napalm | Napalm | secondary | napalm | 14 | 1.5 | 2 / 6 | 140 WP | Sets the ground on fire for 6 s, damages over time |
| hardbass | Hardbass | secondary | stun | 8 | 0.8 | 12 / 48 | 110 WP | Bass wave stuns enemies in front of you |
| knife | Combat knife | melee | melee | 70 | 0.45 | - | 0 WP | Fast and silent |
| machete | Machete | melee | melee | 55 | 0.28 | - | 40 WP | Very fast |
| hammer | Hammer | melee | melee | 115 | 0.95 | - | 60 WP | Slow, crushes anyone |
| crossbow | Crossbow | melee | arrow | 75 | 1.1 | 1 / 12 | 130 WP | Silent long-range bolt |
| shield | Riot shield | melee | shield | 25 | 0.8 | - | 100 WP | Blocks bullets from the front, bash stuns |
| m67 | M67 grenade | grenade | frag | 130 | - | - | 0 WP | 7 m blast |
| dynamite | Dynamite | grenade | dyn | 190 | - | - | 50 WP | Bigger 9 m blast, longer fuse |
| smoke | Smoke grenade | grenade | smoke | - | - | - | 40 WP | Smoke blocks the enemy line of sight |
| flash | Flashbang | grenade | flash | - | - | - | 50 WP | Stuns everyone within 15 m, blinds you too |

How the kinds behave:

* `hitscan`: instant ray, `spread` is a random cone (halved ×0.35 when aiming down sights); head hits ×2.5.
* `shotgun`: 8 pellets; `rocket`: projectile, 8 m blast, damage falls off with distance, vehicles take 1.6× explosion damage.
* `arrow`: gravity arc, silent, no alert; `napalm`: canister that leaves a fire zone for 6 s; `stun` (Hardbass): 15 m cone of 28 degrees, stuns for 2.5 s.
* `melee`: ~2.4 m in front; `shield`: while equipped, damage from the front is multiplied by 0.15, the bash stuns.
* Grenades are thrown with an arc and explode after a fuse (M67 2 s, dynamite 3.5 s, smoke 1.2 s, flashbang 1.5 s). Smoke blocks line of sight for 12 s.

## 5. Vehicles and the player helicopter

| Vehicle | Behavior | Armor (bullet multiplier) |
|---|---|---|
| APC (8x8, BTR-like) | drives toward the player, stops at 30 m, fires 8-round machine-gun bursts | 0.06 |
| Tank (T-14 Armata look) | slower (3 m/s), stops at 40 m, fires a 55-damage explosive shell every 5–7.5 s | 0.03 |
| Attack helicopter | circles 40 m around the target at ~28 m altitude, fires 12-round bursts | 0.22 |
| Jet | invisible between runs; every 14–22 s makes a strafing run and bombs the spot where the target stood | 0.02 |

Vehicle hit points are `560+60k` (APC), `900+90k` (tank), `380+40k` (helicopter), 300 (jet), where `k` is the mission index inside the campaign.

**Player helicopter (Mi-24 look, campaign 2, solo):** boards with `E`; mouse sets heading and pitch (nose down = forward flight, speed up to 26 m/s),
`W/S` climb/descend, `A/D` strafe, chase camera 17 m behind. Weapons: `1` machine gun (16 damage, unlimited), `2` rocket pods (4 rockets per salvo, 40 total, 90 damage, 4.5 m blast),
`3` anti-tank missiles (8, 260 damage, 8 m blast). 500 hit points; when destroyed the player bails out and takes 35 damage. Exit requires altitude below 4 m.

**AI allies:** two soldiers (Alpha, Bravo, 120 HP) follow the player, engage visible enemies within 45 m (vehicles within 60 m) with 60% accuracy.

## 6. Progression and economy

* XP: mission XP rewards add up; **level = 1 + floor(XP / 100)** (display only today; perks are planned).
* Mission rewards are listed above; failing a mission gives 10 Weapoints.
* Store prices are in the weapon table. Weapons are owned permanently; one item per slot is equipped.

## 7. Interface structure

Main menu: **Play**, **Multiplayer**, **Store**, **Settings**, **Quit**, plus a player box (name, level, kills, missions, deaths).

* **Play**: tabs *Campaign* (choose campaign, then mission) and *Quick Games* (Training, Survival, Team Match, Multiplayer shortcut, Zombie Arena placeholder). Loadout strip on top.
* **Multiplayer**: nickname, *Create game* / *Join with code*; lobby with roster, host picks mode and mission.
* **Store**: tabs Primary / Secondary / Melee / Grenade; buy, then equip.
* **Settings**: Audio (effects volume), Controls (mouse sensitivity and key table), Game (FOV, quality, delete progress).
* **HUD**: health bottom-left, ammo bottom-right, objective top-left, minimap top-right (enemies within 50 m, vehicles within 60 m), crosshair, scope overlay for the SVD, blood splats, low-health vignette.

## 8. Design backlog

See `ROADMAP.md`. The brainstormed extras that are written but not integrated (perks, weapon attachments, difficulty levels, objectives, bosses, Zombie Arena,
killstreaks, weather/night, jeep, ally commands, explosive barrels, collectible documents, achievements) are described in `drafts/v1.1/INTEGRATION.md`.
