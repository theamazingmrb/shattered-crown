// ============================================================
// world.js  —  Overworld map rendering, player movement,
//              NPC interaction, chest collection, location names
// ============================================================

const WORLD = (() => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  const TILE   = 32;
  const MAP_W  = 35;
  const MAP_H  = 22;
  const VIEW_W = 900;
  const VIEW_H = 620;

  // Player state
  const player = {
    tx: 4, ty: 7,         // tile position
    px: 4 * TILE,         // pixel position (smooth)
    py: 7 * TILE,
    moving: false,
    moveTimer: 0,
    fromPx: 0, fromPy: 0,
    toPx:   0, toPy:   0,
    MOVE_TIME: 110,
    facing: 'down',
    walkFrame: 0,
    walkTimer: 0,
  };

  let camX = 0, camY = 0;
  let moveCooldown = 0;
  let collectedChests = {};  // chestId -> bool
  let worldTime = 0;         // ms elapsed, for animations

  // Location name display
  let locNameText  = '';
  let locNameAlpha = 0;
  let locNameTimer = 0;
  let lastLocName  = '';

  // Tile hover info system
  let hoverTx = -1, hoverTy = -1;
  let hoverTimer = 0;
  let hoverInfo = null;
  const HOVER_DELAY = 1000; // 1 second

  function init() {
    console.log('[WORLD] Initializing world...');
    player.tx = 4; player.ty = 7;
    player.px = player.tx * TILE;
    player.py = player.ty * TILE;
    player.moving = false;
    collectedChests = {};
    updateCamera();
    console.log('[WORLD] World initialized. Player at:', player.tx, player.ty, 'Camera:', camX, camY);
  }

  function updateCamera() {
    const targetX = player.px + TILE/2 - VIEW_W/2;
    const targetY = player.py + TILE/2 - VIEW_H/2;
    camX = Math.max(0, Math.min(targetX, MAP_W*TILE - VIEW_W));
    camY = Math.max(0, Math.min(targetY, MAP_H*TILE - VIEW_H));
  }

  function getTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 0;
    return DATA.WORLD_MAP[ty][tx];
  }

  function isWalkable(tx, ty) {
    // Can't walk if NPC occupies tile
    for (const npc of DATA.NPCS) {
      if (npc.tx === tx && npc.ty === ty) return false;
    }
    const t = getTile(tx, ty);
    return DATA.TILE_WALKABLE[t] === true;
  }

  function update(dt, game) {
    worldTime += dt;

    if (UI.isDialogueActive() || UI.isMenuOpen()) return;
    if (UI.isFading()) return;

    // Update tile hover info
    updateTileHoverInfo(game);

    moveCooldown -= dt;

    // Menu open
    if (INPUT.wasPressed('Tab') || INPUT.wasPressed('i') || INPUT.wasPressed('I')) {
      if (game && game.party) {
        UI.openMenu(game.party);
      }
      return;
    }

    // Smooth movement
    if (player.moving) {
      player.moveTimer += dt;
      const t = Math.min(1, player.moveTimer / player.MOVE_TIME);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      player.px = player.fromPx + (player.toPx - player.fromPx) * ease;
      player.py = player.fromPy + (player.toPy - player.fromPy) * ease;
      if (t >= 1) {
        player.moving    = false;
        player.px        = player.toPx;
        player.py        = player.toPy;
        moveCooldown     = 75;
        player.walkFrame = (player.walkFrame + 1) % 4;
        // Check triggers
        if (game && game.checkWorldTrigger) game.checkWorldTrigger();
        // Check chests
        checkChestCollect(game);
      }
    } else if (moveCooldown <= 0) {
      let dx = 0, dy = 0;
      if      (INPUT.isDown('ArrowUp')    || INPUT.isDown('w') || INPUT.isDown('W')) { dy=-1; player.facing='up';    }
      else if (INPUT.isDown('ArrowDown')  || INPUT.isDown('s') || INPUT.isDown('S')) { dy= 1; player.facing='down';  }
      else if (INPUT.isDown('ArrowLeft')  || INPUT.isDown('a') || INPUT.isDown('A')) { dx=-1; player.facing='left';  }
      else if (INPUT.isDown('ArrowRight') || INPUT.isDown('d') || INPUT.isDown('D')) { dx= 1; player.facing='right'; }

      if (dx !== 0 || dy !== 0) {
        const nx = player.tx + dx, ny = player.ty + dy;
        if (isWalkable(nx, ny)) {
          player.moving    = true;
          player.moveTimer = 0;
          player.fromPx    = player.px;
          player.fromPy    = player.py;
          player.toPx      = nx * TILE;
          player.toPy      = ny * TILE;
          player.tx = nx; player.ty = ny;
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.step();
        }
      }
    }

    updateCamera();

    // Location name update
    const locName = getLocationName(player.tx, player.ty, game && game.actProgress || 0);
    if (locName !== lastLocName) {
      lastLocName  = locName;
      locNameText  = locName;
      locNameAlpha = 0;
      locNameTimer = 3000;
    }
    if (locNameTimer > 0) {
      locNameTimer -= dt;
      locNameAlpha = locNameTimer < 500 ? locNameTimer/500 : locNameTimer > 2700 ? (3000-locNameTimer)/300 : 1;
    }

    // NPC interaction
    if (INPUT.wasPressed('Enter') || INPUT.wasPressed(' ')) {
      checkNPCInteraction(game);
    }
  }

  function checkChestCollect(game) {
    if (!game) return;
    for (const chest of DATA.CHESTS) {
      if (collectedChests[chest.id]) continue;
      if ((game.actProgress || 0) < chest.actMin) continue;
      if (chest.tx === player.tx && chest.ty === player.ty) {
        collectedChests[chest.id] = true;
        if (game.collectItem) game.collectItem(chest.item, chest.label);
        if (typeof AUDIO !== 'undefined') AUDIO.sfx.chestOpen();
      }
    }
  }

  function checkNPCInteraction(game) {
    const act = game ? (game.actProgress || 0) : 0;
    for (const npc of DATA.NPCS) {
      if (npc.actMin !== undefined && act < npc.actMin) continue;
      if (npc.actMax !== undefined && act > npc.actMax) continue;
      const dist = Math.abs(npc.tx - player.tx) + Math.abs(npc.ty - player.ty);
      if (dist <= 1) {
        const lines = (npc.lines || [npc.text]).map(t => ({
          name: npc.name, color: npc.color, portrait: npc.portrait || 'none', text: t
        }));
        UI.startDialogue(lines, null);
        return;
      }
    }
  }

  function draw(actProgress) {
    const act = actProgress || 0;

    ctx.save();
    ctx.translate(-Math.floor(camX), -Math.floor(camY));
    
    // Debug: log first draw
    if (!draw._logged) {
      console.log('[WORLD] First draw call. Act:', act, 'Player:', player.tx, player.ty, 'Cam:', camX, camY);
      draw._logged = true;
    }

    // Visible tile range
    const startTX = Math.max(0, Math.floor(camX / TILE) - 1);
    const startTY = Math.max(0, Math.floor(camY / TILE) - 1);
    const endTX   = Math.min(MAP_W, startTX + Math.ceil(VIEW_W/TILE) + 3);
    const endTY   = Math.min(MAP_H, startTY + Math.ceil(VIEW_H/TILE) + 3);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        drawTile(tx, ty);
      }
    }

    // Ambient tile-based particle pass (motes, fireflies, dust)
    drawWorldAmbient(startTX, startTY, endTX, endTY);

    // Draw chests
    for (const chest of DATA.CHESTS) {
      if (collectedChests[chest.id]) continue;
      if (act < chest.actMin) continue;
      if (chest.tx < startTX || chest.tx > endTX || chest.ty < startTY || chest.ty > endTY) continue;
      drawChest(chest);
    }

    // Draw NPCs
    for (const npc of DATA.NPCS) {
      if (npc.actMin !== undefined && act < npc.actMin) continue;
      if (npc.actMax !== undefined && act > npc.actMax) continue;
      if (npc.tx < startTX || npc.tx > endTX || npc.ty < startTY || npc.ty > endTY) continue;
      drawNPC(npc);
    }

    // Draw player
    drawPlayer();

    ctx.restore();

    // Location name overlay
    if (locNameTimer > 0 && locNameAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${locNameAlpha * 0.75})`;
      const tw = ctx.measureText(locNameText).width + 30;
      UI.roundRect(ctx, VIEW_W/2 - tw/2, VIEW_H/2 + 50, tw, 32, 4); ctx.fill();
      ctx.fillStyle = `rgba(200,180,120,${locNameAlpha})`;
      ctx.font = 'italic 15px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(locNameText, VIEW_W/2, VIEW_H/2+66);
      ctx.textAlign = 'left';
    }

    // Tile hover info overlay
    const hoverInfo = getHoverInfo();
    if (hoverInfo) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      const padding = 12;
      const lineHeight = 18;
      const lines = [
        `${hoverInfo.name} ${hoverInfo.position}`,
        hoverInfo.walkable ? 'Walkable' : 'Blocked',
        ...hoverInfo.details
      ];
      const maxWidth = Math.max(150, Math.max(...lines.map(line => ctx.measureText(line).width)));
      const boxHeight = lines.length * lineHeight + padding * 2;
      const boxWidth = maxWidth + padding * 2;
      
      // Position box near mouse but keep it on screen
      const mousePos = INPUT.getMousePos();
      let boxX = mousePos.x + 20;
      let boxY = mousePos.y - boxHeight - 20;
      
      // Keep box on screen
      if (boxX + boxWidth > VIEW_W) boxX = mousePos.x - boxWidth - 20;
      if (boxY < 0) boxY = mousePos.y + 20;
      
      UI.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 4); ctx.fill();
      
      ctx.fillStyle = '#ffdd88';
      ctx.font = 'bold 12px Georgia';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      lines.forEach((line, i) => {
        const y = boxY + padding + i * lineHeight;
        if (i === 0) {
          ctx.fillStyle = '#ffdd88';
          ctx.font = 'bold 12px Georgia';
        } else if (i === 1) {
          ctx.fillStyle = hoverInfo.walkable ? '#88ff88' : '#ff8888';
          ctx.font = 'italic 11px Georgia';
        } else {
          ctx.fillStyle = '#cccccc';
          ctx.font = '11px Georgia';
        }
        ctx.fillText(line, boxX + padding, y);
      });
    }
  }

  function drawTile(tx, ty) {
    const x = tx * TILE, y = ty * TILE;
    const tile = getTile(tx, ty);
    const color = DATA.TILE_COLORS[tile] || '#ff00ff';

    ctx.fillStyle = color;
    ctx.fillRect(x, y, TILE, TILE);

    const t = worldTime * 0.001;
    // Deterministic pseudo-random per tile for consistent variation
    const seed = (tx * 1999 + ty * 3571) & 0xffff;
    const srand = (seed % 100) / 100;

    switch (tile) {
      case 1: { // grass — varied shading with wind-swayed blades
        // Base shade variation
        if ((tx*3+ty*7)%5 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x,y,TILE,TILE);
        }
        if ((tx+ty)%3===0) {
          ctx.fillStyle = 'rgba(0,80,0,0.12)';
          ctx.fillRect(x+4, y+4, 6, 3); ctx.fillRect(x+18, y+20, 5, 3);
        }
        // Subtle flowers on some tiles
        if ((tx*7+ty*13)%11 === 0) {
          const flowerColor = (tx*ty)%3===0?'rgba(255,220,80,0.55)':((tx+ty*2)%3===0?'rgba(200,80,200,0.45)':'rgba(200,255,120,0.45)');
          ctx.fillStyle = flowerColor;
          ctx.beginPath(); ctx.arc(x+srand*14+4, y+srand*14+4, 2.5, 0, Math.PI*2); ctx.fill();
        }
        // Wind effect: swaying grass highlight
        const windOffset = Math.sin(t*0.8 + tx*0.5 + ty*0.3) * 1.5;
        if ((tx+ty*3)%4===0) {
          ctx.strokeStyle = 'rgba(60,120,40,0.15)'; ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(x+10, y+28); ctx.lineTo(x+10+windOffset, y+20);
          ctx.moveTo(x+22, y+28); ctx.lineTo(x+22+windOffset, y+18);
          ctx.stroke();
        }
        break;
      }
      case 2: { // forest — layered canopy with depth
        // Dark base layer
        ctx.fillStyle = '#0e2e0a';
        ctx.beginPath(); ctx.arc(x+16, y+18, 14, 0, Math.PI*2); ctx.fill();
        // Mid canopy
        ctx.fillStyle = '#1e4a18';
        ctx.beginPath(); ctx.arc(x+16, y+12, 11, 0, Math.PI*2); ctx.fill();
        // Bright tip
        ctx.fillStyle = '#27641f';
        ctx.beginPath(); ctx.arc(x+16, y+7, 8, 0, Math.PI*2); ctx.fill();
        // Highlight sparkle (occasional)
        if ((tx*5+ty*11)%13 === 0) {
          const leafAlpha = 0.15 + 0.12*Math.sin(t*1.2 + srand * 6);
          ctx.fillStyle = `rgba(80,180,40,${leafAlpha})`;
          ctx.beginPath(); ctx.arc(x+12, y+8, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x+20, y+10, 2, 0, Math.PI*2); ctx.fill();
        }
        // Roots / ground level
        ctx.fillStyle = 'rgba(20,10,5,0.3)';
        ctx.fillRect(x, y+24, TILE, 8);
        // Magic glow
        ctx.fillStyle = `rgba(0,180,100,${0.03+0.02*Math.sin(t*0.4+tx+ty)})`;
        ctx.fillRect(x,y,TILE,TILE);
        break;
      }
      case 3: { // mountain — rocky with snow-capped peak
        // Rocky base
        ctx.fillStyle = '#5a4a40';
        ctx.fillRect(x, y+20, TILE, TILE-20);
        // Main peak
        ctx.fillStyle = '#7a6a5a';
        ctx.beginPath(); ctx.moveTo(x+16,y+3); ctx.lineTo(x+30,y+29); ctx.lineTo(x+2,y+29); ctx.closePath(); ctx.fill();
        // Highlight face
        ctx.fillStyle = '#aaa090';
        ctx.beginPath(); ctx.moveTo(x+16,y+3); ctx.lineTo(x+22,y+13); ctx.lineTo(x+10,y+13); ctx.closePath(); ctx.fill();
        // Snow tip
        ctx.fillStyle = '#e8eeff';
        ctx.beginPath(); ctx.moveTo(x+16,y+3); ctx.lineTo(x+20,y+10); ctx.lineTo(x+12,y+10); ctx.closePath(); ctx.fill();
        // Crevice shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+16,y+10); ctx.lineTo(x+18,y+22); ctx.stroke();
        break;
      }
      case 4: { // dirt path — worn with wheel tracks
        // Subtle track marks
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        if ((tx*5+ty*11)%7<3) ctx.fillRect(x+5,y+5,7,5);
        if ((tx*3+ty*9)%7<3)  ctx.fillRect(x+18,y+20,6,4);
        // Wheel ruts (horizontal paths vs vertical)
        const isHPath = getTile(tx-1,ty) === 4 || getTile(tx+1,ty) === 4;
        const isVPath = getTile(tx,ty-1) === 4 || getTile(tx,ty+1) === 4;
        ctx.strokeStyle = 'rgba(60,40,20,0.2)'; ctx.lineWidth=2;
        if (isHPath) {
          ctx.beginPath(); ctx.moveTo(x,y+10); ctx.lineTo(x+TILE,y+10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x,y+22); ctx.lineTo(x+TILE,y+22); ctx.stroke();
        }
        if (isVPath) {
          ctx.beginPath(); ctx.moveTo(x+10,y); ctx.lineTo(x+10,y+TILE); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x+22,y); ctx.lineTo(x+22,y+TILE); ctx.stroke();
        }
        // Pebbles
        if (srand > 0.7) {
          ctx.fillStyle = 'rgba(120,100,70,0.5)';
          ctx.beginPath(); ctx.arc(x+srand*20+4, y+srand*16+8, 1.5, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
      case 5: { // village/town building
        // Building wall
        ctx.fillStyle = '#c4a070'; ctx.fillRect(x+5, y+12, 22, 18);
        // Wooden roof
        ctx.fillStyle = '#7a3a10';
        ctx.beginPath(); ctx.moveTo(x+3,y+12); ctx.lineTo(x+16,y+4); ctx.lineTo(x+29,y+12); ctx.closePath(); ctx.fill();
        // Roof ridge highlight
        ctx.strokeStyle = '#aa5520'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+16,y+4); ctx.lineTo(x+3,y+12); ctx.moveTo(x+16,y+4); ctx.lineTo(x+29,y+12); ctx.stroke();
        // Door
        ctx.fillStyle = '#4a2a0a'; ctx.fillRect(x+12, y+22, 8, 8);
        ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth=0.5; ctx.strokeRect(x+12,y+22,8,8);
        // Glowing window (flickers per tile)
        const winFlicker = 0.4 + 0.3*Math.sin(t*0.7+tx*1.3+ty*0.8);
        ctx.fillStyle = `rgba(255,240,120,${winFlicker})`;
        ctx.fillRect(x+6, y+16, 7, 5); ctx.fillRect(x+19, y+16, 7, 5);
        // Window cross
        ctx.strokeStyle = 'rgba(80,50,10,0.5)'; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(x+9,y+16); ctx.lineTo(x+9,y+21); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+6,y+18); ctx.lineTo(x+13,y+18); ctx.stroke();
        // Chimney smoke if at top of building
        if ((tx+ty)%4===0) {
          const smokeAlpha = 0.1 + 0.08*Math.sin(t*1.5+tx);
          ctx.fillStyle = `rgba(120,120,120,${smokeAlpha})`;
          ctx.beginPath(); ctx.arc(x+22+Math.sin(t+tx)*2, y+2, 3, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
      case 6: { // castle — fortified with banner
        ctx.fillStyle = '#555566'; ctx.fillRect(x+3, y+6, 26, 22);
        ctx.fillStyle = '#444455';
        ctx.fillRect(x+3, y+4, 9, 12); ctx.fillRect(x+20, y+4, 9, 12);
        // Battlements
        ctx.fillStyle = '#333344';
        for (let i = 0; i < 5; i++) ctx.fillRect(x+4+i*5, y+2, 3, 5);
        // Keep door
        ctx.fillStyle = '#222233'; ctx.fillRect(x+12, y+18, 8, 10);
        // Arrow slit windows
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(x+5, y+10, 3, 6); ctx.fillRect(x+24, y+10, 3, 6);
        // Banner (animated ripple)
        ctx.fillStyle = '#881111';
        const bannerWave = Math.sin(t*1.5+tx)*1.5;
        ctx.beginPath();
        ctx.moveTo(x+14, y+3); ctx.lineTo(x+14+8+bannerWave, y+3);
        ctx.lineTo(x+14+8+bannerWave, y+8); ctx.lineTo(x+14, y+8); ctx.closePath(); ctx.fill();
        // Torch glow
        ctx.fillStyle = `rgba(255,160,50,${0.12+0.08*Math.sin(t*2+tx)})`;
        ctx.fillRect(x,y,TILE,TILE);
        break;
      }
      case 7: { // ruins — crumbling with arcane residue
        // Ground rubble
        ctx.fillStyle = '#252020'; ctx.fillRect(x, y+24, TILE, 8);
        // Broken walls
        ctx.fillStyle = '#2a2020'; ctx.fillRect(x+3,y+10,10,18);
        ctx.fillStyle = '#302020'; ctx.fillRect(x+20,y+6,8,22);
        // Crumbled blocks
        ctx.fillStyle = '#3a2a2a';
        for (let i=0;i<3;i++) { ctx.fillRect(x+5+i*9,y+28,6,3); }
        // Broken wall top
        ctx.fillStyle = '#1a1414';
        ctx.beginPath();
        ctx.moveTo(x+3,y+10); ctx.lineTo(x+5,y+7); ctx.lineTo(x+8,y+10);
        ctx.lineTo(x+11,y+6); ctx.lineTo(x+13,y+10); ctx.closePath(); ctx.fill();
        // Rune glow (pulsing)
        const runeAlpha = 0.2 + 0.2*Math.sin(t*1.5+tx+ty);
        const runeGrad = ctx.createRadialGradient(x+10,y+18,0, x+10,y+18,6);
        runeGrad.addColorStop(0, `rgba(160,80,255,${runeAlpha*1.5})`);
        runeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = runeGrad; ctx.fillRect(x+4,y+12,12,12);
        const runeGrad2 = ctx.createRadialGradient(x+24,y+14,0, x+24,y+14,6);
        runeGrad2.addColorStop(0, `rgba(120,60,200,${runeAlpha})`);
        runeGrad2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = runeGrad2; ctx.fillRect(x+18,y+8,12,12);
        // Small rune dots
        ctx.fillStyle = `rgba(120,60,200,${runeAlpha})`;
        ctx.beginPath(); ctx.arc(x+10,y+18,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+24,y+14,2,0,Math.PI*2); ctx.fill();
        break;
      }
      case 8: { // vault/dungeon entrance
        ctx.fillStyle = '#141420'; ctx.fillRect(x,y,TILE,TILE);
        // Arch entrance
        ctx.fillStyle = '#0a0a18';
        ctx.beginPath(); ctx.arc(x+16, y+22, 12, Math.PI, 0); ctx.fill();
        ctx.fillRect(x+4, y+22, 24, 8);
        // Iron bars
        ctx.strokeStyle = '#282844'; ctx.lineWidth=1.5;
        for (let i=0;i<4;i++) {
          ctx.beginPath(); ctx.moveTo(x+7+i*5,y+14); ctx.lineTo(x+7+i*5,y+28); ctx.stroke();
        }
        // Purple glow seeping out
        const vaultGlow = ctx.createRadialGradient(x+16,y+22,4, x+16,y+22,18);
        vaultGlow.addColorStop(0, `rgba(80,0,160,${0.3+0.2*Math.sin(t*2)})`);
        vaultGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vaultGlow; ctx.fillRect(x,y+4,TILE,28);
        break;
      }
      case 9: { // deep water
        // Wave animation
        const waveT = t*1.2;
        const w1 = ctx.createLinearGradient(x,y,x,y+TILE);
        w1.addColorStop(0,'#142840'); w1.addColorStop(1,'#0a1830');
        ctx.fillStyle = w1; ctx.fillRect(x,y,TILE,TILE);
        // Wave lines
        ctx.strokeStyle = `rgba(60,120,200,${0.25+0.15*Math.sin(waveT+tx*0.5)})`;
        ctx.lineWidth = 1;
        for (let wi=0;wi<3;wi++) {
          const wy = y+6+wi*9;
          ctx.beginPath();
          ctx.moveTo(x, wy+Math.sin(waveT+tx+wi)*1.5);
          ctx.quadraticCurveTo(x+TILE/2, wy+Math.sin(waveT+tx+wi+1)*2, x+TILE, wy+Math.sin(waveT+tx+wi+2)*1.5);
          ctx.stroke();
        }
        // Reflection glint
        if ((tx*3+ty*7)%5===0) {
          const glintAlpha = Math.max(0, Math.sin(t*2+srand*6)) * 0.3;
          ctx.fillStyle = `rgba(180,220,255,${glintAlpha})`;
          ctx.beginPath(); ctx.ellipse(x+srand*20+4, y+srand*12+4, 3, 1, 0.3, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
      case 10: { // observatory — dome with celestial trackers
        // Base structure
        ctx.fillStyle = '#555578'; ctx.fillRect(x+4, y+14, 24, 16);
        // Dome
        ctx.fillStyle = '#8877bb';
        ctx.beginPath(); ctx.arc(x+16, y+14, 12, Math.PI, 0); ctx.fill();
        // Dome highlight
        ctx.fillStyle = '#9988cc';
        ctx.beginPath(); ctx.arc(x+14, y+11, 5, Math.PI, 0); ctx.fill();
        // Observatory slit
        ctx.fillStyle = '#1a1030';
        ctx.fillRect(x+14, y+8, 4, 10);
        // Telescope glint
        const teleAlpha = 0.4 + 0.4*Math.sin(t*1.8+tx*0.7);
        ctx.fillStyle = `rgba(180,160,255,${teleAlpha})`;
        ctx.beginPath(); ctx.arc(x+16, y+10, 2, 0, Math.PI*2); ctx.fill();
        // Star tracker lines
        ctx.strokeStyle = `rgba(140,100,255,${0.15+0.1*Math.sin(t+tx)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x+16,y+8); ctx.lineTo(x+26,y+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+16,y+8); ctx.lineTo(x+6,y+3); ctx.stroke();
        // Star tracker dome glow
        ctx.fillStyle = `rgba(140,100,255,${0.12+0.1*Math.sin(t+tx)})`;
        ctx.fillRect(x,y,TILE,TILE);
        break;
      }
      case 11: { // undercity entrance
        ctx.fillStyle = '#18182a'; ctx.fillRect(x,y,TILE,TILE);
        // Trapdoor / grate
        ctx.fillStyle = '#0e0e1e'; ctx.fillRect(x+6,y+8,20,16);
        ctx.strokeStyle = '#2a2a44'; ctx.lineWidth=1.5;
        for (let gx2=0; gx2<4; gx2++) ctx.strokeRect(x+7+gx2*5,y+8,4,16);
        // Faint light below
        const ucGlow = ctx.createRadialGradient(x+16,y+24,0, x+16,y+24,12);
        ucGlow.addColorStop(0, `rgba(40,60,160,${0.3+0.2*Math.sin(t*1.5+tx)})`);
        ucGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ucGlow; ctx.fillRect(x+4,y+12,24,16);
        break;
      }
      case 0: { // void/border
        // Subtle star field for void tiles
        if ((tx*17+ty*23)%7===0) {
          ctx.fillStyle = 'rgba(140,140,160,0.08)';
          ctx.beginPath(); ctx.arc(x+srand*TILE, y+srand*TILE, 1, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
    }

    // Subtle grid line
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, TILE, TILE);
  }

  // ── Ambient world particles ─────────────────────────────────────
  // Deterministic per-tile movers — position derived from tile seed + time
  // so they stay anchored to their tile without a particle array.
  function drawWorldAmbient(startTX, startTY, endTX, endTY) {
    const t = worldTime * 0.001;
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const tile = getTile(tx, ty);
        if (tile === 0) continue;

        const seed  = (tx * 1999 + ty * 3571) & 0xffff;
        const sx    = (seed % 100) / 100;         // 0-1 per-tile deterministic
        const sx2   = ((seed >> 8) % 100) / 100;

        const bx = tx * TILE;
        const by = ty * TILE;

        if (tile === 2) {
          // Forest: slow firefly motes
          const count = 2 + (seed % 2);
          for (let i = 0; i < count; i++) {
            const phase = sx * Math.PI * 2 + i * 2.1;
            const mx = bx + 4 + (sx * 24) + Math.sin(t * 0.9 + phase) * 5;
            const my = by + 6 + (sx2 * 18) + Math.cos(t * 0.7 + phase * 1.3) * 4;
            const alpha = (0.3 + 0.4 * Math.sin(t * 1.6 + phase)) * 0.65;
            if (alpha > 0) {
              ctx.beginPath(); ctx.arc(mx, my, 1.3, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(170,255,140,${alpha})`;
              ctx.fill();
            }
          }
        } else if (tile === 9) {
          // Water: surface light caustics
          const cx2 = bx + 16 + Math.sin(t * 1.2 + sx * 5) * 6;
          const cy2 = by + 16 + Math.cos(t * 0.9 + sx2 * 4) * 4;
          ctx.beginPath(); ctx.arc(cx2, cy2, 2.5 + Math.sin(t * 2 + sx) * 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,230,255,${0.12 + 0.1 * Math.sin(t * 1.8 + sx)})`;
          ctx.fill();
        } else if (tile === 4) {
          // Path: dust motes
          if ((seed % 5) === 0) {
            const dx = bx + sx * 28;
            const dy = by + 18 + Math.sin(t * 0.4 + sx * 3) * 3;
            ctx.beginPath(); ctx.arc(dx, dy, 1.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,185,150,${0.18 + 0.1 * Math.sin(t + sx)})`;
            ctx.fill();
          }
        } else if (tile === 6) {
          // Castle: torch ember float
          if ((seed % 7) === 0) {
            const ex = bx + 12 + sx * 8;
            const ey = by + 4 + Math.sin(t * 1.1 + sx * 4) * 5 - (t * 0.5 % 20);
            const ea = (0.4 + 0.3 * Math.sin(t * 2.5 + sx)) * (1 - ((t * 0.5) % 20) / 20);
            if (ea > 0.05) {
              ctx.beginPath(); ctx.arc(ex % TILE + bx, ey < by ? ey + TILE : ey, 1, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255,160,40,${ea * 0.7})`; ctx.fill();
            }
          }
        } else if (tile === 7) {
          // Ruins: pale dust rising
          if ((seed % 4) === 0) {
            const rx = bx + sx * 26;
            const ry = by + 20 - (t * 0.35 * sx2) % 24;
            ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200,190,160,${0.12 + 0.08 * sx})`; ctx.fill();
          }
        } else if (tile === 8) {
          // Vault: arcane rune sparks
          if ((seed % 6) === 0) {
            const ang = t * 0.8 + sx * Math.PI * 2;
            const vx2 = bx + 16 + Math.cos(ang) * 9;
            const vy2 = by + 16 + Math.sin(ang) * 6;
            ctx.beginPath(); ctx.arc(vx2, vy2, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(160,80,255,${0.35 + 0.25 * Math.sin(t * 3 + sx)})`;
            ctx.fill();
          }
        }
      }
    }
  }

  function drawChest(chest) {
    const x = chest.tx * TILE + TILE/2;
    const y = chest.ty * TILE + TILE/2;
    const t = worldTime * 0.003;
    const pulse = 0.7 + 0.3 * Math.sin(t + chest.tx + chest.ty);

    // Outer shimmer glow
    const g = ctx.createRadialGradient(x, y, 2, x, y, 22);
    g.addColorStop(0, `rgba(255,220,50,${pulse * 0.55})`);
    g.addColorStop(0.6, `rgba(255,180,20,${pulse * 0.18})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);

    // Chest shadow
    ctx.beginPath(); ctx.ellipse(x, y + 10, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();

    // Chest base (wood)
    ctx.fillStyle = '#4a2a00';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 9, y - 3, 18, 12, 2) : ctx.fillRect(x - 9, y - 3, 18, 12);
    ctx.fill();
    // Wood grain highlight
    ctx.fillStyle = '#6b3d0a'; ctx.fillRect(x - 9, y - 3, 18, 5);

    // Lid (arc top)
    ctx.fillStyle = '#7a4a12';
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 9, 4, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Metal bands
    ctx.strokeStyle = '#c89020'; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 9, y - 3, 18, 12);
    ctx.beginPath(); ctx.moveTo(x - 9, y + 1); ctx.lineTo(x + 9, y + 1); ctx.stroke();

    // Lock clasp
    ctx.fillStyle = '#ffc830';
    ctx.beginPath(); ctx.arc(x, y + 2, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#aa8000'; ctx.lineWidth = 0.8; ctx.stroke();

    // Animated sparkle rays
    for (let i = 0; i < 4; i++) {
      const ang  = (t * 1.5 + i * Math.PI / 2) % (Math.PI * 2);
      const dist = 12 + 4 * Math.sin(t * 2.5 + i);
      const sx   = x + Math.cos(ang) * dist;
      const sy   = y - 8 + Math.sin(ang) * dist * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,100,${pulse * 0.7})`;
      ctx.fill();
    }

    // "!" indicator with glow
    ctx.shadowColor = 'rgba(255,220,50,0.8)';
    ctx.shadowBlur  = 8 * pulse;
    ctx.fillStyle   = `rgba(255,220,50,${pulse})`;
    ctx.font        = 'bold 11px Arial';
    ctx.textAlign   = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('!', x, y - 9);
    ctx.shadowBlur  = 0;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawNPC(npc) {
    const x = npc.tx * TILE + TILE / 2;
    const y = npc.ty * TILE + TILE / 2;
    const t = worldTime * 0.002;
    // Per-NPC phase offset so NPCs don't all pulse in sync
    const phase = (npc.tx * 7 + npc.ty * 13) % 100 / 100 * Math.PI * 2;
    const bob   = Math.sin(t * 1.4 + phase) * 1.5;  // gentle bob
    const pulse = 0.88 + 0.12 * Math.sin(t * 1.1 + phase);

    // Ground shadow (slightly offset by bob)
    ctx.beginPath(); ctx.ellipse(x, y + 13 - bob * 0.3, 9, 3.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${0.28 - bob * 0.01})`; ctx.fill();

    // Cloak / robe lower
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 11 - bob);
    ctx.lineTo(x + 8, y + 11 - bob);
    ctx.lineTo(x + 6, y - 2 - bob);
    ctx.lineTo(x - 6, y - 2 - bob);
    ctx.closePath();
    const robeColor = npc.color || '#888888';
    ctx.fillStyle = robeColor; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();

    // Body / head
    ctx.beginPath(); ctx.arc(x, y - 3 - bob, 10 * pulse, 0, Math.PI * 2);
    ctx.fillStyle   = robeColor; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();

    // Face circle (skin)
    ctx.beginPath(); ctx.arc(x, y - 4 - bob, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c888'; ctx.fill();

    // Name initial
    ctx.fillStyle = '#222222';
    ctx.font      = 'bold 8px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((npc.name || '?')[0].toUpperCase(), x, y - 4 - bob);

    // "?" speech bubble
    const qAlpha = 0.55 + 0.45 * Math.sin(t * 1.8 + phase);
    ctx.fillStyle = `rgba(255,255,200,${qAlpha * 0.85})`;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 8, y - 27 - bob, 16, 12, 3) : ctx.fillRect(x - 8, y - 27 - bob, 16, 12);
    ctx.fill();
    // Bubble tail
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 16 - bob);
    ctx.lineTo(x + 3, y - 16 - bob);
    ctx.lineTo(x,     y - 12 - bob);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,200,${qAlpha * 0.85})`; ctx.fill();

    ctx.fillStyle = `rgba(80,60,20,${qAlpha})`;
    ctx.font      = 'bold 10px Arial';
    ctx.fillText('?', x, y - 21 - bob);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawPlayer() {
    const cx = player.px + TILE/2;
    const cy = player.py + TILE/2;
    const t  = worldTime * 0.002;

    // Shadow
    ctx.beginPath(); ctx.ellipse(cx, cy+13, 11, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

    // Pulsing ring (cursor)
    const ringR = 16 + 2*Math.sin(t*3);
    const ringAlpha = 0.25 + 0.15*Math.sin(t*3);
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(255,220,50,${ringAlpha})`; ctx.lineWidth = 2; ctx.stroke();

    // Player body
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI*2);
    const pGrad = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, 13);
    pGrad.addColorStop(0, '#6699ff');
    pGrad.addColorStop(1, '#2255aa');
    ctx.fillStyle = pGrad; ctx.fill();
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2; ctx.stroke();

    // Sword cross
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy-10); ctx.lineTo(cx, cy+10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-6, cy-3); ctx.lineTo(cx+6, cy-3); ctx.stroke();
    // Pommel dot
    ctx.beginPath(); ctx.arc(cx, cy+10, 2, 0, Math.PI*2);
    ctx.fillStyle = '#ffdd44'; ctx.fill();
  }

  function getLocationName(tx, ty, actProgress) {
    const act = actProgress || 0;
    for (const loc of DATA.LOCATIONS) {
      if (tx >= loc.tx1 && tx <= loc.tx2 && ty >= loc.ty1 && ty <= loc.ty2) {
        return loc.name;
      }
    }
    // Fallback by tile type
    const tile = getTile(tx, ty);
    const tileNames = { 1:'Open Field', 2:'Deep Forest', 3:'Mountain', 4:'Road', 5:'Settlement', 6:'Fortification', 7:'Ancient Ruins', 8:'Vault', 10:'Observatory' };
    return tileNames[tile] || 'Valdris Kingdom';
  }

  function getPlayerTile() { return { tx: player.tx, ty: player.ty }; }
  function getPlayerPos()  { return { px: player.px, py: player.py }; }
  function setPlayerPos(tx, ty) {
    player.tx = tx; player.ty = ty;
    player.px = tx * TILE; player.py = ty * TILE;
    updateCamera();
  }

  
  function updateTileHoverInfo(game) {
    if (!game || !game.party) return;
    
    // Get mouse position in world coordinates
    const mousePos = INPUT.getMousePos();
    if (!mousePos) {
      hoverTimer = 0;
      hoverInfo = null;
      return;
    }
    const mx = mousePos.x;
    const my = mousePos.y;
    
    // Convert mouse to tile coordinates
    const worldX = mx + camX;
    const worldY = my + camY;
    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);
    
    // Check if hovering over a different tile
    if (tx !== hoverTx || ty !== hoverTy) {
      hoverTx = tx;
      hoverTy = ty;
      hoverTimer = 0;
      hoverInfo = null;
    }
    
    // Update hover timer
    hoverTimer += dt;
    
    // Show info after 1 second
    if (hoverTimer >= HOVER_DELAY && !hoverInfo) {
      hoverInfo = getTileInfo(tx, ty, game);
    }
  }
  
  function getTileInfo(tx, ty, game) {
    const tile = getTile(tx, ty);
    const tileNames = {
      0: 'Void', 1: 'Grass', 2: 'Forest', 3: 'Mountain',
      4: 'Path', 5: 'Village', 6: 'Castle', 7: 'Ruins',
      8: 'Vault', 9: 'Deep Water', 10: 'Observatory', 11: 'Undercity'
    };
    
    const info = {
      name: tileNames[tile] || 'Unknown',
      walkable: DATA.TILE_WALKABLE[tile] || false,
      position: `(${tx}, ${ty})`,
      details: []
    };
    
    // Add location info if in a named area
    const location = getLocationName(tx, ty, game.actProgress || 0);
    if (location && location !== 'Valdris Kingdom') {
      info.details.push(`Location: ${location}`);
    }
    
    // Check for chests
    for (const chest of DATA.CHESTS) {
      if (chest.tx === tx && chest.ty === ty && !collectedChests[chest.id]) {
        info.details.push(`Chest: ${chest.name || 'Treasure'}`);
      }
    }
    
    // Check for NPCs
    for (const npc of DATA.NPCS) {
      if (npc.tx === tx && npc.ty === ty) {
        info.details.push(`NPC: ${npc.name}`);
      }
    }
    
    // Check if player is on this tile
    if (player.tx === tx && player.ty === ty) {
      info.details.push('Player Position');
    }
    
    return info;
  }
  
  function getHoverInfo() {
    return hoverInfo;
  }

  return {
    init, update, draw,
    getPlayerTile, getPlayerPos, setPlayerPos,
    getLocationName,
    collectedChests: () => collectedChests,
    getHoverInfo,
  };
})();
