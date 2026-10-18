# CLAUDE.md

Read **AGENTS.md** first; it is the source of truth for rules, commands and the repository map.

Claude Code specifics:

* Useful allow-list for commands: `npm install`, `npm run build`, `npm test`, `node tests/*.test.js`, `python3 tools/build.py`.
* Save tokens (see AGENTS.md section 9): targeted `grep`/line ranges instead of whole files, run single test files while iterating, full `npm test` before each commit. Do not edit `web/dist/` manually.
* The repository language is English. If you receive instructions in Czech, answer in the user's language but write code, comments, UI text and docs in English.
* When unsure about game balance or design intent, check `docs/GAME_DESIGN.md` and `docs/DECISIONS.md` before changing numbers.
* Keep `docs/DEVLOG.md` updated (AGENTS.md section 10): rewrite its "Current state" section and add a dated entry at the end of every session and before stopping for any reason, so the next agent or instance is oriented immediately.
