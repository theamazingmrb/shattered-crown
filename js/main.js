// ============================================================
// main.js  —  Game entry point, state machine, act orchestration
//
// States: PROLOGUE | TITLE | WORLD | DIALOGUE | BATTLE | MENU
//         GAMEOVER | ENDING | CREDITS
// ============================================================

// ── Save system ──────────────────────────────────────────────
const SAVE = (() => {
  const PREFIX = 'shattered_crown_v2_';
  function key(slot) { return PREFIX + slot; }
  return {
    get(slot) {
      try { const r = localStorage.getItem(key(slot)); return r ? JSON.parse(r) : null; }
      catch(e) { return null; }
    },
    set(slot, data) {
      try { localStorage.setItem(key(slot), JSON.stringify(data)); return true; }
      catch(e) { return false; }
    },
    del(slot) { try { localStorage.removeItem(key(slot)); } catch(e) {} },
    hasSave(slot) { return !!this.get(slot); },
  };
})();

const GAME = (() => {
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const W = 900, H = 620;

  // ── Game state ──────────────────────────────────────────────
  let state       = 'PROLOGUE';
  let actProgress = 0;       // 0=beginning, 1=after act1, etc.
  let actTriggered = {};     // which act triggers have fired
  let titleTime   = 0;
  let party       = [];
  let inventory   = [];      // array of equipment key strings
  let lastBattleDef = null;
  let finalChoiceResult = null;  // 0=Path A Keeper, 1=Path B Swap
  let varethChoiceResult = null; // 0=resist, 1=accept
  let kingFreed   = false;

  // ── Title menu ───────────────────────────────────────────────
  let titleMenuIdx = 0;
  let titleMenuItems = [];

  function rebuildTitleMenu() {
    titleMenuItems = [{ label: 'New Game', action: 'new' }];
    for (let i = 0; i < 3; i++) {
      const save = SAVE.get(i);
      if (save) {
        const d = new Date(save.savedAt);
        const label = `Continue — Act ${save.actProgress}  (${d.toLocaleDateString()})`;
        titleMenuItems.push({ label, action: 'load', slot: i });
      } else {
        titleMenuItems.push({ label: `Slot ${i + 1} — Empty`, action: 'empty', slot: i });
      }
    }
    titleMenuItems.push({ label: AUDIO.isMusicEnabled() ? 'Music: ON' : 'Music: OFF', action: 'toggleMusic' });
    titleMenuItems.push({ label: AUDIO.isSfxEnabled()   ? 'SFX: ON'   : 'SFX: OFF',   action: 'toggleSfx'   });
    titleMenuIdx = Math.min(titleMenuIdx, titleMenuItems.length - 1);
  }

  // ── Save / Load helpers ───────────────────────────────────────
  function saveGame(slot) {
    const data = {
      version: '2.0',
      savedAt: Date.now(),
      actProgress,
      actTriggered,
      finalChoiceResult,
      varethChoiceResult,
      kingFreed,
      playerPos: WORLD.getPlayerTile(),
      inventory: [...inventory],
      party: party.map(ch => ({
        name: ch.name,
        level: ch.level || 1,
        exp: ch.exp || 0,
        hp: ch.hp,
        mp: ch.mp,
        baseMaxHp: ch.baseMaxHp,
        baseMaxMp: ch.baseMaxMp,
        baseAtk:   ch.baseAtk,
        baseDef:   ch.baseDef,
        baseMag:   ch.baseMag,
        baseSPD:   ch.baseSPD,
        equipment: ch.equipment || {},
        skills:    ch.skills    || [],
        dead:      ch.dead      || false,
      })),
    };
    if (SAVE.set(slot, data)) {
      UI.showNotif(`Saved to Slot ${slot + 1}!`, '#44ffaa', 2000);
    }
  }

  function loadFromSave(slot) {
    const save = SAVE.get(slot);
    if (!save) return;
    actProgress        = save.actProgress    || 0;
    actTriggered       = save.actTriggered   || {};
    finalChoiceResult  = save.finalChoiceResult  ?? null;
    varethChoiceResult = save.varethChoiceResult ?? null;
    kingFreed          = save.kingFreed      || false;
    inventory          = save.inventory      || [];

    // Rebuild party from save
    party = [];
    for (const savedChar of (save.party || [])) {
      const charKey = savedChar.name.toLowerCase();
      const tmpl    = DATA.CHAR_TEMPLATES[charKey];
      if (!tmpl) continue;
      const ch = DATA.makeChar(Object.assign({}, tmpl));
      // Apply saved base stats (accumulated through leveling)
      ch.baseMaxHp = savedChar.baseMaxHp;
      ch.baseMaxMp = savedChar.baseMaxMp;
      ch.baseAtk   = savedChar.baseAtk;
      ch.baseDef   = savedChar.baseDef;
      ch.baseMag   = savedChar.baseMag;
      ch.baseSPD   = savedChar.baseSPD;
      ch.level     = savedChar.level || 1;
      ch.exp       = savedChar.exp   || 0;
      ch.skills    = savedChar.skills && savedChar.skills.length ? [...savedChar.skills] : [...(tmpl.skills || [])];
      ch.equipment = savedChar.equipment || {};
      ch.dead      = savedChar.dead || false;
      // Recompute maxHp/maxMp/atk etc from base + equipment
      ch.maxHp = ch.baseMaxHp; ch.maxMp = ch.baseMaxMp;
      ch.atk   = ch.baseAtk;  ch.def   = ch.baseDef;
      ch.mag   = ch.baseMag;  ch.spd   = ch.baseSPD;
      DATA.applyEquipment(ch, ch.equipment);
      ch.hp = Math.min(savedChar.hp, ch.maxHp);
      ch.mp = Math.min(savedChar.mp, ch.maxMp);
      party.push(ch);
    }

    // Restore world position
    WORLD.init();
    if (save.playerPos) WORLD.setPlayerPos(save.playerPos.tx, save.playerPos.ty);

    UI.showNotif('Game loaded!', '#44ffaa', 2000);
    AUDIO.crossfadeTo('world', 1200);
    state = 'WORLD';
    UI.fadeIn(500);
  }

  // ── Party management ────────────────────────────────────────
  function initParty() {
    party = [];
    addToParty('kael');
    // Give starting equipment
    for (const ch of party) {
      if (ch.startEquip) {
        ch.equipment = Object.assign({}, ch.startEquip);
        // Add to inventory too
        for (const slot of Object.values(ch.equipment)) {
          if (slot && !inventory.includes(slot)) inventory.push(slot);
        }
        DATA.applyEquipment(ch, ch.equipment);
        ch.hp = ch.maxHp; ch.mp = ch.maxMp;
      }
    }
  }

  function addToParty(key) {
    const tmpl = DATA.CHAR_TEMPLATES[key];
    if (!tmpl) return;
    if (party.find(p => p.name === tmpl.name)) return;
    const ch = DATA.makeChar(Object.assign({}, tmpl));
    ch.hp = ch.maxHp; ch.mp = ch.maxMp;
    if (ch.startEquip) {
      ch.equipment = Object.assign({}, ch.startEquip);
      for (const slot of Object.values(ch.equipment)) {
        if (slot && !inventory.includes(slot)) inventory.push(slot);
      }
      DATA.applyEquipment(ch, ch.equipment);
      ch.hp = ch.maxHp; ch.mp = ch.maxMp;
    }
    party.push(ch);
  }

  function collectItem(itemKey, label) {
    if (!inventory.includes(itemKey)) {
      inventory.push(itemKey);
      UI.showNotif(`Found: ${label}!`, '#ffdd44', 2500);
    }
  }

  // ── Post-battle EXP & leveling ──────────────────────────────
  // ── Title menu activation ────────────────────────────────────
  function activateTitleMenuItem(item) {
    if (!item) return;
    AUDIO.sfx.menuOpen();
    if (item.action === 'new') {
      console.log('[NEW GAME] Starting fadeOut...');
      UI.fadeOut(() => {
        console.log('[NEW GAME] FadeOut complete, initializing game state...');
        inventory          = [];
        actProgress        = 0;
        actTriggered       = {};
        finalChoiceResult  = null;
        varethChoiceResult = null;
        kingFreed          = false;
        initParty();
        console.log('[NEW GAME] Party initialized:', party);
        WORLD.init();
        console.log('[NEW GAME] World initialized');
        state = 'WORLD';
        console.log('[NEW GAME] State set to WORLD');
        AUDIO.crossfadeTo('world', 1200);
        setTimeout(() => {
          console.log('[NEW GAME] Triggering Act 1...');
          triggerAct1();
        }, 400);
        console.log('[NEW GAME] Starting fadeIn...');
        UI.fadeIn();
      });
    } else if (item.action === 'load') {
      UI.fadeOut(() => loadFromSave(item.slot));
    } else if (item.action === 'toggleMusic') {
      AUDIO.toggleMusic();
      rebuildTitleMenu();
    } else if (item.action === 'toggleSfx') {
      AUDIO.toggleSfx();
      rebuildTitleMenu();
    }
    // 'empty' does nothing
  }

  function awardExp(expAmount) {
    const lines = [];
    for (const ch of party) {
      if (ch.dead) continue;
      ch.exp += expAmount;
      const expNeeded = DATA.expForLevel(ch.level);
      if (ch.exp >= expNeeded) {
        ch.exp -= expNeeded;
        ch.level++;
        // Stat gains
        ch.baseMaxHp += 5; ch.baseMaxMp += 3;
        ch.baseAtk   += 1 + Math.floor(Math.random()*2);
        ch.baseDef   += 1 + Math.floor(Math.random()*2);
        ch.baseMag   += 1 + Math.floor(Math.random()*2);
        ch.baseSPD   += Math.random() < 0.4 ? 1 : 0;
        // Re-apply equipment
        DATA.applyEquipment(ch, ch.equipment);
        ch.hp = ch.maxHp; ch.mp = ch.maxMp;
        // Check skill unlock
        const charKey = ch.name.toLowerCase();
        const unlocks = DATA.LEVEL_SKILL_UNLOCKS[charKey];
        if (unlocks && unlocks[ch.level] && !ch.skills.includes(unlocks[ch.level])) {
          ch.skills.push(unlocks[ch.level]);
          const sk = DATA.SKILLS[unlocks[ch.level]];
          lines.push(`${ch.name} Lv.${ch.level}! Learned: ${sk ? sk.name : unlocks[ch.level]}!`);
        } else {
          lines.push(`${ch.name} reached Level ${ch.level}!`);
        }
        UI.spawnParticles(400 + (party.indexOf(ch)-1)*100, 300, 'levelup', 12);
      }
    }
    return lines;
  }

  function restorePartyAfterBattle(survivingUnits) {
    // Copy HP/MP from battle survivors
    if (survivingUnits) {
      for (const su of survivingUnits) {
        const pm = party.find(p => p.name === su.name);
        if (pm) { pm.hp = su.hp; pm.mp = su.mp; pm.dead = su.dead; }
      }
    }
    // Partial restore: 30% HP, 50% MP
    for (const ch of party) {
      if (!ch.dead) {
        ch.hp = Math.min(ch.maxHp, ch.hp + Math.floor(ch.maxHp * 0.30));
        ch.mp = Math.min(ch.maxMp, ch.mp + Math.floor(ch.maxMp * 0.50));
      } else {
        // Revive dead party members with 1 HP (they were defeated in battle)
        ch.dead = false; ch.hp = 1;
      }
      ch.buffs = []; ch.statusEffects = [];
      ch.shieldActive = false; ch.barrierActive = false;
      ch.doubleNextAtk = false; ch.isGuarding = false;
    }
  }

  // ── World trigger check ──────────────────────────────────────
  function checkWorldTrigger() {
    if (UI.isDialogueActive() || UI.isFading()) return;
    const { tx, ty } = WORLD.getPlayerTile();

    // Act 1 — Ember Village (fires at start)
    if (!actTriggered['act2'] && actProgress === 1) {
      // Mirewood Forest trigger
      if (tx >= 9 && tx <= 18 && ty >= 6 && ty <= 13) {
        actTriggered['act2'] = true;
        triggerAct2();
      }
    }
    // Act 2 shrine — east forest
    if (!actTriggered['act2shrine'] && actProgress === 2) {
      if (tx >= 14 && tx <= 16 && ty >= 7 && ty <= 9) {
        actTriggered['act2shrine'] = true;
        UI.startDialogue(DATA.STORY.act2Shrine);
      }
    }
    // Act 3 — Thornhaven
    if (!actTriggered['act3'] && actProgress === 2) {
      if (tx >= 11 && tx <= 14 && ty >= 7 && ty <= 9) {
        actTriggered['act3'] = true;
        triggerAct3();
      }
    }
    // Act 4 — Selvara
    if (!actTriggered['act4'] && actProgress === 3) {
      if (tx >= 25 && tx <= 29 && ty >= 6 && ty <= 10) {
        actTriggered['act4'] = true;
        triggerAct4();
      }
    }
    // Act 4 optional battle — tax collector
    if (!actTriggered['act4opt'] && actProgress >= 3) {
      if (tx >= 26 && tx <= 28 && ty >= 8 && ty <= 10) {
        actTriggered['act4opt'] = true;
        triggerAct4Optional();
      }
    }
    // Act 5 — Observatory
    if (!actTriggered['act5'] && actProgress === 4) {
      if (tx >= 7 && tx <= 8 && ty >= 1 && ty <= 3) {
        actTriggered['act5'] = true;
        triggerAct5();
      }
    }
    // Act 6 — Undercity / Castle approach
    if (!actTriggered['act6'] && actProgress === 5) {
      if (tx >= 19 && tx <= 22 && ty >= 4 && ty <= 7) {
        actTriggered['act6'] = true;
        triggerAct6();
      }
    }
    // Act 7 — Stasis chamber
    if (!actTriggered['act7'] && actProgress === 6) {
      if (tx >= 19 && tx <= 22 && ty >= 1 && ty <= 4) {
        actTriggered['act7'] = true;
        triggerAct7();
      }
    }
    // Act 8 — Throne room (Aldric speech)
    if (!actTriggered['act8'] && actProgress === 7) {
      if (tx >= 20 && tx <= 21 && ty >= 2 && ty <= 3) {
        actTriggered['act8'] = true;
        triggerAct8();
      }
    }
    // Act 9 — Vault
    if (!actTriggered['act9'] && actProgress === 8) {
      if (tx >= 20 && tx <= 22 && ty >= 5 && ty <= 7) {
        actTriggered['act9'] = true;
        triggerAct9();
      }
    }
    // Act 10 — Final choice
    if (!actTriggered['act10'] && actProgress === 9) {
      if (tx >= 20 && tx <= 21 && ty >= 5 && ty <= 7) {
        actTriggered['act10'] = true;
        triggerAct10();
      }
    }
  }

  // ── Act trigger functions ────────────────────────────────────

  function triggerAct1() {
    console.log('[ACT 1] Triggering Act 1...');
    actTriggered['act1'] = true;
    UI.showActBanner('Act I — Ashes and Oaths', 'Ember Village');
    console.log('[ACT 1] Starting dialogue...');
    UI.startDialogue(DATA.STORY.act1Pre, () => {
      console.log('[ACT 1] Dialogue complete, starting battle...');
      startBattle('battle1', (result, survivors) => {
        onBattleEnd(result, survivors, 'battle1');
      });
    });
  }

  function triggerAct2() {
    UI.showActBanner('Act II — The Whispering Trees', 'Mirewood Forest');
    UI.startDialogue(DATA.STORY.act2Pre, () => {
      startBattle('battle2', (result, survivors) => {
        onBattleEnd(result, survivors, 'battle2');
      });
    });
  }

  function triggerAct3() {
    UI.showActBanner("Act III — The Healer's Price", 'Thornhaven');
    UI.startDialogue(DATA.STORY.act3Pre, () => {
      startBattle('battle3', (result, survivors) => {
        onBattleEnd(result, survivors, 'battle3');
      });
    });
  }

  function triggerAct4() {
    UI.showActBanner('Act IV — The City of Masks', 'Selvara');
    UI.startDialogue(DATA.STORY.act4Pre, () => {
      startBattle('battle4', (result, survivors) => {
        if (result === 'defeat') { onBattleDefeat('battle4'); return; }
        // After guild job, immediately into ambush
        restorePartyAfterBattle(survivors);
        const expLines = awardExp(DATA.BATTLES.battle4.expReward || 55);
        const lines = ['The guildhouse is cleared.', 'But the night is young...', ...expLines];
        UI.showVictory(lines, () => {
          setTimeout(() => {
            startBattle('battle5', (result2, survivors2) => {
              onBattleEnd(result2, survivors2, 'battle5');
            });
          }, 300);
        });
      });
    });
  }

  function triggerAct4Optional() {
    // Optional side battle
    UI.startDialogue([
      { name:'', color:'#888', portrait:'none', text:'A tax collector is harassing refugees on the road ahead.' },
      { name:'Kael', color:'#4488ff', portrait:'kael', text:'...We deal with this.' },
    ], () => {
      startBattle('battle5opt', (result, survivors) => {
        if (result === 'victory') {
          restorePartyAfterBattle(survivors);
          const expLines = awardExp(30);
          UI.showVictory(['Justice served.', 'Refugees freed.', ...expLines], () => {
            if (!inventory.includes('luckyCharm')) { inventory.push('luckyCharm'); UI.showNotif("Found: Lucky Charm!", '#ffdd44', 2000); }
          });
        }
      });
    });
  }

  function triggerAct5() {
    UI.showActBanner("Act V — The Cartographer's Truth", "Malachar's Observatory");
    UI.startDialogue(DATA.STORY.act5Pre, () => {
      // Guardian battle
      UI.startDialogue(DATA.STORY.act5Guardian, () => {
        startBattle('battleGuardians', (result, survivors) => {
          onBattleEnd(result, survivors, 'battle5_guardian');
        });
      });
    });
  }

  function triggerAct6() {
    UI.showActBanner('Act VI — What the Shadows Remember', 'Castle Undercity');
    UI.startDialogue(DATA.STORY.act6Pre, () => {
      startBattle('battle6', (result, survivors) => {
        onBattleEnd(result, survivors, 'battle6');
      });
    });
  }

  function triggerAct7() {
    UI.showActBanner("Act VII — The King's Prison", 'Castle Valdris');
    UI.startDialogue(DATA.STORY.act7Pre, () => {
      // Break stasis dialogue
      UI.startDialogue(DATA.STORY.act7BreakStasis, () => {
        kingFreed = true;
        startBattle('battle7', (result, survivors) => {
          onBattleEnd(result, survivors, 'battle7');
        });
      });
    });
  }

  function triggerAct8() {
    UI.showActBanner('Act VIII — The Architecture of Lies', 'Throne Room');
    UI.startDialogue(DATA.STORY.act8Speech, () => {
      startBattle('battle8', (result, survivors) => {
        onBattleEnd(result, survivors, 'battle8');
      });
    });
  }

  function triggerAct9() {
    UI.showActBanner('Act IX — What Sleeps Beneath', 'The Ancient Vault');
    UI.startDialogue(DATA.STORY.act9Pre, () => {
      startBattle('battle9', (result, survivors, varethAccepted) => {
        varethChoiceResult = varethAccepted ? 1 : 0;
        onBattleEnd(result, survivors, 'battle9');
      });
    });
  }

  function triggerAct10() {
    UI.showActBanner('Act X — The Weight of Crowns', 'Vault Inner Chamber');
    UI.startDialogue(DATA.STORY.act10Conversations, () => {
      // This is called when dialogue finishes — finalChoiceResult already set by choice callback
      if (finalChoiceResult === 1) {
        triggerAct10PathB();
      } else {
        triggerAct10PathA();
      }
    });
    // Register choice callback
    window._GAME_choiceCallback = (cid, cv) => {
      if (cid === 'finalChoice') {
        finalChoiceResult = cv;
        window._GAME_choiceCallback = null;
      }
    };
  }

  function triggerAct10PathA() {
    UI.startDialogue(DATA.STORY.act10PathA, () => {
      flashScreenGold();
      setTimeout(() => {
        UI.startDialogue(DATA.STORY.act10PathAResult, () => {
          UI.startDialogue(DATA.STORY.act10Convergence, () => {
            actProgress = 11;
            triggerAct11();
          });
        });
      }, 1000);
    });
  }

  function triggerAct10PathB() {
    // Big battle — Vareth Manifests
    startBattle('battle10b', (result, survivors) => {
      if (result === 'defeat') { onBattleDefeat('battle10b'); return; }
      restorePartyAfterBattle(survivors);
      const expLines = awardExp(150);
      UI.showVictory(['Vareth is sealed!', ...expLines], () => {
        UI.startDialogue(DATA.STORY.act10PathBSuccess, () => {
          UI.startDialogue(DATA.STORY.act10Convergence, () => {
            actProgress = 11;
            triggerAct11();
          });
        });
      });
    });
  }

  function triggerAct11() {
    UI.showActBanner('Act XI — Aftermath', 'Castle Valdris, one week later');
    WORLD.setPlayerPos(20, 4);
    // Walk through the castle talking to people — use existing NPC interaction
    // Auto-trigger the character conversations
    UI.startDialogue(DATA.STORY.act11Theron, () => {
      UI.startDialogue(DATA.STORY.act11Lyra, () => {
        UI.startDialogue(DATA.STORY.act11Sera, () => {
          UI.startDialogue(DATA.STORY.act11Malachar, () => {
            UI.startDialogue(DATA.STORY.act11Letter, () => {
              actProgress = 12;
              triggerAct12();
            });
          });
        });
      });
    });
  }

  function triggerAct12() {
    UI.showActBanner('Act XII — New Roads', 'Epilogue');
    setTimeout(() => {
      UI.startDialogue(DATA.STORY.epilogueFinal, () => {
        // Begin ending scroll
        UI.fadeOut(() => {
          state = 'ENDING';
          UI.startEnding();
          UI.fadeIn(800);
        }, 1000);
      });
    }, 500);
  }

  function flashScreenGold() {
    // Flash effect for Path A sealing
    const canvas2 = document.getElementById('game-canvas');
    const ctx2 = canvas2.getContext('2d');
    let alpha = 0.8;
    function flash() {
      alpha -= 0.05;
      if (alpha <= 0) return;
      ctx2.fillStyle = `rgba(255,220,80,${alpha})`;
      ctx2.fillRect(0, 0, W, H);
      requestAnimationFrame(flash);
    }
    flash();
  }

  // ── Battle start / end ───────────────────────────────────────
  // Boss battle keys that get boss music
  const BOSS_BATTLES = new Set(['battle8','battle10b','battleGuardians']);

  function startBattle(battleKey, cb) {
    const battleDef = DATA.BATTLES[battleKey];
    if (!battleDef) { if (cb) cb('victory', party); return; }
    lastBattleDef = battleDef;

    const musicTrack = BOSS_BATTLES.has(battleKey) ? 'boss' : 'battle';
    UI.fadeOut(() => {
      state = 'BATTLE';
      AUDIO.crossfadeTo(musicTrack, 800);
      BATTLE.startBattle(battleDef, party, cb);
      UI.fadeIn(300);
    }, 400);
  }

  function onBattleEnd(result, survivors, actKey) {
    if (result === 'defeat') {
      onBattleDefeat(actKey);
      return;
    }
    // Victory
    AUDIO.sfx.victoryJingle();
    restorePartyAfterBattle(survivors);
    const expAmount = lastBattleDef ? (lastBattleDef.expReward || 30) : 30;
    const expLines  = awardExp(expAmount);

    // Level-up sfx
    if (expLines.some(l => l.includes('Level') || l.includes('Learned')))
      setTimeout(() => AUDIO.sfx.levelUp(), 600);

    UI.showVictory([`+${expAmount} EXP`, ...expLines], () => {
      UI.fadeOut(() => {
        state = 'WORLD';
        AUDIO.crossfadeTo('world', 1200);
        doPostBattleStory(actKey);
        UI.fadeIn(400);
      }, 500);
    }, party.filter(p => !p.dead));
  }

  function onBattleDefeat(actKey) {
    AUDIO.crossfadeTo('gameover', 1000);
    state = 'GAMEOVER';
    UI.resetGameOver();
  }

  function retryBattle() {
    if (!lastBattleDef) return;
    // Restore party
    for (const ch of party) {
      ch.hp = ch.maxHp; ch.mp = ch.maxMp;
      ch.dead = false; ch.buffs = []; ch.statusEffects = [];
      ch.shieldActive = false; ch.barrierActive = false;
    }
    UI.resetGameOver();
    UI.fadeOut(() => {
      state = 'BATTLE';
      BATTLE.startBattle(lastBattleDef, party, (result, survivors, varAcc) => {
        if (lastBattleDef.id === 'battle9') varethChoiceResult = varAcc ? 1 : 0;
        const actKey = lastBattleDef.id;
        onBattleEnd(result, survivors, actKey);
      });
      UI.fadeIn(300);
    }, 400);
  }

  function doPostBattleStory(actKey) {
    switch (actKey) {
      case 'battle1':
        actProgress = 1;
        addToParty('lyra');
        // Give lyra starting equip
        const lyra = party.find(p=>p.name==='Lyra');
        if (lyra && lyra.startEquip) {
          lyra.equipment = Object.assign({}, lyra.startEquip);
          for (const slot of Object.values(lyra.equipment)) {
            if (slot && !inventory.includes(slot)) inventory.push(slot);
          }
          DATA.applyEquipment(lyra, lyra.equipment);
          lyra.hp = lyra.maxHp; lyra.mp = lyra.maxMp;
        }
        UI.startDialogue(DATA.STORY.act1Post, () => {
          UI.showNotif('Lyra joined the party!', '#bb55ff', 2500);
          WORLD.setPlayerPos(7, 8);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle2':
        actProgress = 2;
        addToParty('theron');
        const theron = party.find(p=>p.name==='Theron');
        if (theron && theron.startEquip) {
          theron.equipment = Object.assign({}, theron.startEquip);
          for (const slot of Object.values(theron.equipment)) {
            if (slot && !inventory.includes(slot)) inventory.push(slot);
          }
          DATA.applyEquipment(theron, theron.equipment);
          theron.hp = theron.maxHp; theron.mp = theron.maxMp;
        }
        UI.startDialogue(DATA.STORY.act2Post, () => {
          UI.showNotif('Theron joined the party!', '#ff4444', 2500);
          WORLD.setPlayerPos(12, 10);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle3':
        actProgress = 3;
        addToParty('sera');
        const sera = party.find(p=>p.name==='Sera');
        if (sera && sera.startEquip) {
          sera.equipment = Object.assign({}, sera.startEquip);
          for (const slot of Object.values(sera.equipment)) {
            if (slot && !inventory.includes(slot)) inventory.push(slot);
          }
          DATA.applyEquipment(sera, sera.equipment);
          sera.hp = sera.maxHp; sera.mp = sera.maxMp;
        }
        UI.startDialogue(DATA.STORY.act3Post, () => {
          UI.showNotif('Sera joined the party!', '#ffdd44', 2500);
          WORLD.setPlayerPos(14, 12);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle5':  // Second Selvara battle — night ambush
        actProgress = 4;
        UI.startDialogue(DATA.STORY.act4Post, () => {
          UI.showNotif('Head to the Observatory in the mountains...', '#ccaa66', 3000);
          WORLD.setPlayerPos(15, 7);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle5_guardian':  // Observatory guardians
        actProgress = 5;
        UI.startDialogue(DATA.STORY.act5Post, () => {
          UI.showNotif('Head to Castle Valdris...', '#ccaa66', 3000);
          WORLD.setPlayerPos(18, 6);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle6':  // Undercity patrol
        actProgress = 6;
        UI.startDialogue(DATA.STORY.act6Post, () => {
          WORLD.setPlayerPos(20, 5);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle7':  // King's guard
        actProgress = 7;
        UI.startDialogue(DATA.STORY.act7Post, () => {
          WORLD.setPlayerPos(20, 3);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle8':  // Aldric confronted
        actProgress = 8;
        UI.startDialogue(DATA.STORY.act8Post, () => {
          WORLD.setPlayerPos(21, 6);
          setTimeout(() => saveGame(0), 800);
        });
        break;

      case 'battle9':  // Vault
        actProgress = 9;
        UI.startDialogue(DATA.STORY.act9Post, () => {
          // Player now at act10 trigger zone
          WORLD.setPlayerPos(20, 6);
        });
        break;

      default:
        break;
    }
  }

  // ── Main loop ────────────────────────────────────────────────
  let lastTime = 0;

  function loop(ts) {
    const dt = Math.min(50, ts - lastTime);
    lastTime = ts;

    update(dt);
    draw(dt);

    INPUT.flush();
    requestAnimationFrame(loop);
  }

  let lastLoggedState = null;
  function update(dt) {
    UI.updateFade(dt);
    UI.updateActBanner(dt);
    UI.updateNotif(dt);
    UI.updateVictory(dt);
    UI.updateParticles(dt);

    // Log state changes
    if (state !== lastLoggedState) {
      console.log('[STATE] Changed to:', state);
      lastLoggedState = state;
    }

    switch (state) {
      case 'PROLOGUE':
        if (INPUT.wasPressed('Escape') || INPUT.wasPressed('Enter')) {
          console.log('[PROLOGUE] Skipping to title screen...');
          UI.fadeOut(() => { state = 'TITLE'; titleTime = 0; rebuildTitleMenu(); UI.fadeIn(); }, 300);
          return;
        }
        const pDone = UI.updatePrologue(dt);
        if (pDone) {
          UI.fadeOut(() => { state = 'TITLE'; titleTime = 0; rebuildTitleMenu(); UI.fadeIn(); }, 600);
        }
        break;

      case 'TITLE':
        titleTime += dt;
        if (UI.isFading()) break;

        if (INPUT.wasPressed('ArrowUp') || INPUT.wasPressed('w') || INPUT.wasPressed('W')) {
          titleMenuIdx = (titleMenuIdx - 1 + titleMenuItems.length) % titleMenuItems.length;
          AUDIO.sfx.menuSelect();
        }
        if (INPUT.wasPressed('ArrowDown') || INPUT.wasPressed('s') || INPUT.wasPressed('S')) {
          titleMenuIdx = (titleMenuIdx + 1) % titleMenuItems.length;
          AUDIO.sfx.menuSelect();
        }

        // Mouse hover / click on menu items
        (function() {
          const click = INPUT.consumeClick();
          if (click) {
            const menuStartY = 368;
            const menuItemH  = 38;
            for (let i = 0; i < titleMenuItems.length; i++) {
              const iy = menuStartY + i * menuItemH;
              if (click.y >= iy - 2 && click.y <= iy + menuItemH - 2 &&
                  click.x >= 250 && click.x <= 650) {
                if (titleMenuIdx !== i) { titleMenuIdx = i; AUDIO.sfx.menuSelect(); }
                activateTitleMenuItem(titleMenuItems[i]);
                return;
              }
            }
          }
        })();

        if (INPUT.wasPressed('Enter') || INPUT.wasPressed(' ')) {
          activateTitleMenuItem(titleMenuItems[titleMenuIdx]);
        }
        break;

      case 'WORLD':
        UI.updateDialogue(dt);
        if (UI.isMenuOpen()) {
          UI.updateMenu(dt, inventory);
        } else {
          WORLD.update(dt, {
            checkWorldTrigger,
            party,
            actProgress,
            collectItem,
          });
        }
        break;

      case 'BATTLE':
        BATTLE.update(dt);
        UI.updateDialogue(dt);
        break;

      case 'GAMEOVER':
        if (INPUT.wasPressed('Enter') || INPUT.wasPressed(' ')) {
          retryBattle();
        }
        break;

      case 'ENDING':
        // Ending scroll — press any key to skip to title
        if (INPUT.wasPressed('Enter') || INPUT.wasPressed(' ') || INPUT.wasPressed('Escape')) {
          AUDIO.crossfadeTo('title', 1500);
          UI.fadeOut(() => { state = 'TITLE'; titleTime = 0; rebuildTitleMenu(); UI.fadeIn(); }, 600);
        }
        break;
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);

    switch (state) {
      case 'PROLOGUE':
        UI.drawPrologue();
        UI.drawFade();
        break;

      case 'TITLE':
        UI.drawTitle(titleTime, titleMenuItems, titleMenuIdx);
        UI.drawFade();
        break;

      case 'WORLD':
        try {
          WORLD.draw(actProgress);
          UI.drawWorldHUD(party, WORLD.getLocationName(WORLD.getPlayerTile().tx, WORLD.getPlayerTile().ty, actProgress), actProgress);
          UI.drawDialogue();
          UI.drawActBanner();
          UI.drawNotif();
          UI.drawVictory();
          if (UI.isMenuOpen()) UI.drawMenu(party, inventory);
          UI.drawFade();
        } catch (err) {
          console.error('[DRAW ERROR] Error drawing WORLD state:', err);
        }
        break;

      case 'BATTLE':
        BATTLE.draw();
        UI.drawVictory();
        UI.drawActBanner();
        UI.drawFade();
        break;

      case 'GAMEOVER':
        // Draw world as backdrop
        WORLD.draw(actProgress);
        UI.drawGameOver();
        UI.drawFade();
        break;

      case 'ENDING':
        const done = UI.drawEnding(dt);
        if (done) {
          setTimeout(() => {
            AUDIO.crossfadeTo('title', 1500);
            UI.fadeOut(() => { state = 'TITLE'; titleTime = 0; rebuildTitleMenu(); UI.fadeIn(); }, 600);
          }, 2000);
        }
        UI.drawFade();
        break;
    }
  }

  // ── Boot ────────────────────────────────────────────────────
  function start() {
    AUDIO.init();
    rebuildTitleMenu();

    // Unlock audio on first user interaction
    const unlockAudio = () => {
      AUDIO.ensureCtx();
      AUDIO.playMusic('title');
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('mousedown', unlockAudio);
    };
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('mousedown', unlockAudio);

    UI.setSaveCallback((slot) => saveGame(slot));
    UI.startPrologue();
    requestAnimationFrame(loop);
  }

  return { start };
})();

// ── Launch ──────────────────────────────────────────────────
GAME.start();
