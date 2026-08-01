// ============================================================
// battle.js  —  Tactical grid battle system
//              12×7 grid, CT-based turns, full skill set,
//              terrain, status effects, AI profiles,
//              floating damage, particles, animations
// ============================================================

const BATTLE = (() => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');

  // ── Layout constants ─────────────────────────────────────────
  const GRID_COLS = 12;
  const GRID_ROWS = 7;
  const CELL      = 52;
  const GRID_X    = 8;
  const GRID_Y    = 35;
  const PANEL_X   = GRID_X + GRID_COLS * CELL + 6;  // right panel x
  const PANEL_W   = 900 - PANEL_X - 4;

  // ── State ────────────────────────────────────────────────────
  let units           = [];
  let currentUnitIdx  = -1;
  let phase = 'init'; // init|playerMenu|playerMove|playerTarget|playerItems|itemTarget|enemyTurn|victory|defeat|animating|vChoice
  let background      = 'village';
  let terrainMap      = {};   // "col,row" -> terrain type
  let dynamicTerrainTick = 0;
  let difficulty      = 'normal';  // Difficulty mode for damage calculations

  let selectedSkillKey = null;
  // Momentum (boost) — how much banked momentum to spend on the next action.
  const MOMENTUM_MAX = 5;
  let pendingBoost     = 0;
  // Latent Power — signature ultimate, charges from damage dealt/taken.
  const LATENT_MAX = 100;
  let moveHighlight    = [];
  let targetHighlight  = [];
  let pendingMove      = null;

  let floatingTexts    = [];
  let onBattleEnd      = null;
  let presentNames     = [];   // names of party members in the current battle (banter filter)

  let pulseT           = 0;
  let aiDelay          = 0;
  let battleTurnCount  = 0;   // increments each unit turn
  let globalTurn       = 0;   // increments when all units have gone once

  // Battle-specific flags
  let nightBonus         = false;
  let varethChoiceDone   = false;
  let varethChoiceAct    = false;   // triggered at start
  let theronBerseked     = false;
  let revive50Triggered  = {};      // unit name -> bool
  let bossEndsAtOneHP    = null;    // unit key string

  // Theron Vareth result
  let varethPowerAccepted = false;

  // Visual: screen flash
  let flashAlpha = 0, flashColor = '#ffffff';
  let flashTimer = 0;
  // Hit-stop: ms the sim stays frozen for impact
  let hitStopTimer = 0;

  // Turn queue preview (next 8)
  let turnQueue = [];
  let battleInventory = {}; // consumable key -> count
  let selectedItemKey = null;
  let battleDrops = []; // items dropped by defeated enemies

  // Battle stats tracking
  let battleStats = {
    damageDealt: {},  // char name -> total damage
    damageTaken: {},  // char name -> total damage taken
    itemsUsed: 0,
    turnsTaken: 0,
    startTime: 0,
    enemiesDefeated: 0,
    enemiesSeen: [],     // enemy template keys encountered
    enemiesKilled: {},   // enemy template key -> count defeated
    weaknessesFound: {}, // enemy template key -> [discovered tokens]
  };

  // Battle log - last 20 combat actions
  let battleLog = [];
  const MAX_LOG_ENTRIES = 20;

  // Weather conditions
  let weather = null; // 'rain', 'fog', 'storm', or null
  let weatherTimer = 0; // For storm lightning timing
  let currentWeather = null; // For draw function

  // ── Setup ────────────────────────────────────────────────────
  function startBattle(battleDef, partyState, cb, difficultyMode, consumables) {
    units           = [];
    floatingTexts   = [];
    if (UI.clearProjectiles) UI.clearProjectiles();
    selectedSkillKey = null;
    selectedItemKey = null;
    moveHighlight   = [];
    targetHighlight = [];
    pendingMove     = null;
    background      = battleDef.background || 'village';
    onBattleEnd     = cb;
    battleTurnCount = 0;
    globalTurn      = 0;
    nightBonus      = battleDef.nightBonus || false;
    varethChoiceDone  = false;
    varethChoiceAct   = battleDef.varethChoice || false;
    varethPowerAccepted = false;
    theronBerseked    = false;
    revive50Triggered = {};
    bossEndsAtOneHP   = battleDef.bossEndsAtOneHP || null;
    dynamicTerrainTick = 0;
    flashAlpha = 0;
    hitStopTimer = 0;
    difficulty = difficultyMode || 'normal';  // Store difficulty for damage calcs
    battleInventory = consumables ? {...consumables} : {};
    battleDrops = [];
    battleStats = {
      damageDealt: {},
      damageTaken: {},
      itemsUsed: 0,
      turnsTaken: 0,
      startTime: Date.now(),
      enemiesDefeated: 0,
      enemiesSeen: [],
      enemiesKilled: {},
      weaknessesFound: {},
    };
    battleLog = []; // Reset battle log
    weather = battleDef.weather || null; // Set weather from battle definition
    weatherTimer = 0;


    // Build terrain map
    terrainMap = {};
    if (battleDef.terrain) {
      for (const t of battleDef.terrain) {
        terrainMap[`${t.col},${t.row}`] = t.type;
      }
    }

    // Place party
    const partyFilter = battleDef.partyOverride
      ? partyState.filter(p => battleDef.partyOverride.includes(p.name.toLowerCase()))
      : partyState.filter(p => !p.dead);

    // Names of characters actually in this battle — used to filter banter so
    // absent party members don't chime in (e.g. Lyra in the Kael-only fight).
    presentNames = partyFilter.map(p => p.name);

    // ── Battle start banter ─────────────────────────────────────
    const startBanter = DATA.getBanter('battleStart', presentNames);
    if (startBanter) {
      setTimeout(() => {
        UI.showBattleQuote(startBanter.speaker, startBanter.text, 2500);
      }, 600);
    }

    const partyRows = evenlySpace(partyFilter.length, GRID_ROWS);
    partyFilter.forEach((ch, i) => {
      const u = deepClone(ch);
      u.col = i % 2;
      u.row = partyRows[i];
      u.ct  = 0;
      u.isPlayer = true;
      u.hasActedThisRound = false;
      u.momentum = 1;           // Momentum: banked boost resource (start 1, cap MOMENTUM_MAX)
      u.facing = 'R';           // players start facing right (toward enemies)
      u.latent = 0;             // Latent Power gauge (0..100); charges within each battle
      units.push(u);
    });

    // Place enemies
    battleDef.enemies.forEach((eDef, i) => {
      const tmpl = DATA.ENEMY_TEMPLATES[eDef.key];
      if (!tmpl) return;
      // Track enemy seen
      if (!battleStats.enemiesSeen.includes(eDef.key)) {
        battleStats.enemiesSeen.push(eDef.key);
      }
      const u = deepClone(tmpl);
      u.hp = u.maxHp; u.mp = u.maxMp || 0;
      u.col = eDef.col !== undefined ? eDef.col : 11 - (i % 2);
      u.row = eDef.row !== undefined ? eDef.row : evenlySpace(battleDef.enemies.length, GRID_ROWS)[i];
      u.ct  = 0;
      u.isPlayer = false;
      u.buffs = []; u.statusEffects = [];
      u.shieldActive = false; u.shieldPct = 0;
      u.barrierActive = false;
      u.dead = false;
      u.hasActedThisRound = false;
      u.aiType = tmpl.aiType || 'aggressive';
      u.reviveTriggered = false;
      u.templateKey = eDef.key;  // Track for drops
      // Stagger (Phase 1c): guard depletes on weakness hits; 0 → staggered.
      u.guardMax = tmpl.guardMax || 0;
      u.guard    = u.guardMax;
      u.staggered = false;
      u.facing = 'L';           // enemies start facing left (toward party)
      units.push(u);
    });

    // Theron reinforcement (battle3)
    if (battleDef.theron_reinforcement) {
      units._theronReinforceScheduled = true;
      units._theronReinforceUnit = partyState.find(p => p.name === 'Theron');
    }

    // Compute first turn queue
    buildTurnQueue();
    phase = 'init';
    advanceCT();
  }

  function deepClone(u) {
    const c = Object.assign({}, u);
    c.buffs         = (u.buffs || []).map(b => Object.assign({}, b));
    c.statusEffects = (u.statusEffects || []).map(s => Object.assign({}, s));
    if (u.skills) c.skills = u.skills.slice();
    c.equipment = u.equipment ? Object.assign({}, u.equipment) : { weapon:null, armor:null, accessory:null };
    return c;
  }

  function evenlySpace(count, rows) {
    if (count === 1) return [Math.floor(rows/2)];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(Math.round(i * (rows-1) / Math.max(1,count-1)));
    }
    return result;
  }

  // ── Turn queue ───────────────────────────────────────────────
  function buildTurnQueue() {
    // Simulate CT advancement to preview next 8 units
    const sim = units.filter(u => !u.dead).map(u => ({ name:u.name, color:u.color, spd:u.spd, ct: u.ct, isPlayer: u.isPlayer }));
    turnQueue = [];
    let safety = 0;
    while (turnQueue.length < 8 && safety++ < 50000) {
      for (const s of sim) {
        s.ct += s.spd;
        if (s.ct >= 100) {
          s.ct = 0;
          turnQueue.push({ name: s.name, color: s.color, isPlayer: s.isPlayer });
          if (turnQueue.length >= 8) break;
        }
      }
    }
  }

  // ── CT system ────────────────────────────────────────────────
  function advanceCT() {
    if (checkBattleOver()) return;
    buildTurnQueue();
    let safety = 0;
    while (safety++ < 20000) {
      const alive = units.filter(u => !u.dead);
      for (const u of alive) {
        u.ct += u.spd;
        if (u.ct >= 100) {
          u.ct = 0;
          battleTurnCount++;
          startUnitTurn(u);
          return;
        }
      }
    }
  }

  function startUnitTurn(unit) {
    // Tick statuses BEFORE acting
    tickStatusEffects(unit);
    if (unit.dead) { advanceCT(); return; }

    // Theron reinforcement on turn 3
    if (units._theronReinforceScheduled && battleTurnCount >= 3) {
      units._theronReinforceScheduled = false;
      const theronTmpl = units._theronReinforceUnit;
      if (theronTmpl) {
        const u = deepClone(theronTmpl);
        u.col = 0; u.row = 3;
        u.ct  = 0; u.isPlayer = true;
        u.hasActedThisRound = false;
        units.push(u);
        UI.showNotif('Theron arrives!', '#ff4444', 2000);
        UI.spawnParticles(GRID_X + 0*CELL + CELL/2, GRID_Y + 3*CELL + CELL/2, 'fire', 12);
      }
    }

    // Vareth choice at start of battle9 (first enemy turn after battle starts)
    if (varethChoiceAct && !varethChoiceDone && !unit.isPlayer) {
      varethChoiceDone = true;
      varethChoiceAct  = false;
      currentUnitIdx   = units.indexOf(unit);
      phase = 'vChoice';
      UI.startDialogue(DATA.STORY.act9TheronChoice, (choiceId, choiceVal) => {
        handleVarethChoice(choiceVal, unit);
      });
      // Register choice callback
      window._GAME_choiceCallback = (cid, cv) => {
        if (cid === 'varethChoice') {
          handleVarethChoice(cv, unit);
        }
      };
      return;
    }

    currentUnitIdx = units.indexOf(unit);
    unit.hasActedThisRound = false;

    if (unit.isPlayer) {
      phase = 'playerMenu';
      pendingMove      = null;
      selectedSkillKey = null;
      moveHighlight    = [];
      targetHighlight  = [];
      // Gain +1 Momentum each turn (capped); reset any pending boost.
      unit.momentum = Math.min(MOMENTUM_MAX, (unit.momentum || 0) + 1);
      pendingBoost  = 0;
    } else {
      phase = 'enemyTurn';
      aiDelay = 380;
    }
  }

  function handleVarethChoice(choiceVal, unit) {
    const theron = units.find(u => u.name === 'Theron' && u.isPlayer);
    if (choiceVal === 1) {
      // Accept Vareth's power
      varethPowerAccepted = true;
      if (theron) {
        theron.color = '#cc44ff';
        theron.atk   = Math.floor(theron.atk * 2);
        theron.mag   = Math.floor(theron.mag * 2.5);
        theron.buffs.push({ stat:'atk', mult:2,   turnsLeft:99 });
        theron.buffs.push({ stat:'mag', mult:2.5, turnsLeft:99 });
        flashBang('#aa00ff', 0.7);
        UI.screenShake(8, 5);
        UI.spawnParticles(GRID_X + theron.col*CELL + CELL/2, GRID_Y + theron.row*CELL + CELL/2, 'void', 20);
        UI.startDialogue(DATA.STORY.act9AcceptVareth, () => {
          phase = 'init'; advanceCT();
        });
      }
    } else {
      // Resist
      if (theron) {
        UI.spawnParticles(GRID_X + theron.col*CELL + CELL/2, GRID_Y + theron.row*CELL + CELL/2, 'magic', 12);
      }
      UI.startDialogue(DATA.STORY.act9ResistVareth, () => {
        phase = 'init'; advanceCT();
      });
    }
    window._GAME_choiceCallback = null;
  }

  // ── Status effect ticking ────────────────────────────────────
  function tickStatusEffects(unit) {
    const newSE = [];
    for (const e of unit.statusEffects) {
      let keep = true;
      switch (e.type) {
        case 'poison':
          applyRawDamage(unit, e.value);
          addFloat(unit, `-${e.value}`, '#aa44ff');
          e.turnsLeft--;
          keep = e.turnsLeft > 0;
          break;
        case 'burn':
          const burnDmg = Math.floor(unit.maxHp * 0.1);
          applyRawDamage(unit, burnDmg);
          addFloat(unit, `-${burnDmg}`, '#ff6600');
          e.turnsLeft--;
          keep = e.turnsLeft > 0;
          break;
        case 'regen':
          const regenAmt = Math.floor(unit.maxHp * 0.12);
          unit.hp = Math.min(unit.maxHp, unit.hp + regenAmt);
          addFloat(unit, `+${regenAmt}`, '#44ff88');
          e.turnsLeft--;
          keep = e.turnsLeft > 0;
          break;
        case 'stun':
        case 'freeze':
        case 'berserk':
          e.turnsLeft--;
          keep = e.turnsLeft > 0;
          break;
        case 'blind':
        case 'evasion':
          e.turnsLeft--;
          keep = e.turnsLeft > 0;
          break;
        default:
          e.turnsLeft = (e.turnsLeft || 1) - 1;
          keep = e.turnsLeft > 0;
      }
      if (keep) newSE.push(e);
    }
    unit.statusEffects = newSE;
    // Tick buffs
    unit.buffs = unit.buffs.filter(b => { b.turnsLeft--; return b.turnsLeft > 0; });
    if (unit.hp <= 0) unit.dead = true;
  }

  // ── Battle-over check ────────────────────────────────────────
  function checkBattleOver() {
    const playerAlive = units.filter(u => u.isPlayer && !u.dead);
    const enemyAlive  = units.filter(u => !u.isPlayer && !u.dead);
    if (playerAlive.length === 0) {
      phase = 'defeat';
      return true;
    }
    if (enemyAlive.length === 0) {
      phase = 'victory';
      // Collect drops from defeated enemies
      battleDrops = [];
      for (const u of units) {
        if (!u.isPlayer && u.dead && u.templateKey) {
          const tmpl = DATA.ENEMY_TEMPLATES[u.templateKey];
          if (tmpl && tmpl.drops) {
            const drops = DATA.rollDrops(tmpl.drops);
            battleDrops.push(...drops);
          }
        }
      }
      // Victory banter
      const victoryBanter = DATA.getBanter('victory', presentNames);
      if (victoryBanter) {
        setTimeout(() => UI.showBattleQuote(victoryBanter.speaker, victoryBanter.text, 2500), 600);
      }
      setTimeout(() => {
        battleStats.duration = Math.floor((Date.now() - battleStats.startTime) / 1000);
        if (onBattleEnd) onBattleEnd('victory', units.filter(u => u.isPlayer), varethPowerAccepted, battleInventory, battleDrops, battleStats);
      }, 1400);
      UI.spawnParticles(450, 300, 'victory', 25);
      return true;
    }
    return false;
  }

  // ── Update ───────────────────────────────────────────────────
  function update(dt) {
    // Hit-stop: briefly freeze the sim for impact. Flash/shake keep ticking
    // (updated below) so the frozen frame still reads as a deliberate punch.
    if (hitStopTimer > 0) {
      hitStopTimer -= dt;
      if (flashTimer > 0) { flashTimer -= dt; flashAlpha = Math.max(0, flashTimer / 200); }
      UI.updateShake();
      return;
    }

    pulseT += dt * 0.003;
    if (flashTimer > 0) {
      flashTimer -= dt;
      flashAlpha = Math.max(0, flashTimer / 200);
    }
    dynamicTerrainTick += dt;

    // Weather effects
    if (weather === 'storm') {
      weatherTimer += dt;
      // Random lightning strike every 8-12 seconds
      if (weatherTimer > 8000 + Math.random() * 4000) {
        weatherTimer = 0;
        doLightningStrike();
      }
    }
    // Save weather for draw function
    currentWeather = weather;

    // Quick-save (F5) and Quick-load (F9)
    if (INPUT.wasPressed('F5')) {
      quickSave();
      UI.showNotif('Battle Saved!', '#88aaff', 2000);
    }
    if (INPUT.wasPressed('F9')) {
      quickLoad();
    }

    // Update tooltip from mouse position
    const mp = INPUT.getMousePos();
    updateTooltip(mp.x, mp.y);

    // Floating texts
    floatingTexts = floatingTexts.filter(ft => {
      ft.life -= dt;
      ft.y    -= 0.6 * (dt / 16);
      ft.x    += ft.vx || 0;
      return ft.life > 0;
    });

    UI.updateParticles(dt);
    UI.updateProjectiles(dt);
    UI.updateShake();
    UI.updateBattleQuote(dt);  // Update battle banter quotes

    if (phase === 'defeat') {
      if (INPUT.wasPressed('Enter') || INPUT.wasPressed(' ')) {
        if (onBattleEnd) onBattleEnd('defeat', null, false);
      }
      return;
    }
    if (phase === 'victory') return;
    if (UI.isDialogueActive()) return;
    if (phase === 'vChoice') return;

    if (phase === 'enemyTurn') {
      aiDelay -= dt;
      if (aiDelay <= 0) doEnemyTurn();
      return;
    }
    if (phase === 'playerMenu' || phase === 'playerMove' || phase === 'playerTarget' ||
        phase === 'playerItems' || phase === 'itemTarget') {
      handlePlayerInput();
    }
  }

  // ── Player input handling ────────────────────────────────────
  function handlePlayerInput() {
    const click = INPUT.consumeClick();
    if (!click) return;

    const cu = currentUnit();
    if (!cu || cu.dead) { endPlayerTurn(); return; }

    // Right panel
    if (click.x >= PANEL_X) {
      handlePanelClick(click, cu);
      return;
    }

    // Grid click
    const gx = click.x - GRID_X, gy = click.y - GRID_Y;
    if (gx < 0 || gy < 0) return;
    const col = Math.floor(gx / CELL), row = Math.floor(gy / CELL);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    if (phase === 'playerMove') {
      if (moveHighlight.some(c => c.col === col && c.row === row)) {
        if (col !== cu.col) cu.facing = col > cu.col ? 'R' : 'L';  // face movement dir
        cu.col = col; cu.row = row;
        moveHighlight = [];
        pendingMove   = { col, row };
        phase         = 'playerMenu';
      }
    } else if (phase === 'playerTarget') {
      if (targetHighlight.some(c => c.col === col && c.row === row)) {
        executeSkill(cu, selectedSkillKey, col, row);
      }
    } else if (phase === 'itemTarget') {
      const t = targetHighlight.find(c => c.col === col && c.row === row);
      if (t && t.unit) {
        if (useConsumable(cu, selectedItemKey, t.unit)) {
          phase = 'animating';
          setTimeout(() => {
            phase = 'playerMenu';
            targetHighlight = [];
            selectedItemKey = null;
          }, 400);
        }
      }
    }
  }

  function handlePanelClick(click, cu) {
    const my = click.y;

    // Latent Power activation (glowing button when gauge full)
    if (cu.isPlayer && phase === 'playerMenu' && (cu.latent || 0) >= LATENT_MAX) {
      if (my >= LATENT_Y && my <= LATENT_Y + LATENT_H &&
          click.x >= PANEL_X + 4 && click.x <= PANEL_X + PANEL_W - 4) {
        if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuSelect();
        useLatent(cu);
        return;
      }
    }

    // Momentum boost −/+ (fixed strip near panel bottom; playerMenu/playerTarget)
    if (cu.isPlayer && (phase === 'playerMenu' || phase === 'playerTarget')) {
      const ctrlY = MOM_Y + 30;
      if (my >= ctrlY && my <= ctrlY + MOM_BTN_H) {
        const minusX = PANEL_X + 8, plusX = PANEL_X + PANEL_W - 8 - MOM_BTN_W;
        const maxBoost = Math.min(3, cu.momentum || 0);
        if (click.x >= minusX && click.x <= minusX + MOM_BTN_W) {
          if (pendingBoost > 0) { pendingBoost--; if (typeof AUDIO!=='undefined') AUDIO.sfx.menuSelect(); }
          return;
        }
        if (click.x >= plusX && click.x <= plusX + MOM_BTN_W) {
          if (pendingBoost < maxBoost) { pendingBoost++; if (typeof AUDIO!=='undefined') AUDIO.sfx.menuSelect(); }
          return;
        }
      }
    }

    // ACTION_Y matches the dynamic y value at start of action menu in drawPanel:
    // 10 (start) + 56 (portrait) + 14 (name) + 18 (class) + 18 (hp) + 20 (mp)
    // + 14 (turns label) + 22 (turn queue) + 6 (divider) = 178
    const ACTION_Y = 178;

    if (phase === 'playerMenu' || phase === 'playerTarget') {
      let y = ACTION_Y;

      // MOVE button: h=28
      if (my >= y && my <= y+28) {
        if (phase === 'playerMenu' && !pendingMove) {
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuSelect();
          moveHighlight = getMoveRange(cu);
          phase = 'playerMove';
        }
        return;
      }
      y += 32;

      // ITEMS button: h=22
      if (my >= y && my <= y+22) {
        if (phase === 'playerMenu') {
          const hasItems = Object.keys(battleInventory).length > 0;
          if (!hasItems) { UI.showNotif('No items!', '#ff4444', 1200); return; }
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuSelect();
          phase = 'playerItems';
        }
        return;
      }
      y += 26;

      // ABILITIES header: h=18
      y += 18;

      // Skill buttons: each h=40, spaced 44px
      const skills = cu.skills || [];
      const skillsStartY = y;
      for (let i = 0; i < skills.length; i++) {
        const sy = skillsStartY + i * 44;
        if (my >= sy && my <= sy+40) {
          const skKey = skills[i];
          const sk    = DATA.SKILLS[skKey];
          if (!sk) return;
          if (cu.mp < sk.mp) { UI.showNotif('Not enough MP!', '#ff4444', 1500); return; }
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuSelect();
          selectedSkillKey = skKey;
          targetHighlight  = getTargetRange(cu, sk);
          phase = 'playerTarget';
          return;
        }
      }
      y = skillsStartY + skills.length * 44;

      // WAIT button: y+4, h=28
      const waitY = y + 4;
      if (my >= waitY && my <= waitY+28) {
        if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuBack();
        endPlayerTurn(); return;
      }

      // CANCEL button (playerTarget only): waitY+32, h=26
      if (phase === 'playerTarget') {
        const cancelY = waitY + 32;
        if (my >= cancelY && my <= cancelY+26) {
          phase = 'playerMenu'; targetHighlight = []; selectedSkillKey = null;
        }
      }
    } else if (phase === 'playerMove') {
      // CANCEL: ACTION_Y+34, h=24
      const cancelY = ACTION_Y + 34;
      if (my >= cancelY && my <= cancelY+24) {
        phase = 'playerMenu'; moveHighlight = []; selectedSkillKey = null;
      }
    } else if (phase === 'playerItems' || phase === 'itemTarget') {
      let y = ACTION_Y + 16; // past ITEMS label
      const itemKeys = Object.keys(battleInventory);
      for (let i = 0; i < itemKeys.length; i++) {
        const iy = y + i * 34;
        if (my >= iy && my <= iy+30) {
          const itemKey = itemKeys[i];
          const item = DATA.CONSUMABLES[itemKey];
          if (!item) return;
          if (typeof AUDIO !== 'undefined') AUDIO.sfx.menuSelect();
          selectedItemKey = itemKey;
          targetHighlight = getItemTargetRange(cu, itemKey);
          phase = 'itemTarget';
          return;
        }
      }
      // CANCEL button
      const cancelY = y + itemKeys.length * 34 + 8;
      if (my >= cancelY && my <= cancelY+24) {
        phase = 'playerMenu'; targetHighlight = []; selectedItemKey = null;
      }
    }
  }

  function endPlayerTurn() {
    moveHighlight    = [];
    targetHighlight  = [];
    pendingMove      = null;
    battleStats.turnsTaken++;
    selectedSkillKey = null;
    selectedItemKey  = null;
    const cu = currentUnit();
    if (cu) cu.hasActedThisRound = true;
    phase = 'init';
    advanceCT();
  }

  // ── Battle Log ────────────────────────────────────────────────
  function addBattleLog(text, type = 'normal') {
    const entry = {
      text,
      type, // 'attack', 'heal', 'item', 'status', 'normal'
      turn: battleStats.turnsTaken,
      time: Date.now(),
    };
    battleLog.push(entry);
    if (battleLog.length > MAX_LOG_ENTRIES) {
      battleLog.shift(); // Remove oldest entry
    }
  }

  // ── Consumable items ─────────────────────────────────────────
  function useConsumable(user, itemKey, target) {
    const item = DATA.CONSUMABLES[itemKey];
    if (!item) return false;
    if (!battleInventory[itemKey] || battleInventory[itemKey] <= 0) return false;

    // Decrement count
    battleInventory[itemKey]--;
    if (battleInventory[itemKey] <= 0) delete battleInventory[itemKey];

    // Offensive throwable (e.g. Sunflare Vial): route through applyHit so it
    // exploits weakness, chips guard toward Stagger, and plays the projectile —
    // exactly like an element-tagged skill. Synthesise a skill from the item.
    if (item.offensive && target && !target.isPlayer && !target.dead) {
      const throwSk = { name:item.name, element:item.element, type:'magic' };
      addBattleLog(`${user.name} hurled ${item.name} at ${target.name}!`, 'item');
      applyHit(user, target, item.dmg || 20, throwSk, 'magic');
      battleStats.itemsUsed++;
      return true;
    }

    // Apply effects
    if (item.healHp && target) {
      const amt = Math.min(item.healHp, target.maxHp - target.hp);
      target.hp += amt;
      spawnFloatingText(target.col, target.row, `+${amt} HP`, '#44ff88');
      UI.spawnParticles(target.col * CELL + GRID_X + CELL/2, target.row * CELL + GRID_Y + CELL/2, 'heal', 8);
      if (typeof AUDIO !== 'undefined') AUDIO.sfx.heal();
    }
    if (item.healMp && target) {
      const amt = Math.min(item.healMp, target.maxMp - target.mp);
      target.mp += amt;
      spawnFloatingText(target.col, target.row, `+${amt} MP`, '#4488ff');
    }
    if (item.reviveHp && target && target.dead) {
      target.dead = false;
      target.hp = Math.floor(target.maxHp * item.reviveHp);
      spawnFloatingText(target.col, target.row, 'REVIVED!', '#ffdd44');
      UI.spawnParticles(target.col * CELL + GRID_X + CELL/2, target.row * CELL + GRID_Y + CELL/2, 'holy', 10);
      if (typeof AUDIO !== 'undefined') AUDIO.sfx.heal();
    }
    if (item.cure && target) {
      // Remove status effects
      if (target.statusEffects) {
        target.statusEffects = target.statusEffects.filter(se => se.type !== item.cure);
      }
      spawnFloatingText(target.col, target.row, `Cured!`, '#88ff88');
    }

    // Award skill XP for using item
    if (user && user.isPlayer && !user._itemXpGiven) {
      user._itemXpGiven = true; // Only once per battle to prevent farming
    }

    // Track items used
    battleStats.itemsUsed++;

    // Log item usage
    const targetName = target ? target.name : 'self';
    addBattleLog(`${user.name} used ${item.name} on ${targetName}`, 'item');

    return true;
  }

  function getItemTargetRange(user, itemKey) {
    const item = DATA.CONSUMABLES[itemKey];
    if (!item) return [];
    const targets = [];
    // Offensive items (e.g. Sunflare Vial) target living enemies.
    if (item.offensive) {
      for (const u of units) {
        if (u.isPlayer || u.dead) continue;
        targets.push({ col: u.col, row: u.row, unit: u });
      }
      return targets;
    }
    // Support items target allies (living for heal/mp, dead for revive).
    for (const u of units) {
      if (!u.isPlayer) continue;
      if (item.reviveHp && u.dead) targets.push({ col: u.col, row: u.row, unit: u });
      else if (!item.reviveHp && !u.dead) targets.push({ col: u.col, row: u.row, unit: u });
    }
    return targets;
  }

  // ── Terrain helpers ─────────────────────────────────────────
  function getTerrainAt(col, row) {
    return terrainMap[`${col},${row}`] || 'normal';
  }

  function terrainMoveBonus(col, row) {
    const t = getTerrainAt(col, row);
    if (t === 'water') return -1;
    return 0;
  }

  function terrainAtkBonus(col, row) {
    const t = getTerrainAt(col, row);
    if (t === 'elevated') return 0.15;
    if (t === 'ruins')    return 0.15; // ruins boost MAG
    return 0;
  }

  function terrainEvasion(col, row) {
    const t = getTerrainAt(col, row);
    if (t === 'forest') return 20;
    return 0;
  }

  // ── Move range ───────────────────────────────────────────────
  function getMoveRange(unit) {
    const moveRange = (unit.move || 3) + terrainMoveBonus(unit.col, unit.row);
    const cells = [];
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const dist = Math.abs(c - unit.col) + Math.abs(r - unit.row);
        if (dist <= moveRange && dist > 0 && !getUnitAt(c, r)) {
          cells.push({ col:c, row:r });
        }
      }
    }
    return cells;
  }

  function getTargetRange(unit, sk) {
    const cells = [];
    const isOffensive = sk.type === 'physical' || sk.type === 'magic' || sk.type === 'hybrid';
    const isHeal   = sk.type === 'heal';
    const isRevive = sk.type === 'revive';
    const isRevAll = sk.type === 'reviveAll';
    const isSelf   = sk.target === 'self';
    const isBuff   = sk.type === 'buff' && !isHeal;
    const isDebuff = sk.type === 'debuff';

    if (isRevive) {
      for (const u of units) {
        if (u.dead && u.isPlayer === unit.isPlayer) cells.push({ col:u.col, row:u.row });
      }
      return cells;
    }
    if (isRevAll) {
      cells.push({ col:unit.col, row:unit.row });
      return cells;
    }
    if (isSelf || sk.target === 'party' || sk.target === 'allAlly') {
      cells.push({ col:unit.col, row:unit.row });
      return cells;
    }
    if (sk.target === 'ally') {
      for (const u of units) {
        if (!u.dead && u.isPlayer === unit.isPlayer) cells.push({ col:u.col, row:u.row });
      }
      return cells;
    }
    if (sk.target === 'deadAlly') {
      for (const u of units) {
        if (u.dead && u.isPlayer === unit.isPlayer) cells.push({ col:u.col, row:u.row });
      }
      return cells;
    }
    if (sk.target === 'allEnemy') {
      cells.push({ col:unit.col, row:unit.row });
      return cells;
    }
    if (sk.target === 'allPlayers') {
      cells.push({ col:unit.col, row:unit.row });
      return cells;
    }
    if (sk.target === 'adjAll') {
      // All adjacent enemies
      for (const u of units) {
        if (!u.dead && u.isPlayer !== unit.isPlayer) {
          if (Math.abs(u.col-unit.col)<=1 && Math.abs(u.row-unit.row)<=1)
            cells.push({ col:u.col, row:u.row });
        }
      }
      return cells;
    }
    if (sk.target === 'aoe3x3' || sk.target === 'aoe2') {
      for (const u of units) {
        if (!u.dead && (isDebuff ? u.isPlayer !== unit.isPlayer : u.isPlayer !== unit.isPlayer))
          cells.push({ col:u.col, row:u.row });
      }
      return cells;
    }
    // Single target
    for (const u of units) {
      if (u.dead) continue;
      if (isOffensive && u.isPlayer === unit.isPlayer) continue;
      if (!isOffensive && u.isPlayer !== unit.isPlayer) continue;
      if (sk.range && sk.range !== 99) {
        const dist = Math.abs(u.col - unit.col) + Math.abs(u.row - unit.row);
        if (dist > sk.range) continue;
      }
      cells.push({ col:u.col, row:u.row });
    }
    return cells;
  }

  function getUnitAt(col, row) {
    return units.find(u => !u.dead && u.col === col && u.row === row) || null;
  }

  function currentUnit() {
    return currentUnitIdx >= 0 && currentUnitIdx < units.length ? units[currentUnitIdx] : null;
  }

  // ── Skill execution ─────────────────────────────────────────
  function executeSkill(caster, skKey, targetCol, targetRow) {
    const sk = DATA.SKILLS[skKey];
    if (!sk) return endPlayerTurn();

    caster.mp = Math.max(0, caster.mp - sk.mp);

    // ── Momentum boost: spend banked momentum to amplify this action ──
    // boost 0..3 → damage/heal ×(1 + 0.5·boost), break power +boost.
    const boost = caster.isPlayer ? Math.min(pendingBoost, caster.momentum || 0) : 0;
    if (boost > 0) {
      caster.momentum -= boost;
      addFloat(caster, `BOOST ×${boost + 1}`, '#ffdd55');
      UI.screenShake(2 + boost, 3);
    }
    pendingBoost = 0;
    const boostMult  = 1 + 0.5 * boost;
    // Skills carry a per-cast breakPower (base 1) so weakness hits deplete
    // more guard when boosted. Cloned so we never mutate the shared def.
    const boostedSk  = boost > 0 ? Object.assign({}, sk, { breakPower: 1 + boost }) : sk;

    const tBonus = terrainAtkBonus(caster.col, caster.row);

    // ── SFX dispatch ────────────────────────────────────────────
    if (typeof AUDIO !== 'undefined') {
      if (sk.type === 'physical')                    AUDIO.sfx.sword();
      else if (sk.type === 'magic') {
        const sn = skKey;
        if (sn === 'fireball' || sn === 'supernova') AUDIO.sfx.fire();
        else if (sn === 'blizzard')                  AUDIO.sfx.ice();
        else if (sn === 'holyLight')                 AUDIO.sfx.holy();
        else if (sn === 'gravityWell')               AUDIO.sfx.gravity();
        else if (sn.startsWith('eVoid') || sn === 'eRealityCrack' || sn === 'eVoidMaw') AUDIO.sfx.void();
        else                                         AUDIO.sfx.magic();
      }
      else if (sk.type === 'heal')                   AUDIO.sfx.heal();
      else if (sk.type === 'buff' || sk.type === 'debuff') AUDIO.sfx.menuSelect();
    }

    switch (sk.type) {
      case 'physical': {
        const target = getUnitAt(targetCol, targetRow);
        if (target) {
          let mult = sk.mult * boostMult;
          // Double next attack (Lyra's twinShadow)
          if (caster.doubleNextAtk) { mult *= 2; caster.doubleNextAtk = false; }
          // Assassinate: only if target hasn't acted
          if (skKey === 'assassinate' && target.hasActedThisRound) {
            UI.showNotif('Target already acted!', '#ff4444', 1500);
            caster.mp += sk.mp; // refund
            caster.momentum += boost; // refund momentum too
            return;
          }
          let dmg = calcPhysDmg(caster, target, mult, tBonus);
          // Crit
          if (Math.random() * 100 < 5 + (caster.luck || 0) / 10) {
            dmg = Math.floor(dmg * 1.5);
            addFloatXY(targetCol*CELL+GRID_X+CELL/2-14, targetRow*CELL+GRID_Y+CELL/2-30, 'CRIT!', '#ffff44');
            hitStop(70); flashBang('#ffffaa', 0.3); UI.screenShake(5, 4);
            // Critical hit banter
            if (caster.isPlayer) {
              // The attacker delivers the crit line (fall back to any present speaker).
              const critBanter = DATA.getBanter('criticalHit', [caster.name])
                              || DATA.getBanter('criticalHit', presentNames);
              if (critBanter) {
                setTimeout(() => UI.showBattleQuote(critBanter.speaker, critBanter.text, 2000), 300);
              }
            }
          }
          applyHit(caster, target, dmg, boostedSk, 'physical');
          // Blade Storm: hit ALL adjacent
          if (skKey === 'bladeStorm') {
            for (const u of units) {
              if (!u.dead && !u.isPlayer && u !== target) {
                if (Math.abs(u.col-caster.col)<=1 && Math.abs(u.row-caster.row)<=1) {
                  const dmg2 = calcPhysDmg(caster, u, mult, tBonus);
                  applyHit(caster, u, dmg2, boostedSk, 'physical');
                }
              }
            }
          }
        }
        break;
      }
      case 'magic': {
        if (sk.target === 'aoe3x3') {
          for (const u of units) {
            if (!u.dead && u.isPlayer !== caster.isPlayer) {
              if (Math.abs(u.col-targetCol)<=1 && Math.abs(u.row-targetRow)<=1) {
                const dmg = calcMagDmg(caster, u, sk.mult * boostMult, tBonus);
                applyHit(caster, u, dmg, boostedSk, 'magic');
              }
            }
          }
        } else if (sk.target === 'allEnemy') {
          // Supernova
          for (const u of units) {
            if (!u.dead && u.isPlayer !== caster.isPlayer) {
              const dmg = calcMagDmg(caster, u, sk.mult * boostMult, tBonus);
              applyHit(caster, u, dmg, boostedSk, 'magic');
            }
          }
          // Recoil
          if (sk.recoilPct) {
            const recoil = Math.floor(caster.maxHp * sk.recoilPct);
            applyRawDamage(caster, recoil);
            addFloat(caster, `-${recoil} recoil`, '#ff8800');
          }
        } else if (sk.target === 'allPlayers') {
          for (const u of units) {
            if (!u.dead && u.isPlayer !== caster.isPlayer) {
              const dmg = calcMagDmg(caster, u, sk.mult, tBonus);
              applyHit(caster, u, dmg, sk, 'magic');
            }
          }
          // Also in enemy version (Reality Crack) — hits all party
          if (sk.name === 'Reality Crack') {
            for (const u of units) {
              if (!u.dead && u.isPlayer) {
                const dmg = calcMagDmg(caster, u, sk.mult, tBonus);
                applyHit(caster, u, dmg, sk, 'magic');
              }
            }
          }
        } else {
          const target = getUnitAt(targetCol, targetRow);
          if (target) {
            let dmgMult = sk.mult * boostMult;
            if (sk.vsCorrupted && !target.isPlayer) dmgMult *= 1.4;
            const dmg = calcMagDmg(caster, target, dmgMult, tBonus);
            applyHit(caster, target, dmg, boostedSk, 'magic');
          }
        }
        break;
      }
      case 'hybrid': {
        // Starlight Strike: 3x ATK + 1x MAG
        const target = getUnitAt(targetCol, targetRow);
        if (target) {
          const physDmg = calcPhysDmg(caster, target, sk.mult * boostMult, tBonus);
          const magDmg  = calcMagDmg(caster, target, (sk.magMult || 1.0) * boostMult, tBonus);
          const total = physDmg + magDmg;
          applyRawDamage(target, total);
          addFloat(target, `-${total}`, '#ffcc44');
          UI.spawnParticles(GRID_X+target.col*CELL+CELL/2, GRID_Y+target.row*CELL+CELL/2, 'void', 15);
          UI.screenShake(4, 3);
        }
        break;
      }
      case 'heal': {
        if (sk.target === 'allAlly') {
          let totalHealed = 0;
          for (const u of units) {
            if (!u.dead && u.isPlayer === caster.isPlayer) {
              const amt = Math.floor((sk.healBase + caster.mag) * boostMult);
              u.hp = Math.min(u.maxHp, u.hp + amt);
              totalHealed += amt;
              addFloat(u, `+${amt}`, '#44ff88');
              UI.spawnParticles(GRID_X+u.col*CELL+CELL/2, GRID_Y+u.row*CELL+CELL/2, 'heal', 6);
            }
          }
          addBattleLog(`${caster.name} healed allies for ${totalHealed} HP`, 'heal');
        } else {
          const target = getUnitAt(targetCol, targetRow);
          if (target) {
            const amt = Math.floor((sk.healBase + caster.mag) * boostMult);
            target.hp = Math.min(target.maxHp, target.hp + amt);
            addFloat(target, `+${amt}`, '#44ff88');
            UI.spawnParticles(GRID_X+target.col*CELL+CELL/2, GRID_Y+target.row*CELL+CELL/2, 'heal', 8);
            addBattleLog(`${caster.name} healed ${target.name} for ${amt} HP`, 'heal');
          }
        }
        break;
      }
      case 'revive': {
        const dead = units.find(u => u.dead && u.isPlayer === caster.isPlayer && u.col === targetCol && u.row === targetRow);
        if (dead) {
          dead.dead = false;
          dead.hp   = Math.floor(dead.maxHp * sk.revivePercent);
          addFloatXY(GRID_X+dead.col*CELL+CELL/2, GRID_Y+dead.row*CELL+CELL/2-20, 'REVIVED!', '#ffffff');
          UI.spawnParticles(GRID_X+dead.col*CELL+CELL/2, GRID_Y+dead.row*CELL+CELL/2, 'heal', 14);
          addBattleLog(`${caster.name} revived ${dead.name}!`, 'heal');
        }
        break;
      }
      case 'reviveAll': {
        // Miracle
        let revivedCount = 0;
        for (const u of units) {
          if (u.dead && u.isPlayer === caster.isPlayer) {
            u.dead = false;
            u.hp   = Math.floor(u.maxHp * sk.reviveAllPercent);
            addFloat(u, 'MIRACLE!', '#ffffff');
            UI.spawnParticles(GRID_X+u.col*CELL+CELL/2, GRID_Y+u.row*CELL+CELL/2, 'heal', 10);
            revivedCount++;
          }
        }
        for (const u of units) {
          if (!u.dead && u.isPlayer === caster.isPlayer) {
            u.hp = Math.floor(u.maxHp * sk.healLivingPct);
            addFloat(u, '+MIRACLE', '#44ff88');
          }
        }
        addBattleLog(`${caster.name} cast Miracle! (revived ${revivedCount})`, 'heal');
        break;
      }
      case 'buff': {
        applyBuff(caster, sk, targetCol, targetRow);
        break;
      }
      case 'debuff': {
        applyDebuff(caster, sk, targetCol, targetRow);
        break;
      }
      case 'move': {
        // Shadow Step
        if (!getUnitAt(targetCol, targetRow)) {
          caster.col = targetCol; caster.row = targetRow;
          UI.spawnParticles(GRID_X+targetCol*CELL+CELL/2, GRID_Y+targetRow*CELL+CELL/2, 'void', 8);
        }
        break;
      }
    }

    // Boss special: Vareth 50% HP revive adds
    for (const u of units) {
      if (!u.dead && !u.isPlayer && u.reviveAddsAt50 && !u.reviveTriggered) {
        if (u.hp <= u.maxHp * 0.5) {
          u.reviveTriggered = true;
          reviveVoidShards(u);
          if (typeof AUDIO !== 'undefined') { AUDIO.sfx.varethWake(); AUDIO.crossfadeTo('boss', 800); }
        }
      }
    }

    // Boss ends at 1 HP
    if (bossEndsAtOneHP) {
      const boss = units.find(u => !u.isPlayer && u.name === 'Lord Aldric' && u.hp <= 1);
      if (boss) {
        boss.hp = 1;
        phase = 'victory';
        setTimeout(() => {
          if (onBattleEnd) onBattleEnd('victory', units.filter(u => u.isPlayer), varethPowerAccepted);
        }, 1200);
        return;
      }
    }

    checkBattleOver();
    if (phase !== 'victory' && phase !== 'defeat') endPlayerTurn();
  }

  function applyBuff(caster, sk, targetCol, targetRow) {
    if (sk.effect === 'atkBuff' && sk.target === 'party') {
      for (const u of units) {
        if (!u.dead && u.isPlayer === caster.isPlayer) {
          u.buffs.push({ stat:'atk', mult:1+sk.buffAmt, turnsLeft:sk.buffTurns });
          addFloat(u, 'ATK↑', '#44ff44');
        }
      }
      addBattleLog(`${caster.name} boosted party ATK!`, 'status');
    } else if (sk.effect === 'guardBuff') {
      caster.isGuarding = true;
      caster.buffs.push({ stat:'guard', mult:1, turnsLeft:sk.buffTurns });
      addFloat(caster, 'GUARD', '#4488ff');
      addBattleLog(`${caster.name} is guarding allies!`, 'status');
    } else if (sk.effect === 'shield') {
      const target = getUnitAt(targetCol, targetRow);
      if (target) {
        target.shieldActive = true;
        target.shieldPct    = sk.shieldPct || 0.5;
        addFloat(target, 'SHIELD', '#4488ff');
        addBattleLog(`${caster.name} shielded ${target.name}!`, 'status');
      }
    } else if (sk.effect === 'magAtkBuff') {
      const target = getUnitAt(targetCol, targetRow);
      if (target) {
        target.buffs.push({ stat:'mag', mult:1+sk.buffAmt, turnsLeft:sk.buffTurns });
        target.buffs.push({ stat:'atk', mult:1+sk.buffAmt, turnsLeft:sk.buffTurns });
        addFloat(target, `ATK/MAG↑${Math.floor(sk.buffAmt*100)}%`, '#88ff44');
      }
    } else if (sk.effect === 'barrier') {
      const target = getUnitAt(targetCol, targetRow);
      if (target) {
        target.barrierActive = true;
        addFloat(target, 'BARRIER', '#88aaff');
        addBattleLog(`${caster.name} gave ${target.name} magic barrier!`, 'status');
      }
    } else if (sk.effect === 'doubleNext') {
      caster.doubleNextAtk = true;
      addFloat(caster, 'SHADOW↑↑', '#aa44ff');
      addBattleLog(`${caster.name} prepares shadow strike!`, 'status');
    } else if (sk.effect === 'defBuff') {
      const target = getUnitAt(targetCol, targetRow);
      if (target) {
        target.buffs.push({ stat:'def', mult:1+(sk.buffAmt||0.2), turnsLeft:sk.buffTurns||2 });
        addFloat(target, 'DEF↑', '#44ffaa');
      }
    } else if (sk.effect === 'atkBuff') {
      const target = getUnitAt(targetCol, targetRow);
      if (target) {
        target.buffs.push({ stat:'atk', mult:1+(sk.buffAmt||0.3), turnsLeft:sk.buffTurns||2 });
        addFloat(target, 'ATK↑', '#44ff44');
      }
    } else if (sk.effect === 'evasion') {
      caster.evasionBonus = sk.evasionAmt || 40;
      caster.evasionTurns = sk.evasionTurns || 2;
      addFloat(caster, 'EVASIVE', '#aaaaff');
    } else if (sk.target === 'self') {
      addFloat(caster, sk.name, '#44ffaa');
    }
  }

  function applyDebuff(caster, sk, targetCol, targetRow) {
    if (sk.target === 'aoe3x3' || sk.target === 'aoe2') {
      const radius = sk.target === 'aoe2' ? 2 : 1;
      for (const u of units) {
        if (!u.dead && u.isPlayer !== caster.isPlayer) {
          if (Math.abs(u.col-targetCol)<=radius && Math.abs(u.row-targetRow)<=radius) {
            applyStatusEffect(u, sk);
          }
        }
      }
    } else if (sk.target === 'allPlayers') {
      for (const u of units) {
        if (!u.dead && u.isPlayer) applyStatusEffect(u, sk);
      }
    } else {
      const target = getUnitAt(targetCol, targetRow);
      if (target) applyStatusEffect(target, sk);
    }
  }

  function applyStatusEffect(target, sk) {
    if (target.barrierActive) {
      target.barrierActive = false;
      addFloat(target, 'BARRIER BLOCKED', '#88aaff');
      return;
    }
    const e = sk.effect;
    const tx = GRID_X+target.col*CELL+CELL/2;
    const ty = GRID_Y+target.row*CELL+CELL/2;
    
    if (e === 'stun') { 
      target.statusEffects.push({ type:'stun', turnsLeft:1 }); 
      addFloat(target,'STUN','#ffff44');
      UI.spawnParticles(tx, ty, 'buff', 8);
      addBattleLog(`${target.name} was STUNNED!`, 'status');
    }
    else if (e === 'freeze') { 
      target.statusEffects.push({ type:'freeze', turnsLeft:1 }); 
      addFloat(target,'FREEZE','#88ccff');
      UI.spawnParticles(tx, ty, 'magic', 10);
      addBattleLog(`${target.name} was FROZEN!`, 'status');
    }
    else if (e === 'poison') { 
      target.statusEffects.push({ type:'poison', value: sk.poisonDmg||5, turnsLeft: sk.poisonTurns||3 }); 
      addFloat(target,'POISON','#aa44ff');
      UI.spawnParticles(tx, ty, 'poison', 8);
      addBattleLog(`${target.name} was POISONED!`, 'status');
    }
    else if (e === 'burn')  { 
      target.statusEffects.push({ type:'burn', turnsLeft:2 }); 
      addFloat(target,'BURN','#ff6600');
      UI.spawnParticles(tx, ty, 'fire', 10);
      addBattleLog(`${target.name} was BURNED!`, 'status');
    }
    else if (e === 'blind') { 
      target.statusEffects.push({ type:'blind', turnsLeft: sk.blindTurns||2 }); 
      addFloat(target,'BLIND','#888888');
      UI.spawnParticles(tx, ty, 'debuff', 6);
      addBattleLog(`${target.name} was BLINDED!`, 'status');
    }
    else if (e === 'berserk') { 
      target.statusEffects.push({ type:'berserk', turnsLeft: sk.berserkTurns||2 }); 
      addFloat(target,'BERSERK','#ff4444');
      UI.spawnParticles(tx, ty, 'fire', 8);
      addBattleLog(`${target.name} went BERSERK!`, 'status');
    }
    else if (e === 'blindAtkDown') {
      target.statusEffects.push({ type:'blind',  turnsLeft:2 });
      target.buffs.push({ stat:'atk', mult:0.75, turnsLeft:2 });
      addFloat(target,'NIGHTMARE','#440055');
      UI.spawnParticles(tx, ty, 'void', 12);
      addBattleLog(`${target.name} was afflicted with NIGHTMARE!`, 'status');
    }
    else if (e === 'defDebuff') { 
      target.buffs.push({ stat:'def', mult:1+(sk.buffAmt||-.3), turnsLeft:sk.buffTurns||2 }); 
      addFloat(target,'DEF↓','#ff4444');
      UI.spawnParticles(tx, ty, 'debuff', 6);
      addBattleLog(`${target.name}'s DEFENSE was lowered!`, 'status');
    }
    else if (e === 'atkDebuff') { 
      target.buffs.push({ stat:'atk', mult:1+(sk.buffAmt||-.3), turnsLeft:sk.buffTurns||2 }); 
      addFloat(target,'ATK↓','#ff8844');
      UI.spawnParticles(tx, ty, 'debuff', 6);
      addBattleLog(`${target.name}'s ATTACK was lowered!`, 'status');
    }
    else if (e === 'defDown')   { 
      target.buffs.push({ stat:'def', mult:0.7, turnsLeft:2 }); 
      addFloat(target,'DEF↓','#ff4444');
      UI.spawnParticles(tx, ty, 'debuff', 6);
      addBattleLog(`${target.name}'s DEFENSE was lowered!`, 'status');
    }
    else if (e === 'defShred')  { 
      target.buffs.push({ stat:'def', mult:0, turnsLeft:2 }); 
      addFloat(target,'SHRED!','#ff0000');
      UI.spawnParticles(tx, ty, 'debuff', 10);
      addBattleLog(`${target.name}'s DEFENSE was SHREDDED!`, 'status');
    }
    else if (e === 'steal')     { addFloat(target,'STOLEN!','#ffaa00'); }
    else if (e === 'mpDrain')   {
      const amt = Math.min(target.mp, sk.drainAmt || 20);
      target.mp = Math.max(0, target.mp - amt);
      addFloat(target, `-${amt} MP`, '#aa66ff');
      UI.spawnParticles(tx, ty, 'magic', 6);
      addBattleLog(`${target.name} lost ${amt} MP!`, 'status');
    }
    else if (e === 'guardAlly') { 
      addFloat(target, 'LOYALTY', '#ffcc44');
      UI.spawnParticles(tx, ty, 'buff', 6);
      addBattleLog(`${target.name} is protected by LOYALTY!`, 'status');
    }
  }

  // ── Damage calculation ───────────────────────────────────────
  function getBuffedStat(unit, stat) {
    let val = unit[stat] || 0;
    for (const b of unit.buffs) {
      if (b.stat === stat) val = Math.floor(val * b.mult);
    }
    // Support Bond (Phase 1b): each adjacent ally shores up DEF (+8%, cap +24%).
    if (stat === 'def') {
      const allies = Math.min(3, DATA.adjacentAllies(unit, units));
      if (allies > 0) val = Math.floor(val * (1 + 0.08 * allies));
    }
    return Math.max(0, val);
  }

  // Difficulty damage modifiers
  const DIFFICULTY_MODS = {
    casual:   { dmgMult: 0.70 },
    normal:    { dmgMult: 1.00 },
    hardcore:  { dmgMult: 1.20 },
  };

  function calcPhysDmg(caster, target, mult, terrainMult, isRanged) {
    const atkStat = getBuffedStat(caster, 'atk');
    const defStat = getBuffedStat(target, 'def');
    // Terrain / physical resist
    const physResist = target.physResist || 0;
    const base = Math.max(1, atkStat * mult * (1 + terrainMult) - defStat * 0.5);
    const rand = 0.88 + Math.random() * 0.24;
    let dmg = Math.max(1, Math.floor(base * rand * (1 - physResist)));
    // Fog weather: melee attacks get +10% damage (crit bonus)
    if (weather === 'fog' && !isRanged) {
      dmg = Math.floor(dmg * 1.1);
    }
    // Apply difficulty modifier for player targets
    if (target.isPlayer && !caster.isPlayer) {
      const mod = DIFFICULTY_MODS[difficulty] || DIFFICULTY_MODS.normal;
      dmg = Math.floor(dmg * mod.dmgMult);
    }
    return dmg;
  }

  function calcMagDmg(caster, target, mult, terrainMult) {
    if (typeof mult !== 'number') mult = 1;
    const magStat = getBuffedStat(caster, 'mag');
    const defStat = getBuffedStat(target, 'def') * 0.3;
    const base = Math.max(1, magStat * mult * (1 + terrainMult) - defStat);
    const rand = 0.88 + Math.random() * 0.24;
    let dmg = Math.max(1, Math.floor(base * rand));
    // Apply difficulty modifier for player targets
    if (target.isPlayer && !caster.isPlayer) {
      const mod = DIFFICULTY_MODS[difficulty] || DIFFICULTY_MODS.normal;
      dmg = Math.floor(dmg * mod.dmgMult);
    }
    return dmg;
  }

  // Called when an attack hits a target's weakness. Records the discovered
  // token for the bestiary and depletes the target's guard (Stagger).
  function onWeaknessHit(caster, target, sk, breakPower) {
    if (target.isPlayer || !target.templateKey) return;
    const tokens = [sk.weaponType, sk.element].filter(t => t && t !== 'none');
    if (!battleStats.weaknessesFound[target.templateKey]) {
      battleStats.weaknessesFound[target.templateKey] = [];
    }
    const found = battleStats.weaknessesFound[target.templateKey];
    for (const t of tokens) {
      if (DATA.counterMult({ weaponType: sk.weaponType===t?t:undefined, element: sk.element===t?t:undefined }, target) > 1
          && !found.includes(t)) {
        found.push(t);
      }
    }
    // ── Stagger: deplete guard; at 0 the target breaks ──
    if (target.guardMax > 0 && !target.staggered) {
      target.guard = Math.max(0, target.guard - (breakPower || 1));
      if (target.guard === 0) triggerStagger(target);
    }
  }

  // Break a target: it is staggered (takes +50% damage) and skips its next
  // turn. Recovery + guard refill happen in doEnemyTurn when the skip is spent.
  function triggerStagger(target) {
    target.staggered = true;
    target.staggerSkipPending = true;  // consumed on its next turn
    addFloat(target, 'BREAK!', '#ff5566');
    flashBang('#ff88aa', 0.4);
    UI.screenShake(6, 5);
    hitStop(90);
    if (typeof AUDIO !== 'undefined' && AUDIO.sfx && AUDIO.sfx.hit) AUDIO.sfx.hit();
    addBattleLog(`${target.name} was BROKEN!`, 'status');
  }

  function applyHit(caster, target, dmg, sk, dmgType) {
    // Evasion check
    const evasionChance = terrainEvasion(target.col, target.row)
      + (target.evasionBonus || 0)
      + (target.statusEffects.find(e=>e.type==='evasion') ? (target.statusEffects.find(e=>e.type==='evasion').val||40) : 0)
      + (nightBonus && !target.isPlayer ? 10 : 0)
      + Math.min(3, DATA.adjacentAllies(target, units)) * 3; // Support Bond: +3% evade per adjacent ally
    if (Math.random() * 100 < evasionChance) {
      addFloat(target, 'MISS', '#999999');
      return;
    }

    // ── Stagger bonus: a broken target takes +50% until it recovers ──
    // Applied on hits landed while already staggered (not the breaking hit).
    if (dmg > 0 && target.staggered) dmg = Math.floor(dmg * 1.5);

    // ── Positioning (Phase 1b): facing/back-attacks + flanking ──
    // Only for melee-oriented attacks (physical/hybrid) with real positions.
    let flankBreakBonus = 0;
    if (dmg > 0 && (dmgType === 'physical' || dmgType === 'hybrid') && caster && caster.col != null) {
      // Caster turns to face its target.
      if (caster.col !== target.col) caster.facing = caster.col < target.col ? 'R' : 'L';
      const back = DATA.backAttackMult(caster, target);
      if (back > 1) { dmg = Math.floor(dmg * back); addFloat(target, 'BACK!', '#ff9944'); }
      if (DATA.isFlanked(caster, target, units)) {
        dmg = Math.floor(dmg * 1.20);
        flankBreakBonus = 1;                      // flanking helps break guard
        addFloat(target, 'FLANK!', '#ffbb33');
      }
    }

    // ── Counter Web: weapon/element advantage vs weakness/resistance ──
    // Only applies to damaging attacks with a weapon/element tag.
    if (dmg > 0 && sk && (sk.weaponType || sk.element)) {
      const cm = DATA.counterMult(sk, target);
      if (cm > 1) {
        dmg = Math.floor(dmg * cm);
        addFloat(target, 'WEAK!', '#ffcc33');
        onWeaknessHit(caster, target, sk, (sk.breakPower || 1) + flankBreakBonus);
      } else if (cm < 1) {
        dmg = Math.max(1, Math.floor(dmg * cm));
        addFloat(target, 'RESIST', '#88aacc');
      }
    }

    // Shield
    if (target.shieldActive) {
      dmg = Math.floor(dmg * (1 - (target.shieldPct || 0.5)));
      target.shieldActive = false;
      addFloat(target, 'SHIELD!', '#4488ff');
    }

    // Royal Guard: Kael absorbs for adjacent ally
    const kael = units.find(u => u.name === 'Kael' && u.isPlayer && !u.dead && u.isGuarding);
    if (kael && target.isPlayer && target !== kael) {
      const dist = Math.abs(kael.col-target.col) + Math.abs(kael.row-target.row);
      if (dist <= 1) {
        const absorbed = Math.floor(dmg * 0.5);
        dmg -= absorbed;
        applyRawDamage(kael, absorbed);
        addFloat(kael, `-${absorbed} (guard)`, '#4488ff');
      }
    }

    // Frozen units take 20% more damage
    if (target.statusEffects.find(e=>e.type==='freeze')) dmg = Math.floor(dmg * 1.2);

    applyRawDamage(target, dmg);

    // Track battle stats
    if (caster && caster.name) {
      battleStats.damageDealt[caster.name] = (battleStats.damageDealt[caster.name] || 0) + dmg;
    }
    if (target && target.name) {
      battleStats.damageTaken[target.name] = (battleStats.damageTaken[target.name] || 0) + dmg;
    }

    // ── Latent Power charge (Phase 1e) ──
    // Dealer charges on damage dealt; taker charges (more) on damage taken.
    if (caster && caster.isPlayer && !target.isPlayer) gainLatent(caster, dmg * 0.25);
    if (target && target.isPlayer) gainLatent(target, dmg * 0.40);

    // Log attack with skill name
    const skillName = sk && sk.name ? sk.name : 'Attack';
    addBattleLog(`${caster.name} hit ${target.name} with ${skillName} for ${dmg}`, 'attack');

    const color = dmgType==='magic' ? '#ff8844' : '#ff4444';
    addFloat(target, `-${dmg}`, color);
    // Element-aware impact burst (falls back to melee/magic default).
    const impactType = elementParticle(sk && sk.element, dmgType);
    const tcx = GRID_X+target.col*CELL+CELL/2, tcy = GRID_Y+target.row*CELL+CELL/2;
    const impact = () => UI.spawnParticles(tcx, tcy, impactType, 6);

    // Ranged / non-adjacent hits get a traveling bolt from caster → target so
    // the damage reads as coming from somewhere, not appearing out of thin air.
    // Melee (adjacent) keeps the instant burst. Bolt is decorative; damage is
    // already applied above — the burst just lands in sync on arrival.
    const hasPos = caster && Number.isInteger(caster.col) && Number.isInteger(caster.row);
    const cheb = hasPos ? Math.max(Math.abs(caster.col-target.col), Math.abs(caster.row-target.row)) : 1;
    if (hasPos && cheb > 1) {
      const style = (sk && sk.element) ? sk.element : (dmgType==='magic' ? 'arcane' : 'blade');
      UI.spawnProjectile(
        GRID_X+caster.col*CELL+CELL/2, GRID_Y+caster.row*CELL+CELL/2,
        tcx, tcy, style, impact);
    } else {
      impact();
    }

    // Kill impact — a satisfying beat when a unit falls
    if (target.dead) {
      hitStop(80); UI.screenShake(5, 5);
      UI.spawnParticles(GRID_X+target.col*CELL+CELL/2, GRID_Y+target.row*CELL+CELL/2,
        target.isPlayer ? 'magic' : 'fire', 14);
    }

    // Apply skill effects
    if (sk.effect === 'stun')   applyStatusEffect(target, sk);
    if (sk.effect === 'poison') applyStatusEffect(target, sk);
    if (sk.effect === 'burn')   applyStatusEffect(target, sk);
    if (sk.effect === 'freeze') applyStatusEffect(target, sk);
    if (sk.effect === 'defShred') applyStatusEffect(target, sk);
    if (sk.effect === 'defDown')  applyStatusEffect(target, sk);

    // Lifesteal
    if (sk.effect === 'lifesteal') {
      const ls = Math.floor(dmg * (sk.lifestealPct || 0.3));
      caster.hp = Math.min(caster.maxHp, caster.hp + ls);
      addFloat(caster, `+${ls}`, '#44ff88');
    }

    // Counter-attack passive
    if (!target.dead && !target.isPlayer && target.skills && target.skills.includes('eCounter')) {
      if (Math.random() < 0.5) {
        const counterDmg = calcPhysDmg(target, caster, 1.0, 0);
        applyRawDamage(caster, counterDmg);
        addFloat(caster, `-${counterDmg} CTR`, '#ff8800');
      }
    }

    if (target.hp <= 0) {
      UI.spawnParticles(GRID_X+target.col*CELL+CELL/2, GRID_Y+target.row*CELL+CELL/2, 'death', 8);
      if (typeof AUDIO !== 'undefined') AUDIO.sfx.death();
      // Track enemy defeated
      if (!target.isPlayer) {
        battleStats.enemiesDefeated++;
        // Track specific enemy type killed for bestiary
        if (target.templateKey) {
          battleStats.enemiesKilled[target.templateKey] = (battleStats.enemiesKilled[target.templateKey] || 0) + 1;
        }
      }
      // Ally death banter — a living survivor reacts (not the one who fell).
      if (target.isPlayer) {
        const survivors = units.filter(u => u.isPlayer && !u.dead && u.name !== target.name).map(u => u.name);
        const deathBanter = DATA.getBanter('allyDeath', survivors);
        if (deathBanter) {
          setTimeout(() => UI.showBattleQuote(deathBanter.speaker, deathBanter.text, 2500), 400);
        }
      }
    }

    if (dmg >= 40) { UI.screenShake(3, 3); }
  }

  function applyRawDamage(unit, dmg) {
    unit.hp = Math.max(0, unit.hp - dmg);
    if (unit.hp <= 0) unit.dead = true;
  }

  // ── Latent Power (Phase 1e) ──────────────────────────────────
  function gainLatent(unit, amt) {
    if (!unit || !unit.isPlayer) return;
    const was = unit.latent || 0;
    unit.latent = Math.min(LATENT_MAX, was + amt);
    if (was < LATENT_MAX && unit.latent >= LATENT_MAX) {
      addFloat(unit, 'LATENT READY!', '#ffee66');
      if (typeof AUDIO !== 'undefined' && AUDIO.sfx && AUDIO.sfx.levelUp) AUDIO.sfx.levelUp();
    }
  }

  // Per-character signature ultimate. Fires the effect, empties the gauge,
  // and ends the caster's turn. Reuses existing effect primitives.
  function useLatent(caster) {
    if (!caster || !caster.isPlayer || (caster.latent || 0) < LATENT_MAX) return;
    caster.latent = 0;
    const name = caster.name;
    flashBang('#ffee88', 0.7); UI.screenShake(7, 6);
    const ccx = GRID_X + caster.col*CELL + CELL/2, ccy = GRID_Y + caster.row*CELL + CELL/2;

    if (name === 'Kael') {
      // Aegis Vow — party gains a strong shield + moderate heal.
      for (const u of units) {
        if (!u.dead && u.isPlayer) {
          u.shieldActive = true; u.shieldPct = 0.6;
          const heal = Math.floor(u.maxHp * 0.35);
          u.hp = Math.min(u.maxHp, u.hp + heal);
          addFloat(u, 'AEGIS', '#66aaff');
          UI.spawnParticles(GRID_X+u.col*CELL+CELL/2, GRID_Y+u.row*CELL+CELL/2, 'heal', 8);
        }
      }
      addBattleLog(`${name} invokes Aegis Vow — the party is shielded!`, 'status');

    } else if (name === 'Lyra') {
      // Shadow Flurry — refund full Momentum + a free boosted strike on nearest enemy.
      caster.momentum = MOMENTUM_MAX;
      const tgt = units.filter(u => !u.dead && !u.isPlayer)
        .sort((a,b)=>(Math.abs(a.col-caster.col)+Math.abs(a.row-caster.row))-(Math.abs(b.col-caster.col)+Math.abs(b.row-caster.row)))[0];
      if (tgt) {
        for (let i=0;i<3;i++) {
          const dmg = calcPhysDmg(caster, tgt, 1.6, terrainAtkBonus(caster.col,caster.row));
          applyHit(caster, tgt, dmg, { name:'Shadow Flurry', weaponType:'dagger', breakPower:2 }, 'physical');
        }
      }
      addBattleLog(`${name} unleashes Shadow Flurry! Momentum restored.`, 'status');

    } else if (name === 'Theron') {
      // Vareth Surge — heavy dark burst to ALL enemies.
      for (const u of units) {
        if (!u.dead && !u.isPlayer) {
          const dmg = calcMagDmg(caster, u, 3.0, terrainAtkBonus(caster.col,caster.row));
          applyHit(caster, u, dmg, { name:'Vareth Surge', element:'dark', breakPower:2 }, 'magic');
        }
      }
      UI.spawnParticles(ccx, ccy, 'void', 24);
      addBattleLog(`${name} channels the Vareth Surge!`, 'status');

    } else if (name === 'Sera') {
      // Dawn's Grace — revive all fallen allies + full-heal the living.
      let revived = 0;
      for (const u of units) {
        if (u.isPlayer && u.dead) { u.dead=false; u.hp=Math.floor(u.maxHp*0.6); addFloat(u,'DAWN!','#ffffcc'); revived++; }
        else if (u.isPlayer) { u.hp=u.maxHp; addFloat(u,'+FULL','#66ff99'); }
        if (u.isPlayer) UI.spawnParticles(GRID_X+u.col*CELL+CELL/2, GRID_Y+u.row*CELL+CELL/2, 'heal', 10);
      }
      addBattleLog(`${name} calls Dawn's Grace! (revived ${revived})`, 'heal');
    }

    checkBattleOver();
    if (phase !== 'victory' && phase !== 'defeat') endPlayerTurn();
  }

  function reviveVoidShards(boss) {
    const shards = units.filter(u => u.dead && !u.isPlayer && u.name === 'Void Shard');
    for (const s of shards) {
      s.dead = false;
      s.hp   = s.maxHp;
      addFloat(s, 'REBORN!', '#cc44ff');
    }
    addFloatXY(GRID_X + boss.col*CELL + CELL/2, GRID_Y + boss.row*CELL - 20, 'VOID SHARDS REBORN!', '#cc44ff');
    flashBang('#440066', 0.5);
  }

  // ── Enemy AI ─────────────────────────────────────────────────
  function doEnemyTurn() {
    const eu = units[currentUnitIdx];
    if (!eu || eu.dead) { endEnemyTurn(); return; }

    // Stunned / frozen / berserk handling
    const stunned = eu.statusEffects.find(e => e.type==='stun' || e.type==='freeze');
    if (stunned) {
      addFloat(eu, stunned.type==='freeze' ? 'FROZEN' : 'STUNNED', '#88ccff');
      endEnemyTurn(); return;
    }
    // Stagger skip: broken enemies lose this turn, then recover (guard refills).
    if (eu.staggerSkipPending) {
      eu.staggerSkipPending = false;
      eu.staggered = false;
      eu.guard = eu.guardMax;
      addFloat(eu, 'STAGGERED', '#ff8888');
      addBattleLog(`${eu.name} is staggered and loses a turn!`, 'status');
      endEnemyTurn(); return;
    }
    const berserk = eu.statusEffects.find(e => e.type==='berserk');
    if (berserk) {
      // Force attack nearest unit regardless of side
      const target = units.filter(u => !u.dead && u !== eu)
        .sort((a,b) => (Math.abs(a.col-eu.col)+Math.abs(a.row-eu.row)) - (Math.abs(b.col-eu.col)+Math.abs(b.row-eu.row)))[0];
      if (target) {
        const dmg = Math.floor(calcPhysDmg(eu, target, 1.3, 0));
        applyHit(eu, target, dmg, { type:'physical', mult:1.3 }, 'physical');
      }
      endEnemyTurn(); return;
    }

    const ai = eu.aiType || 'aggressive';
    const players = units.filter(u => u.isPlayer && !u.dead);
    const enemies = units.filter(u => !u.isPlayer && !u.dead);

    if (players.length === 0) { checkBattleOver(); return; }

    // Multi-action for Vareth
    const actCount = eu.actionsPerTurn || 1;
    for (let act = 0; act < actCount; act++) {
      if (eu.dead || players.every(p=>p.dead)) break;
      doSingleEnemyAction(eu, ai, players, enemies);
    }

    endEnemyTurn();
  }

  function doSingleEnemyAction(eu, ai, players, enemies) {
    // Choose skill
    let skKey = null;
    if (ai === 'support') {
      // Prioritize buffing/debuffing
      const supportSkills = (eu.skills || []).filter(k => {
        const s = DATA.SKILLS[k]; return s && (s.type==='buff' || s.type==='debuff');
      });
      if (supportSkills.length > 0 && Math.random() < 0.6) {
        skKey = supportSkills[Math.floor(Math.random() * supportSkills.length)];
      }
    }
    if (!skKey) {
      // Pick from skills
      const offSkills = (eu.skills || []).filter(k => {
        const s = DATA.SKILLS[k]; return s && (s.type==='physical'||s.type==='magic'||s.type==='debuff');
      });
      if (offSkills.length > 0) skKey = offSkills[Math.floor(Math.random() * offSkills.length)];
      else skKey = (eu.skills||[])[0];
    }
    if (!skKey) return;
    const sk = DATA.SKILLS[skKey];
    if (!sk) return;

    // Choose target
    let target = null;
    if (ai === 'tactical' || ai === 'boss') {
      // Target lowest HP, prioritise healers
      const healers = players.filter(p => p.class && p.class.toLowerCase().includes('heal'));
      target = healers.length > 0 ? healers[0] : players.reduce((a,b) => a.hp < b.hp ? a : b, players[0]);
    } else {
      target = players[Math.floor(Math.random() * players.length)];
    }

    // Move toward target
    const dist = Math.abs(eu.col-target.col) + Math.abs(eu.row-target.row);
    const moveRange = (eu.move||3) + terrainMoveBonus(eu.col, eu.row);
    if (dist > (sk.range||1) && dist > 1) {
      const mr = getMoveRange(eu);
      if (mr.length > 0) {
        const best = mr.reduce((a,b) => {
          const da = Math.abs(a.col-target.col)+Math.abs(a.row-target.row);
          const db = Math.abs(b.col-target.col)+Math.abs(b.row-target.row);
          return da < db ? a : b;
        });
        eu.col = best.col; eu.row = best.row;
      }
    }

    // Boss: move to elevated terrain
    if ((ai==='boss') && Math.random() < 0.4) {
      const elev = Object.keys(terrainMap).filter(k => terrainMap[k]==='elevated').map(k=>{
        const [c,r]=k.split(','); return {col:+c,row:+r};
      });
      if (elev.length > 0 && !getUnitAt(elev[0].col,elev[0].row)) {
        eu.col = elev[0].col; eu.row = elev[0].row;
      }
    }

    // Execute skill
    const tBonus = terrainAtkBonus(eu.col, eu.row);
    switch (sk.type) {
      case 'physical': {
        if (!target || target.dead) break;
        const dmg = calcPhysDmg(eu, target, sk.mult, tBonus);
        applyHit(eu, target, dmg, sk, 'physical');
        break;
      }
      case 'magic': {
        if (sk.target === 'allPlayers') {
          for (const p of players) {
            const dmg = calcMagDmg(eu, p, sk.mult, tBonus);
            applyHit(eu, p, dmg, sk, 'magic');
          }
        } else if (!target || target.dead) { break; }
        else {
          const dmg = calcMagDmg(eu, target, sk.mult, tBonus);
          applyHit(eu, target, dmg, sk, 'magic');
        }
        break;
      }
      case 'debuff': {
        if (sk.target === 'aoe2') {
          for (const p of players) {
            const r = 2;
            if (Math.abs(p.col-eu.col)<=r && Math.abs(p.row-eu.row)<=r) applyStatusEffect(p, sk);
          }
        } else if (sk.target === 'allPlayers') {
          for (const p of players) applyStatusEffect(p, sk);
        } else if (target) { applyStatusEffect(target, sk); }
        break;
      }
      case 'buff': {
        // Enemy buff: target nearby ally
        if (sk.effect === 'atkBuff' || sk.effect === 'defBuff') {
          const ally = enemies.find(e2 => e2 !== eu && Math.abs(e2.col-eu.col)+Math.abs(e2.row-eu.row)<=2);
          if (ally) {
            ally.buffs.push({ stat: sk.effect==='atkBuff'?'atk':'def', mult:1+(sk.buffAmt||0.3), turnsLeft:sk.buffTurns||2 });
            addFloat(ally, sk.effect==='atkBuff'?'ATK↑':'DEF↑', '#44ff44');
          }
        } else if (sk.effect === 'shield') {
          const ally = enemies.find(e2 => e2 !== eu && Math.abs(e2.col-eu.col)<=1);
          if (ally) { ally.shieldActive = true; ally.shieldPct = 0.5; addFloat(ally,'SHIELD','#4488ff'); }
        } else if (sk.effect === 'evasion') {
          eu.evasionBonus = sk.evasionAmt || 40; eu.evasionTurns = sk.evasionTurns || 2;
          addFloat(eu,'EVASIVE','#aaaaff');
        }
        break;
      }
      case 'special': {
        if (sk.effect === 'mpDrain' && target) applyStatusEffect(target, sk);
        break;
      }
    }

    // Check boss Vareth revive
    if (eu.reviveAddsAt50 && !eu.reviveTriggered && eu.hp <= eu.maxHp * 0.5) {
      eu.reviveTriggered = true;
      reviveVoidShards(eu);
    }

    checkBattleOver();
  }

  function endEnemyTurn() {
    phase   = 'init';
    aiDelay = 0;
    battleStats.turnsTaken++;
    advanceCT();
  }

  // ── Quick-save / Quick-load (Single slot) ────────────────────
  function quickSave() {
    const saveData = {
      units: units.map(u => ({
        ...u,
        // Deep clone objects to avoid reference issues
        buffs: [...(u.buffs || [])],
        statusEffects: [...(u.statusEffects || [])],
        skills: [...(u.skills || [])],
      })),
      battleInventory: {...battleInventory},
      battleStats: {...battleStats, startTime: Date.now()}, // Reset timer for duration calc
      phase,
      currentUnitIdx,
      difficulty,
      battleDrops: [...battleDrops],
      battleLog: [...battleLog],
      savedAt: Date.now(),
    };
    localStorage.setItem('shattered_crown_battle_save', JSON.stringify(saveData));
  }

  function quickLoad() {
    const saveData = localStorage.getItem('shattered_crown_battle_save');
    if (!saveData) {
      UI.showNotif('No quick-save found!', '#ff6644', 2000);
      return;
    }
    try {
      const data = JSON.parse(saveData);
      // Restore battle state
      units = data.units || [];
      battleInventory = data.battleInventory || {};
      battleStats = data.battleStats || {};
      phase = data.phase || 'init';
      currentUnitIdx = data.currentUnitIdx || 0;
      difficulty = data.difficulty || 'normal';
      battleDrops = data.battleDrops || [];
      battleLog = data.battleLog || [];
      // Restore floating texts and other arrays
      floatingTexts = [];
      selectedSkillKey = null;
      selectedItemKey = null;
      moveHighlight = [];
      targetHighlight = [];
      pendingMove = null;
      UI.showNotif('Battle Loaded!', '#88ff88', 2000);
    } catch (e) {
      console.error('Failed to load quick-save:', e);
      UI.showNotif('Failed to load save!', '#ff6644', 2000);
    }
  }

  // ── Weather effects ─────────────────────────────────────────
  function doLightningStrike() {
    // Pick a random non-elevated unit to strike (elevated terrain is safe)
    const targets = units.filter(u => !u.dead && terrainMap[`${u.col},${u.row}`] !== 'elevated');
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const dmg = Math.floor(25 + Math.random() * 15); // 25-40 damage
    applyRawDamage(target, dmg);
    addFloat(target, `-${dmg} LIGHTNING!`, '#ffff44');
    UI.spawnParticles(GRID_X+target.col*CELL+CELL/2, GRID_Y+target.row*CELL+CELL/2, 'lightning', 12);
    flashBang('#ffffaa', 0.6);
    UI.screenShake(4, 4);
    addBattleLog(`Lightning struck ${target.name} for ${dmg} damage!`, 'normal');
  }

  // ── Flash / visual effects ───────────────────────────────────
  function flashBang(color, alpha) {
    flashColor = color || '#ffffff';
    flashAlpha = alpha || 0.8;
    flashTimer = 200;
  }

  // Freeze the sim briefly for impact (crit/break/kill). Capped so it can't stall.
  function hitStop(ms) {
    hitStopTimer = Math.min(120, Math.max(hitStopTimer, ms || 60));
  }

  // ── Floating text helpers ────────────────────────────────────
  function addFloat(unit, text, color) {
    addFloatXY(GRID_X+unit.col*CELL+CELL/2, GRID_Y+unit.row*CELL+CELL/4, text, color);
  }

  function addFloatXY(x, y, text, color) {
    floatingTexts.push({
      x, y, text, color,
      vx: (Math.random()-0.5)*0.5,
      life:1100, maxLife:1100
    });
  }

  // ── Drawing ─────────────────────────────────────────────────
  function draw() {
    UI.updateShake();
    ctx.save();
    UI.applyShake();

    drawBackground();
    drawGrid();
    drawTerrainHighlights();
    drawHighlights();
    drawUnits();
    drawWeather();
    drawGrade();          // cinematic color grade + vignette over the diorama
    drawFloatingTexts();
    UI.drawParticles();
    UI.drawProjectiles();
    drawPanel();
    UI.drawBattleQuote();  // Draw battle banter quotes

    // Battle log (drawn outside shake transform)
    drawBattleLog();

    // Tooltip (drawn outside shake transform to keep it stable)
    ctx.restore();
    if (hoveredUnit) drawTooltip();

    ctx.save();
    UI.applyShake();
    if (phase === 'defeat') drawDefeatOverlay();

    // Flash effect — additive for a bloom-like pop over the whole frame
    if (flashAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = flashColor.startsWith('#')
        ? UI.hexAlpha(flashColor, flashAlpha * 0.7) : flashColor;
      ctx.fillRect(0, 0, 900, 620);
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Cinematic color grade + vignette (HD-2D-style depth) ──────
  // Per-scene tint (multiply-ish via low-alpha overlay) + radial vignette,
  // drawn over the battlefield diorama only (left of the right panel).
  const GRADE = {
    village:       { tint:'rgba(255,220,150,0.10)', vig:0.42 },
    forest:        { tint:'rgba(120,200,140,0.12)', vig:0.50 },
    town:          { tint:'rgba(255,210,140,0.10)', vig:0.44 },
    selvara:       { tint:'rgba(255,190,120,0.12)', vig:0.46 },
    selvara_night: { tint:'rgba(70,90,180,0.18)',   vig:0.58 },
    undercity:     { tint:'rgba(80,90,150,0.20)',   vig:0.62 },
    castle_hall:   { tint:'rgba(180,170,210,0.12)', vig:0.52 },
    throne_room:   { tint:'rgba(255,205,110,0.14)', vig:0.50 },
    vault_cracking:{ tint:'rgba(200,90,220,0.16)',  vig:0.60 },
    vault_final:   { tint:'rgba(170,70,210,0.20)',  vig:0.64 },
  };
  function drawGrade() {
    const g = GRADE[background] || GRADE.village;
    const w = PANEL_X, h = 620;
    // Color tint
    ctx.fillStyle = g.tint;
    ctx.fillRect(0, 0, w, h);
    // Radial vignette — bright centre, dark edges
    const cx = w/2, cy = h/2;
    const vg = ctx.createRadialGradient(cx, cy, h*0.25, cx, cy, h*0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${g.vig})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // ── Background drawing ───────────────────────────────────────
  function drawBackground() {
    const t = Date.now() * 0.001;
    switch (background) {
      case 'village': drawBgVillage(t); break;
      case 'forest':  drawBgForest(t);  break;
      case 'town':    drawBgTown(t);    break;
      case 'selvara': drawBgSelvara(t); break;
      case 'selvara_night': drawBgSelvaraNight(t); break;
      case 'undercity': drawBgUndercity(t); break;
      case 'castle_hall': drawBgCastleHall(t); break;
      case 'throne_room': drawBgThrone(t); break;
      case 'vault_cracking': drawBgVaultCracking(t); break;
      case 'vault_final':    drawBgVaultFinal(t); break;
      default: drawBgVillage(t);
    }
    // Roguelike floor tile texture over battle grid (Kenney CC0)
    if (typeof SPRITES !== 'undefined') {
      SPRITES.battleFloor(ctx, background, GRID_X, GRID_Y, CELL, GRID_COLS, GRID_ROWS, 0.42);
    }
  }

  function drawBgVillage(t) {
    const sky = ctx.createLinearGradient(0,0,0,520);
    sky.addColorStop(0,'#080814'); sky.addColorStop(0.5,'#18140e'); sky.addColorStop(0.8,'#1a0f0a'); sky.addColorStop(1,'#0d0805');
    ctx.fillStyle = sky; ctx.fillRect(0,0,900,520);
    // Dark bottom area for UI separation
    ctx.fillStyle = '#0a0505'; ctx.fillRect(0,520,900,100);
    // Buildings silhouette - positioned higher
    ctx.fillStyle = '#0d0503';
    for (let i=0;i<7;i++) {
      const bx=30+i*120, bh=140+i%3*40;
      const by=520-bh;
      ctx.fillRect(bx, by, 90, bh);
      // Jagged top
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+22,by-25); ctx.lineTo(bx+45,by-15); ctx.lineTo(bx+68,by-28); ctx.lineTo(bx+90,by); ctx.fill();
    }
    // Fire glow - positioned higher, more subtle
    for (let i=0;i<4;i++) {
      const fx=80+i*200, fy=420+i%2*40;
      const fg=ctx.createRadialGradient(fx,fy,6,fx,fy,45);
      fg.addColorStop(0,`rgba(255,140,30,${0.35+0.15*Math.sin(t*2.5+i)})`);
      fg.addColorStop(0.5,`rgba(200,60,20,${0.15+0.08*Math.sin(t*1.8+i)})`);
      fg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=fg; ctx.fillRect(fx-45,fy-45,90,90);
    }
    // Embers - fewer, higher up
    for (let i=0;i<12;i++) {
      const ex=60+((t*25+i*67)%780), ey=180+i*22-((t*15+i*25)%200);
      if (ey > 450) continue; // keep embers above UI area
      const ea=0.3+0.3*Math.sin(t*3+i);
      ctx.beginPath(); ctx.arc(ex,ey,1.2,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,100,30,${ea})`; ctx.fill();
    }
    // Bottom gradient fade for smooth transition
    const fade = ctx.createLinearGradient(0,480,0,520);
    fade.addColorStop(0,'rgba(0,0,0,0)'); fade.addColorStop(1,'rgba(10,5,5,0.9)');
    ctx.fillStyle=fade; ctx.fillRect(0,480,900,40);
  }

  function drawBgForest(t) {
    ctx.fillStyle='#070f06'; ctx.fillRect(0,0,900,620);
    // Tree layers
    for (let layer=0;layer<3;layer++) {
      ctx.fillStyle = layer===0?'#040904':layer===1?'#081408':'#0d1e0c';
      for (let i=0;i<16;i++) {
        const tx2=(i*61+layer*200)%900, th=160+i%4*30+layer*40;
        ctx.beginPath();
        ctx.moveTo(tx2,620); ctx.lineTo(tx2-20-layer*5,620-th*0.35); ctx.lineTo(tx2,620-th); ctx.lineTo(tx2+20+layer*5,620-th*0.35);
        ctx.closePath(); ctx.fill();
      }
    }
    // Eerie green glow
    const fg=ctx.createRadialGradient(450,310,40,450,310,320);
    fg.addColorStop(0,`rgba(0,80,40,${0.12+0.05*Math.sin(t*0.5)})`);
    fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fg; ctx.fillRect(0,0,900,620);
    // Fireflies
    for (let i=0;i<30;i++) {
      const fa=0.3+0.7*Math.abs(Math.sin(t*1.5+i*0.8));
      const fx=50+i*30+20*Math.sin(t*0.3+i), fy=100+i*15+30*Math.cos(t*0.4+i*0.7);
      ctx.beginPath(); ctx.arc(fx%900,fy,2,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,255,100,${fa*0.5})`; ctx.fill();
    }
  }

  function drawBgTown(t) {
    ctx.fillStyle='#0e0e14'; ctx.fillRect(0,0,900,620);
    ctx.fillStyle='#181828';
    for (let r=0;r<22;r++) for (let c=0;c<15;c++) if ((r+c)%2===0) ctx.fillRect(c*64,r*30,63,29);
    // Muddy ground
    ctx.fillStyle='#2a1a0a';
    ctx.fillRect(0,520,900,100);
    // Torch lights
    for (let i=0;i<5;i++) {
      const tx2=80+i*180;
      const tg=ctx.createRadialGradient(tx2,100,4,tx2,100,90);
      tg.addColorStop(0,`rgba(255,160,40,${0.35+0.15*Math.sin(t*2.2+i)})`);
      tg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=tg; ctx.fillRect(tx2-90,10,180,190);
    }
  }

  function drawBgSelvara(t) {
    ctx.fillStyle='#0a0810'; ctx.fillRect(0,0,900,620);
    ctx.fillStyle='#14101a';
    for (let r=0;r<12;r++) for (let c=0;c<10;c++) ctx.fillRect(c*90,r*55,88,53);
    // Mask decorations
    for (let i=0;i<6;i++) {
      const mx=80+i*140, my=50;
      ctx.fillStyle=`rgba(180,140,80,0.15)`;
      ctx.beginPath(); ctx.ellipse(mx,my,25,30,0,0,Math.PI*2); ctx.fill();
    }
    // Market lights
    for (let i=0;i<8;i++) {
      const lx=50+i*110;
      const lg=ctx.createRadialGradient(lx,80,5,lx,80,70);
      lg.addColorStop(0,`rgba(255,200,100,${0.2+0.1*Math.sin(t*1.5+i)})`);
      lg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=lg; ctx.fillRect(lx-70,10,140,150);
    }
  }

  function drawBgSelvaraNight(t) {
    drawBgSelvara(t);
    ctx.fillStyle='rgba(0,0,20,0.55)'; ctx.fillRect(0,0,900,620);
    // Moonlight
    const ml=ctx.createRadialGradient(750,50,10,750,50,200);
    ml.addColorStop(0,'rgba(180,180,255,0.1)');
    ml.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ml; ctx.fillRect(0,0,900,620);
  }

  function drawBgUndercity(t) {
    ctx.fillStyle='#060610'; ctx.fillRect(0,0,900,620);
    // Stone bricks
    ctx.fillStyle='#0e0e20';
    for (let r=0;r<10;r++) {
      const offset = r%2===0?0:48;
      for (let c=0;c<10;c++) ctx.fillRect(c*96+offset,r*64,94,62);
    }
    // Rune glow
    for (let i=0;i<12;i++) {
      const rx=50+i*70, ry=30+i%3*60;
      const ra=0.2+0.2*Math.sin(t*2+i);
      ctx.beginPath(); ctx.arc(rx,ry,4,0,Math.PI*2);
      ctx.fillStyle=`rgba(80,60,200,${ra})`; ctx.fill();
    }
    // Undercity torches
    for (let i=0;i<4;i++) {
      const ux=100+i*220;
      const ug=ctx.createRadialGradient(ux,120,5,ux,120,80);
      ug.addColorStop(0,`rgba(200,120,40,${0.3+0.1*Math.sin(t*2+i)})`);
      ug.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ug; ctx.fillRect(ux-80,40,160,160);
    }
  }

  function drawBgCastleHall(t) {
    ctx.fillStyle='#0c0c16'; ctx.fillRect(0,0,900,620);
    ctx.fillStyle='#141424';
    for (let r=0;r<20;r++) for (let c=0;c<15;c++) if ((r+c)%2===0) ctx.fillRect(c*64,r*32,62,30);
    // Pillars
    ctx.fillStyle='#1a1a2e';
    for (let i=0;i<5;i++) { ctx.fillRect(60+i*180,0,28,620); ctx.fillStyle='#24243e'; ctx.fillRect(62+i*180,0,10,620); ctx.fillStyle='#1a1a2e'; }
    // Torches
    for (let i=0;i<4;i++) {
      const tx2=80+i*230;
      const tg=ctx.createRadialGradient(tx2,100,6,tx2,100,100);
      tg.addColorStop(0,`rgba(255,160,40,${0.4+0.15*Math.sin(t*2.5+i)})`);
      tg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=tg; ctx.fillRect(tx2-100,0,200,200);
    }
    // Gold trim
    ctx.strokeStyle='rgba(180,140,50,0.3)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,50); ctx.lineTo(900,50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,570); ctx.lineTo(900,570); ctx.stroke();
  }

  function drawBgThrone(t) {
    const floor=ctx.createLinearGradient(0,300,0,620);
    floor.addColorStop(0,'#200808'); floor.addColorStop(1,'#0e0404');
    ctx.fillStyle=floor; ctx.fillRect(0,0,900,620);
    // Red carpet
    ctx.fillStyle='#440000'; ctx.fillRect(350,0,200,620);
    ctx.fillStyle='#550000'; ctx.fillRect(360,0,180,620);
    ctx.fillStyle='#660000'; ctx.fillRect(370,0,160,620);
    // Gold trim carpet
    ctx.strokeStyle='#886600'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(350,0); ctx.lineTo(350,620); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(550,0); ctx.lineTo(550,620); ctx.stroke();
    ctx.strokeStyle='#aa8800'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(360,0); ctx.lineTo(360,620); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(540,0); ctx.lineTo(540,620); ctx.stroke();
    // Pillars
    for (let i=0;i<4;i++) {
      ctx.fillStyle='#2a2a3a'; ctx.fillRect(40+i*240,0,30,620);
      ctx.fillStyle='#3a3a4a'; ctx.fillRect(42+i*240,0,12,620);
    }
    // Throne glow
    const tg=ctx.createRadialGradient(450,30,20,450,30,180);
    tg.addColorStop(0,`rgba(255,140,20,${0.25+0.1*Math.sin(t*1.5)})`);
    tg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=tg; ctx.fillRect(270,0,360,360);
  }

  function drawBgVaultCracking(t) {
    ctx.fillStyle='#040418'; ctx.fillRect(0,0,900,620);
    // Cracking stone
    ctx.strokeStyle='rgba(80,60,180,0.3)'; ctx.lineWidth=2;
    for (let i=0;i<15;i++) {
      const cx2=50+i*60+20*Math.sin(t+i);
      ctx.beginPath(); ctx.moveTo(cx2,0); ctx.lineTo(cx2+40,620); ctx.stroke();
    }
    // Void cracks
    for (let i=0;i<8;i++) {
      const ca=0.3+0.3*Math.sin(t*3+i);
      ctx.strokeStyle=`rgba(150,50,255,${ca})`; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(100+i*100, 200+i*20);
      ctx.lineTo(100+i*100+30+i*5, 200+i*20+40);
      ctx.lineTo(100+i*100+60, 200+i*20+20); ctx.stroke();
    }
    // Purple radiance
    const vg=ctx.createRadialGradient(450,310,30,450,310,380);
    vg.addColorStop(0,`rgba(80,20,200,${0.2+0.1*Math.sin(t*2)})`);
    vg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,900,620);
  }

  function drawBgVaultFinal(t) {
    drawBgVaultCracking(t);
    // Extra chaos
    const chaos=ctx.createRadialGradient(450,310,20,450,310,260);
    chaos.addColorStop(0,`rgba(120,40,255,${0.3+0.2*Math.sin(t*4)})`);
    chaos.addColorStop(0.5,`rgba(40,0,120,${0.15+0.1*Math.cos(t*3)})`);
    chaos.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=chaos; ctx.fillRect(0,0,900,620);
    // Reality shards
    for (let i=0;i<25;i++) {
      const rx=(Date.now()*0.02+i*120)%900;
      const ry=(50+i*25+(Math.sin(t*2+i)*30+30))%620;
      const ra=0.4+0.4*Math.sin(t*3+i);
      ctx.beginPath(); ctx.arc(rx,ry,2,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,100,255,${ra})`; ctx.fill();
    }
  }

  // ── Grid drawing ─────────────────────────────────────────────
  function drawGrid() {
    const t2 = Date.now() * 0.001;
    for (let r=0; r<GRID_ROWS; r++) {
      for (let c=0; c<GRID_COLS; c++) {
        const x = GRID_X + c*CELL, y = GRID_Y + r*CELL;
        const ttype = getTerrainAt(c, r);

        // ── Roguelike sprite base per terrain type ─────────────
        if (typeof SPRITES !== 'undefined') {
          SPRITES.battleCell(ctx, ttype, x, y, CELL);
        }

        // ── Colour tint overlay to unify sprite with scene mood ─
        const tints = {
          elevated: 'rgba(255,220,140,0.10)',
          water:    'rgba(20,60,140,0.32)',
          forest:   'rgba(10,50,10,0.25)',
          ruins:    'rgba(60,20,120,0.18)',
          normal:   'rgba(0,0,0,0.22)',
        };
        ctx.fillStyle = tints[ttype] || tints.normal;
        ctx.fillRect(x, y, CELL, CELL);

        // ── Rich terrain overlay art ────────────────────────────
        if (ttype === 'elevated') {
          // Rocky ledge: stacked stone slabs on bottom edge + height arrows
          ctx.fillStyle = 'rgba(180,140,60,0.30)';
          ctx.fillRect(x+4, y+CELL-10, CELL-8, 6);
          ctx.fillRect(x+8, y+CELL-16, CELL-16, 5);
          // Highlight on top stone edge
          ctx.fillStyle = 'rgba(255,220,140,0.45)';
          ctx.fillRect(x+4, y+CELL-10, CELL-8, 2);
          // Height indicator arrows (top-right corner)
          ctx.strokeStyle = 'rgba(255,200,80,0.55)'; ctx.lineWidth = 1.5;
          for (let ai = 0; ai < 3; ai++) {
            const ay = y + 6 + ai * 6;
            ctx.beginPath();
            ctx.moveTo(x+CELL-14, ay+4); ctx.lineTo(x+CELL-10, ay); ctx.lineTo(x+CELL-6, ay+4);
            ctx.stroke();
          }
          // Warm glow on floor
          ctx.fillStyle = 'rgba(255,200,80,0.06)';
          ctx.fillRect(x, y, CELL, CELL);

        } else if (ttype === 'water') {
          // Full-cell animated water ripples
          const wt = t2 * 1.4 + c * 0.6 + r * 0.4;
          // Deep water fill
          ctx.fillStyle = 'rgba(10,40,120,0.38)';
          ctx.fillRect(x, y, CELL, CELL);
          // Wave lines sweeping the full cell
          ctx.lineWidth = 1.2;
          for (let wi = 0; wi < 5; wi++) {
            const wy = y + 5 + wi * 9;
            const amp = 1.8 + Math.sin(wt + wi * 1.1) * 1.2;
            ctx.strokeStyle = `rgba(80,160,255,${0.30 + 0.18*Math.sin(wt*1.2+wi)})`;
            ctx.beginPath();
            ctx.moveTo(x, wy + Math.sin(wt + c + wi) * amp);
            for (let wx2 = 0; wx2 <= CELL; wx2 += 8) {
              ctx.lineTo(x + wx2, wy + Math.sin(wt + wx2 * 0.18 + wi) * amp);
            }
            ctx.stroke();
          }
          // Sparkle glints
          for (let gi = 0; gi < 3; gi++) {
            const gx = x + 8 + gi * 16 + Math.sin(t2 * 0.8 + gi + c) * 4;
            const gy = y + 8 + gi * 12 + Math.cos(t2 * 1.1 + gi) * 3;
            ctx.fillStyle = `rgba(180,230,255,${0.35 + 0.3*Math.abs(Math.sin(t2*2.5+gi+c))})`;
            ctx.beginPath(); ctx.arc(gx % (x+CELL-4) || gx, gy, 1.2, 0, Math.PI*2); ctx.fill();
          }

        } else if (ttype === 'forest') {
          // 2–3 tree canopy shapes
          const trees = [
            { ox: 0.25, oy: 0.55, r: 10 },
            { ox: 0.65, oy: 0.45, r: 9 },
            { ox: 0.45, oy: 0.68, r: 7 },
          ];
          for (const tr of trees) {
            const tx2 = x + CELL * tr.ox, ty2 = y + CELL * tr.oy;
            // Trunk
            ctx.fillStyle = 'rgba(50,25,10,0.55)';
            ctx.fillRect(tx2-2, ty2, 4, CELL*(1-tr.oy));
            // Dark undercanopy
            ctx.fillStyle = 'rgba(8,40,8,0.65)';
            ctx.beginPath(); ctx.arc(tx2, ty2-2, tr.r, 0, Math.PI*2); ctx.fill();
            // Mid canopy
            ctx.fillStyle = 'rgba(18,70,18,0.55)';
            ctx.beginPath(); ctx.arc(tx2, ty2-5, tr.r*0.75, 0, Math.PI*2); ctx.fill();
            // Bright tip
            ctx.fillStyle = 'rgba(30,100,20,0.45)';
            ctx.beginPath(); ctx.arc(tx2, ty2-8, tr.r*0.50, 0, Math.PI*2); ctx.fill();
          }
          // Subtle magic shimmer
          ctx.fillStyle = `rgba(40,180,60,${0.04+0.03*Math.sin(t2*0.8+c+r)})`;
          ctx.fillRect(x, y, CELL, CELL);

        } else if (ttype === 'ruins') {
          // Crumbled stone rubble in corners
          const rubble = [
            [x+2,  y+2,  10, 7], [x+CELL-12, y+2,   10, 7],
            [x+2,  y+CELL-9, 8, 7], [x+CELL-10,y+CELL-9, 8, 7],
          ];
          for (const [rx,ry,rw,rh] of rubble) {
            ctx.fillStyle = 'rgba(50,35,55,0.60)'; ctx.fillRect(rx,ry,rw,rh);
            ctx.fillStyle = 'rgba(70,50,75,0.35)'; ctx.fillRect(rx,ry,rw,2);
          }
          // Rune circle at centre
          const runeAlpha = 0.28 + 0.22 * Math.sin(t2 * 1.8 + c + r);
          ctx.strokeStyle = `rgba(160,80,255,${runeAlpha})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x+CELL/2, y+CELL/2, 10, 0, Math.PI*2); ctx.stroke();
          // Rune cross
          ctx.beginPath();
          ctx.moveTo(x+CELL/2, y+CELL/2-10); ctx.lineTo(x+CELL/2, y+CELL/2+10);
          ctx.moveTo(x+CELL/2-10, y+CELL/2); ctx.lineTo(x+CELL/2+10, y+CELL/2);
          ctx.stroke();
          // Purple glow
          ctx.fillStyle = `rgba(120,40,220,${runeAlpha * 0.4})`;
          ctx.beginPath(); ctx.arc(x+CELL/2, y+CELL/2, 14, 0, Math.PI*2); ctx.fill();
        }

        // ── Grid line ───────────────────────────────────────────
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL, CELL);
      }
    }
  }

  function drawTerrainHighlights() {
    // Small icon badge in top-left corner of every non-normal terrain cell
    const tColors  = { elevated:'#ffdd88', water:'#88bbff', forest:'#66ee66', ruins:'#bb88ff' };
    const tIcons   = { elevated:'▲', water:'≋', forest:'♣', ruins:'⌖' };
    ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let r=0; r<GRID_ROWS; r++) {
      for (let c=0; c<GRID_COLS; c++) {
        const ttype = getTerrainAt(c, r);
        if (ttype === 'normal') continue;
        const x = GRID_X + c*CELL, y = GRID_Y + r*CELL;
        // Small dark pill badge
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x+2, y+2, 16, 11, 3) : ctx.fillRect(x+2, y+2, 16, 11);
        ctx.fill();
        ctx.fillStyle = tColors[ttype] || '#fff';
        ctx.fillText(tIcons[ttype] || '?', x+10, y+3);
      }
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawHighlights() {
    const p2 = 0.5 + 0.5*Math.sin(pulseT * 4);
    for (const cell of moveHighlight) {
      const x=GRID_X+cell.col*CELL, y=GRID_Y+cell.row*CELL;
      ctx.fillStyle=`rgba(50,120,255,${0.18+p2*0.18})`; ctx.fillRect(x,y,CELL,CELL);
      ctx.strokeStyle=`rgba(100,180,255,${0.6+p2*0.35})`; ctx.lineWidth=2;
      ctx.strokeRect(x+1,y+1,CELL-2,CELL-2);
    }
    for (const cell of targetHighlight) {
      const x=GRID_X+cell.col*CELL, y=GRID_Y+cell.row*CELL;
      ctx.fillStyle=`rgba(255,50,50,${0.18+p2*0.2})`; ctx.fillRect(x,y,CELL,CELL);
      ctx.strokeStyle=`rgba(255,100,80,${0.7+p2*0.3})`; ctx.lineWidth=2;
      ctx.strokeRect(x+1,y+1,CELL-2,CELL-2);
    }
  }

  function drawUnits() {
    for (const u of units) {
      if (u.dead) continue;
      drawUnit(u);
    }
  }

  // ── Idle animation offset ───────────────────────────────────
  function getIdleBob(u) {
    // Staggered breathing animation, different per unit type
    if (u.isPlayer) {
      return Math.sin(pulseT * 2.5 + u.col * 0.8) * 2.5;
    } else {
      return Math.sin(pulseT * 3.0 + u.col * 1.2) * 1.5;
    }
  }

  // ── Draw procedural character sprite ───────────────────────────
  function drawCharacterSprite(u, cx, cy, r) {
    const baseColor = u.color || '#888';
    const name = u.name ? u.name.toLowerCase() : '';
    
    // Determine character type for sprite
    let spriteType = 'enemy';
    if (u.isPlayer) {
      if (name.includes('kael')) spriteType = 'knight';
      else if (name.includes('lyra')) spriteType = 'rogue';
      else if (name.includes('theron')) spriteType = 'mage';
      else if (name.includes('sera')) spriteType = 'healer';
    } else {
      // Enemy types
      if (name.includes('bandit') || name.includes('thief') || name.includes('enf')) spriteType = 'bandit';
      else if (name.includes('spirit') || name.includes('wraith') || name.includes('ghost')) spriteType = 'spirit';
      else if (name.includes('captain') || name.includes('boss') || name.includes('aldric')) spriteType = 'boss';
      else if (name.includes('vareth') || name.includes('shade')) spriteType = 'vareth';
    }

    // Kenney Tiny Dungeon sprite for enemies; player characters keep their procedural art
    if (!u.isPlayer && typeof SPRITES !== 'undefined' && SPRITES.battle(ctx, spriteType, cx, cy, r)) {
      return;
    }

    ctx.save();

    switch (spriteType) {
      case 'knight':
        // Kael: Armored knight with sword
        // Body (armor)
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        const knightGrad = ctx.createRadialGradient(cx-4, cy-4, 2, cx, cy, r);
        knightGrad.addColorStop(0, '#6699ff');
        knightGrad.addColorStop(1, baseColor);
        ctx.fillStyle = knightGrad; ctx.fill();
        ctx.strokeStyle = '#334477'; ctx.lineWidth = 2; ctx.stroke();
        // Sword (right side)
        ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx+r+2, cy-5); ctx.lineTo(cx+r+12, cy-15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r+5, cy-10); ctx.lineTo(cx+r+10, cy-10); ctx.stroke();
        // Shield hint (left side)
        ctx.fillStyle = '#445577';
        ctx.beginPath(); ctx.ellipse(cx-r-2, cy, 6, 8, 0, 0, Math.PI*2); ctx.fill();
        break;

      case 'rogue':
        // Lyra: Hooded figure with daggers
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        const rogueGrad = ctx.createRadialGradient(cx-4, cy-4, 2, cx, cy, r);
        rogueGrad.addColorStop(0, '#cc88ff');
        rogueGrad.addColorStop(1, baseColor);
        ctx.fillStyle = rogueGrad; ctx.fill();
        // Hood
        ctx.fillStyle = '#221133';
        ctx.beginPath(); ctx.arc(cx, cy-5, r-6, Math.PI, 0, true); ctx.fill();
        // Daggers (crossed)
        ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx-10, cy+8); ctx.lineTo(cx-18, cy+18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+10, cy+8); ctx.lineTo(cx+18, cy+18); ctx.stroke();
        break;

      case 'mage':
        // Theron: Robed figure with staff
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        const mageGrad = ctx.createRadialGradient(cx-4, cy-4, 2, cx, cy, r);
        mageGrad.addColorStop(0, '#ff6666');
        mageGrad.addColorStop(1, baseColor);
        ctx.fillStyle = mageGrad; ctx.fill();
        // Staff (right side, with glow)
        ctx.strokeStyle = '#884422'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx+r, cy); ctx.lineTo(cx+r+15, cy-20); ctx.stroke();
        // Staff orb
        ctx.beginPath(); ctx.arc(cx+r+15, cy-23, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ffaa44'; ctx.fill();
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
        // Robe lines
        ctx.strokeStyle = '#661111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-5, cy+5); ctx.lineTo(cx-5, cy+r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+5, cy+5); ctx.lineTo(cx+5, cy+r); ctx.stroke();
        break;

      case 'healer':
        // Sera: Gentle figure with staff and halo
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        const healerGrad = ctx.createRadialGradient(cx-4, cy-4, 2, cx, cy, r);
        healerGrad.addColorStop(0, '#ffee88');
        healerGrad.addColorStop(1, baseColor);
        ctx.fillStyle = healerGrad; ctx.fill();
        // Halo
        ctx.strokeStyle = '#ffff88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy-r-6, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
        ctx.shadowColor = '#ffff44'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
        // Staff (left side)
        ctx.strokeStyle = '#997744'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx-r-2, cy); ctx.lineTo(cx-r-14, cy-18); ctx.stroke();
        // Staff ornament
        ctx.beginPath(); ctx.arc(cx-r-14, cy-21, 3, 0, Math.PI*2);
        ctx.fillStyle = '#88ffaa'; ctx.fill();
        break;

      case 'bandit':
        // Bulky enemy
        ctx.beginPath(); ctx.arc(cx, cy, r+2, 0, Math.PI*2);
        ctx.fillStyle = baseColor; ctx.fill();
        ctx.strokeStyle = '#442211'; ctx.lineWidth = 2; ctx.stroke();
        // Rough edges (jagged)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const angle = (i/8) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(cx+Math.cos(angle)*(r-2), cy+Math.sin(angle)*(r-2));
          ctx.lineTo(cx+Math.cos(angle)*(r+4), cy+Math.sin(angle)*(r+4)); ctx.stroke();
        }
        break;

      case 'spirit':
        // Wispy, translucent spirit
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(cx, cy, r+3, 0, Math.PI*2);
        const spiritGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r+3);
        spiritGrad.addColorStop(0, '#aaccff');
        spiritGrad.addColorStop(0.5, baseColor);
        spiritGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = spiritGrad; ctx.fill();
        // Wispy tendrils
        ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const angle = (i/4) * Math.PI * 2 + pulseT * 2;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(cx+Math.cos(angle)*r*1.5, cy+Math.sin(angle)*r*1.5,
                               cx+Math.cos(angle+0.5)*(r+10), cy+Math.sin(angle+0.5)*(r+10));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;

      case 'boss':
        // Large, imposing boss
        ctx.beginPath(); ctx.arc(cx, cy, r+4, 0, Math.PI*2);
        const bossGrad = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, r+4);
        bossGrad.addColorStop(0, '#ff8888');
        bossGrad.addColorStop(1, baseColor);
        ctx.fillStyle = bossGrad; ctx.fill();
        // Crown or horns
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.moveTo(cx-10, cy-r-2); ctx.lineTo(cx-7, cy-r-12); ctx.lineTo(cx-4, cy-r-2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx+4, cy-r-2); ctx.lineTo(cx+7, cy-r-12); ctx.lineTo(cx+10, cy-r-2); ctx.fill();
        break;

      case 'vareth':
        // Vareth: Eldritch horror
        ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2);
        const varethGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r+5);
        varethGrad.addColorStop(0, '#aa44ff');
        varethGrad.addColorStop(0.5, baseColor);
        varethGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = varethGrad; ctx.fill();
        // Void tendrils
        ctx.strokeStyle = '#6622aa'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i/6) * Math.PI * 2 + pulseT * 1.5;
          ctx.beginPath();
          ctx.moveTo(cx+Math.cos(angle)*r, cy+Math.sin(angle)*r);
          ctx.lineTo(cx+Math.cos(angle)*(r+12), cy+Math.sin(angle)*(r+12));
          ctx.stroke();
        }
        // Central eye
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
        ctx.fillStyle = '#000000'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2);
        ctx.fillStyle = '#ff4488'; ctx.fill();
        break;

      default:
        // Generic enemy
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fillStyle = baseColor; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    
    ctx.restore();
  }

  function drawUnit(u) {
    const cx = GRID_X + u.col*CELL + CELL/2;
    const idleBob = getIdleBob(u);
    const cy = GRID_Y + u.row*CELL + CELL/2 + idleBob;
    const r  = 20;
    const isActive = units[currentUnitIdx] === u;
    const t  = Date.now();

    // Active pulse ring
    if (isActive) {
      const p = 0.6 + 0.4*Math.sin(pulseT * 6);
      ctx.beginPath(); ctx.arc(cx, cy, r+10, 0, Math.PI*2);
      ctx.fillStyle=`rgba(255,255,100,${p*0.2})`; ctx.fill();
      ctx.strokeStyle=`rgba(255,255,100,${p*0.7})`; ctx.lineWidth=2.5; ctx.stroke();
    }

    // Shadow (stays grounded, no bob)
    const shadowY = GRID_Y + u.row*CELL + CELL/2 + 2;
    ctx.beginPath(); ctx.ellipse(cx, shadowY, r*0.7, 5, 0, 0, Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fill();

    // Draw procedural sprite
    drawCharacterSprite(u, cx, cy, r);
    
    // Active unit highlight
    ctx.strokeStyle = isActive ? '#ffff88' : (u.isPlayer ? '#aaddff' : '#ff6644');
    ctx.lineWidth = isActive ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r+2, 0, Math.PI*2); ctx.stroke();

    // Facing chevron (Phase 1b) — small arrow on the side the unit faces
    if (u.facing) {
      const dir = u.facing === 'R' ? 1 : -1;
      const fx = cx + dir*(r+6), fy = cy;
      ctx.fillStyle = u.isPlayer ? 'rgba(170,221,255,0.85)' : 'rgba(255,140,110,0.85)';
      ctx.beginPath();
      ctx.moveTo(fx + dir*4, fy);
      ctx.lineTo(fx - dir*3, fy - 4);
      ctx.lineTo(fx - dir*3, fy + 4);
      ctx.closePath(); ctx.fill();
    }

    // Portrait overlay for player units (smaller, top-right)
    if (u.isPlayer && u.portrait && u.portrait !== 'none') {
      // Small portrait in corner instead of replacing sprite
      UI.drawPortrait(u.portrait, cx, cy, r-6);
    }

    // Status icons (small dots above unit)
    const statusDots = [];
    if (u.statusEffects.find(e=>e.type==='poison'))  statusDots.push('#aa44ff');
    if (u.statusEffects.find(e=>e.type==='burn'))    statusDots.push('#ff6600');
    if (u.statusEffects.find(e=>e.type==='freeze'))  statusDots.push('#88ccff');
    if (u.statusEffects.find(e=>e.type==='stun'))    statusDots.push('#ffff44');
    if (u.statusEffects.find(e=>e.type==='berserk')) statusDots.push('#ff4444');
    if (u.statusEffects.find(e=>e.type==='blind'))   statusDots.push('#888888');
    if (u.statusEffects.find(e=>e.type==='regen'))   statusDots.push('#44ff88');
    if (u.shieldActive)   statusDots.push('#4488ff');
    if (u.barrierActive)  statusDots.push('#88aaff');
    if (u.doubleNextAtk)  statusDots.push('#ff88ff');
    for (let di=0; di<statusDots.length; di++) {
      ctx.beginPath(); ctx.arc(cx - (statusDots.length-1)*5 + di*10, cy-r-4, 4, 0, Math.PI*2);
      ctx.fillStyle=statusDots[di]; ctx.fill();
    }

    // HP bar
    const bw = CELL-6, bh = 7;
    const bx = GRID_X+u.col*CELL+3, by = GRID_Y+u.row*CELL+CELL-bh-2;
    ctx.fillStyle='#220000'; ctx.fillRect(bx,by,bw,bh);
    const hpPct = u.hp/u.maxHp;
    ctx.fillStyle = hpPct>0.5 ? '#22cc44' : hpPct>0.25 ? '#eecc00' : '#cc2222';
    ctx.fillRect(bx, by, Math.floor(bw*Math.max(0,hpPct)), bh);
    ctx.strokeStyle='#333'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,bh);
    // HP number
    ctx.fillStyle='#ffffff'; ctx.font='8px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${u.hp}`, bx+bw/2, by+bh/2);

    // Guard pips (Stagger) — just above the HP bar, enemies only
    if (!u.isPlayer && u.guardMax > 0) {
      const pipR = 2.5, gap = 7;
      const totalW = (u.guardMax - 1) * gap;
      const gx0 = cx - totalW/2, gy = by - 5;
      for (let i = 0; i < u.guardMax; i++) {
        ctx.beginPath();
        ctx.arc(gx0 + i*gap, gy, pipR, 0, Math.PI*2);
        ctx.fillStyle = i < u.guard ? '#ffcc33' : 'rgba(120,90,40,0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.75; ctx.stroke();
      }
    }
    // Staggered ring — pulsing red outline
    if (u.staggered) {
      const p = 0.5 + 0.5*Math.sin(Date.now()*0.012);
      ctx.strokeStyle = `rgba(255,70,90,${0.5 + 0.4*p})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2); ctx.stroke();
    }

    ctx.textAlign='left'; ctx.textBaseline='top';
  }

  function lightenColor(hex, amt) {
    try {
      const r=Math.min(255,parseInt(hex.slice(1,3),16)+amt);
      const g=Math.min(255,parseInt(hex.slice(3,5),16)+amt);
      const b=Math.min(255,parseInt(hex.slice(5,7),16)+amt);
      return `rgb(${r},${g},${b})`;
    } catch(e) { return hex; }
  }

  // Map a skill's element to an impact particle type (all exist in UI).
  function elementParticle(element, dmgType) {
    switch (element) {
      case 'fire':      return 'fire';
      case 'ice':       return 'ice';
      case 'lightning': return 'lightning';
      case 'wind':      return 'spark';
      case 'light':     return 'holy';
      case 'dark':      return 'void';
      default:          return dmgType === 'magic' ? 'magic' : 'blood';
    }
  }

  // Keyword popups that deserve extra emphasis (bigger + glow + pop).
  const EMPHATIC = { 'CRIT!':1, 'WEAK!':1, 'BREAK!':1, 'BACK!':1, 'FLANK!':1, 'RESIST':1, 'LATENT READY!':1 };

  function drawFloatingTexts() {
    const now = Date.now();
    for (const ft of floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      const emph  = EMPHATIC[ft.text];
      // Entry pop: scale overshoots then settles over the first ~180ms.
      const age   = ft.maxLife - ft.life;
      const pop   = age < 180 ? 1 + 0.6 * (1 - age/180) : 1;
      const size  = (emph ? 18 : 14) * pop;

      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 2);
      ctx.translate(ft.x, ft.y);
      ctx.font = `bold ${size.toFixed(1)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (emph) {
        // Additive glow halo for punch
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = ft.color; ctx.shadowBlur = 12;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
      }
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ── Right panel ──────────────────────────────────────────────
  function drawPanel() {
    const px = PANEL_X, pw = PANEL_W;
    // Background with subtle gradient
    const grad = ctx.createLinearGradient(px, 0, px+pw, 620);
    grad.addColorStop(0, 'rgba(8,6,18,0.98)');
    grad.addColorStop(1, 'rgba(12,10,24,0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, pw+2, 620);
    // Outer border
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth=2;
    ctx.strokeRect(px, 0, pw+1, 620);
    // Inner decorative border
    ctx.strokeStyle = '#2a2030'; ctx.lineWidth=1;
    ctx.strokeRect(px+4, 4, pw-7, 612);
    // Top accent bar
    ctx.fillStyle = 'rgba(140,120,100,0.3)';
    ctx.fillRect(px+6, 6, pw-11, 2);

    const cu = currentUnit();
    if (!cu) return;

    let y = 10;
    // Active unit portrait + name
    if (cu.isPlayer && cu.portrait && cu.portrait !== 'none') {
      UI.drawPortrait(cu.portrait, px+pw/2, y+26, 22);
    } else {
      ctx.beginPath(); ctx.arc(px+pw/2, y+26, 22, 0, Math.PI*2);
      ctx.fillStyle = cu.color; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth=1.5; ctx.stroke();
    }
    y += 56;
    ctx.fillStyle = cu.color; ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(cu.name, px+pw/2, y);
    y += 14;
    ctx.fillStyle = '#888'; ctx.font = '10px Georgia';
    ctx.fillText(cu.isPlayer ? (cu.class||'') : 'Enemy', px+pw/2, y);
    y += 18;

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    // HP / MP bars with modern styling
    drawPanelBarV2(px+3, y, pw-6, 14, cu.hp, cu.maxHp, '#44aa44', '#1a1122', `HP ${cu.hp}/${cu.maxHp}`, '#88cc88');
    y += 18;
    drawPanelBarV2(px+3, y, pw-6, 14, cu.mp, cu.maxMp||0, '#4488cc', '#1a1122', `MP ${cu.mp}/${cu.maxMp||0}`, '#88bbee');
    y += 20;

    // Turn queue - moved higher to prevent overlap
    ctx.fillStyle='#776655'; ctx.font='10px Georgia';
    ctx.fillText('NEXT TURNS', px+5, y); y += 14;
    buildTurnQueue();
    const qShow = Math.min(turnQueue.length, 6);
    for (let i=0;i<qShow;i++) {
      const qu = turnQueue[i];
      const qx = px+5+i*(pw-10)/qShow, qy = y;
      const qr = (pw-10)/(qShow*2.4);
      ctx.beginPath(); ctx.arc(qx+qr, qy+qr, qr, 0, Math.PI*2);
      ctx.fillStyle = qu.color; ctx.fill();
      ctx.strokeStyle = qu.isPlayer ? '#88aaff' : '#ff8866'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=`${Math.floor(qr*0.9)}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(qu.name[0], qx+qr, qy+qr);
    }
    ctx.textAlign='left'; ctx.textBaseline='top';
    y += 22;

    // Divider
    ctx.strokeStyle='#332211'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px+3,y); ctx.lineTo(px+pw-3,y); ctx.stroke();
    y += 6;

    if (!cu.isPlayer) {
      ctx.fillStyle='#666'; ctx.font='11px Georgia';
      ctx.fillText('Enemy acting...', px+5, y);
      return;
    }

    // Player action menu — all positions flow from dynamic `y` (after divider)
    // y = 178 at this point (portrait 56 + name 14 + class 18 + hp 18 + mp 20 + turns 36 + divider 6 + start 10)
    const bw = pw-8;
    if (phase === 'playerMenu' || phase === 'playerTarget') {
      // MOVE button
      ctx.fillStyle = pendingMove ? '#226622' : '#2a3344';
      roundRect2(px+4, y, bw, 28, 3); ctx.fill();
      ctx.strokeStyle = pendingMove ? '#44aa44' : '#446688'; ctx.lineWidth=1;
      roundRect2(px+4, y, bw, 28, 3); ctx.stroke();
      ctx.fillStyle = pendingMove ? '#88ff88' : '#aaddff';
      ctx.font = 'bold 11px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pendingMove ? '✓ MOVED' : 'MOVE', px+4+bw/2, y+14);
      ctx.textAlign='left'; ctx.textBaseline='top';
      y += 32;

      // ITEMS button
      const hasItems = Object.keys(battleInventory).length > 0;
      ctx.fillStyle = hasItems ? '#2a4433' : '#1a1a1a';
      roundRect2(px+4, y, bw, 22, 3); ctx.fill();
      ctx.strokeStyle = hasItems ? '#44aa66' : '#333'; ctx.lineWidth=1;
      roundRect2(px+4, y, bw, 22, 3); ctx.stroke();
      ctx.fillStyle = hasItems ? '#88ffaa' : '#555';
      ctx.font = 'bold 10px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const itemCount = Object.values(battleInventory).reduce((a,b)=>a+b,0);
      ctx.fillText(hasItems ? `ITEMS (${itemCount})` : 'ITEMS (0)', px+4+bw/2, y+11);
      ctx.textAlign='left'; ctx.textBaseline='top';
      y += 26;

      // ABILITIES section header
      ctx.fillStyle='rgba(180,160,140,0.6)'; ctx.font='bold 10px Georgia';
      ctx.fillText('ABILITIES', px+8, y);
      ctx.strokeStyle='rgba(140,120,100,0.3)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(px+8, y+12); ctx.lineTo(px+pw-8, y+12); ctx.stroke();
      y += 18;

      // Skill buttons
      const skills = cu.skills || [];
      const skillsStartY = y;
      for (let i=0;i<skills.length;i++) {
        const sk = DATA.SKILLS[skills[i]]; if (!sk) continue;
        const sy = skillsStartY + i*44;
        const hasMP = cu.mp >= sk.mp;
        const isSel = selectedSkillKey === skills[i];
        const btnGrad = ctx.createLinearGradient(px+4, sy, px+4, sy+40);
        if (isSel) {
          btnGrad.addColorStop(0, '#6a3a2a'); btnGrad.addColorStop(1, '#4a2a1a');
        } else if (hasMP) {
          btnGrad.addColorStop(0, '#2a3a4e'); btnGrad.addColorStop(1, '#1a2535');
        } else {
          btnGrad.addColorStop(0, '#1a1a22'); btnGrad.addColorStop(1, '#121218');
        }
        ctx.fillStyle = btnGrad;
        roundRect2(px+4, sy, bw, 40, 4); ctx.fill();
        ctx.strokeStyle = isSel ? '#ffaa66' : hasMP ? '#4a5a6e' : '#2a2a32';
        ctx.lineWidth = isSel ? 2 : 1;
        roundRect2(px+4, sy, bw, 40, 4); ctx.stroke();
        ctx.fillStyle = hasMP ? '#e8e4e0' : '#666';
        ctx.font = 'bold 12px Georgia'; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText(sk.name, px+10, sy+6);
        const mpText = `${sk.mp} MP`;
        ctx.font = '9px Arial';
        const mpWidth = ctx.measureText(mpText).width + 8;
        ctx.fillStyle = hasMP ? 'rgba(68,136,187,0.3)' : 'rgba(60,60,70,0.5)';
        roundRect2(px+10, sy+22, mpWidth, 14, 7); ctx.fill();
        ctx.fillStyle = hasMP ? '#88bbee' : '#555';
        ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(mpText, px+14, sy+29);
        ctx.fillStyle = isSel ? '#ffaa66' : hasMP ? '#5a7a9e' : '#3a3a42';
        ctx.fillRect(px+bw-18, sy+8, 10, 10);
        ctx.strokeStyle = isSel ? '#ffcc88' : hasMP ? '#88aacc' : '#555';
        ctx.lineWidth=1; ctx.strokeRect(px+bw-18, sy+8, 10, 10);
      }
      y = skillsStartY + skills.length*44;

      // WAIT button
      const waitY = y + 4;
      ctx.fillStyle='#28200c'; roundRect2(px+4, waitY, bw, 28, 3); ctx.fill();
      ctx.strokeStyle='#554422'; ctx.lineWidth=1; roundRect2(px+4, waitY, bw, 28, 3); ctx.stroke();
      ctx.fillStyle='#ccaa66'; ctx.font='bold 11px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('WAIT', px+4+bw/2, waitY+14);
      ctx.textAlign='left'; ctx.textBaseline='top';

      if (phase === 'playerTarget') {
        const cancelY = waitY + 32;
        ctx.fillStyle='#280000'; roundRect2(px+4, cancelY, bw, 26, 3); ctx.fill();
        ctx.strokeStyle='#882222'; ctx.lineWidth=1; roundRect2(px+4, cancelY, bw, 26, 3); ctx.stroke();
        ctx.fillStyle='#ff6644'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('CANCEL', px+4+bw/2, cancelY+13);
        ctx.textAlign='left'; ctx.textBaseline='top';
        if (selectedSkillKey) {
          const sk = DATA.SKILLS[selectedSkillKey];
          if (sk) {
            ctx.fillStyle='#88aacc'; ctx.font='10px Georgia';
            ctx.fillText(`→ ${sk.name}: ${sk.desc||''}`, px+4, cancelY+34);
          }
        }
      }
    } else if (phase === 'playerItems' || phase === 'itemTarget') {
      ctx.fillStyle='#776655'; ctx.font='10px Georgia';
      ctx.fillText('ITEMS', px+5, y);
      y += 16;
      const itemKeys = Object.keys(battleInventory);
      for (let i=0;i<itemKeys.length;i++) {
        const itemKey = itemKeys[i];
        const item = DATA.CONSUMABLES[itemKey]; if (!item) continue;
        const iy = y + i*34;
        const isSel = selectedItemKey === itemKey;
        ctx.fillStyle = isSel ? '#2a3322' : '#1e2d3e';
        roundRect2(px+4, iy, bw, 30, 3); ctx.fill();
        ctx.strokeStyle = isSel ? '#88ff44' : '#334455'; ctx.lineWidth=1;
        roundRect2(px+4, iy, bw, 30, 3); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Georgia'; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText(item.name, px+8, iy+3);
        ctx.fillStyle = '#778899';
        ctx.font = '9px Georgia';
        ctx.fillText(`x${battleInventory[itemKey]} — ${item.desc.substring(0,24)}`, px+8, iy+16);
      }
      const cancelY = y + itemKeys.length*34 + 8;
      ctx.fillStyle='#280000'; roundRect2(px+4, cancelY, bw, 24, 3); ctx.fill();
      ctx.strokeStyle='#882222'; ctx.lineWidth=1; roundRect2(px+4, cancelY, bw, 24, 3); ctx.stroke();
      ctx.fillStyle='#ff6644'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('CANCEL', px+4+bw/2, cancelY+12);
      ctx.textAlign='left'; ctx.textBaseline='top';
      if (phase === 'itemTarget' && selectedItemKey) {
        const item = DATA.CONSUMABLES[selectedItemKey];
        if (item) {
          ctx.fillStyle='#88ffaa'; ctx.font='10px Georgia';
          const tgtWord = item.offensive ? 'enemy' : 'ally';
          ctx.fillText(`→ ${item.name}: Click ${tgtWord} to use`, px+4, cancelY+32);
        }
      }
    } else if (phase === 'playerMove') {
      ctx.fillStyle='#aabbcc'; ctx.font='12px Georgia';
      ctx.fillText('Click blue tile', px+4, y);
      ctx.fillText('to move.', px+4, y+16);
      const cancelY = y + 34;
      ctx.fillStyle='#280000'; roundRect2(px+4, cancelY, pw-8, 24, 3); ctx.fill();
      ctx.strokeStyle='#882222'; ctx.lineWidth=1; roundRect2(px+4, cancelY, pw-8, 24, 3); ctx.stroke();
      ctx.fillStyle='#ff6644'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('CANCEL', px+(pw-8)/2+4, cancelY+12);
      ctx.textAlign='left'; ctx.textBaseline='top';
    }

    // Momentum strip (fixed position near panel bottom, above enemy note)
    if (cu.isPlayer && (phase === 'playerMenu' || phase === 'playerTarget')) {
      drawMomentumStrip(cu, px, pw);
    }
  }

  // Layout constants for the momentum boost control (also used by click handler)
  const MOM_Y      = 556;   // strip top
  const MOM_BTN_W  = 26;
  const MOM_BTN_H  = 22;
  const LATENT_Y   = 522;   // latent gauge/button row (above momentum)
  const LATENT_H   = 26;
  const LATENT_NAMES = { Kael:'AEGIS VOW', Lyra:'SHADOW FLURRY', Theron:'VARETH SURGE', Sera:"DAWN'S GRACE" };

  function drawLatentBar(cu, px, pw) {
    const pct = (cu.latent || 0) / LATENT_MAX;
    const ready = pct >= 1;
    const bx = px + 4, by = LATENT_Y, bw = pw - 8;
    if (ready) {
      // Glowing activatable button
      const pulse = 0.5 + 0.5*Math.sin(Date.now()*0.006);
      ctx.fillStyle = `rgba(120,90,20,${0.85})`;
      roundRect2(bx, by, bw, LATENT_H, 4); ctx.fill();
      ctx.strokeStyle = `rgba(255,230,${100+Math.floor(80*pulse)},1)`; ctx.lineWidth = 2;
      roundRect2(bx, by, bw, LATENT_H, 4); ctx.stroke();
      ctx.fillStyle = '#ffee88'; ctx.font = 'bold 11px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★ ' + (LATENT_NAMES[cu.name] || 'LATENT') + ' ★', px + pw/2, by + LATENT_H/2);
    } else {
      // Charging gauge
      ctx.fillStyle = 'rgba(200,180,120,0.7)'; ctx.font = 'bold 9px Georgia';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('LATENT', bx + 4, by - 1);
      const gy = by + 11, gw = bw - 8, gh = 8;
      ctx.fillStyle = '#1a1626'; roundRect2(bx+4, gy, gw, gh, 3); ctx.fill();
      const grad = ctx.createLinearGradient(bx, 0, bx+gw, 0);
      grad.addColorStop(0, '#8866cc'); grad.addColorStop(1, '#ffcc55');
      ctx.fillStyle = grad; roundRect2(bx+4, gy, Math.max(2, gw*pct), gh, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,80,0.5)'; ctx.lineWidth = 1;
      roundRect2(bx+4, gy, gw, gh, 3); ctx.stroke();
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawMomentumStrip(cu, px, pw) {
    drawLatentBar(cu, px, pw);
    const mom = cu.momentum || 0;
    const y = MOM_Y;
    // Label
    ctx.fillStyle = 'rgba(200,180,120,0.7)'; ctx.font = 'bold 10px Georgia';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('MOMENTUM', px + 8, y);
    // Pips
    const pipY = y + 18, pipR = 5, gap = 15;
    for (let i = 0; i < MOMENTUM_MAX; i++) {
      const cx = px + 12 + i * gap;
      ctx.beginPath(); ctx.arc(cx, pipY, pipR, 0, Math.PI*2);
      // spent-this-action portion shown dimmer-gold; available bright; empty grey
      if (i < mom - pendingBoost)      ctx.fillStyle = '#ffdd55';           // available
      else if (i < mom)                ctx.fillStyle = 'rgba(255,180,60,0.5)'; // queued to spend
      else                             ctx.fillStyle = 'rgba(90,80,60,0.5)';   // empty
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // −  Boost ×N  +  controls
    const ctrlY = y + 30;
    const minusX = px + 8, plusX = px + pw - 8 - MOM_BTN_W;
    const maxBoost = Math.min(3, mom);
    // minus
    drawMomBtn(minusX, ctrlY, '−', pendingBoost > 0);
    // plus
    drawMomBtn(plusX, ctrlY, '+', pendingBoost < maxBoost);
    // center label
    ctx.fillStyle = pendingBoost > 0 ? '#ffdd55' : '#99aabb';
    ctx.font = 'bold 12px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(pendingBoost > 0 ? `BOOST ×${pendingBoost + 1}` : 'Boost ×1',
                 px + pw/2, ctrlY + MOM_BTN_H/2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawMomBtn(bx, by, label, enabled) {
    ctx.fillStyle = enabled ? '#3a2f14' : '#1c1810';
    roundRect2(bx, by, MOM_BTN_W, MOM_BTN_H, 3); ctx.fill();
    ctx.strokeStyle = enabled ? '#8a6a2a' : '#333'; ctx.lineWidth = 1;
    roundRect2(bx, by, MOM_BTN_W, MOM_BTN_H, 3); ctx.stroke();
    ctx.fillStyle = enabled ? '#ffcc66' : '#555';
    ctx.font = 'bold 15px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + MOM_BTN_W/2, by + MOM_BTN_H/2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  // ── Weather Drawing ──────────────────────────────────────────
  function drawWeather() {
    if (!currentWeather) return;

    // Weather overlay on grid area
    const gridW = GRID_COLS * CELL;
    const gridH = GRID_ROWS * CELL;

    if (currentWeather === 'rain') {
      // Rain overlay - semi-transparent blue tint
      ctx.fillStyle = 'rgba(100,120,180,0.15)';
      ctx.fillRect(GRID_X, GRID_Y, gridW, gridH);
      // Rain drops
      ctx.strokeStyle = 'rgba(150,180,220,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const rx = GRID_X + Math.random() * gridW;
        const ry = GRID_Y + Math.random() * gridH;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + 8);
        ctx.stroke();
      }
    } else if (currentWeather === 'fog') {
      // Fog overlay - gray mist
      ctx.fillStyle = 'rgba(180,180,200,0.2)';
      ctx.fillRect(GRID_X, GRID_Y, gridW, gridH);
      // Fog particles
      ctx.fillStyle = 'rgba(200,200,220,0.3)';
      for (let i = 0; i < 15; i++) {
        const fx = GRID_X + Math.random() * gridW;
        const fy = GRID_Y + Math.random() * gridH;
        ctx.beginPath();
        ctx.arc(fx, fy, 20 + Math.random() * 30, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentWeather === 'storm') {
      // Storm overlay - dark with lightning flashes
      ctx.fillStyle = 'rgba(40,40,60,0.25)';
      ctx.fillRect(GRID_X, GRID_Y, gridW, gridH);
      // Heavy rain
      ctx.strokeStyle = 'rgba(180,180,220,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        const rx = GRID_X + Math.random() * gridW;
        const ry = GRID_Y + Math.random() * gridH;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + 12);
        ctx.stroke();
      }
    }

    // Weather indicator in corner
    const weatherIcons = { rain: '🌧️', fog: '🌫️', storm: '⛈️' };
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(weatherIcons[currentWeather] || '', GRID_X + 5, GRID_Y + 20);
  }

  // ── Battle Log Display ───────────────────────────────────────
  function drawBattleLog() {
    if (battleLog.length === 0) return;

    const logX = 10;
    const logY = 420;
    const logW = 380;  // Widened from 200
    const logH = 140;
    const lineH = 14;

    // Background
    ctx.fillStyle = 'rgba(4,3,12,0.92)';
    ctx.fillRect(logX, logY, logW, logH);
    ctx.strokeStyle = 'rgba(100,80,60,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(logX, logY, logW, logH);

    // Title
    ctx.fillStyle = '#ccbb88';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText('BATTLE LOG', logX + 6, logY + 14);

    // Log entries (newest at bottom)
    const entriesToShow = Math.min(battleLog.length, Math.floor((logH - 28) / lineH));
    const startIdx = Math.max(0, battleLog.length - entriesToShow);

    for (let i = 0; i < entriesToShow; i++) {
      const entry = battleLog[startIdx + i];
      const y = logY + 28 + i * lineH;

      // Color based on type
      const typeColors = {
        attack: '#ffaa88',
        heal: '#88ff88',
        item: '#ffdd44',
        status: '#88aaff',
        normal: '#aaaaaa'
      };
      ctx.fillStyle = typeColors[entry.type] || '#aaaaaa';
      ctx.font = '10px Georgia';

      // Truncate text if too long (increased limit for wider box)
      let text = entry.text;
      if (text.length > 58) text = text.substring(0, 55) + '...';
      ctx.fillText(text, logX + 6, y);
    }

    ctx.textAlign = 'left';
  }

  function drawPanelBar(x,y,w,h,val,max,fill,bg,label) {
    ctx.fillStyle=bg; ctx.fillRect(x,y,w,h);
    const pct=max>0?val/max:0;
    ctx.fillStyle=fill; ctx.fillRect(x,y,Math.floor(w*Math.max(0,pct)),h);
    ctx.strokeStyle='#333'; ctx.lineWidth=1; ctx.strokeRect(x,y,w,h);
    ctx.fillStyle='#fff'; ctx.font='8px Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, x+w/2, y+h/2);
    ctx.textAlign='left'; ctx.textBaseline='top';
  }

  // Improved panel bar with rounded corners and glow
  function drawPanelBarV2(x,y,w,h,val,max,fill,bg,label,glowColor) {
    const r = h/2; // corner radius
    // Background
    ctx.fillStyle=bg;
    roundRect2(x,y,w,h,r); ctx.fill();
    // Fill bar
    const pct=max>0?val/max:0;
    const fillW=Math.floor(w*Math.max(0,pct));
    if (fillW > 0) {
      ctx.save();
      ctx.beginPath();
      roundRect2(x,y,fillW,h,r);
      ctx.clip();
      // Gradient fill
      const grad=ctx.createLinearGradient(x,y,x,y+h);
      grad.addColorStop(0, fill); grad.addColorStop(1, adjustBrightness(fill,-20));
      ctx.fillStyle=grad; ctx.fillRect(x,y,fillW,h);
      ctx.restore();
    }
    // Border
    ctx.strokeStyle='rgba(60,60,80,0.8)'; ctx.lineWidth=1;
    roundRect2(x,y,w,h,r); ctx.stroke();
    // Label with shadow
    ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=2;
    ctx.shadowOffsetX=1; ctx.shadowOffsetY=1;
    ctx.fillStyle='#e0e0e0'; ctx.font='bold 9px Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, x+w/2, y+h/2);
    ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
    ctx.textAlign='left'; ctx.textBaseline='top';
  }

  // Helper to darken/lighten a hex color
  function adjustBrightness(hex, amt) {
    const num = parseInt(hex.replace('#',''),16);
    const r = Math.max(0, Math.min(255, (num>>16)+amt));
    const g = Math.max(0, Math.min(255, ((num>>8)&0x00FF)+amt));
    const b = Math.max(0, Math.min(255, (num&0x0000FF)+amt));
    return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
  }

  function roundRect2(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  // ── Unit tooltip on mouse hover ─────────────────────────────
  let hoveredUnit = null;
  let tooltipX = 0, tooltipY = 0;

  function updateTooltip(mouseX, mouseY) {
    hoveredUnit = null;
    if (mouseX < GRID_X || mouseX >= GRID_X + GRID_COLS*CELL) return;
    if (mouseY < GRID_Y || mouseY >= GRID_Y + GRID_ROWS*CELL) return;
    const col = Math.floor((mouseX - GRID_X) / CELL);
    const row = Math.floor((mouseY - GRID_Y) / CELL);
    const u = getUnitAt(col, row);
    if (u && !u.dead) {
      hoveredUnit = u;
      tooltipX = mouseX;
      tooltipY = mouseY;
    }
  }

  function drawTooltip() {
    if (!hoveredUnit) return;
    const u = hoveredUnit;
    const tw = 158, th = 130;
    let tx = tooltipX + 14;
    let ty = tooltipY - th - 8;
    if (tx + tw > 900) tx = tooltipX - tw - 4;
    if (ty < 0) ty = tooltipY + 20;

    // Background
    ctx.fillStyle = 'rgba(4,3,14,0.96)';
    roundRect2(tx, ty, tw, th, 4); ctx.fill();
    ctx.strokeStyle = u.isPlayer ? '#4477aa' : '#aa4444'; ctx.lineWidth=1;
    roundRect2(tx, ty, tw, th, 4); ctx.stroke();

    // Name header
    ctx.fillStyle = u.color; ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(u.name, tx+8, ty+6);
    ctx.fillStyle = '#666'; ctx.font = '10px Georgia';
    ctx.fillText(u.isPlayer ? (u.class||'Player') : 'Enemy', tx+8, ty+20);

    // Stats
    ctx.fillStyle = '#aabbcc'; ctx.font = '10px Georgia';
    const stats = [
      [`HP: ${u.hp}/${u.maxHp}`, `ATK: ${u.atk}`],
      [`MP: ${u.mp}/${u.maxMp||0}`, `DEF: ${u.def}`],
      [`SPD: ${u.spd}`, `MAG: ${u.mag}`],
      [`MOV: ${u.move||3}`, `LCK: ${u.luck||0}`],
    ];
    for (let row2=0; row2<stats.length; row2++) {
      const [left, right] = stats[row2];
      ctx.fillStyle = '#99aacc';
      ctx.fillText(left, tx+8, ty+36+row2*14);
      ctx.fillText(right, tx+88, ty+36+row2*14);
    }

    // Status effects
    const seNames = (u.statusEffects||[]).map(e=>e.type).join(', ');
    if (seNames) {
      ctx.fillStyle = '#ffaa44'; ctx.font = '10px Georgia';
      ctx.fillText(`Status: ${seNames}`, tx+8, ty+96);
    }

    // Terrain bonus if on special terrain
    const tt = getTerrainAt(u.col, u.row);
    if (tt !== 'normal') {
      const tDesc = { elevated:'Elevated: +15% ATK', water:'Water: -1 MOV', forest:'Forest: +20% EVA', ruins:'Ruins: +15% MAG' };
      ctx.fillStyle = '#88ccaa'; ctx.font = '9px Georgia';
      ctx.fillText(tDesc[tt] || tt, tx+8, ty+110);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawDefeatOverlay() {
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,900,620);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#cc2222'; ctx.font='bold 52px Georgia';
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=40;
    ctx.fillText('DEFEATED', 450, 260);
    ctx.shadowBlur=0;
    ctx.fillStyle='#ffffff'; ctx.font='18px Georgia';
    ctx.fillText('Press Space / Enter to retry', 450, 324);
    ctx.textAlign='left'; ctx.textBaseline='top';
  }

  return {
    startBattle,
    update,
    draw,
    getPhase: () => phase,
    isVarethPowerAccepted: () => varethPowerAccepted,
  };
})();
