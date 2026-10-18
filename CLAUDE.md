# CLAUDE.md

Read **AGENTS.md** first; it is the source of truth for rules, commands and the repository map.

Claude Code specifics:

* Useful allow-list for commands: `npm install`, `npm run build`, `npm test`, `node tests/*.test.js`, `python3 tools/build.py`.
* Work in small steps and run `npm test` after each. Do not edit `web/dist/` manually.
* The repository language is English. If you receive instructions in Czech, answer in the user's language but write code, comments, UI text and docs in English.
* When unsure about game balance or design intent, check `docs/GAME_DESIGN.md` and `docs/DECISIONS.md` before changing numbers.
* Keep `docs/DEVLOG.md` updated: add a dated entry for every working session (what changed, what was verified, what is open).
