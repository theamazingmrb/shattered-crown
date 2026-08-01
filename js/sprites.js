// ============================================================
// sprites.js — Kenney asset integration (all CC0)
//   Tiny Dungeon: world terrain + character sprites
//   UI Pack RPG Expansion: panels + item slot icons
// ============================================================

const SPRITES = (() => {

  // ── Tiny Dungeon packed tilemap (16×16, 12 cols) ─────────
  const SRC_SIZE = 16;
  const COLS     = 12;
  const tdImg    = new Image();
  let   tdReady  = false;
  tdImg.onload   = () => { tdReady = true; };
  tdImg.src      = 'assets/Tilemap/tilemap_packed.png';

  // ── Kenney Roguelike/RPG pack (16×16 tiles, 1px margin → 17px step) ──
  const RL_STEP  = 17;
  const RL_SRC   = 16;
  const rlImg    = new Image();
  let   rlReady  = false;
  rlImg.onload   = () => { rlReady = true; };
  rlImg.src      = 'assets/roguelike-rpg/Spritesheet/roguelikeSheet_transparent.png';

  function rlBlit(ctx, col, row, dx, dy, dw, dh) {
    if (!rlReady) return false;
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rlImg, col * RL_STEP, row * RL_STEP, RL_SRC, RL_SRC, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = prev;
    return true;
  }

  // World tile type → roguelike sheet [col, row]
  // Only tiles whose procedural overlay is additive (transparent details on top)
  const RL_TERRAIN_MAP = {
    1: [5, 0],   // grass — bright green base
    2: [5, 0],   // forest — same green base; procedural trees draw on top
  };

  function blit(ctx, idx, dx, dy, dw, dh) {
    if (!tdReady) return false;
    const col  = idx % COLS;
    const row  = Math.floor(idx / COLS);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tdImg, col * SRC_SIZE, row * SRC_SIZE, SRC_SIZE, SRC_SIZE, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = prev;
    return true;
  }

  // World tile type → tilemap index (null = keep fully procedural)
  const TERRAIN_MAP = {
    4:  48,   // dirt path — sandy tan floor
    7:  24,   // ruins     — rough stone floor
    8:  36,   // vault     — grey stone floor
  };

  // World map NPC sprite pool (84 = player; 85–98 = NPCs)
  const NPC_POOL = [85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98];

  // Battle sprite type → tilemap index
  const BATTLE_MAP = {
    knight:  87,   // blue armoured warrior  (Kael)
    rogue:   93,   // hooded figure          (Lyra)
    mage:    84,   // purple mage            (Theron)
    healer:  88,   // brown healer           (Sera)
    bandit:  86,   // red enemy
    spirit: 121,   // white ghost / wraith
    boss:    91,   // dark red boss
    vareth:  97,   // dark purple (Vareth)
    enemy:   90,   // generic enemy
  };

  // ── UI Pack RPG Expansion images ─────────────────────────
  function loadImg(src) {
    const img  = new Image();
    let   rdy  = false;
    img.onload = () => { rdy = true; };
    img.src    = src;
    return { img, isReady: () => rdy };
  }

  const panelBrown = loadImg('assets/ui-rpg/PNG/panel_brown.png');
  const panelBeige = loadImg('assets/ui-rpg/PNG/panel_beige.png');
  const iconSword  = loadImg('assets/ui-rpg/PNG/cursorSword_gold.png');
  const iconArmor  = loadImg('assets/ui-rpg/PNG/cursorGauntlet_bronze.png');
  const iconRing   = loadImg('assets/ui-rpg/PNG/iconCircle_brown.png');

  // 9-slice panel: corners stay fixed, middle stretches to any size
  function draw9Slice(ctx, res, dx, dy, dw, dh, b) {
    if (!res.isReady()) return false;
    const i = res.img;
    const sw = i.naturalWidth, sh = i.naturalHeight;
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(i,    0,    0,  b,      b,      dx,       dy,       b,      b     );
    ctx.drawImage(i,    b,    0,  sw-2*b, b,      dx+b,     dy,       dw-2*b, b     );
    ctx.drawImage(i, sw-b,    0,  b,      b,      dx+dw-b,  dy,       b,      b     );
    ctx.drawImage(i,    0,    b,  b,      sh-2*b, dx,       dy+b,     b,      dh-2*b);
    ctx.drawImage(i,    b,    b,  sw-2*b, sh-2*b, dx+b,     dy+b,     dw-2*b, dh-2*b);
    ctx.drawImage(i, sw-b,    b,  b,      sh-2*b, dx+dw-b,  dy+b,     b,      dh-2*b);
    ctx.drawImage(i,    0, sh-b,  b,      b,      dx,       dy+dh-b,  b,      b     );
    ctx.drawImage(i,    b, sh-b,  sw-2*b, b,      dx+b,     dy+dh-b,  dw-2*b, b     );
    ctx.drawImage(i, sw-b, sh-b,  b,      b,      dx+dw-b,  dy+dh-b,  b,      b     );
    ctx.imageSmoothingEnabled = prev;
    return true;
  }

  // Battle terrain cell type → roguelike tile [col, row]
  const CELL_TERRAIN_MAP = {
    normal:   [5, 14],  // grey stone floor
    elevated: [8,  0],  // sandy stone (warm/light)
    water:    [1,  1],  // blue water
    forest:   [5,  0],  // green grass
    ruins:    [5, 14],  // stone floor (rune overlay distinguishes it)
  };

  // Battle background type → roguelike floor tile [col, row]
  const BG_FLOOR_MAP = {
    village:       [8,  0],   // sandy/stone floor
    town:          [5, 14],   // grey stone pavement
    selvara:       [5, 14],
    selvara_night: [5, 14],
    forest:        [5,  0],   // grass
    undercity:     [5, 14],   // dark stone
    castle_hall:   [5, 14],
    throne_room:   [5, 14],
    vault_cracking:[5, 14],
    vault_final:   [5, 14],
  };

  return {
    isReady: () => tdReady,

    // ── World map ───────────────────────────────────────────

    terrain(ctx, tileType, x, y, size) {
      // Roguelike/RPG pack base (grass, forest floor)
      const rl = RL_TERRAIN_MAP[tileType];
      if (rl) return rlBlit(ctx, rl[0], rl[1], x, y, size, size);
      // Tiny Dungeon fallback (path, ruins, vault)
      const idx = TERRAIN_MAP[tileType];
      return idx != null && blit(ctx, idx, x, y, size, size);
    },

    player(ctx, x, y, size) {
      return blit(ctx, 84, x, y, size, size);
    },

    npc(ctx, npcObj, x, y, size) {
      const hash = ((npcObj.tx * 7 + npcObj.ty * 13) >>> 0) % NPC_POOL.length;
      return blit(ctx, NPC_POOL[hash], x, y, size, size);
    },

    // ── Battle ──────────────────────────────────────────────

    // Draw battle character sprite (cx/cy = centre, r = radius)
    battle(ctx, spriteType, cx, cy, r) {
      const idx = BATTLE_MAP[spriteType] ?? BATTLE_MAP.enemy;
      return blit(ctx, idx, cx - r, cy - r, r * 2, r * 2);
    },

    // Draw terrain-appropriate roguelike tile for a single battle grid cell
    battleCell(ctx, terrainType, x, y, cellSize) {
      const tile = CELL_TERRAIN_MAP[terrainType] ?? CELL_TERRAIN_MAP.normal;
      return rlBlit(ctx, tile[0], tile[1], x, y, cellSize, cellSize);
    },

    // Draw roguelike floor tiles over the battle grid area (called after bg atmosphere)
    // bgType: background name string; gridX/Y: top-left pixel; cell: cell size px; cols/rows: grid dims
    battleFloor(ctx, bgType, gridX, gridY, cell, cols, rows, alpha) {
      const tile = BG_FLOOR_MAP[bgType] ?? BG_FLOOR_MAP.town;
      if (!rlReady) return false;
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = alpha != null ? alpha : 0.45;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          rlBlit(ctx, tile[0], tile[1], gridX + c * cell, gridY + r * cell, cell, cell);
        }
      }
      ctx.globalAlpha = prev;
      return true;
    },

    // ── UI ──────────────────────────────────────────────────

    // Draw a Kenney panel border with a dark centre for text readability.
    // type: 'brown' | 'beige'   border: corner size in px (default 20)
    drawPanel(ctx, type, x, y, w, h, border) {
      const b     = border ?? 20;
      const panel = type === 'beige' ? panelBeige : panelBrown;
      if (!draw9Slice(ctx, panel, x, y, w, h, b)) return false;
      // Dark overlay on centre so game text stays readable
      ctx.fillStyle = 'rgba(6,4,14,0.90)';
      ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
      return true;
    },

    // Draw an item-slot icon.  slot: 'weapon' | 'armor' | 'accessory'
    drawItemIcon(ctx, slot, x, y, size) {
      const map = { weapon: iconSword, armor: iconArmor, accessory: iconRing };
      const res = map[slot];
      if (!res || !res.isReady()) return false;
      const i    = res.img;
      const prev = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(i, 0, 0, i.naturalWidth, i.naturalHeight, x, y, size, size);
      ctx.imageSmoothingEnabled = prev;
      return true;
    },
  };
})();
