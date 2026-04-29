// ============================================================
// ui.js  —  All UI rendering: dialogue, portraits, title,
//           menus, HUD, equipment, ending, banners, particles
// ============================================================

const UI = (() => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const W = 900, H = 620;

  // ── Particle system ─────────────────────────────────────────
  let particles = [];

  function spawnParticles(x, y, type, count) {
    const configs = {
      heal:     { colors:['#44ff88','#88ffaa','#22cc66','#aaffcc'], vy:-2.5, spread:1.5, size:4, life:900 },
      fire:     { colors:['#ff8800','#ff4400','#ffcc00','#ff6600'], vy:-1.5, spread:3,   size:5, life:700 },
      ice:      { colors:['#88ccff','#4488ff','#aaddff','#cceeFF'], vy:-1,   spread:2.5, size:4, life:800 },
      death:    { colors:['#888888','#555555','#aaaaaa','#333333'], vy:-1,   spread:3,   size:4, life:800 },
      levelup:  { colors:['#ffdd00','#ffaa00','#ffffff','#ffff88'], vy:-3,   spread:2,   size:5, life:1200 },
      victory:  { colors:['#ffdd00','#ff8800','#ffffff','#ff44aa','#44ffdd'], vy:-2, spread:5, size:5, life:1500 },
      magic:    { colors:['#aa44ff','#8833cc','#ff88ff','#cc66ff'], vy:-2,   spread:2,   size:4, life:700 },
      void:     { colors:['#4444aa','#224488','#8844cc','#6633bb'], vy:-1.5, spread:3,   size:5, life:900 },
      // New types
      holy:     { colors:['#ffffaa','#ffeecc','#ffffff','#ffd700'], vy:-3,   spread:2,   size:4, life:1000 },
      lightning:{ colors:['#ffffff','#ddddff','#aaaaff','#ccccff'], vy:-4,   spread:1,   size:3, life:400 },
      shard:    { colors:['#8888ff','#6644ff','#4422cc','#aa88ff'], vy:-2,   spread:4,   size:4, life:1100 },
      explosion:{ colors:['#ff6600','#ff8800','#ffaa00','#ff3300','#fff'], vy:-0.5, spread:6, size:6, life:600 },
      smoke:    { colors:['#888888','#999999','#777777','#aaaaaa'], vy:-0.8, spread:2,   size:6, life:1200 },
      blood:    { colors:['#cc0000','#880000','#aa0000','#dd2200'], vy:-1,   spread:2,   size:4, life:700 },
      spark:    { colors:['#ffdd00','#ffaa00','#ffffff','#ffcc44'], vy:-2.5, spread:4,   size:2, life:500 },
      rune:     { colors:['#8844ff','#aa66ff','#cc88ff','#6622cc'], vy:-1.5, spread:1.5, size:3, life:1300 },
    };
    const cfg = configs[type] || configs.magic;
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random()-0.5) * cfg.spread * 2,
        vy: cfg.vy + (Math.random()-0.5),
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
        size: cfg.size * (0.6 + Math.random() * 0.8),
        life: cfg.life, maxLife: cfg.life,
        spin: (Math.random()-0.5) * 0.3,
        glow: type === 'holy' || type === 'rune' || type === 'shard',
      });
    }
  }

  function updateParticles(dt) {
    particles = particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx *= 0.98;
      p.vy += 0.04;
      return p.life > 0;
    });
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.size * 3 * alpha;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
      if (p.glow) { ctx.shadowBlur = 0; }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
  }

  // ── Screen shake ─────────────────────────────────────────────
  let shakeFrames = 0, shakeAmt = 0;
  let shakeX = 0, shakeY = 0;

  function screenShake(frames, amt) {
    shakeFrames = frames;
    shakeAmt    = amt;
  }

  function updateShake() {
    if (shakeFrames > 0) {
      shakeFrames--;
      shakeX = (Math.random()-0.5) * shakeAmt * 2;
      shakeY = (Math.random()-0.5) * shakeAmt * 2;
    } else {
      shakeX = 0; shakeY = 0;
    }
  }

  function applyShake() {
    if (shakeX !== 0 || shakeY !== 0) ctx.translate(shakeX, shakeY);
  }

  // ── Portrait drawing ─────────────────────────────────────────
  function drawPortrait(key, cx, cy, radius) {
    const r = radius || 28;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.clip();

    const portraits = {
      kael: () => {
        // Background (blue)
        ctx.fillStyle = '#1a2e5a'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // Hair — spiky dark
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.2, r*0.75, r*0.65, 0, 0, Math.PI*2); ctx.fill();
        // Spikes
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i*r*0.18, cy - r*0.6);
          ctx.lineTo(cx + i*r*0.18 - r*0.1, cy - r*0.3);
          ctx.lineTo(cx + i*r*0.18 + r*0.1, cy - r*0.3);
          ctx.fill();
        }
        // Face
        ctx.fillStyle = '#d4956a';
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.1, r*0.52, r*0.58, 0, 0, Math.PI*2); ctx.fill();
        // Eyes — blue
        ctx.fillStyle = '#3366cc';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.05, r*0.055, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.05, r*0.055, 0, Math.PI*2); ctx.fill();
        // Scar
        ctx.strokeStyle = '#c07050'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx+r*0.1, cy-r*0.2); ctx.lineTo(cx+r*0.25, cy+r*0.05); ctx.stroke();
        // Jawline / chin
        ctx.strokeStyle = '#b07858'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-r*0.35, cy+r*0.25); ctx.quadraticCurveTo(cx, cy+r*0.62, cx+r*0.35, cy+r*0.25); ctx.stroke();
      },
      lyra: () => {
        ctx.fillStyle = '#1a0e28'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // Hood/back hair
        ctx.fillStyle = '#3a1a08';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.15, r*0.88, r*0.75, 0, 0, Math.PI*2); ctx.fill();
        // Red hair
        ctx.fillStyle = '#cc3300';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.18, r*0.7, r*0.6, 0, 0, Math.PI*2); ctx.fill();
        // Short hair wisps
        ctx.strokeStyle = '#ee4400'; ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(cx + i*r*0.25, cy-r*0.7);
          ctx.quadraticCurveTo(cx + i*r*0.4, cy-r*0.5, cx + i*r*0.35, cy-r*0.3); ctx.stroke();
        }
        // Face
        ctx.fillStyle = '#d08878';
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.12, r*0.5, r*0.55, 0, 0, Math.PI*2); ctx.fill();
        // Sharp eyes
        ctx.fillStyle = '#224422';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.02, r*0.055, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.02, r*0.055, 0, Math.PI*2); ctx.fill();
        // Smirk
        ctx.strokeStyle = '#c07060'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.2, cy+r*0.2); ctx.quadraticCurveTo(cx+r*0.05, cy+r*0.3, cx+r*0.25, cy+r*0.18); ctx.stroke();
      },
      theron: () => {
        ctx.fillStyle = '#0d100d'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // Gray hair
        ctx.fillStyle = '#888888';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.18, r*0.72, r*0.62, 0, 0, Math.PI*2); ctx.fill();
        // Gray streak
        ctx.fillStyle = '#cccccc';
        ctx.beginPath(); ctx.ellipse(cx-r*0.2, cy-r*0.3, r*0.12, r*0.35, -0.3, 0, Math.PI*2); ctx.fill();
        // Face
        ctx.fillStyle = '#c8a882';
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.1, r*0.52, r*0.58, 0, 0, Math.PI*2); ctx.fill();
        // Glasses (thin circles)
        ctx.strokeStyle = '#888866'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.04, r*0.14, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.04, r*0.14, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-r*0.06, cy-r*0.04); ctx.lineTo(cx+r*0.06, cy-r*0.04); ctx.stroke();
        // Eyes behind glasses — intense
        ctx.fillStyle = '#882200';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.04, r*0.07, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.04, r*0.07, 0, Math.PI*2); ctx.fill();
        // Furrowed brow
        ctx.strokeStyle = '#a07050'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.35, cy-r*0.25); ctx.lineTo(cx-r*0.08, cy-r*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.35, cy-r*0.25); ctx.lineTo(cx+r*0.08, cy-r*0.2); ctx.stroke();
      },
      sera: () => {
        ctx.fillStyle = '#0a0818'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // Blonde hair
        ctx.fillStyle = '#d4a800';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.18, r*0.78, r*0.68, 0, 0, Math.PI*2); ctx.fill();
        // Hair sides (soft)
        ctx.beginPath(); ctx.ellipse(cx-r*0.65, cy+r*0.1, r*0.22, r*0.5, -0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx+r*0.65, cy+r*0.1, r*0.22, r*0.5, 0.2, 0, Math.PI*2); ctx.fill();
        // Face — soft features
        ctx.fillStyle = '#e8b88a';
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.08, r*0.5, r*0.55, 0, 0, Math.PI*2); ctx.fill();
        // Kind eyes
        ctx.fillStyle = '#3366aa';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.05, r*0.055, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.05, r*0.055, 0, Math.PI*2); ctx.fill();
        // Gentle smile
        ctx.strokeStyle = '#c09070'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.2, cy+r*0.2); ctx.quadraticCurveTo(cx, cy+r*0.32, cx+r*0.2, cy+r*0.2); ctx.stroke();
        // Earrings
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath(); ctx.arc(cx-r*0.6, cy+r*0.02, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.6, cy+r*0.02, r*0.06, 0, Math.PI*2); ctx.fill();
      },
      malachar: () => {
        ctx.fillStyle = '#04040f'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // White hair/beard
        ctx.fillStyle = '#ddddcc';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.15, r*0.72, r*0.62, 0, 0, Math.PI*2); ctx.fill();
        // Beard
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.5, r*0.42, r*0.38, 0, 0, Math.PI*2); ctx.fill();
        // Face — deeply lined
        ctx.fillStyle = '#b89070';
        ctx.beginPath(); ctx.ellipse(cx, cy+r*0.12, r*0.5, r*0.58, 0, 0, Math.PI*2); ctx.fill();
        // Eyes — deep-set, piercing
        ctx.fillStyle = '#001133';
        ctx.beginPath(); ctx.ellipse(cx-r*0.2, cy-r*0.06, r*0.12, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx+r*0.2, cy-r*0.06, r*0.12, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6688aa';
        ctx.beginPath(); ctx.arc(cx-r*0.2, cy-r*0.06, r*0.07, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.2, cy-r*0.06, r*0.07, 0, Math.PI*2); ctx.fill();
        // Deep wrinkles
        ctx.strokeStyle = '#907060'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-r*0.35, cy-r*0.15); ctx.lineTo(cx-r*0.08, cy-r*0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.35, cy-r*0.15); ctx.lineTo(cx+r*0.08, cy-r*0.1); ctx.stroke();
      },
      aldric: () => {
        ctx.fillStyle = '#08030a'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        // Slicked back gray hair
        ctx.fillStyle = '#888880';
        ctx.beginPath(); ctx.ellipse(cx, cy-r*0.22, r*0.68, r*0.55, 0, 0, Math.PI*2); ctx.fill();
        // Hair slicked — sharp lines
        ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(cx + i*r*0.2, cy-r*0.7);
          ctx.lineTo(cx + i*r*0.25, cy-r*0.3); ctx.stroke();
        }
        // Angular face
        ctx.fillStyle = '#c8a888';
        ctx.beginPath(); ctx.moveTo(cx-r*0.48, cy-r*0.1); ctx.lineTo(cx-r*0.5, cy+r*0.2);
        ctx.lineTo(cx-r*0.25, cy+r*0.6); ctx.lineTo(cx+r*0.25, cy+r*0.6);
        ctx.lineTo(cx+r*0.5, cy+r*0.2); ctx.lineTo(cx+r*0.48, cy-r*0.1);
        ctx.lineTo(cx, cy-r*0.6); ctx.closePath(); ctx.fill();
        // Cold eyes
        ctx.fillStyle = '#335533';
        ctx.beginPath(); ctx.arc(cx-r*0.22, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.22, cy-r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx-r*0.22, cy-r*0.05, r*0.05, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+r*0.22, cy-r*0.05, r*0.05, 0, Math.PI*2); ctx.fill();
        // Thin lips
        ctx.strokeStyle = '#a08060'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx-r*0.2, cy+r*0.22); ctx.lineTo(cx+r*0.2, cy+r*0.22); ctx.stroke();
      },
    };

    const drawFn = portraits[key];
    if (drawFn) {
      drawFn();
    } else {
      // Generic portrait
      ctx.fillStyle = '#222233'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
      ctx.fillStyle = '#888888';
      ctx.beginPath(); ctx.arc(cx, cy, r*0.4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // Border
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = '#aa8844'; ctx.lineWidth = 2; ctx.stroke();
  }

  // ── Dialogue system ─────────────────────────────────────────
  let dialogueQueue    = [];
  let currentLine      = null;
  let charIndex        = 0;
  let charTimer        = 0;
  const CHAR_DELAY     = 28; // ms per character
  let dialogueActive   = false;
  let onDialogueDone   = null;
  let choiceResult     = null;
  let waitingForChoice = false;
  let choiceHighlight  = 0;
  let pendingChoiceId  = null;

  function startDialogue(lines, cb) {
    if (!lines || lines.length === 0) { if (cb) cb(); return; }
    dialogueQueue  = lines.slice();
    onDialogueDone = cb || null;
    dialogueActive = true;
    waitingForChoice = false;
    choiceHighlight  = 0;
    advanceDialogue();
  }

  function advanceDialogue() {
    if (dialogueQueue.length === 0) {
      dialogueActive = false;
      currentLine    = null;
      waitingForChoice = false;
      if (onDialogueDone) {
        const cb = onDialogueDone;
        onDialogueDone = null;
        cb();
      }
      return;
    }
    currentLine = dialogueQueue.shift();
    charIndex   = 0;
    charTimer   = 0;
    waitingForChoice = false;
    if (currentLine.isChoice) {
      charIndex = currentLine.text.length; // show full text immediately
      waitingForChoice = true;
      pendingChoiceId  = currentLine.choiceId;
      choiceHighlight  = 0;
    }
  }

  // ── Battle Quote (banter) system ─────────────────────────────
  let battleQuote    = null;  // { speaker, text, life, maxLife }
  function showBattleQuote(speaker, text, duration) {
    battleQuote = { speaker, text, life: duration || 2500, maxLife: duration || 2500 };
  }
  function updateBattleQuote(dt) {
    if (battleQuote) {
      battleQuote.life -= dt;
      if (battleQuote.life <= 0) battleQuote = null;
    }
  }
  function drawBattleQuote() {
    if (!battleQuote) return;
    const alpha = Math.min(1, battleQuote.life / 500);
    const y = 60;
    // Background
    ctx.fillStyle = `rgba(0,0,0,${0.7 * alpha})`;
    ctx.fillRect(150, y - 20, 600, 50);
    ctx.strokeStyle = `rgba(180,160,80,${alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(150, y - 20, 600, 50);
    // Speaker name
    ctx.fillStyle = `rgba(255,220,150,${alpha})`;
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText(battleQuote.speaker, 165, y);
    // Text
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = '15px Georgia';
    ctx.fillText(battleQuote.text, 165 + ctx.measureText(battleQuote.speaker).width + 15, y);
  }

  function updateDialogue(dt) {
    if (!dialogueActive || !currentLine) return;

    if (waitingForChoice) {
      // Arrow keys to navigate choice
      if (INPUT.wasPressed('ArrowUp')   || INPUT.wasPressed('w')) choiceHighlight = Math.max(0, choiceHighlight - 1);
      if (INPUT.wasPressed('ArrowDown') || INPUT.wasPressed('s')) choiceHighlight = Math.min((currentLine.choices||[]).length - 1, choiceHighlight + 1);
      if (INPUT.didAdvance()) {
        choiceResult = choiceHighlight;
        // Dispatch the choice event
        if (pendingChoiceId) {
          const cid = pendingChoiceId;
          const cv  = choiceHighlight;
          pendingChoiceId = null;
          waitingForChoice = false;
          advanceDialogue();
          // Fire callback through main game after small delay
          if (window._GAME_choiceCallback) window._GAME_choiceCallback(cid, cv);
        }
      }
      // Also handle click on choice buttons
      const click = INPUT.consumeClick();
      if (click && currentLine.choices) {
        const baseY = H - 130 + 70;
        for (let i = 0; i < currentLine.choices.length; i++) {
          const by = baseY + i * 38;
          if (click.y >= by && click.y <= by + 32 && click.x >= 80 && click.x <= W - 80) {
            choiceHighlight = i;
            choiceResult = i;
            const cid = pendingChoiceId;
            pendingChoiceId = null;
            waitingForChoice = false;
            advanceDialogue();
            if (window._GAME_choiceCallback) window._GAME_choiceCallback(cid, i);
            break;
          }
        }
      }
      return;
    }

    if (charIndex < currentLine.text.length) {
      charTimer += dt;
      while (charTimer >= CHAR_DELAY && charIndex < currentLine.text.length) {
        charIndex++;
        charTimer -= CHAR_DELAY;
        // Tick sfx every few chars (not spaces)
        if (charIndex % 3 === 0 && currentLine.text[charIndex-1] !== ' ') {
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.dialogue();
        }
      }
    }

    if (INPUT.didAdvance()) {
      if (charIndex < currentLine.text.length) {
        charIndex = currentLine.text.length;
      } else {
        advanceDialogue();
      }
      return;
    }
    // Also allow click to advance
    const click = INPUT.consumeClick();
    if (click && click.y > H - 160) {
      if (charIndex < currentLine.text.length) {
        charIndex = currentLine.text.length;
      } else {
        advanceDialogue();
      }
    }
  }

  function drawDialogue() {
    if (!dialogueActive || !currentLine) return;
    const x = 0, y = H - 145, w = W, h = 145;

    // Background panel
    ctx.fillStyle = 'rgba(4,4,18,0.94)';
    ctx.fillRect(x, y, w, h);
    // Outer border (gold)
    ctx.strokeStyle = '#554422';
    ctx.lineWidth = 2;
    ctx.strokeRect(x+1, y+1, w-2, h-2);
    // Inner border
    ctx.strokeStyle = '#aa8844';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+4, y+4, w-8, h-8);

    // Portrait
    const portKey = currentLine.portrait || 'none';
    if (portKey !== 'none') {
      drawPortrait(portKey, x+46, y+72, 32);
    } else {
      // Colored circle fallback
      ctx.beginPath();
      ctx.arc(x+46, y+72, 32, 0, Math.PI*2);
      ctx.fillStyle = currentLine.color || '#888';
      ctx.fill();
      ctx.strokeStyle = '#aa8844'; ctx.lineWidth = 2; ctx.stroke();
      if (currentLine.name) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((currentLine.name||'?')[0].toUpperCase(), x+46, y+72);
      }
    }

    // Name
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 14px Georgia';
    ctx.fillText(currentLine.name || '', x+90, y+12);

    // Dialogue text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Georgia';
    const textToShow = currentLine.text.substring(0, charIndex);
    drawWrappedText(ctx, textToShow, x+90, y+34, w - 110, 19, 4);

    // Choice buttons
    if (waitingForChoice && currentLine.choices) {
      const baseY = y + 72;
      for (let i = 0; i < currentLine.choices.length; i++) {
        const by = baseY + i * 36;
        const isHl = i === choiceHighlight;
        ctx.fillStyle = isHl ? 'rgba(80,60,120,0.95)' : 'rgba(20,16,36,0.9)';
        ctx.fillRect(90, by, w - 100, 30);
        ctx.strokeStyle = isHl ? '#aa88ff' : '#554466';
        ctx.lineWidth = 1;
        ctx.strokeRect(90, by, w - 100, 30);
        ctx.fillStyle = isHl ? '#ffffff' : '#ccbbdd';
        ctx.font = isHl ? 'bold 13px Georgia' : '13px Georgia';
        ctx.textAlign = 'left';
        ctx.fillText((isHl ? '▶  ' : '   ') + currentLine.choices[i], 100, by + 8);
      }
    }

    // Advance hint
    if (!waitingForChoice && charIndex >= currentLine.text.length) {
      if (Math.floor(Date.now() / 400) % 2 === 0) {
        ctx.fillStyle = '#ffdd88';
        ctx.font = '11px Georgia';
        ctx.textAlign = 'right';
        ctx.fillText('[ Space / Enter / Click ]', w - 10, y + h - 12);
      }
    }
    ctx.textAlign = 'left';
  }

  // ── Title screen ─────────────────────────────────────────────
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.8 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.08,
      });
    }
  }
  initStars();

  function drawTitle(t) {
    // Deep space background
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#04020e');
    sky.addColorStop(0.5, '#08041a');
    sky.addColorStop(1, '#0c0620');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Nebula layers (more detailed)
    const neb1 = ctx.createRadialGradient(300, 200, 30, 300, 200, 280);
    neb1.addColorStop(0, 'rgba(60,20,100,0.18)');
    neb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);
    const neb2 = ctx.createRadialGradient(650, 380, 20, 650, 380, 220);
    neb2.addColorStop(0, 'rgba(20,40,80,0.15)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);
    const neb3 = ctx.createRadialGradient(100, 450, 10, 100, 450, 180);
    neb3.addColorStop(0, 'rgba(40,10,80,0.12)');
    neb3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb3; ctx.fillRect(0, 0, W, H);
    const neb4 = ctx.createRadialGradient(800, 120, 5, 800, 120, 160);
    neb4.addColorStop(0, 'rgba(10,50,80,0.1)');
    neb4.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb4; ctx.fillRect(0, 0, W, H);

    // Shooting stars / meteors (slow drift)
    for (let mi = 0; mi < 3; mi++) {
      const mPhase = (t * 0.00015 + mi * 0.33) % 1;
      if (mPhase < 0.15) {
        const mx = mPhase / 0.15 * W + mi * 200;
        const my = 80 + mi * 60;
        const mAlpha = mPhase < 0.05 ? mPhase/0.05 : mPhase > 0.12 ? (0.15-mPhase)/0.03 : 1;
        const tailLen = 60 + mi * 20;
        const tailGrad = ctx.createLinearGradient(mx - tailLen, my - tailLen * 0.3, mx, my);
        tailGrad.addColorStop(0, 'rgba(0,0,0,0)');
        tailGrad.addColorStop(1, `rgba(220,200,255,${mAlpha * 0.6})`);
        ctx.strokeStyle = tailGrad; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(mx - tailLen, my - tailLen*0.3); ctx.lineTo(mx, my); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,240,220,${mAlpha})`; ctx.fill();
      }
    }

    // Stars
    for (const s of stars) {
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,252,220,${alpha})`;
      ctx.fill();
    }

    // Crown
    drawTitleCrown(450, 160, t);

    // Title
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#cc8800'; ctx.shadowBlur = 40;
    const grad = ctx.createLinearGradient(0, 245, 0, 300);
    grad.addColorStop(0, '#ffe88a');
    grad.addColorStop(0.5, '#ffcc44');
    grad.addColorStop(1, '#cc8800');
    ctx.fillStyle = grad;
    ctx.font = 'bold 58px Georgia';
    ctx.fillText('SHATTERED CROWN', 450, 280);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aa8844';
    ctx.font = 'italic 22px Georgia';
    ctx.fillText('Echoes of Valdris', 450, 322);

    // Decorative lines
    ctx.strokeStyle = '#553311';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(160, 342); ctx.lineTo(740, 342); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(180, 345); ctx.lineTo(720, 345); ctx.stroke();

    // Menu items (passed in from main.js)
    const menuItems   = arguments[1] || null;
    const menuSelIdx  = arguments[2] || 0;
    const menuStartY  = 368;
    const menuItemH   = 38;

    if (menuItems && menuItems.length) {
      for (let i = 0; i < menuItems.length; i++) {
        const item = menuItems[i];
        const iy   = menuStartY + i * menuItemH;
        const sel  = i === menuSelIdx;
        // Hover background
        if (sel) {
          ctx.fillStyle = 'rgba(180,120,20,0.25)';
          ctx.fillRect(250, iy - 2, 400, menuItemH - 4);
          ctx.strokeStyle = 'rgba(220,160,40,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(250, iy - 2, 400, menuItemH - 4);
        }
        // Arrow indicator
        if (sel) {
          ctx.fillStyle = '#ffcc44';
          ctx.font = 'bold 16px Georgia';
          ctx.textAlign = 'left';
          ctx.fillText('▶', 258, iy + menuItemH / 2 - 6);
        }
        // Item label
        const isLoad   = item.action === 'load';
        const isEmpty  = item.action === 'empty';
        ctx.fillStyle  = sel ? '#ffe898' : isEmpty ? '#555544' : isLoad ? '#aaddff' : '#ccbb88';
        ctx.font       = sel ? 'bold 17px Georgia' : '16px Georgia';
        ctx.textAlign  = 'center';
        ctx.fillText(item.label, 450, iy + menuItemH / 2 - 5);
      }
    } else {
      // Fallback: original blink prompt
      if (Math.floor(t / 550) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,200,0.88)';
        ctx.font = '18px Georgia';
        ctx.fillText('Press Enter to Begin', 450, 396);
      }
    }

    // Lore flavor text cycling (pushed down if menu shown)
    const loreY = menuItems ? menuStartY + menuItems.length * menuItemH + 22 : 432;
    const loreLines = [
      '"The Crown was not made to be worn. It was made to hold a dream in place."',
      '"Do not let it wake."  — Oldest inscription, Valdris founding vault',
      '"The shard knows its bloodline. The bloodline does not always know itself."',
      '"I have watched three kings and one tyrant. The differences are smaller than they appear."  — Malachar',
      '"A kingdom is not its ruler. A kingdom is every person who has to live in the decisions a ruler makes."',
    ];
    const loreIdx = Math.floor(t * 0.0002) % loreLines.length;
    const loreCycle = (t * 0.0002) % 1;
    const loreAlpha = loreCycle < 0.1 ? loreCycle / 0.1 : loreCycle > 0.85 ? (1 - loreCycle) / 0.15 : 1;
    if (loreY < 590) {
      ctx.globalAlpha = loreAlpha * 0.50;
      ctx.fillStyle = '#aa9977';
      ctx.font = 'italic 12px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(loreLines[loreIdx], 450, loreY);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#3a3028';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('↑↓ Navigate  ·  Enter Select  ·  2-3 hours  ·  No install', 450, 598);

    drawParticles();
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }

  function drawTitleCrown(cx, cy, t) {
    const wobble = Math.sin(t * 0.0018) * 4;
    const glow   = 0.4 + 0.3 * Math.sin(t * 0.003);
    ctx.save();
    ctx.translate(cx, cy + wobble);

    // Outer glow
    const crownGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
    crownGlow.addColorStop(0, `rgba(220,160,30,${glow * 0.4})`);
    crownGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = crownGlow;
    ctx.fillRect(-80, -80, 160, 160);

    // Crown shape
    ctx.beginPath();
    ctx.moveTo(-55, 22);
    ctx.lineTo(-55, -8);
    ctx.lineTo(-34, -38);
    ctx.lineTo(-14, -10);
    ctx.lineTo(0,  -54);
    ctx.lineTo(14, -10);
    ctx.lineTo(34, -38);
    ctx.lineTo(55, -8);
    ctx.lineTo(55, 22);
    ctx.closePath();

    const crownFill = ctx.createLinearGradient(-55, -54, 55, 22);
    crownFill.addColorStop(0, `rgba(255,220,60,${0.35 + glow * 0.2})`);
    crownFill.addColorStop(1, `rgba(180,120,20,${0.2 + glow * 0.1})`);
    ctx.fillStyle = crownFill;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,50,${0.5 + glow * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Shattered fractures
    ctx.strokeStyle = 'rgba(80,40,200,0.7)';
    ctx.lineWidth = 1.5;
    const cracks = [[-20,-5,-10,12],[5,-30,20,-8],[-35,8,-22,-12],[18,-14,35,4]];
    for (const [x1,y1,x2,y2] of cracks) {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }

    // Shard points (glowing)
    const shardColors = ['#8844ff','#4488ff','#ff4488','#44ffaa'];
    const shardPos = [[-34,-38],[34,-38],[0,-54],[-14,-10],[14,-10]];
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = shardPos[i];
      const shAlpha = 0.5 + 0.5 * Math.sin(t * 0.003 + i * 1.2);
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
      sg.addColorStop(0, shardColors[i].replace(')', `,${shAlpha})`).replace('rgb', 'rgba'));
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx-14, sy-14, 28, 28);
      ctx.beginPath();
      ctx.moveTo(sx, sy-8); ctx.lineTo(sx-6, sy+5); ctx.lineTo(sx+6, sy+5);
      ctx.closePath();
      ctx.fillStyle = `rgba(200,160,255,${shAlpha * 0.7})`;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Prologue ─────────────────────────────────────────────────
  let prologueFrame = 0;
  let prologueTimer = 0;
  let prologueFade  = 0;  // 0=fade in, 1=visible, 2=fade out
  let prologueFadeAmt = 0;
  let prologueDone  = false;
  let prologueNarrated = [];  // track which frames have been narrated

  function startPrologue() {
    prologueFrame = 0;
    prologueTimer = 0;
    prologueFade  = 0;
    prologueFadeAmt = 0;
    prologueDone  = false;
    prologueNarrated = [];
  }

  function narrateText(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();  // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;  // Slightly slower for dramatic effect
      utterance.pitch = 0.95;  // Slightly lower pitch
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }

  function updatePrologue(dt) {
    if (prologueDone) return true;
    prologueTimer += dt;

    if (prologueFade === 0) {
      prologueFadeAmt = Math.min(1, prologueTimer / 600);
      if (prologueFadeAmt >= 1) { 
        prologueFade = 1; 
        prologueTimer = 0;
      }
    } else if (prologueFade === 1) {
      const frame = DATA.STORY.prologueFrames[prologueFrame];
      if (!frame) { prologueDone = true; return true; }
      if (prologueTimer >= frame.duration || INPUT.wasPressed(' ') || INPUT.wasPressed('Enter')) {
        prologueFade = 2; prologueTimer = 0;
      }
    } else if (prologueFade === 2) {
      prologueFadeAmt = 1 - Math.min(1, prologueTimer / 600);
      if (prologueFadeAmt <= 0) {
        prologueFrame++;
        if (prologueFrame >= DATA.STORY.prologueFrames.length) {
          prologueDone = true;
          return true;
        }
        prologueFade = 0; prologueFadeAmt = 0; prologueTimer = 0;
      }
    }
    return false;
  }

  function drawPrologueScene(scene, alpha) {
    const t = Date.now() * 0.001;
    
    switch(scene) {
      case 'stars':
        // Enhanced starfield with shooting stars
        for (const s of stars) {
          const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.5 + s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI*2);
          ctx.fillStyle = `rgba(220,220,200,${alpha * twinkle * 0.5})`;
          ctx.fill();
        }
        // Shooting star easter egg
        const shootingStar = (t * 0.3) % 1;
        if (shootingStar < 0.2) {
          const sx = shootingStar * 5 * W;
          const sy = 100 + shootingStar * 200;
          ctx.strokeStyle = `rgba(255,255,200,${alpha * (1 - shootingStar / 0.2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - 60, sy - 30);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        break;
        
      case 'vault':
        // Dark stone vault with actual crown drawing
        ctx.fillStyle = `rgba(10,8,15,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Stone archway
        ctx.fillStyle = `rgba(40,35,45,${alpha * 0.5})`;
        ctx.fillRect(W/2-150, H/2-100, 20, 200);
        ctx.fillRect(W/2+130, H/2-100, 20, 200);
        ctx.beginPath();
        ctx.arc(W/2, H/2-100, 150, Math.PI, 0);
        ctx.fill();
        
        // Draw the Starlight Crown
        const cx = W/2, cy = H/2-50;
        const pulse = 0.8 + 0.2 * Math.sin(t * 2);
        
        // Crown glow
        const crownGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 80);
        crownGlow.addColorStop(0, `rgba(255,220,100,${alpha * 0.6 * pulse})`);
        crownGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = crownGlow;
        ctx.fillRect(0, 0, W, H);
        
        // Crown base
        ctx.fillStyle = `rgba(255,220,80,${alpha})`;
        ctx.fillRect(cx-40, cy+10, 80, 8);
        
        // Crown points
        for (let i = 0; i < 5; i++) {
          const px = cx - 40 + i * 20;
          ctx.beginPath();
          ctx.moveTo(px, cy+10);
          ctx.lineTo(px+10, cy-20 - (i === 2 ? 15 : 0));
          ctx.lineTo(px+20, cy+10);
          ctx.fill();
          
          // Gems
          ctx.fillStyle = `rgba(150,200,255,${alpha * pulse})`;
          ctx.beginPath();
          ctx.arc(px+10, cy-15 - (i === 2 ? 15 : 0), 4, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,220,80,${alpha})`;
        }
        break;
        
      case 'betrayal':
        // Two figures - king and Aldric
        ctx.fillStyle = `rgba(15,10,20,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Red ominous glow
        const betrayalGlow = ctx.createRadialGradient(W/2+50, H/2, 30, W/2+50, H/2, 200);
        betrayalGlow.addColorStop(0, `rgba(180,40,40,${alpha * 0.4})`);
        betrayalGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = betrayalGlow;
        ctx.fillRect(0, 0, W, H);
        
        // King (left figure)
        ctx.fillStyle = `rgba(80,80,120,${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(W/2-60, H/2-20, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillRect(W/2-75, H/2+5, 30, 60);
        
        // Aldric (right figure - reaching)
        ctx.fillStyle = `rgba(120,60,60,${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(W/2+60, H/2-15, 25, 0, Math.PI*2);
        ctx.fill();
        ctx.fillRect(W/2+45, H/2+10, 30, 55);
        // Reaching hand
        ctx.fillStyle = `rgba(140,80,80,${alpha * 0.8})`;
        ctx.fillRect(W/2+20, H/2-30, 40, 12);
        break;
        
      case 'shatter':
        // Crown exploding into shards
        ctx.fillStyle = `rgba(5,5,10,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Explosion flash
        const flashIntensity = Math.max(0, 1 - t * 0.5) * alpha;
        ctx.fillStyle = `rgba(255,255,200,${flashIntensity * 0.3})`;
        ctx.fillRect(0, 0, W, H);
        
        // Four shards flying outward
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + t * 0.3;
          const dist = 80 + t * 30 + Math.sin(t + i) * 15;
          const x = W/2 + Math.cos(angle) * dist;
          const y = H/2 + Math.sin(angle) * dist;
          
          // Shard trail
          ctx.strokeStyle = `rgba(200,180,255,${alpha * 0.3})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(W/2, H/2);
          ctx.lineTo(x, y);
          ctx.stroke();
          
          // Shard
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle + t);
          ctx.fillStyle = `rgba(255,220,100,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(8, 0);
          ctx.lineTo(0, 12);
          ctx.lineTo(-8, 0);
          ctx.closePath();
          ctx.fill();
          
          // Shard glow
          const shardGlow = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
          shardGlow.addColorStop(0, `rgba(200,180,255,${alpha * 0.8})`);
          shardGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = shardGlow;
          ctx.fillRect(-30, -30, 60, 60);
          ctx.restore();
        }
        break;
        
      case 'prince':
        // Hooded figure in moonlight
        ctx.fillStyle = `rgba(8,8,15,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Moon
        ctx.fillStyle = `rgba(200,200,220,${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(W/2+200, 100, 60, 0, Math.PI*2);
        ctx.fill();
        
        // Prince silhouette
        ctx.fillStyle = `rgba(30,30,50,${alpha * 0.8})`;
        // Head
        ctx.beginPath();
        ctx.arc(W/2, H/2-30, 30, 0, Math.PI*2);
        ctx.fill();
        // Hood
        ctx.beginPath();
        ctx.moveTo(W/2-40, H/2-30);
        ctx.lineTo(W/2, H/2-70);
        ctx.lineTo(W/2+40, H/2-30);
        ctx.fill();
        // Body
        ctx.fillRect(W/2-35, H/2, 70, 80);
        // Cloak
        ctx.beginPath();
        ctx.moveTo(W/2-35, H/2+10);
        ctx.lineTo(W/2-60, H/2+90);
        ctx.lineTo(W/2+60, H/2+90);
        ctx.lineTo(W/2+35, H/2+10);
        ctx.fill();
        break;
        
      case 'village':
        // Peaceful village with houses
        const villageGlow = ctx.createRadialGradient(W/2, H/2+100, 50, W/2, H/2+100, 250);
        villageGlow.addColorStop(0, `rgba(60,120,60,${alpha * 0.25})`);
        villageGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = villageGlow;
        ctx.fillRect(0, 0, W, H);
        
        // Simple houses
        for (let i = 0; i < 3; i++) {
          const hx = W/2 - 120 + i * 120;
          const hy = H/2 + 50;
          // House
          ctx.fillStyle = `rgba(80,60,40,${alpha * 0.5})`;
          ctx.fillRect(hx, hy, 60, 50);
          // Roof
          ctx.fillStyle = `rgba(100,50,30,${alpha * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(hx-10, hy);
          ctx.lineTo(hx+30, hy-30);
          ctx.lineTo(hx+70, hy);
          ctx.fill();
          // Window light
          ctx.fillStyle = `rgba(255,200,100,${alpha * 0.4})`;
          ctx.fillRect(hx+20, hy+20, 20, 20);
        }
        break;
        
      case 'castle':
        // Detailed castle silhouette
        ctx.fillStyle = `rgba(15,10,20,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Castle structure
        ctx.fillStyle = `rgba(30,25,40,${alpha * 0.7})`;
        // Main keep
        ctx.fillRect(W/2-80, H/2-20, 160, 120);
        // Towers
        ctx.fillRect(W/2-100, H/2-40, 30, 140);
        ctx.fillRect(W/2+70, H/2-40, 30, 140);
        // Central tower
        ctx.fillRect(W/2-25, H/2-80, 50, 80);
        
        // Battlements
        for (let i = 0; i < 8; i++) {
          const bx = W/2-80 + i * 20;
          if (i % 2 === 0) ctx.fillRect(bx, H/2-30, 20, 10);
        }
        
        // Ominous window
        ctx.fillStyle = `rgba(180,100,100,${alpha * 0.6 * (0.8 + 0.2 * Math.sin(t * 2))})`;
        ctx.fillRect(W/2-10, H/2-50, 20, 30);
        break;
        
      case 'fire':
        // Actual animated fire
        ctx.fillStyle = `rgba(10,5,0,${alpha})`;
        ctx.fillRect(0, 0, W, H);
        
        // Multiple fire sources
        for (let fx = 0; fx < 5; fx++) {
          const fireX = 150 + fx * 150;
          const fireY = H/2 + 100;
          
          // Fire particles
          for (let i = 0; i < 15; i++) {
            const flicker = Math.sin(t * 5 + i + fx) * 0.5 + 0.5;
            const fy = fireY - i * 8 - Math.sin(t * 3 + i) * 10;
            const fsize = (15 - i) * (0.8 + flicker * 0.4);
            
            // Flame colors
            const colors = [
              `rgba(255,100,20,${alpha * (1 - i/15) * 0.8})`,
              `rgba(255,180,50,${alpha * (1 - i/15) * 0.6})`,
              `rgba(255,220,100,${alpha * (1 - i/15) * 0.4})`
            ];
            
            ctx.fillStyle = colors[i % 3];
            ctx.beginPath();
            ctx.arc(fireX + Math.sin(t * 2 + i) * 15, fy, fsize, 0, Math.PI*2);
            ctx.fill();
          }
        }
        
        // Burning building silhouette
        ctx.fillStyle = `rgba(20,10,5,${alpha * 0.8})`;
        ctx.fillRect(W/2-60, H/2+50, 120, 80);
        ctx.beginPath();
        ctx.moveTo(W/2-70, H/2+50);
        ctx.lineTo(W/2, H/2+10);
        ctx.lineTo(W/2+70, H/2+50);
        ctx.fill();
        
        // Smoke
        for (let s = 0; s < 8; s++) {
          const smokeY = H/2 - s * 30 - t * 20;
          const smokeX = W/2 + Math.sin(t + s) * 40;
          ctx.fillStyle = `rgba(60,50,40,${alpha * 0.3 * (1 - s/8)})`;
          ctx.beginPath();
          ctx.arc(smokeX, smokeY % H, 20 + s * 5, 0, Math.PI*2);
          ctx.fill();
        }
        break;
        
      case 'fade':
      default:
        // Just stars
        for (const s of stars) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 0.4, 0, Math.PI*2);
          ctx.fillStyle = `rgba(200,200,180,${alpha * 0.25})`;
          ctx.fill();
        }
        break;
    }
  }

  function drawPrologue() {
    // Deep black background
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, W, H);

    const frame = DATA.STORY.prologueFrames[prologueFrame];
    if (!frame) return;

    // Draw scene background
    drawPrologueScene(frame.scene || 'stars', prologueFadeAmt);

    ctx.globalAlpha = prologueFadeAmt;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text with shadow for better readability
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    
    const totalH = frame.lines.length * 34;
    let startY = H/2 - totalH/2;
    for (const line of frame.lines) {
      ctx.fillStyle = '#d4c8a8';
      ctx.font = line.startsWith('Ten') || line.startsWith('And') ? 'italic 22px Georgia' : '20px Georgia';
      ctx.fillText(line, W/2, startY);
      startY += 34;
    }
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Frame counter
    ctx.fillStyle = `rgba(100,80,60,${prologueFadeAmt * 0.7})`;
    ctx.font = '11px Georgia';
    ctx.fillText(`${prologueFrame+1} / ${DATA.STORY.prologueFrames.length}  —  Space/Enter to skip`, W/2, H-20);
    ctx.textAlign = 'left';
  }

  // ── World HUD ────────────────────────────────────────────────
  function drawWorldHUD(party, locationName, actProgress) {
    // Location name (bottom left) with fade
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, 8, H-38, 260, 30, 4); ctx.fill();
    ctx.strokeStyle = '#443322'; ctx.lineWidth=1;
    roundRect(ctx, 8, H-38, 260, 30, 4); ctx.stroke();
    ctx.fillStyle = '#ccaa66';
    ctx.font = '13px Georgia';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(locationName || 'Valdris', 16, H-23);

    // Act progress indicator (bottom left, above location)
    if (actProgress > 0) {
      const actLabel = actProgress >= 12 ? 'Epilogue' :
                       actProgress >= 10 ? `Act ${actProgress} — Endgame` :
                       `Act ${actProgress}`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, 8, H-68, 160, 22, 3); ctx.fill();
      ctx.fillStyle = '#887744'; ctx.font = 'italic 11px Georgia';
      ctx.fillText(`${actLabel}`, 14, H-57);
    }

    // Controls hint
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 278, H-38, 370, 30, 4); ctx.fill();
    ctx.fillStyle = '#777777';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('WASD/Arrows: Move  |  Enter/Space: Talk  |  Tab/I: Menu', 286, H-23);

    // Party status panel (top right)
    const px = W - 190, py = 8;
    const ph = party.length * 28 + 14;
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    roundRect(ctx, px-4, py-4, 194, ph+8, 4); ctx.fill();
    ctx.strokeStyle = '#443322'; ctx.lineWidth = 1;
    roundRect(ctx, px-4, py-4, 194, ph+8, 4); ctx.stroke();
    ctx.strokeStyle = '#665533'; ctx.lineWidth = 0.5;
    roundRect(ctx, px-2, py-2, 190, ph+4, 3); ctx.stroke();

    for (let i = 0; i < party.length; i++) {
      const ch = party[i];
      const ry = py + 4 + i * 28;
      const isDead = ch.dead || ch.hp <= 0;

      // Color dot (portrait-style mini circle)
      ctx.beginPath(); ctx.arc(px+9, ry+9, 7, 0, Math.PI*2);
      const dotGrad = ctx.createRadialGradient(px+7, ry+7, 1, px+9, ry+9, 7);
      dotGrad.addColorStop(0, isDead ? '#444' : hexAlpha(ch.color, 0.9));
      dotGrad.addColorStop(1, isDead ? '#222' : hexAlpha(ch.color, 0.5));
      ctx.fillStyle = dotGrad; ctx.fill();
      ctx.strokeStyle = isDead ? '#333' : '#888'; ctx.lineWidth=1; ctx.stroke();

      // Name & level
      ctx.fillStyle = isDead ? '#555' : (ch.color || '#fff');
      ctx.font = 'bold 11px Georgia';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(ch.name, px+20, ry+1);
      ctx.fillStyle = isDead ? '#443333' : '#aaa888';
      ctx.font = '9px Georgia';
      ctx.fillText(`Lv${ch.level}`, px+20, ry+12);

      // HP bar (wider)
      const bw = 80, bh = 5;
      const bx = px+68, by = ry+2;
      ctx.fillStyle = '#220000'; ctx.fillRect(bx, by, bw, bh);
      const hp = isDead ? 0 : (ch.hp / ch.maxHp);
      ctx.fillStyle = hp > 0.6 ? '#33cc44' : hp > 0.3 ? '#eecc00' : hp > 0 ? '#cc2222' : '#440000';
      ctx.fillRect(bx, by, Math.floor(bw * Math.max(0,hp)), bh);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      // HP number overlay
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font='7px Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`${ch.hp}/${ch.maxHp}`, bx+bw/2, by+bh/2);

      // MP bar
      const mpbh = 4;
      const mpbx = bx, mpby = by + 7;
      ctx.fillStyle = '#001133'; ctx.fillRect(mpbx, mpby, bw, mpbh);
      const maxMp = ch.maxMp || 1;
      const mp = Math.max(0, ch.mp / maxMp);
      ctx.fillStyle = '#2255cc';
      ctx.fillRect(mpbx, mpby, Math.floor(bw * Math.max(0,mp)), mpbh);
      ctx.strokeStyle = '#222244'; ctx.lineWidth = 1;
      ctx.strokeRect(mpbx, mpby, bw, mpbh);

      // DEAD indicator
      if (isDead) {
        ctx.fillStyle = 'rgba(180,0,0,0.7)';
        ctx.font = 'bold 9px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('KO', bx+bw/2, by+bh/2+2);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ── Menu system ──────────────────────────────────────────────
  let menuOpen = false;
  let menuTab  = 0;  // 0=Status, 1=Equipment, 2=Skills, 3=Save
  let menuSaveCallback = null;  // set externally by main.js
  let menuParty   = null;
  let menuEqChar  = 0;
  let menuSkChar  = 0;
  const MENU_TABS = ['Status','Equipment','Skills','Save'];

  function openMenu(party) {
    menuOpen  = true;
    menuTab   = 0;
    menuParty = party;
    menuEqChar = 0;
    menuSkChar = 0;
    if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuOpen();
  }

  function closeMenu() {
    menuOpen = false;
    if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuClose();
  }
  function isMenuOpen() { return menuOpen; }

  function updateMenu(dt, inventory) {
    if (!menuOpen) return;
    if (INPUT.wasPressed('Escape') || INPUT.wasPressed('Tab') || INPUT.wasPressed('i') || INPUT.wasPressed('I')) {
      closeMenu(); return;
    }
    // Tab switching: Q/E or left/right on top row
    if (INPUT.wasPressed('ArrowLeft')  || INPUT.wasPressed('q') || INPUT.wasPressed('Q'))
      menuTab = Math.max(0, menuTab-1);
    if (INPUT.wasPressed('ArrowRight') || INPUT.wasPressed('e') || INPUT.wasPressed('E'))
      menuTab = Math.min(MENU_TABS.length-1, menuTab+1);

    if (menuTab === 1 || menuTab === 2) {
      if (INPUT.wasPressed('ArrowUp')   || INPUT.wasPressed('w')) {
        if (menuTab===1) menuEqChar = Math.max(0, menuEqChar-1);
        else             menuSkChar = Math.max(0, menuSkChar-1);
      }
      if (INPUT.wasPressed('ArrowDown') || INPUT.wasPressed('s')) {
        if (menuTab===1) menuEqChar = Math.min((menuParty||[]).length-1, menuEqChar+1);
        else             menuSkChar = Math.min((menuParty||[]).length-1, menuSkChar+1);
      }
    }

    // Click handling
    const click = INPUT.consumeClick();
    if (click) {
      // Tab buttons
      for (let i = 0; i < MENU_TABS.length; i++) {
        const tx = 60 + i * 140, ty = 50;
        if (click.x >= tx && click.x <= tx+130 && click.y >= ty && click.y <= ty+32) {
          menuTab = i;
        }
      }
      // Close button
      if (click.x >= W-60 && click.x <= W-20 && click.y >= 15 && click.y <= 45) {
        closeMenu();
      }
      // Equipment equip/unequip
      if (menuTab === 1 && menuParty) {
        handleEquipClick(click, menuParty, inventory);
      }
    }
  }

  function handleEquipClick(click, party, inventory) {
    if (!party || !inventory) return;
    const ch = party[menuEqChar];
    if (!ch) return;
    // Slot buttons (3 slots, each row y ~ 180+slot*50)
    const slotY = [200, 250, 300];
    const slots = ['weapon','armor','accessory'];
    for (let s = 0; s < 3; s++) {
      if (click.y >= slotY[s] && click.y <= slotY[s]+40) {
        // Clicked slot — try to cycle equipment available for this slot/char
        const slot = slots[s];
        const available = Object.keys(DATA.EQUIPMENT).filter(k => {
          const e = DATA.EQUIPMENT[k];
          return e.slot === slot && (!e.chars || e.chars.includes(ch.name)) && inventory.includes(k);
        });
        if (available.length === 0) return;
        const current = ch.equipment[slot];
        const idx = current ? available.indexOf(current) : -1;
        const next = available[(idx+1) % (available.length+1)];
        ch.equipment[slot] = (idx === available.length-1) ? null : (next || null);
        DATA.applyEquipment(ch, ch.equipment);
        if (typeof AUDIO !== 'undefined') AUDIO.sfx.equip();
      }
    }
  }

  function drawMenu(party, inventory) {
    if (!menuOpen) return;
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);
    // Panel
    ctx.fillStyle = 'rgba(8,6,18,0.98)';
    roundRect(ctx, 30, 30, W-60, H-60, 8); ctx.fill();
    ctx.strokeStyle = '#554422'; ctx.lineWidth = 2;
    roundRect(ctx, 30, 30, W-60, H-60, 8); ctx.stroke();
    ctx.strokeStyle = '#aa8844'; ctx.lineWidth = 1;
    roundRect(ctx, 34, 34, W-68, H-68, 6); ctx.stroke();

    // Title
    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('— MENU —', W/2, 52);

    // Close button
    ctx.fillStyle = '#443322';
    roundRect(ctx, W-62, 17, 40, 30, 4); ctx.fill();
    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 14px Georgia';
    ctx.fillText('✕', W-42, 32);

    // Tab buttons
    for (let i = 0; i < MENU_TABS.length; i++) {
      const tx = 60 + i * 140, ty = 50;
      const active = i === menuTab;
      ctx.fillStyle = active ? 'rgba(60,40,100,0.95)' : 'rgba(20,16,30,0.8)';
      roundRect(ctx, tx, ty, 130, 32, 4); ctx.fill();
      ctx.strokeStyle = active ? '#aa88ff' : '#443355'; ctx.lineWidth = 1;
      roundRect(ctx, tx, ty, 130, 32, 4); ctx.stroke();
      ctx.fillStyle = active ? '#ffffff' : '#888888';
      ctx.font = active ? 'bold 13px Georgia' : '13px Georgia';
      ctx.fillText(MENU_TABS[i], tx + 65, ty + 16);
    }

    // Content area
    const cx = 50, cy = 100, cw = W-100, ch2 = H-170;
    ctx.fillStyle = 'rgba(4,2,12,0.6)';
    roundRect(ctx, cx, cy, cw, ch2, 4); ctx.fill();

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    if (menuTab === 0) drawMenuStatus(party, cx, cy, cw, ch2);
    else if (menuTab === 1) drawMenuEquipment(party, inventory, cx, cy, cw, ch2);
    else if (menuTab === 2) drawMenuSkills(party, cx, cy, cw, ch2);
    else if (menuTab === 3) drawMenuSave(cx, cy, cw, ch2);
  }

  function drawMenuSave(x, y, w, h) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ccbb88';
    ctx.font = 'bold 18px Georgia';
    ctx.fillText('Save Game', x + w/2, y + 30);
    ctx.font = '14px Georgia';
    ctx.fillStyle = '#887766';
    ctx.fillText('Game auto-saves after each act. Manual save below.', x + w/2, y + 60);

    // 3 save slot buttons
    for (let i = 0; i < 3; i++) {
      const bx = x + w/2 - 160, by = y + 90 + i * 60;
      const save = typeof SAVE !== 'undefined' ? SAVE.get(i) : null;
      ctx.fillStyle = 'rgba(30,20,50,0.8)';
      roundRect(ctx, bx, by, 320, 45, 6); ctx.fill();
      ctx.strokeStyle = '#554477'; ctx.lineWidth = 1;
      roundRect(ctx, bx, by, 320, 45, 6); ctx.stroke();
      ctx.fillStyle = '#aaddff';
      ctx.font = 'bold 15px Georgia';
      ctx.fillText(`Slot ${i+1}`, bx + 160, by + 15);
      ctx.fillStyle = '#887799';
      ctx.font = '13px Georgia';
      if (save) {
        const d = new Date(save.savedAt);
        ctx.fillText(`Act ${save.actProgress} — ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`, bx + 160, by + 33);
      } else {
        ctx.fillText('Empty', bx + 160, by + 33);
      }
    }

    ctx.font = '13px Georgia';
    ctx.fillStyle = '#665544';
    ctx.textAlign = 'center';
    ctx.fillText('Click a slot to save. Load from the title screen.', x + w/2, y + h - 20);

    // Click detection for save slots
    const click = INPUT.consumeClick();
    if (click) {
      for (let i = 0; i < 3; i++) {
        const bx = x + w/2 - 160, by = y + 90 + i * 60;
        if (click.x >= bx && click.x <= bx+320 && click.y >= by && click.y <= by+45) {
          if (menuSaveCallback) menuSaveCallback(i);
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.equip();
        }
      }
    }
  }

  function drawMenuStatus(party, x, y, w, h) {
    if (!party || party.length === 0) return;
    const colW = w / Math.max(party.length, 1);
    for (let i = 0; i < party.length; i++) {
      const ch = party[i];
      const cx2 = x + i * colW + colW/2;
      // Portrait
      drawPortrait(ch.portrait, cx2, y+50, 34);
      // Name & class
      ctx.fillStyle = ch.color;
      ctx.font = 'bold 14px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(ch.name, cx2, y+94);
      ctx.fillStyle = '#888888';
      ctx.font = '11px Georgia';
      ctx.fillText(ch.class, cx2, y+110);
      // Level / EXP
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`Lv ${ch.level}   EXP: ${ch.exp} / ${DATA.expForLevel(ch.level)}`, cx2, y+124);
      // Stat bars
      const stats = [
        { label:'HP',  val:ch.hp,    max:ch.maxHp,  fill:'#33cc44', bg:'#220000' },
        { label:'MP',  val:ch.mp,    max:ch.maxMp,  fill:'#2255cc', bg:'#001133' },
      ];
      let sy = y+140;
      for (const st of stats) {
        ctx.fillStyle = '#888'; ctx.font = '11px Georgia'; ctx.textAlign = 'left';
        ctx.fillText(`${st.label}: ${st.val}/${st.max}`, cx2 - colW/2 + 10, sy);
        const bx2 = cx2-colW/2+10, bw2 = colW-20, bh2 = 8;
        ctx.fillStyle = st.bg; ctx.fillRect(bx2, sy+13, bw2, bh2);
        const pct = Math.max(0, st.val/st.max);
        ctx.fillStyle = st.fill; ctx.fillRect(bx2, sy+13, bw2*pct, bh2);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(bx2, sy+13, bw2, bh2);
        sy += 28;
      }
      // Stats grid
      const statList = [
        ['ATK', ch.atk], ['DEF', ch.def], ['MAG', ch.mag],
        ['SPD', ch.spd], ['LCK', ch.luck], ['MOV', ch.move],
      ];
      sy += 4;
      for (let si = 0; si < statList.length; si++) {
        const [sn, sv] = statList[si];
        const col2 = si % 2, row2 = Math.floor(si / 2);
        const sx2 = cx2 - colW/2 + 10 + col2 * (colW/2 - 10);
        const ssy = sy + row2 * 18;
        ctx.fillStyle = '#667788';
        ctx.font = '11px Georgia';
        ctx.textAlign = 'left';
        ctx.fillText(`${sn}:`, sx2, ssy);
        ctx.fillStyle = '#ccddee';
        ctx.fillText(`${sv}`, sx2+30, ssy);
      }
    }
    ctx.textAlign = 'left';
  }

  function drawMenuEquipment(party, inventory, x, y, w, h) {
    if (!party || party.length === 0) return;
    // Character selector (left strip)
    const stripW = 120;
    for (let i = 0; i < party.length; i++) {
      const ch = party[i];
      const by = y+10+i*44;
      const sel = i === menuEqChar;
      ctx.fillStyle = sel ? 'rgba(60,40,100,0.9)' : 'rgba(20,16,30,0.7)';
      roundRect(ctx, x+6, by, stripW-12, 38, 3); ctx.fill();
      if (sel) { ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 1; roundRect(ctx, x+6, by, stripW-12, 38, 3); ctx.stroke(); }
      drawPortrait(ch.portrait, x+28, by+19, 14);
      ctx.fillStyle = sel ? '#fff' : '#aaa';
      ctx.font = 'bold 12px Georgia'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(ch.name, x+48, by+8);
      ctx.fillStyle = '#666'; ctx.font = '10px Georgia';
      ctx.fillText(`Lv ${ch.level}`, x+48, by+22);
    }

    // Equipment detail (right)
    const ch = party[menuEqChar];
    if (!ch) return;
    const ex = x + stripW + 10, ew = w - stripW - 15;

    ctx.fillStyle = ch.color; ctx.font = 'bold 15px Georgia'; ctx.textAlign = 'left';
    ctx.fillText(`${ch.name} — Equipment`, ex, y+10);

    const slots = ['weapon','armor','accessory'];
    const slotNames = ['Weapon','Armor','Accessory'];
    for (let s = 0; s < 3; s++) {
      const slotY = y+40+s*56;
      const key = ch.equipment[slots[s]];
      const eq  = key ? DATA.EQUIPMENT[key] : null;
      ctx.fillStyle = 'rgba(20,16,40,0.8)';
      roundRect(ctx, ex, slotY, ew-4, 48, 3); ctx.fill();
      ctx.strokeStyle = key ? '#aa8844' : '#333344'; ctx.lineWidth = 1;
      roundRect(ctx, ex, slotY, ew-4, 48, 3); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '11px Georgia';
      ctx.fillText(slotNames[s], ex+8, slotY+6);
      ctx.fillStyle = key ? '#ffffff' : '#555';
      ctx.font = 'bold 13px Georgia';
      ctx.fillText(eq ? eq.name : '(none)', ex+8, slotY+22);
      if (eq) {
        ctx.fillStyle = '#88aa88'; ctx.font = '11px Georgia';
        ctx.fillText(eq.desc, ex+8, slotY+36);
      }
      // Click instruction
      ctx.fillStyle = '#556677'; ctx.font = '10px Georgia';
      ctx.textAlign = 'right';
      ctx.fillText('click to cycle ▶', ex+ew-8, slotY+38);
      ctx.textAlign = 'left';
    }

    // Available inventory
    ctx.fillStyle = '#778899'; ctx.font = '12px Georgia';
    ctx.fillText('Available Items:', ex, y+220);
    if (!inventory || inventory.length === 0) {
      ctx.fillStyle = '#445566'; ctx.fillText('None yet', ex+4, y+238);
    } else {
      let iy = y+236;
      for (const k of inventory) {
        const eq = DATA.EQUIPMENT[k]; if (!eq) continue;
        const forChar = !eq.chars || eq.chars.includes(ch.name);
        ctx.fillStyle = forChar ? '#aabbcc' : '#445566';
        ctx.font = '11px Georgia';
        ctx.fillText(`• ${eq.name}  (${eq.desc})${forChar ? '' : ' [not usable]'}`, ex+4, iy);
        iy += 16;
        if (iy > y+h-20) break;
      }
    }
  }

  function drawMenuSkills(party, x, y, w, h) {
    if (!party || party.length === 0) return;
    const stripW = 120;
    // Character selector
    for (let i = 0; i < party.length; i++) {
      const ch = party[i];
      const by = y+10+i*44;
      const sel = i === menuSkChar;
      ctx.fillStyle = sel ? 'rgba(60,40,100,0.9)' : 'rgba(20,16,30,0.7)';
      roundRect(ctx, x+6, by, stripW-12, 38, 3); ctx.fill();
      if (sel) { ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 1; roundRect(ctx, x+6, by, stripW-12, 38, 3); ctx.stroke(); }
      drawPortrait(ch.portrait, x+28, by+19, 14);
      ctx.fillStyle = sel ? '#fff' : '#aaa';
      ctx.font = 'bold 12px Georgia'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(ch.name, x+48, by+8);
    }
    // Skill list
    const ch = party[menuSkChar];
    if (!ch) return;
    const ex = x + stripW + 10, ew = w - stripW - 15;
    ctx.fillStyle = ch.color; ctx.font = 'bold 15px Georgia'; ctx.textAlign = 'left';
    ctx.fillText(`${ch.name} — Skills`, ex, y+10);
    let sy = y+32;
    for (const sk of ch.skills) {
      const skDef = DATA.SKILLS[sk]; if (!skDef) continue;
      ctx.fillStyle = 'rgba(20,16,40,0.8)';
      roundRect(ctx, ex, sy, ew-4, 42, 3); ctx.fill();
      ctx.strokeStyle = '#334455'; ctx.lineWidth = 1;
      roundRect(ctx, ex, sy, ew-4, 42, 3); ctx.stroke();
      ctx.fillStyle = '#ddeecc'; ctx.font = 'bold 12px Georgia';
      ctx.fillText(skDef.name, ex+8, sy+6);
      ctx.fillStyle = '#8899aa'; ctx.font = '11px Georgia';
      ctx.fillText(`MP: ${skDef.mp}  |  ${skDef.desc || ''}`, ex+8, sy+22);
      const typeColors = {physical:'#ff8866',magic:'#88aaff',heal:'#44ff88',buff:'#88ff44',debuff:'#ff4488',revive:'#ffdd44'};
      ctx.fillStyle = typeColors[skDef.type] || '#888';
      ctx.textAlign = 'right';
      ctx.fillText(skDef.type, ex+ew-8, sy+6);
      ctx.textAlign = 'left';
      sy += 48;
      if (sy > y+h-20) break;
    }
  }

  // ── Act banner ───────────────────────────────────────────────
  let actBannerText  = '';
  let actBannerTimer = 0;
  let actBannerSubtitle = '';

  function showActBanner(text, sub) {
    actBannerText  = text;
    actBannerSubtitle = sub || '';
    actBannerTimer = 4000;
  }
  function updateActBanner(dt) { if (actBannerTimer > 0) actBannerTimer -= dt; }
  function drawActBanner() {
    if (actBannerTimer <= 0) return;
    const alpha = actBannerTimer < 500 ? actBannerTimer / 500 :
                  actBannerTimer > 3500 ? (4000 - actBannerTimer) / 500 : 1;
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.75})`;
    ctx.fillRect(0, H/2-55, W, 110);
    // Decorative lines
    ctx.strokeStyle = `rgba(180,140,60,${alpha * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, H/2-2); ctx.lineTo(W-60, H/2-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, H/2+2); ctx.lineTo(W-60, H/2+2); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,220,100,${alpha})`;
    ctx.font = 'bold 30px Georgia';
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 25 * alpha;
    ctx.fillText(actBannerText, W/2, H/2-20);
    ctx.shadowBlur = 0;
    if (actBannerSubtitle) {
      ctx.fillStyle = `rgba(200,180,140,${alpha})`;
      ctx.font = 'italic 16px Georgia';
      ctx.fillText(actBannerSubtitle, W/2, H/2+18);
    }
    ctx.textAlign = 'left';
  }

  // ── Notification ─────────────────────────────────────────────
  let notifText  = '';
  let notifTimer = 0;
  let notifColor = '#ffffff';

  function showNotif(text, color, duration) {
    notifText  = text;
    notifColor = color || '#ffffff';
    notifTimer = duration || 2200;
  }
  function updateNotif(dt) { if (notifTimer > 0) notifTimer -= dt; }
  function drawNotif() {
    if (notifTimer <= 0) return;
    const alpha = Math.min(1, notifTimer / 350);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
    const tw = ctx.measureText(notifText).width + 30;
    ctx.fillRect(W/2-tw/2, 72, tw, 28);
    ctx.fillStyle = notifColor.startsWith('#') ? hexAlpha(notifColor, alpha) : notifColor;
    ctx.font = 'bold 16px Georgia';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText(notifText, W/2, 86);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
  }

  // ── Victory screen ───────────────────────────────────────────
  let victoryActive  = false;
  let victoryTimer   = 0;
  let victoryLines   = [];
  let victoryCB      = null;
  let victoryParty   = null;  // party reference for portrait cards

  function showVictory(lines, cb, party) {
    victoryActive = true;
    victoryTimer  = 4200;
    victoryLines  = lines || [];
    victoryCB     = cb || null;
    victoryParty  = party || null;
    spawnParticles(W/2, H/3, 'victory', 22);
    spawnParticles(W/4, H/2, 'victory', 12);
    spawnParticles(3*W/4, H/2, 'victory', 12);
  }
  function updateVictory(dt) {
    if (!victoryActive) return;
    victoryTimer -= dt;
    updateParticles(dt);
    // Spawn trailing victory particles
    if (Math.random() < 0.12) {
      spawnParticles(Math.random() * W, Math.random() * H * 0.6, 'victory', 3);
    }
    if (victoryTimer <= 0) {
      victoryActive = false;
      if (victoryCB) { const c = victoryCB; victoryCB = null; c(); }
    }
  }
  function drawVictory() {
    if (!victoryActive) return;
    const alpha = Math.min(1, victoryTimer > 3800 ? (4200-victoryTimer)/400 : victoryTimer < 400 ? victoryTimer/400 : 1);

    // Radiant background
    ctx.fillStyle = `rgba(255,220,50,${alpha * 0.08})`;
    ctx.fillRect(0, 0, W, H);
    const vGlow = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, 380);
    vGlow.addColorStop(0, `rgba(255,200,50,${alpha*0.2})`);
    vGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vGlow; ctx.fillRect(0, 0, W, H);

    // VICTORY text
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,220,50,${alpha})`;
    ctx.font = 'bold 56px Georgia';
    ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 40 * alpha;
    ctx.fillText('VICTORY!', W/2, 90);
    ctx.shadowBlur = 0;

    // Decorative line
    ctx.strokeStyle = `rgba(200,160,60,${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(100, 120); ctx.lineTo(W-100, 120); ctx.stroke();

    // Reward lines (EXP, level ups, etc.)
    for (let i = 0; i < victoryLines.length; i++) {
      const lineAlpha = Math.min(1, alpha * (1.5 - i * 0.15));
      ctx.fillStyle = `rgba(180,255,180,${lineAlpha})`;
      ctx.font = i === 0 ? 'bold 20px Georgia' : '16px Georgia';
      ctx.fillText(victoryLines[i], W/2, 148 + i * 28);
    }

    // Party portrait row (if provided)
    if (victoryParty && victoryParty.length > 0) {
      const cardW = 140, cardH = 90;
      const totalW = victoryParty.length * (cardW + 12) - 12;
      const startX = W/2 - totalW/2;
      const cardY = 280;

      for (let i = 0; i < victoryParty.length; i++) {
        const ch = victoryParty[i];
        const cx2 = startX + i * (cardW + 12);
        const slideAlpha = Math.min(1, alpha * 2) * (victoryTimer > 3500 ? (4200-victoryTimer)/700 : 1);

        // Card background
        ctx.fillStyle = `rgba(8,6,20,${slideAlpha * 0.9})`;
        roundRect(ctx, cx2, cardY, cardW, cardH, 4); ctx.fill();
        ctx.strokeStyle = `rgba(${parseInt(ch.color.slice(1,3),16)},${parseInt(ch.color.slice(3,5),16)},${parseInt(ch.color.slice(5,7),16)},${slideAlpha * 0.8})`;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cx2, cardY, cardW, cardH, 4); ctx.stroke();

        // Portrait
        ctx.globalAlpha = slideAlpha;
        drawPortrait(ch.portrait, cx2 + 26, cardY + 30, 22);
        ctx.globalAlpha = 1;

        // Name
        ctx.fillStyle = `rgba(255,255,255,${slideAlpha})`;
        ctx.font = `bold 12px Georgia`; ctx.textAlign = 'left';
        ctx.fillText(ch.name, cx2 + 54, cardY + 10);

        // HP/MP status
        ctx.fillStyle = `rgba(160,200,160,${slideAlpha})`;
        ctx.font = '10px Georgia';
        ctx.fillText(`HP: ${ch.hp}/${ch.maxHp}`, cx2 + 54, cardY + 26);
        ctx.fillStyle = `rgba(120,160,220,${slideAlpha})`;
        ctx.fillText(`MP: ${ch.mp}/${ch.maxMp}`, cx2 + 54, cardY + 40);

        // Mini HP bar
        const bw2 = cardW - 60, bx2 = cx2 + 54, by2 = cardY + 54;
        ctx.fillStyle = '#220000'; ctx.fillRect(bx2, by2, bw2, 6);
        const hpPct = Math.max(0, ch.hp/ch.maxHp);
        ctx.fillStyle = hpPct > 0.5 ? '#33cc44' : hpPct > 0.25 ? '#eecc00' : '#cc2222';
        ctx.fillRect(bx2, by2, Math.floor(bw2*hpPct), 6);
        ctx.strokeStyle='#333'; ctx.lineWidth=1; ctx.strokeRect(bx2, by2, bw2, 6);

        // Level
        ctx.fillStyle = `rgba(220,200,120,${slideAlpha})`;
        ctx.font = '10px Georgia';
        ctx.fillText(`Lv ${ch.level}`, cx2 + 54, cardY + 68);
      }
    }

    drawParticles();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ── Game Over screen ─────────────────────────────────────────
  let gameOverAlpha  = 0;
  let gameOverEmbers = [];
  function _initGameOverEmbers() {
    gameOverEmbers = [];
    for (let i = 0; i < 55; i++) {
      gameOverEmbers.push({
        x: Math.random() * W,
        y: Math.random() * H + H,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(Math.random() * 0.9 + 0.3),
        r: Math.random() * 2.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        flicker: Math.random() * Math.PI * 2,
      });
    }
  }
  _initGameOverEmbers();

  function drawGameOver() {
    gameOverAlpha = Math.min(1, gameOverAlpha + 0.008);
    const ga = gameOverAlpha;

    // Deep crimson background vignette
    ctx.fillStyle = `rgba(30,0,0,${ga * 0.92})`;
    ctx.fillRect(0, 0, W, H);

    // Radial dark center glow
    const vg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H*0.65);
    vg.addColorStop(0, `rgba(100,0,0,${ga * 0.45})`);
    vg.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Ember particles rising
    const t = Date.now() / 1000;
    for (const e of gameOverEmbers) {
      e.x  += e.vx;
      e.y  += e.vy;
      e.flicker += 0.07;
      if (e.y < -10) { e.y = H + 5; e.x = Math.random() * W; }
      const fa = (e.alpha * (0.7 + 0.3 * Math.sin(e.flicker))) * Math.min(1, ga * 3);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${Math.floor(80 + 60 * Math.sin(e.flicker))},0,${fa})`;
      ctx.fill();
    }

    if (ga > 0.45) {
      const a = Math.min(1, (ga - 0.45) * 1.82);
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';

      // Cracked-shadow layered text effect
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.1);
      for (let d = 6; d >= 1; d--) {
        ctx.shadowColor = `rgba(255,0,0,${a * 0.18})`;
        ctx.shadowBlur  = d * 9;
        ctx.fillStyle   = `rgba(${Math.floor(140 + d * 12)},0,0,${a * 0.5})`;
        ctx.font        = `bold 74px Georgia`;
        ctx.fillText('GAME OVER', W/2 + d, H/2 - 48 + d);
      }
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 55 * pulse;
      ctx.fillStyle   = `rgba(230,35,35,${a})`;
      ctx.font        = 'bold 74px Georgia';
      ctx.fillText('GAME OVER', W/2, H/2 - 48);
      ctx.shadowBlur  = 0;

      // Subtitle
      const flavorLines = [
        '"The Crown remains shattered."',
        '"Vareth stirs in the silence."',
        '"Someone must try again."',
      ];
      const fi = Math.floor(t / 6) % flavorLines.length;
      ctx.fillStyle = `rgba(200,140,140,${a * 0.75})`;
      ctx.font      = `italic 17px Georgia`;
      ctx.fillText(flavorLines[fi], W/2, H/2 + 6);

      // Horizontal rule decorative lines
      ctx.strokeStyle = `rgba(180,30,30,${a * 0.6})`;
      ctx.lineWidth   = 1;
      const rw = 190;
      ctx.beginPath(); ctx.moveTo(W/2 - rw, H/2 + 26); ctx.lineTo(W/2 + rw, H/2 + 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W/2 - rw, H/2 - 80); ctx.lineTo(W/2 + rw, H/2 - 80); ctx.stroke();

      // Blinking prompt
      if (Math.floor(t / 0.62) % 2 === 0) {
        ctx.shadowColor = 'rgba(255,80,80,0.6)';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = `rgba(255,180,180,${a})`;
        ctx.font        = '19px Georgia';
        ctx.fillText('Press Enter to Retry', W/2, H/2 + 52);
        ctx.shadowBlur  = 0;
      }

      // Bottom lore fragment fading in late
      if (ga > 0.85) {
        const la = Math.min(1, (ga - 0.85) * 6.7);
        ctx.fillStyle = `rgba(160,100,100,${la * 0.55})`;
        ctx.font      = 'italic 13px Georgia';
        ctx.fillText('Every ending is a beginning held in suspension.', W/2, H - 36);
      }
    }
    ctx.textAlign = 'left';
  }
  function resetGameOver() { gameOverAlpha = 0; _initGameOverEmbers(); }

  // ── Ending / Epilogue ────────────────────────────────────────
  let endingActive   = false;
  let endingScrollY  = H + 80;
  let endingPhase    = 'scroll';   // 'scroll' | 'final'
  let endingFinal    = false;
  let endingFinalDialogue = null;
  let endingDone     = false;

  function startEnding() {
    endingActive   = true;
    endingScrollY  = H + 80;
    endingPhase    = 'scroll';
    endingFinal    = false;
    endingDone     = false;
    endingFinalDialogue = null;
  }

  // Ending screen constellation lines (static seed)
  const _endingConstLines = (() => {
    const pts = [];
    const rng = (s) => ((s * 2654435769) >>> 0) / 0xffffffff;
    for (let i = 0; i < 18; i++) {
      pts.push({ x: rng(i * 3 + 1) * 760, y: rng(i * 3 + 2) * 480 });
    }
    // Connect some neighbors
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
      if (dx*dx + dy*dy < 22000) segs.push([i, i+1]);
    }
    return { pts, segs };
  })();

  function drawEnding(dt) {
    if (!endingActive) return false;
    endingScrollY -= 0.55;

    const t = Date.now() / 1000;

    // Dark sky background
    ctx.fillStyle = '#01010a';
    ctx.fillRect(0, 0, W, H);

    // Nebula wisps in background
    const neb1 = ctx.createRadialGradient(W*0.25, H*0.35, 0, W*0.25, H*0.35, 280);
    neb1.addColorStop(0, 'rgba(40,20,80,0.18)');
    neb1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);

    const neb2 = ctx.createRadialGradient(W*0.75, H*0.6, 0, W*0.75, H*0.6, 220);
    neb2.addColorStop(0, 'rgba(20,50,80,0.15)');
    neb2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);

    // Stars with slow twinkle
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed * 3.1 + s.x);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,200,185,${0.15 + 0.25 * twinkle})`;
      ctx.fill();
    }

    // Constellation overlay (faint)
    const { pts, segs } = _endingConstLines;
    ctx.strokeStyle = 'rgba(180,170,200,0.07)';
    ctx.lineWidth   = 0.8;
    for (const [a, b] of segs) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }
    for (const p of pts) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,190,220,0.18)';
      ctx.fill();
    }

    // Gradient vignette (top/bottom fade bands)
    const topGrad = ctx.createLinearGradient(0, 0, 0, 90);
    topGrad.addColorStop(0, 'rgba(1,1,10,1)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 90);
    const botGrad = ctx.createLinearGradient(0, H-90, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, 'rgba(1,1,10,1)');
    ctx.fillStyle = botGrad; ctx.fillRect(0, H-90, W, 90);

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';

    const lines = DATA.STORY.epilogueNarration;
    let y = endingScrollY;

    // Title
    const titlePulse = 0.88 + 0.12 * Math.sin(t * 1.4);
    ctx.shadowColor = 'rgba(255,220,100,0.55)';
    ctx.shadowBlur  = 18 * titlePulse;
    ctx.fillStyle   = `rgba(255,228,120,${Math.min(1, Math.max(0, Math.min(1 - (y-(H-100))/100, y/80)))})`;
    ctx.font        = 'bold 28px Georgia';
    ctx.fillText('~ Epilogue ~', W/2, y - 66);
    ctx.shadowBlur  = 0;
    ctx.font        = '17px Georgia';

    for (const line of lines) {
      if (line === '') { y += 22; continue; }
      const br    = 1 - Math.max(0, Math.min(1, (y - (H-190)) / 200));
      const bt    = Math.max(0, Math.min(1, (y - 110) / 110));
      const alpha = Math.min(br, bt);
      // Italic for quoted lines
      const isQuote = line.startsWith('"') || line.startsWith('\u201c');
      ctx.font      = isQuote ? 'italic 17px Georgia' : '17px Georgia';
      ctx.fillStyle = isQuote
        ? `rgba(220,200,160,${alpha})`
        : `rgba(200,192,175,${alpha})`;
      ctx.fillText(line, W/2, y);
      y += 28;
    }

    y += 55;
    const e2a = 1 - Math.max(0, Math.min(1, (y - (H - 120)) / 80));
    const e2b = Math.max(0, Math.min(1, (y - 100) / 80));
    const e2  = Math.min(e2a, e2b);

    if (e2 > 0) {
      // Decorative rule above finale text
      ctx.strokeStyle = `rgba(255,220,80,${e2 * 0.4})`;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(W/2 - 160, y - 14); ctx.lineTo(W/2 + 160, y - 14); ctx.stroke();

      ctx.shadowColor = 'rgba(255,200,80,0.7)';
      ctx.shadowBlur  = 22;
      ctx.fillStyle   = `rgba(255,220,100,${e2})`;
      ctx.font        = 'bold 38px Georgia';
      ctx.fillText('~ The Crown Sleeps ~', W/2, y);
      ctx.shadowBlur  = 0;

      y += 50;
      ctx.fillStyle = `rgba(180,165,145,${e2})`;
      ctx.font      = 'italic 21px Georgia';
      ctx.fillText('"The road goes on."', W/2, y);

      y += 40;
      ctx.strokeStyle = `rgba(255,220,80,${e2 * 0.3})`;
      ctx.beginPath(); ctx.moveTo(W/2 - 100, y); ctx.lineTo(W/2 + 100, y); ctx.stroke();
    }

    if (y + 130 < 0) {
      endingActive = false;
      endingDone   = true;
      ctx.textAlign = 'left';
      return true;
    }

    ctx.textAlign = 'left';
    return false;
  }

  // ── Fade ─────────────────────────────────────────────────────
  let fadeAlpha = 0, fadeDir = 0, fadeDuration = 450, fadeTimer = 0, fadeCB = null;
  function fadeOut(cb, dur) {
    console.log('[FADE] fadeOut called, duration:', dur || 450);
    fadeDir = 1; fadeAlpha = 0; fadeTimer = 0; fadeCB = cb || null;
    fadeDuration = dur || 450;
  }
  function fadeIn(dur) {
    console.log('[FADE] fadeIn called, duration:', dur || 450);
    fadeDir = -1; fadeAlpha = 1; fadeTimer = 0; fadeCB = null;
    fadeDuration = dur || 450;
  }
  function updateFade(dt) {
    if (fadeDir === 0) return;
    fadeTimer += dt;
    const p = Math.min(1, fadeTimer / fadeDuration);
    if (fadeDir === 1) {
      fadeAlpha = p;
      if (p >= 1) {
        console.log('[FADE] fadeOut complete, executing callback');
        fadeDir = 0;
        if (fadeCB) { const c = fadeCB; fadeCB = null; c(); }
      }
    } else {
      fadeAlpha = 1 - p;
      if (p >= 1) { 
        console.log('[FADE] fadeIn complete');
        fadeDir = 0; fadeAlpha = 0; 
      }
    }
  }
  function drawFade() {
    if (fadeAlpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
  function isFading() { return fadeDir !== 0; }

  // ── Pre-battle intro screen ──────────────────────────────────
  let preBattleActive = false;
  let preBattleDef    = null;
  let preBattleTimer  = 0;

  function showPreBattle(def) {
    preBattleActive = true;
    preBattleDef    = def;
    preBattleTimer  = 2200;
  }

  function drawPreBattle() {
    if (!preBattleActive || !preBattleDef) return;
    const alpha = Math.min(1, preBattleTimer/400);
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.9})`;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(200,160,60,${alpha})`;
    ctx.font = 'bold 26px Georgia';
    ctx.fillText(preBattleDef.label || 'Battle', W/2, H/2-28);
    if (preBattleDef.background) {
      ctx.fillStyle = `rgba(140,120,100,${alpha*0.8})`;
      ctx.font = 'italic 16px Georgia';
      ctx.fillText('Prepare for battle...', W/2, H/2+16);
    }
    preBattleTimer -= 16;
    if (preBattleTimer <= 0) preBattleActive = false;
    ctx.textAlign = 'left';
  }

  // ── Utility helpers ──────────────────────────────────────────
  function drawWrappedText(ctx2, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(' ');
    let line = '', count = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line + (line ? ' ' : '') + words[i];
      if (ctx2.measureText(test).width > maxWidth && line) {
        ctx2.fillText(line, x, y + count * lineHeight);
        line = words[i]; count++;
        if (maxLines && count >= maxLines) { ctx2.fillText('...', x, y + count * lineHeight); return; }
      } else { line = test; }
    }
    if (line) ctx2.fillText(line, x, y + count * lineHeight);
  }

  function roundRect(ctx2, x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x+r, y);
    ctx2.lineTo(x+w-r, y);
    ctx2.arcTo(x+w, y, x+w, y+r, r);
    ctx2.lineTo(x+w, y+h-r);
    ctx2.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx2.lineTo(x+r, y+h);
    ctx2.arcTo(x, y+h, x, y+h-r, r);
    ctx2.lineTo(x, y+r);
    ctx2.arcTo(x, y, x+r, y, r);
    ctx2.closePath();
  }

  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return {
    // particles
    spawnParticles, updateParticles, drawParticles,
    // shake
    screenShake, updateShake, applyShake,
    // portraits
    drawPortrait,
    // dialogue
    startDialogue, updateDialogue, drawDialogue,
    isDialogueActive: () => dialogueActive,
    // title
    drawTitle,
    // prologue
    startPrologue, updatePrologue, drawPrologue,
    // world HUD
    drawWorldHUD,
    // menu
    openMenu, closeMenu, isMenuOpen, updateMenu, drawMenu,
    setSaveCallback: (fn) => { menuSaveCallback = fn; },
    // act banner
    showActBanner, updateActBanner, drawActBanner,
    // notif
    showNotif, updateNotif, drawNotif,
    // victory
    showVictory, updateVictory, drawVictory,
    // game over
    drawGameOver, resetGameOver,
    // ending
    startEnding, drawEnding,
    // fade
    fadeOut, fadeIn, updateFade, drawFade, isFading,
    // pre-battle
    showPreBattle, drawPreBattle,
    // battle quotes (banter)
    showBattleQuote, updateBattleQuote, drawBattleQuote,
    // util
    drawWrappedText, roundRect, hexAlpha,
    // stars
    stars,
    // canvas
    W, H,
  };
})();
