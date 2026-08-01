# AGENTS.md — Shattered Crown

Guidance for AI coding agents (Claude Code, Cursor, Windsurf, Codex, etc.) working in this repo. This is the single source of truth; `CLAUDE.md` points here.

## What this is

A browser tactical-RPG built with **vanilla JavaScript + HTML5 Canvas**. No dependencies, no build step, no framework. You open `index.html` and it runs.

- **Do not** add a bundler, package.json, TypeScript, npm deps, or a framework. The "no build step" constraint is a feature, not an oversight.
- All rendering is procedural Canvas 2D. Sprites/audio come from CC0 Kenney assets in `assets/`.

## Run & test

- **Serve it** (don't use `file://` — the browser blocks it). Any static server works, but Chrome caches JS aggressively:
  ```
  python3 -m http.server 8991        # simple, but you WILL see stale JS after edits
  ```
  Prefer a **no-cache** server during development so reloads pick up edits. A ready one lives in the scratchpad; equivalent inline:
  ```
  python3 -c "import http.server,socketserver as s; \
    H=http.server.SimpleHTTPRequestHandler; \
    _e=H.end_headers; H.end_headers=lambda self:(self.send_header('Cache-Control','no-store'),_e(self)); \
    s.TCPServer(('',8991),H).serve_forever()"
  ```
- Then open `http://localhost:8991/index.html`.
- **No automated tests exist.** "Testing" means driving the game in a browser and watching behavior/console. When verifying combat math, note that `DATA` functions (`counterMult`, `backAttackMult`, `isFlanked`, `adjacentAllies`, `getBanter`) are exported and callable from the console.
- **Cache gotcha:** Chrome may keep running old JS even after reload / `location.reload(true)`. If a change doesn't take effect, use the no-cache server **and open a fresh tab**.

## Architecture

Scripts load in this exact order (see `index.html`) — later files depend on earlier globals:

```
data.js → input.js → audio.js → ui.js → sprites.js → world.js → battle.js → main.js
```

Each module is an IIFE exposing one global (`DATA`, `INPUT`, `AUDIO`, `UI`, `SPRITES`, `WORLD`, `BATTLE`, `GAME`). Canvas is 900×620. States: `PROLOGUE | TITLE | WORLD | DIALOGUE | BATTLE | MENU | GAMEOVER | ENDING`.

| File | Responsibility |
|---|---|
| `js/data.js` | All static data: world map, NPCs, equipment, skills, enemies, battles, story text, banter. Also pure combat helpers (Counter Web, positioning). |
| `js/world.js` | Overworld map, movement, NPC interaction, tile rendering, world color-grade. |
| `js/battle.js` | Tactical grid combat (12×7, CT-based turns). The big one. |
| `js/ui.js` | Dialogue, portraits, menus, HUD, title, particles, floating text. |
| `js/main.js` | Game loop, state machine, save system, act orchestration. |
| `js/audio.js` | Web Audio music + SFX (real Kenney OGG with procedural fallback). |
| `js/sprites.js` | Kenney asset integration (returns false → procedural fallback). |

## Combat systems (built out; keep them coherent)

The battle model is an FFT/Fire-Emblem/Octopath-inspired fusion — **inspired by, not copied** (no borrowed names/numbers/art). Core loop: probe weakness → break guard → bank resource → unleash → charge ultimate. All hooks converge in `applyHit()` (battle.js).

- **Counter Web** — weapon-type triangle + elemental weak/resist (`DATA.counterMult`). Skills carry `weaponType`/`element`; enemies carry `guardType`/`weak`/`resist`.
- **Stagger** — weakness hits deplete `guard` pips; at 0 the enemy breaks (skips a turn, takes ×1.5). `guardMax` per enemy; `triggerStagger()`.
- **Momentum** — bankable boost (`momentum`, +1/turn, cap 5); spend via the panel −/+ control to amplify damage/heals and break power.
- **Positioning** — facing/back-attacks (`DATA.backAttackMult`), flanking (`DATA.isFlanked`), support bonds (`DATA.adjacentAllies` → +DEF/evasion).
- **Latent Powers** — per-character ultimate; `latent` gauge charges from combat, glowing button fires `useLatent()`.

See `UPGRADE_PLAN.md` for the full phased plan and status.

## Conventions & gotchas

- **Match the surrounding style.** Terse comments, IIFE modules, no semicolyphobia — mirror the file you're in.
- Player battle sprites and the hand-coded portraits (Kael/Lyra/Theron/Sera) are bespoke — **do not** replace them with Kenney sprites. Enemy sprites use Kenney.
- `main.js` historically had duplicate hoisted functions where the *second* declaration wins (a trap). If you see two `function foo`, the later one is live.
- Battle-only state (Momentum, Stagger, Latent) is **not** saved; it resets each battle. The save format is versioned — default-fill new fields so old saves still load.
- Banter (`DATA.getBanter(trigger, present)`) must be filtered by who's actually in the fight. Battle 1 is intentionally Kael-only.
- Keep `README.md` (human-facing) and this file (agent-facing) in sync on the basics.

## Coding standards & semantics

- **Match the file you're in.** Style is not centralized — mirror local naming, comment density, spacing, and idiom rather than imposing a global style.
- **Naming:** `camelCase` functions/vars; `UPPER_SNAKE` module constants (`GRID_COLS`, `MOMENTUM_MAX`); module globals are the single capitalized IIFE export (`DATA`, `BATTLE`). Data keys are lowerCamel (`hp_potion` snake is the existing exception for consumable/item keys — follow the neighbors).
- **Semantics / where things go:**
  - New *content* (a skill, enemy, item, battle, story beat, banter line) → `data.js` only. No behavior in data.
  - New *combat behavior* → `battle.js`; if it modifies damage, route it through `applyHit()` so it composes with weakness/stagger/positioning multipliers rather than duplicating math.
  - Pure, testable helpers (geometry, multipliers) → `data.js` and export them, so they're callable from the console for verification.
  - Rendering-only passes → additive, drawn in the existing `draw()` order; never change game state inside a draw function.
- **State ownership:** persistent state lives in `main.js` `GAME` and the save format; battle-scoped state lives in `battle.js` and must reset on `startBattle`. Don't leak battle-only fields into the save.
- **No new dependencies, no build step, no framework.** If a task seems to need one, stop and flag it instead.
- **Verify before claiming done:** serve the game (no-cache), drive the actual affected flow, watch the console. For combat math, exercise the exported `DATA` helper from the console. Report failures with the real output; don't hedge a verified pass.
- **Scope discipline:** make the change asked for. Don't opportunistically refactor unrelated code, rename things, or "clean up" in the same change — propose those separately.

## Git & commits

- **Never commit or push unless explicitly asked.** When asked, if on `main`, create a branch first.
- **Small, logical commits.** One coherent change per commit; don't bundle unrelated work.
- **Message format:** imperative subject ≤72 chars, then a body explaining *why* when non-obvious. Reference the phase/system when relevant (e.g. `Phase 1c: add Stagger (guard-break) to combat`).
- **Do not commit:** `plan.md`, `.claude/` (both gitignored), secrets, or large binaries beyond the existing `assets/`.
- `AGENTS.md` / `CLAUDE.md` / `UPGRADE_PLAN.md` / `README.md` are committed and kept current with the code they describe.
- Attribution/co-author trailers: follow the host tool's convention; don't invent one.

## Files not to touch casually

- `assets/` — CC0 third-party art/audio; don't edit.
- `plan.md` — legacy planning doc, gitignored. `UPGRADE_PLAN.md` is the current roadmap.
- Bespoke hand-coded art: player battle sprites + the four portraits. Enemy sprites are Kenney and may change.
