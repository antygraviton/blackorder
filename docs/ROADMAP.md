# Roadmap and known issues

Priorities are the owner's wishes in order of the latest conversation. "Draft" means code exists in `drafts/v1.1` but is not integrated.

## P0 – next engineering steps
1. **Integrate the v1.1 drafts** into `web/src/js` as proper modules (checklist in `drafts/v1.1/INTEGRATION.md`), with tests for each feature and multiplayer replication for objectives, bosses and barrels.
2. **Playtest with real people** online and fix whatever the mock-room tests could not show (latency feel, view model/vehicle look, performance on weaker laptops).
3. **Resolve the Unreal editor problem** (see `engines/unreal/README.md`).

## P1 – features requested or brainstormed
| Feature | State |
|---|---|
| Mission objectives other than "kill everything": rescue, defend zone, silent infiltration/hack, destroy depots | Done (v1.1) |
| Briefings and radio messages | Done (v1.1) |
| Boss missions (soldier commander, Armata tank) | Done (v1.1) |
| Zombie Arena (night, undead waves, tyrant boss every 5th wave) | Draft |
| Killstreaks (UAV, ammo drop, air strike) | Draft |
| Perks (level-gated) and weapon attachments (suppressor, extended magazine, laser) | Done (v1.1) |
| Difficulty levels (easy … realistic) | Done (v1.1) |
| Weather and day/night (fog, rain, storm, night with flashlight) | Done (v1.1) |
| Player jeep, ally commands (follow / hold / attack), explosive barrels | Barrels done (v1.1); jeep and ally commands are drafts |
| Collectible lore documents, achievements, records | Draft |
| Base defense with buildable defenses | Idea |
| Own tank for the player | Idea |
| Destructible buildings (only barrels are destructible in the draft) | Idea |
| Real audio (shots, ambience, music) | Idea; needs sound files, breaks the "no assets" rule unless synthesized |
| Barks (speech bubbles) and cinematic scenes | Done (v1.2): intro, boss kill-cam, bullet time; more scenes and voiced audio are open |
| Story scenes / voiced radio | Idea |
| Longer campaign (the owner wants 5+ hours; today about 20–30 minutes) | Open |
| Multiplayer: 1v1 … 5v5 against humans (the sketches show up to 5v5) | Open; current limit is 3 humans |
| Training, Survival, Zombie in multiplayer | Open (the player helicopter works in co-op since v1.1) |
| Production version in Unreal with realistic models (Fab/Quixel, Mixamo animations) | Open |

## Known issues
* **Unreal:** the editor says the `CernyRad` module is missing or built with a different engine version; manual builds succeed. Needs the editor log.
* **Browser:** visual quality and performance never inspected by the AI; proportions of vehicles and view models are best guesses from reference photos.
* **Multiplayer:** only tested with a mock room; host tab must stay in the foreground; positions and shots are trusted; public links cannot connect.
* **Technical debt:** one global scope across modules, long functions, no localization layer (see `ARCHITECTURE.md` section 9).
* **Draft code** was never run in the real game; its tests do not exist yet.

## Suggested refactors (when convenient)
* Bundle with esbuild to get real ES modules while still emitting one HTML file.
* Split `100-shooting.js` (480 lines) into weapons, projectiles, vehicles and damage.
* Move data tables to JSON-like files to make balancing easier.
* Add a lightweight i18n table so strings can be translated without code changes.
