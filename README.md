# Shattered Crown: Echoes of Valdris

A browser-based RPG built with vanilla JavaScript and HTML5 Canvas. No dependencies, no build step — open `index.html` and play.

## Story

Ten years ago, the Starlight Crown shattered. Four shards scattered across the kingdom. A god stirs in its weakened prison. You are Kael — and the blood in your veins knows more than you do.

## Features

- Turn-based battles with a party of four characters
- Animated prologue cinematic with narration
- World exploration across multiple acts
- Dialogue system with branching narrative
- Procedurally drawn scenes (pure Canvas 2D — no sprites or image assets)
- Web Audio API soundtrack and sound effects

## How to Play

1. Clone or download the repo
2. Open `index.html` in a browser
3. Use **WASD** or **Arrow Keys** to move
4. **Enter** or **Space** to interact / advance dialogue
5. **Tab** or **I** to open the menu

## Project Structure

```
shattered-crown/
├── index.html
├── style.css
└── js/
    ├── data.js     # Story text, enemy stats, item definitions
    ├── input.js    # Keyboard input handler
    ├── audio.js    # Web Audio API music and SFX
    ├── ui.js       # All rendering — HUD, prologue, menus, battle UI
    ├── world.js    # World map, movement, NPC logic
    ├── battle.js   # Turn-based combat engine
    └── main.js     # Game loop, state machine
```
