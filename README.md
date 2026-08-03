# Shattered Crown: Echoes of Valdris

A browser-based tactical RPG built with vanilla JavaScript and HTML5 Canvas. No dependencies, no build step — open `index.html` and play.

## Story

Ten years ago, the Starlight Crown shattered. Four shards scattered across the kingdom. A god stirs in its weakened prison. You are Kael — and the blood in your veins knows more than you do.

## Features

- **Tactical grid combat** — a 12×7 grid with CT-based turn order and a party of four
- **Combat depth systems** (FFT/Fire-Emblem/Octopath-inspired, all original):
  - **Counter Web** — weapon-type triangle + elemental weakness/resistance
  - **Stagger** — hit a weakness to break an enemy's guard and skip its turn
  - **Momentum** — bank a resource, spend it to amplify actions
  - **Positioning** — back-attacks, flanking, and support bonds between adjacent allies
  - **Latent Powers** — a per-character ultimate that charges through combat
- **Economy** — earn gold from battles, buy and sell at town shops
- Three difficulty modes, discoverable enemy weaknesses (bestiary), and party banter
- World exploration across a 12-act story with branching choices
- Animated prologue cinematic, dialogue system, and a Web Audio soundtrack
- Rendering blends rich procedural Canvas art with CC0 Kenney sprite/audio assets

## How to Play

> **Serve it — don't open the file directly.** Browsers block `file://` for the
> assets. Any static server works, e.g. `python3 -m http.server 8991`, then visit
> `http://localhost:8991/index.html`.

1. Clone or download the repo
2. Serve the folder and open `index.html` (see note above)
3. Use **WASD** or **Arrow Keys** to move
4. **Enter** or **Space** to interact / advance dialogue (talk to a town shopkeeper to trade)
5. **Tab** or **I** to open the menu
6. In battle: click a unit's action, then a target; ↑↓ and Enter drive the shop

## Project Structure

```
shattered-crown/
├── index.html
├── style.css
└── js/
    ├── data.js     # Story, enemies, items, prices, combat helpers (weakness/positioning)
    ├── input.js    # Keyboard + mouse input handler
    ├── audio.js    # Web Audio API music and SFX (Kenney OGG + procedural fallback)
    ├── ui.js       # All rendering — HUD, prologue, menus, shop, battle UI, particles
    ├── sprites.js  # Kenney asset integration (falls back to procedural art)
    ├── world.js    # World map, movement, NPC + shop interaction
    ├── battle.js   # Tactical grid combat engine
    └── main.js     # Game loop, state machine, save system, economy
```

Agent-facing guidance (architecture, conventions, run/test) lives in [AGENTS.md](./AGENTS.md); the phased roadmap is in [UPGRADE_PLAN.md](./UPGRADE_PLAN.md).
