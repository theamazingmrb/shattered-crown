// ============================================================
// data.js  —  All static game data: maps, characters, skills,
//             enemies, battles, story, equipment, NPCs
// ============================================================

const DATA = (() => {

  // ── World map  (35 cols × 25 rows) ─────────────────────────
  // Tile types:
  //  0 = void/border  1 = grass  2 = forest  3 = mountain
  //  4 = dirt path    5 = village/town  6 = castle
  //  7 = ruins        8 = dungeon vault  9 = deep water
  //  10 = observatory (mountain peak)  11 = undercity entrance
  const WORLD_MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,10,3,3,3,3,3,3,3,3,3,3,3,3,6,6,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,4,3,3,3,3,3,3,3,3,3,3,3,3,6,6,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,4,3,3,3,3,3,3,3,3,3,3,3,3,6,6,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,1,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,1,1,1,3,3,3,3,3,0],
    [0,3,1,1,1,1,1,4,1,1,1,1,2,2,2,2,2,2,1,1,1,8,1,1,1,1,1,1,1,1,3,3,3,3,0],
    [0,3,1,1,5,1,1,4,1,1,2,2,2,2,2,2,2,2,2,1,1,4,1,1,1,1,5,1,1,1,1,3,3,3,0],
    [0,3,1,1,1,1,1,4,1,2,2,2,5,2,2,2,2,2,2,2,1,4,1,1,1,1,1,1,1,1,1,1,3,3,0],
    [0,3,1,1,1,1,1,4,1,2,2,2,2,2,2,2,2,2,2,1,1,4,1,1,1,7,7,7,1,1,1,1,3,3,0],
    [0,3,1,1,1,4,4,4,4,4,2,2,2,2,2,2,2,2,1,1,1,4,4,4,4,4,4,4,4,4,1,1,3,3,0],
    [0,3,1,1,1,1,1,1,1,4,1,1,2,2,2,2,2,1,1,1,1,1,1,1,1,7,7,7,1,1,1,3,3,3,0],
    [0,3,1,1,1,1,1,1,1,4,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,0],
    [0,3,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,0],
    [0,3,3,1,1,1,1,1,1,4,4,4,4,4,4,4,4,1,1,1,1,1,5,1,1,1,1,1,1,1,3,3,3,3,0],
    [0,3,3,1,1,1,1,1,1,1,1,1,1,4,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,0],
    [0,3,3,3,1,1,1,1,1,1,1,1,1,4,1,1,4,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,1,1,1,1,1,1,1,1,4,4,4,4,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  const TILE_COLORS = {
    0:  '#02020a',  // void
    1:  '#3a6b32',  // grass
    2:  '#1e4a1a',  // forest
    3:  '#5a4f45',  // mountain
    4:  '#9e8060',  // path
    5:  '#7a5530',  // village/town
    6:  '#404060',  // castle
    7:  '#3a2e2e',  // ruins
    8:  '#0a0a18',  // vault
    9:  '#102040',  // deep water
    10: '#6a5a9a',  // observatory
    11: '#202030',  // undercity
  };

  const TILE_WALKABLE = {
    0:false, 1:true, 2:true, 3:false, 4:true, 5:true,
    6:true,  7:true, 8:true, 9:false, 10:true, 11:true
  };

  // ── Locations ────────────────────────────────────────────────
  // Each location: region bounds (tx1,ty1,tx2,ty2), name, actRequired
  const LOCATIONS = [
    { name:'Ember Village',         tx1:3,  ty1:6,  tx2:6,  ty2:9,  actRequired:0  },
    { name:'Mirewood Forest',       tx1:9,  ty1:6,  tx2:18, ty2:13, actRequired:1  },
    { name:'Thornhaven',            tx1:11, ty1:7,  tx2:13, ty2:9,  actRequired:2  },
    { name:'Road to Selvara',       tx1:5,  ty1:4,  tx2:22, ty2:6,  actRequired:1  },
    { name:'Selvara — Merchant City', tx1:25,ty1:6, tx2:29,ty2:10,  actRequired:3  },
    { name:'Ancient Ruins',         tx1:24, ty1:8,  tx2:28, ty2:12, actRequired:3  },
    { name:'Mountain Pass',         tx1:5,  ty1:2,  tx2:8,  ty2:7,  actRequired:4  },
    { name:"Malachar's Observatory",tx1:7,  ty1:1,  tx2:8,  ty2:3,  actRequired:4  },
    { name:'Castle Valdris',        tx1:19, ty1:1,  tx2:22, ty2:7,  actRequired:5  },
    { name:'Ancient Vault',         tx1:20, ty1:5,  tx2:22, ty2:7,  actRequired:8  },
    { name:'Crossroads',            tx1:13, ty1:13, tx2:17, ty2:18, actRequired:0  },
    { name:'Thornhaven Village',    tx1:14, ty1:17, tx2:17, ty2:19, actRequired:2  },
  ];

  // ── NPCs ─────────────────────────────────────────────────────
  const NPCS = [
    // Ember Village area
    { tx:4,  ty:7,  name:'Village Elder (Dying)', color:'#ffddaa', portrait:'elder',
      lines:['The fires... they came with that sigil. A broken crown.','Kael... your father... he left something for you. Take it.'],
      actMin:0, actMax:0, id:'emberElder' },
    { tx:5,  ty:7,  name:'Villager', color:'#ccaa88', portrait:'none',
      lines:['Run! The bandits set fire to everything!','...I heard the Elder whispering something about the old king.'],
      actMin:0, actMax:99 },
    { tx:3,  ty:8,  name:'Fleeing Child', color:'#aaffaa', portrait:'none',
      lines:["We pretend one of us is the hero who'll save the king! I always win."],
      actMin:0, actMax:99 },

    // Road / general
    { tx:10, ty:5,  name:'Refugee', color:'#ccbbaa', portrait:'none',
      lines:["I heard there are food stores in Selvara for those of us who lost our homes. Lord Aldric closed the castle depots.",
              "The roads are dangerous. Please... be careful."],
      actMin:1, actMax:99 },
    { tx:15, ty:5,  name:'Wounded Soldier', color:'#aaaacc', portrait:'none',
      lines:["They made us patrol villages for 'suspicious activity'. I didn't sign up to silence farmers. I ran.",
              "If you're heading to the castle... watch yourself. Aldric's inquisitors are everywhere now."],
      actMin:2, actMax:99 },
    { tx:17, ty:5,  name:'Old Merchant', color:'#ddcc88', portrait:'none',
      lines:["Used to be you could travel the whole kingdom in a week without trouble. Now every road has someone charging tolls for 'protection'.",
              "Mark my words — whatever's happening started the night that Crown shattered."],
      actMin:1, actMax:99 },

    // Selvara
    { tx:26, ty:7,  name:'Maskmaker', color:'#ff8855', portrait:'none',
      lines:["Welcome to Selvara, traveler. Everyone wears a mask here — old custom. Protects trade secrets.",
              "Information? That has a price. Help me recover what was stolen from my warehouse, and I'll help you."],
      actMin:3, actMax:99, id:'maskmaker' },
    { tx:27, ty:8,  name:'Scarred Veteran', color:'#888899', portrait:'none',
      lines:["I know Lyra. She saved my unit in the Eastern passes. She's with you? Good.",
              "Word of advice: a masked woman has been dropping things 'by accident' near travelers heading east. She's testing you."],
      actMin:3, actMax:99 },
    { tx:25, ty:8,  name:"Lyra's Contact", color:'#aa44ff', portrait:'none',
      lines:["Tell Lyra the network is still running. Southern route's compromised — Aldric's men took the bridge.",
              "Eastern passage through the ruins is clear though. The Undercity is waiting for the right moment."],
      actMin:3, actMax:99 },
    { tx:28, ty:7,  name:'Grieving Merchant', color:'#ccaa66', portrait:'none',
      lines:["My wife — she left three weeks ago. I thought something had happened to her.",
              "...She left a note. She fled Aldric's conscription of traders. She's safe. I just... I miss her.",
              "Thank you for checking. Here — take this. It's no use to me in grief."],
      actMin:3, actMax:99, id:'merchant' },

    // Ruins
    { tx:25, ty:9,  name:'Ghost of a Scholar', color:'#8888cc', portrait:'none',
      lines:["The ruins here were a library once. Before Aldric burned it.",
              "They burned it because it contained records. About the Crown. About who built it, and why.",
              "The truth is still in the stones if you know how to read them."],
      actMin:3, actMax:99 },

    // Crossroads
    { tx:14, ty:16, name:'Innkeeper', color:'#cc9944', portrait:'none',
      lines:["Crossroads hasn't been safe for a year. But where else do the roads meet?",
              "Strange travelers come through. Robed figures, mostly. Heading north."],
      actMin:0, actMax:99 },
    { tx:16, ty:17, name:'Wandering Bard', color:'#ff88cc', portrait:'none',
      lines:["♪ When the Crown shattered on that cold night, four pieces of heaven took their flight... ♪",
              "They don't like it when I sing that one. Which is exactly why I keep singing it."],
      actMin:1, actMax:99 },

    // Post-act dialogue shifts
    { tx:4,  ty:8,  name:'Ember Villager (Post)', color:'#ccbbaa', portrait:'none',
      lines:["The elder is gone. But the village will rebuild. Kael would want that.",
              "You're really going after whoever sent those bandits? ...Be careful."],
      actMin:1, actMax:99 },
    { tx:15, ty:18, name:'Thornhaven Survivor', color:'#99ccaa', portrait:'none',
      lines:["The plague here — it moved strangely. Only hit people who'd spoken at the town meeting against Aldric.",
              "That's not how plagues work. Someone did this deliberately."],
      actMin:2, actMax:99 },

    // Extended world NPCs — additional lore and flavor
    { tx:8,  ty:10, name:'Forest Hermit', color:'#558855', portrait:'none',
      lines:["I've lived in this forest forty years. It started changing six years ago. Slowly at first.",
              "Animals moving wrong. Plants growing toward things they shouldn't be able to see.",
              "Someone is siphoning energy from this place. Not taking it — feeding it back corrupted."],
      actMin:1, actMax:99 },
    { tx:20, ty:4,  name:'Pilgrim', color:'#ddbbaa', portrait:'none',
      lines:["I'm making for the castle. I have a petition — about the food levies.",
              "...I know it won't matter. But someone has to try. Someone has to be the person who tries."],
      actMin:1, actMax:8 },
    { tx:20, ty:4,  name:'Pilgrim', color:'#ddbbaa', portrait:'none',
      lines:["I heard the king is awake. I heard there might be a trial for Aldric.",
              "I've been waiting ten years for that. Is it really true?"],
      actMin:9, actMax:99 },
    { tx:22, ty:6,  name:'Castle Servant', color:'#aaaacc', portrait:'none',
      lines:["The old king used to walk the grounds at dawn. Just him. No guards.",
              "Lord Aldric stopped that. Said it was a security risk.",
              "I think he just didn't like that the king could talk to people."],
      actMin:5, actMax:99 },
    { tx:13, ty:15, name:'Road Warden', color:'#998877', portrait:'none',
      lines:["I used to report to the castle. Standard duty. Three years ago they stopped paying us.",
              "Now I'm a 'road warden' — basically meaning I stop travelers and hope they give me food.",
              "This is what governance looks like from the bottom."],
      actMin:0, actMax:99 },
    { tx:18, ty:15, name:'Ruined Farmer', color:'#cc9966', portrait:'none',
      lines:["The south fields flooded two years ago. We asked the castle for aid.",
              "They sent an assessor. The assessor left. We never heard back.",
              "Three of us went to Selvara to work the docks instead. Two came back."],
      actMin:0, actMax:99 },
    { tx:26, ty:6,  name:'Selvaran Archivist', color:'#8899aa', portrait:'none',
      lines:["There are records here dating back to the first Valdris kings. The Crown appears in all of them.",
              "Not as a symbol of power — as a warning. The inscription always reads: Do not let it wake.",
              "Aldric had the older records sealed twelve years ago. I made copies."],
      actMin:3, actMax:99 },
    { tx:28, ty:8,  name:'Dock Worker', color:'#887766', portrait:'none',
      lines:["We get ships from six kingdoms here. All of them have heard about the troubles in Valdris.",
              "The merchants are nervous. When Valdris sneezes, the trading routes get cold.",
              "Whatever you're doing — do it fast. The whole coast is watching."],
      actMin:3, actMax:99 },
    { tx:24, ty:10, name:'Ruins Scavenger', color:'#886644', portrait:'none',
      lines:["People think the ruins are empty. They're not.",
              "I've found fragments here — small crystalline shards. They pulse when you hold them.",
              "I sold one to an archivist in Selvara. He went very quiet and paid me triple without haggling."],
      actMin:3, actMax:99 },
    { tx:7,  ty:3,  name:'Observatory Guard', color:'#7766aa', portrait:'none',
      lines:["The master's been here thirty years. Maybe more. He doesn't age normally.",
              "He watches things. Says most scholars look at the sky to find patterns.",
              "He says he watches it to make sure the patterns stay the same."],
      actMin:4, actMax:99 },
    { tx:9,  ty:5,  name:'Traveling Monk', color:'#ccccaa', portrait:'none',
      lines:["In the eastern liturgy, the Crown is not a crown at all.",
              "It is described as a knot — a binding. A place where the divine and the mortal worlds meet.",
              "The question the monks always asked was: who tied the knot, and did they know what they were binding?"],
      actMin:2, actMax:99 },
    { tx:16, ty:7,  name:'Cartographer', color:'#99bb99', portrait:'none',
      lines:["I've been mapping the kingdom for eight years. It keeps changing.",
              "Not the geography — the authority. Which towns report to which lord. It shifts every season.",
              "Used to be simple. Valdris was the name. Now it's a question."],
      actMin:1, actMax:99 },
    { tx:21, ty:8,  name:'Vault Archaeologist', color:'#6688aa', portrait:'none',
      lines:["The vault beneath the castle is older than the castle itself.",
              "Much older. The castle was built around it, not the other way.",
              "Whatever is inside wasn't put there by any king of Valdris."],
      actMin:5, actMax:99 },
    { tx:12, ty:12, name:'Undercity Contact', color:'#556688', portrait:'none',
      lines:["The Undercity has its own laws. Its own logic.",
              "People come here when the surface stops working for them.",
              "We don't ask why. We ask what you can do."],
      actMin:2, actMax:99 },
    { tx:15, ty:14, name:'Former Inquisitor', color:'#664455', portrait:'none',
      lines:["I served the Inquisition for two years before I understood what we were actually doing.",
              "We were not removing threats to the kingdom. We were removing threats to Aldric's version of the kingdom.",
              "I burned my badge. I've been running since."],
      actMin:4, actMax:99 },
    { tx:9,  ty:5,  name:'Village Elder', color:'#aa9955', portrait:'none',
      lines:["The old magic isn't gone. It just got quieter.",
             "Used to be you could feel the Crown from anywhere in the valley. Like a heartbeat. Like knowing someone was watching over you.",
             "I haven't felt it in ten years. That's the worst part — the silence where it used to be."],
      actMin:1, actMax:99 },
    { tx:26, ty:12, name:'Dockmaster', color:'#557799', portrait:'none',
      lines:["Trade's dried up since the inquisition started checking cargo.",
             "They're not looking for contraband. They're looking for people. Which is worse.",
             "Half my best suppliers just stopped coming. No warning. No word. Just... gone."],
      actMin:3, actMax:99 },
    { tx:18, ty:15, name:'Wandering Bard', color:'#cc8844', portrait:'none',
      lines:["Every kingdom has a version of this story. The sleeping king. The hidden heir. The crown that must not fall.",
             "I've sung it in six lands under different names. But this one — this one feels different. This one has names I recognize from census records.",
             "That's how you know it's not a legend yet. Legends don't have paperwork."],
      actMin:2, actMax:99 },
  ];

  // ── Treasure chests ─────────────────────────────────────────
  // Collected flag stored externally; data here is position + contents
  const CHESTS = [
    { id:'chest1', tx:6,  ty:9,  item:'forestShardAmulet',  label:'Forest Shard Amulet',   actMin:2 },
    { id:'chest2', tx:12, ty:8,  item:'knightSword',         label:"Knight's Sword",        actMin:2 },
    { id:'chest3', tx:27, ty:9,  item:'voidDagger',          label:'Void Dagger',           actMin:3 },
    { id:'chest4', tx:7,  ty:2,  item:'arcaneCodex',         label:'Arcane Codex',          actMin:4 },
    { id:'chest5', tx:21, ty:3,  item:'holyStaff',           label:'Holy Staff',            actMin:5 },
    { id:'chest6', tx:20, ty:6,  item:'runicArmor',          label:'Runic Armor',           actMin:6 },
  ];

  // ── Equipment definitions ────────────────────────────────────
  const EQUIPMENT = {
    // Weapons
    ironSword:         { name:'Iron Sword',       slot:'weapon', chars:['Kael'],           atk:3,  desc:'+3 ATK' },
    knightSword:       { name:"Knight's Sword",   slot:'weapon', chars:['Kael'],           atk:7,  desc:'+7 ATK' },
    twinDaggers:       { name:'Twin Daggers',      slot:'weapon', chars:['Lyra'],           atk:4, spd:2, desc:'+4 ATK +2 SPD' },
    voidDagger:        { name:'Void Dagger',       slot:'weapon', chars:['Lyra'],           atk:8, spd:3, desc:'+8 ATK +3 SPD' },
    apprenticeStaff:   { name:'Apprentice Staff',  slot:'weapon', chars:['Theron'],         mag:5,  desc:'+5 MAG' },
    arcaneCodex:       { name:'Arcane Codex',      slot:'weapon', chars:['Theron'],         mag:10, desc:'+10 MAG' },
    healingRod:        { name:'Healing Rod',       slot:'weapon', chars:['Sera'],           mag:3,  desc:'+3 MAG' },
    holyStaff:         { name:'Holy Staff',        slot:'weapon', chars:['Sera'],           mag:8, maxMp:15, desc:'+8 MAG +15 MP' },
    // Armors
    chainMail:         { name:'Chain Mail',        slot:'armor',  chars:['Kael'],           def:4,  desc:'+4 DEF' },
    runicArmor:        { name:'Runic Armor',       slot:'armor',  chars:['Kael'],           def:8,  desc:'+8 DEF' },
    leatherArmor:      { name:'Leather Armor',     slot:'armor',  chars:['Lyra'],           def:2,  desc:'+2 DEF' },
    mistCloak:         { name:'Mist Cloak',        slot:'armor',  chars:['Lyra'],           def:4, spd:5, desc:'+4 DEF +5 SPD' },
    scholarRobe:       { name:'Scholar Robe',      slot:'armor',  chars:['Theron'],         def:1, maxMp:5, desc:'+1 DEF +5 MP' },
    vestments:         { name:'Vestments',         slot:'armor',  chars:['Sera'],           def:2, maxMp:10, desc:'+2 DEF +10 MP' },
    // Accessories
    luckyCharm:        { name:'Lucky Charm',       slot:'accessory', chars:['Kael','Lyra','Theron','Sera'], luck:2, desc:'+2 LUCK' },
    shadowCloak:       { name:'Shadow Cloak',      slot:'accessory', chars:['Lyra'],        spd:2,  desc:'+2 SPD' },
    focusLens:         { name:'Focus Lens',        slot:'accessory', chars:['Theron'],      mag:3,  desc:'+3 MAG' },
    silverLocket:      { name:'Silver Locket',     slot:'accessory', chars:['Sera'],        maxHp:5, desc:'+5 HP' },
    forestShardAmulet: { name:'Forest Shard Amulet',slot:'accessory',chars:['Kael','Lyra','Theron','Sera'], mag:5, desc:'+5 MAG' },

    // Additional equipment (found / acquired mid-game)
    valorBlade:        { name:'Valor Blade',       slot:'weapon',   chars:['Kael'],           atk:12, luck:2, desc:'+12 ATK +2 LUCK' },
    shadowweave:       { name:'Shadowweave Wrap',  slot:'armor',    chars:['Lyra'],           def:6, spd:3,  desc:'+6 DEF +3 SPD' },
    vaultScroll:       { name:'Vault Scroll',      slot:'weapon',   chars:['Theron'],         mag:14, maxMp:10, desc:'+14 MAG +10 MP' },
    sanctifiedRobe:    { name:'Sanctified Robe',   slot:'armor',    chars:['Sera'],           def:5, maxMp:20, desc:'+5 DEF +20 MP' },
    soldierHelm:       { name:"Soldier's Helm",    slot:'armor',    chars:['Kael'],           def:3,  desc:'+3 DEF' },
    thievesBelt:       { name:"Thieves' Belt",     slot:'accessory',chars:['Lyra'],           atk:2, spd:1, luck:3, desc:'+2 ATK +1 SPD +3 LUCK' },
    wardingStone:      { name:'Warding Stone',     slot:'accessory',chars:['Kael','Theron','Sera'], maxHp:10, desc:'+10 HP' },
    crimsonSeal:       { name:'Crimson Seal',      slot:'accessory',chars:['Kael','Lyra','Theron','Sera'], luck:4, maxMp:5, desc:'+4 LUCK +5 MP' },
  };

  // ── Skill definitions ────────────────────────────────────────
  const SKILLS = {
    // ===== KAEL =====
    slash: {
      name:'Slash', type:'physical', target:'single', mult:1.5, mp:0,
      range:1, levelReq:1,
      desc:'1.5x ATK, adjacent only'
    },
    shieldBash: {
      name:'Shield Bash', type:'physical', target:'single', mult:0.8, mp:8,
      range:1, effect:'stun', levelReq:1,
      desc:'0.8x ATK + stun 1 turn'
    },
    rally: {
      name:'Rally', type:'buff', target:'party', mult:0, mp:15,
      effect:'atkBuff', buffAmt:0.25, buffTurns:3, levelReq:1,
      desc:'All allies ATK +25% for 3 turns'
    },
    bladeStorm: {
      name:'Blade Storm', type:'physical', target:'adjAll', mult:1.2, mp:20,
      range:1, levelReq:3,
      desc:'1.2x ATK all adjacent enemies'
    },
    royalGuard: {
      name:'Royal Guard', type:'buff', target:'party', mult:0, mp:25,
      effect:'guardBuff', buffTurns:2, levelReq:6,
      desc:'Kael absorbs 50% dmg for adjacent allies, 2 turns'
    },
    starlightStrike: {
      name:'Starlight Strike', type:'hybrid', target:'single', mult:3.0, mp:35,
      magMult:1.0, range:1, levelReq:10,
      desc:'3x ATK + 1x MAG — the shard awakes'
    },

    // ===== LYRA =====
    stab: {
      name:'Stab', type:'physical', target:'single', mult:2.0, mp:0,
      range:1, levelReq:1,
      desc:'2x ATK'
    },
    shadowStep: {
      name:'Shadow Step', type:'move', target:'self', mult:0, mp:8,
      moveRange:5, levelReq:1,
      desc:'Teleport up to 5 cells'
    },
    poisonBlade: {
      name:'Poison Blade', type:'physical', target:'single', mult:1.0, mp:12,
      range:1, effect:'poison', poisonDmg:8, poisonTurns:4, levelReq:1,
      desc:'ATK + poison 8/turn for 4 turns'
    },
    smokeBomb: {
      name:'Smoke Bomb', type:'debuff', target:'aoe3x3', mult:0, mp:18,
      effect:'blind', blindTurns:2, levelReq:3,
      desc:'All enemies 3x3: 50% miss chance 2 turns'
    },
    assassinate: {
      name:'Assassinate', type:'physical', target:'single', mult:3.0, mp:30,
      range:1, requiresUnacted:true, levelReq:6,
      desc:'3x ATK — only if target has not acted this round'
    },
    twinShadow: {
      name:'Twin Shadow', type:'buff', target:'self', mult:0, mp:40,
      effect:'doubleNext', levelReq:10,
      desc:'Next attack deals double damage'
    },

    // ===== THERON =====
    fireball: {
      name:'Fireball', type:'magic', target:'single', mult:2.0, mp:12,
      range:99, levelReq:1,
      desc:'2x MAG single target fire'
    },
    blizzard: {
      name:'Blizzard', type:'magic', target:'aoe3x3', mult:1.2, mp:22,
      range:99, effect:'freeze', levelReq:1,
      desc:'1.2x MAG in 3x3 area, may freeze'
    },
    arcaneShield: {
      name:'Arcane Shield', type:'buff', target:'single', mult:0, mp:15,
      effect:'shield', shieldPct:0.6, levelReq:1,
      desc:'Target: next hit reduced 60%'
    },
    gravityWell: {
      name:'Gravity Well', type:'magic', target:'single', mult:1.0, mp:20,
      range:99, effect:'pull', pullRadius:3, levelReq:3,
      desc:'Pull all enemies within 3 cells, 1x MAG each'
    },
    shardInfusion: {
      name:'Shard Infusion', type:'buff', target:'ally', mult:0, mp:25,
      effect:'magAtkBuff', buffAmt:0.4, buffTurns:3, levelReq:6,
      desc:'Ally ATK or MAG +40% for 3 turns'
    },
    supernova: {
      name:'Supernova', type:'magic', target:'allEnemy', mult:2.5, mp:50,
      recoilPct:0.2, levelReq:10,
      desc:'2.5x MAG ALL enemies — Theron takes 20% max HP recoil'
    },

    // ===== SERA =====
    heal: {
      name:'Heal', type:'heal', target:'ally', mult:0, mp:12,
      healBase:35, levelReq:1,
      desc:'Restore 35+MAG HP to ally'
    },
    holyLight: {
      name:'Holy Light', type:'magic', target:'single', mult:2.5, mp:18,
      range:99, vsCorrupted:true, levelReq:1,
      desc:'2.5x MAG vs dark/corrupted enemies'
    },
    resurrection: {
      name:'Resurrection', type:'revive', target:'deadAlly', mult:0, mp:40,
      revivePercent:0.5, levelReq:1,
      desc:'Revive fallen ally at 50% HP'
    },
    barrier: {
      name:'Barrier', type:'buff', target:'ally', mult:0, mp:15,
      effect:'barrier', levelReq:3,
      desc:'Ally immune to next debuff'
    },
    massHeal: {
      name:'Mass Heal', type:'heal', target:'allAlly', mult:0, mp:35,
      healBase:20, levelReq:6,
      desc:'Heal ALL living allies for 20+MAG HP'
    },
    miracle: {
      name:'Miracle', type:'reviveAll', target:'all', mult:0, mp:60,
      reviveAllPercent:0.4, healLivingPct:0.8, levelReq:10,
      desc:'Revive ALL fallen allies (40%) + heal living to 80%'
    },

    // ===== ENEMY SKILLS =====
    eStrike:        { name:'Strike',          type:'physical', target:'single', mult:1.0, mp:0, range:1 },
    eHeavyBlow:     { name:'Heavy Blow',      type:'physical', target:'single', mult:2.0, mp:0, range:1 },
    eWail:          { name:'Wail',            type:'magic',    target:'single', mult:1.5, mp:0, range:99 },
    eCurse:         { name:'Curse',           type:'debuff',   target:'single', mult:0,   mp:0, range:99,  effect:'defDebuff', buffAmt:-0.3, buffTurns:2 },
    eSuppress:      { name:'Suppress',        type:'physical', target:'single', mult:1.0, mp:0, range:1,   effect:'stun' },
    ePlagueTch:     { name:'Plague Touch',    type:'physical', target:'single', mult:1.0, mp:0, range:1,   effect:'poison', poisonDmg:5, poisonTurns:3 },
    eBackstab:      { name:'Backstab',        type:'physical', target:'single', mult:2.0, mp:0, range:1 },
    ePilfer:        { name:'Pilfer',          type:'special',  target:'single', mult:0,   mp:0, range:1,   effect:'steal' },
    eSmokeScr:      { name:'Smoke Screen',    type:'debuff',   target:'allPlayers', mult:0, mp:0,          effect:'blind', blindTurns:2 },
    eShadowStrike:  { name:'Shadow Strike',   type:'physical', target:'single', mult:1.5, mp:0, range:1,   effect:'poison', poisonDmg:5, poisonTurns:2 },
    eVanish:        { name:'Vanish',          type:'buff',     target:'self',   mult:0,   mp:0,            effect:'evasion', evasionAmt:50, evasionTurns:1 },
    eDarkBlade:     { name:'Dark Blade',      type:'physical', target:'single', mult:2.0, mp:0, range:1 },
    eNightmare:     { name:'Nightmare',       type:'debuff',   target:'single', mult:0,   mp:0, range:99,  effect:'blindAtkDown' },
    eCommand:       { name:'Command',         type:'buff',     target:'adjAlly',mult:0,   mp:0,            effect:'atkBuff', buffAmt:0.3, buffTurns:2 },
    eShieldStrike:  { name:'Shield Strike',   type:'physical', target:'single', mult:1.2, mp:0, range:1,   effect:'stun' },
    eFormation:     { name:'Formation',       type:'buff',     target:'adjAlly',mult:0,   mp:0,            effect:'defBuff', buffAmt:0.2, buffTurns:2 },
    eCleave:        { name:'Cleave',          type:'physical', target:'single', mult:1.5, mp:0, range:1 },
    eCorruption:    { name:'Corruption',      type:'magic',    target:'single', mult:0,   mp:0, range:99,   fixedDmg:60, effect:'defShred' },
    eShardBlast:    { name:'Shard Blast',     type:'magic',    target:'single', mult:1.8, mp:0, range:99 },
    eCorruptBersk:  { name:'Corruption Pulse',type:'debuff',   target:'aoe2',   mult:0,   mp:0,            effect:'berserk', berserkTurns:2 },
    eShieldFaith:   { name:'Shield of Faith', type:'buff',     target:'adjAlly',mult:0,   mp:0,            effect:'shield', shieldPct:0.6 },
    eLoyalty:       { name:'Loyalty',         type:'buff',     target:'self',   mult:0,   mp:0,            effect:'guardAlly' },
    eDevour:        { name:'Devour',          type:'physical', target:'single', mult:1.5, mp:0, range:1,   effect:'lifesteal', lifestealPct:0.3 },
    eVoidSlash:     { name:'Void Slash',      type:'physical', target:'single', mult:1.5, mp:0, range:1,   effect:'defDown' },
    eRealityTear:   { name:'Reality Tear',    type:'magic',    target:'single', mult:2.0, mp:0, range:99 },
    ePhase:         { name:'Phase',           type:'buff',     target:'self',   mult:0,   mp:0,            effect:'evasion', evasionAmt:40, evasionTurns:2 },
    eShardSlash:    { name:'Shard Slash',     type:'physical', target:'single', mult:1.3, mp:0, range:1 },
    eSBarrier:      { name:'Barrier',         type:'buff',     target:'adjAlly',mult:0,   mp:0,            effect:'shield', shieldPct:0.5 },
    eTactRet:       { name:'Tactical Retreat',type:'move',     target:'self',   mult:0,   mp:0,            moveRange:2 },
    ePrecise:       { name:'Precise Strike',  type:'physical', target:'single', mult:1.3, mp:0, range:1 },
    eCounter:       { name:'Counter',         type:'passive',  target:'self',   mult:0,   mp:0,            counterChance:0.5 },
    // Vareth
    eRealityCrack:  { name:'Reality Crack',   type:'magic',    target:'allPlayers', mult:1.5, mp:0 },
    eShardDrain:    { name:'Shard Drain',     type:'special',  target:'single', mult:0,   mp:0, range:99,  effect:'mpDrain', drainAmt:20 },
    eVoidMaw:       { name:'Void Maw',        type:'magic',    target:'single', mult:3.0, mp:0, range:99 },
  };

  // ── Character templates ──────────────────────────────────────
  const CHAR_TEMPLATES = {
    kael: {
      name:'Kael', class:'Swordsman / Heir', color:'#4488ff', portrait:'kael',
      baseMaxHp:120, baseMaxMp:40, baseAtk:18, baseDef:14, baseMag:8,  baseSPD:9,  luck:5, move:3,
      maxHp:120, maxMp:40, atk:18, def:14, mag:8, spd:9,
      skills:['slash','shieldBash','rally'],
      startEquip:{ weapon:'ironSword', armor:'chainMail', accessory:'luckyCharm' },
    },
    lyra: {
      name:'Lyra', class:'Rogue / Spy', color:'#bb55ff', portrait:'lyra',
      baseMaxHp:85, baseMaxMp:55, baseAtk:22, baseDef:9, baseMag:12, baseSPD:14, luck:8, move:4,
      maxHp:85, maxMp:55, atk:22, def:9, mag:12, spd:14,
      skills:['stab','shadowStep','poisonBlade'],
      startEquip:{ weapon:'twinDaggers', armor:'leatherArmor', accessory:'shadowCloak' },
    },
    theron: {
      name:'Theron', class:'Mage / Scholar', color:'#ff4444', portrait:'theron',
      baseMaxHp:70, baseMaxMp:90, baseAtk:8,  baseDef:7,  baseMag:24, baseSPD:8,  luck:4, move:3,
      maxHp:70, maxMp:90, atk:8, def:7, mag:24, spd:8,
      skills:['fireball','blizzard','arcaneShield'],
      startEquip:{ weapon:'apprenticeStaff', armor:'scholarRobe', accessory:'focusLens' },
    },
    sera: {
      name:'Sera', class:'Sage / Healer', color:'#ffdd44', portrait:'sera',
      baseMaxHp:80, baseMaxMp:100, baseAtk:7, baseDef:10, baseMag:20, baseSPD:10, luck:6, move:3,
      maxHp:80, maxMp:100, atk:7, def:10, mag:20, spd:10,
      skills:['heal','holyLight','resurrection'],
      startEquip:{ weapon:'healingRod', armor:'vestments', accessory:'silverLocket' },
    },
  };

  // ── Enemy templates ──────────────────────────────────────────
  const ENEMY_TEMPLATES = {
    bandit:          { name:'Bandit',           color:'#996633', maxHp:50,  atk:14, def:6,  mag:2,  spd:7,  luck:2, move:3, skills:['eStrike'],                               isPlayer:false, aiType:'aggressive' },
    banditCaptain:   { name:'Bandit Captain',   color:'#cc4422', maxHp:90,  atk:18, def:10, mag:3,  spd:8,  luck:3, move:3, skills:['eStrike','eHeavyBlow'],                   isPlayer:false, aiType:'aggressive' },
    corruptSpirit:   { name:'Corrupt Spirit',   color:'#44aaaa', maxHp:60,  atk:8,  def:4,  mag:18, spd:12, luck:4, move:4, skills:['eWail','eCurse'],                         isPlayer:false, aiType:'tactical'   },
    wraith:          { name:'Wraith',           color:'#225588', maxHp:45,  atk:5,  def:2,  mag:22, spd:15, luck:3, move:5, skills:['eRealityTear','ePhase'],                  isPlayer:false, aiType:'tactical', ignoresTerrain:true },
    enforcer:        { name:'Enforcer',         color:'#778877', maxHp:80,  atk:16, def:12, mag:4,  spd:8,  luck:3, move:3, skills:['eStrike','eSuppress'],                    isPlayer:false, aiType:'aggressive' },
    enforcerCaptain: { name:'Enf.Captain',      color:'#557755', maxHp:120, atk:20, def:14, mag:5,  spd:9,  luck:3, move:3, skills:['eStrike','eHeavyBlow','ePlagueTch'],      isPlayer:false, aiType:'tactical'   },
    thief:           { name:'Thief',            color:'#886644', maxHp:65,  atk:17, def:7,  mag:4,  spd:13, luck:6, move:4, skills:['eBackstab','ePilfer'],                    isPlayer:false, aiType:'aggressive' },
    thiefBoss:       { name:'Thief Boss',       color:'#aa7733', maxHp:110, atk:22, def:10, mag:6,  spd:14, luck:7, move:5, skills:['eBackstab','eSmokeScr'],                  isPlayer:false, aiType:'tactical'   },
    assassin:        { name:'Assassin',         color:'#222255', maxHp:70,  atk:20, def:8,  mag:5,  spd:16, luck:8, move:5, skills:['eShadowStrike','eVanish'],                isPlayer:false, aiType:'aggressive' },
    shadowMaster:    { name:'Shadow Master',    color:'#334466', maxHp:140, atk:18, def:12, mag:14, spd:12, luck:5, move:4, skills:['eDarkBlade','eNightmare','eCommand'],      isPlayer:false, aiType:'tactical'   },
    castleGuard:     { name:'Castle Guard',     color:'#9999bb', maxHp:90,  atk:17, def:15, mag:3,  spd:8,  luck:2, move:3, skills:['eShieldStrike','eFormation'],             isPlayer:false, aiType:'aggressive' },
    castleGuardCap:  { name:'Guard Captain',    color:'#7777aa', maxHp:130, atk:22, def:18, mag:5,  spd:9,  luck:3, move:3, skills:['eCleave','eFormation'],                   isPlayer:false, aiType:'tactical'   },
    inquisitor:      { name:'Inquisitor',       color:'#884466', maxHp:85,  atk:10, def:8,  mag:20, spd:10, luck:3, move:3, skills:['eShardBlast','eCorruptBersk','eShieldFaith'], isPlayer:false, aiType:'support' },
    eliteGuard:      { name:'Elite Guard',      color:'#aaaacc', maxHp:140, atk:25, def:20, mag:5,  spd:9,  luck:2, move:3, skills:['ePrecise','eCounter'],                    isPlayer:false, aiType:'aggressive' },
    corruptedKnight: { name:'Corrupt Knight',   color:'#442244', maxHp:150, atk:28, def:20, mag:10, spd:7,  luck:2, move:2, skills:['eDarkBlade','eDevour'],                   isPlayer:false, aiType:'aggressive', physResist:0.2 },
    throneGuard:     { name:'Throne Guard',     color:'#886633', maxHp:100, atk:22, def:17, mag:6,  spd:9,  luck:3, move:3, skills:['eLoyalty','eShieldStrike'],               isPlayer:false, aiType:'support'    },
    voidKnight:      { name:'Void Knight',      color:'#334455', maxHp:120, atk:22, def:14, mag:12, spd:10, luck:3, move:3, skills:['eVoidSlash','eCorruptBersk'],             isPlayer:false, aiType:'aggressive' },
    voidWraith:      { name:'Void Wraith',      color:'#113355', maxHp:80,  atk:12, def:5,  mag:25, spd:18, luck:4, move:6, skills:['eRealityTear','ePhase'],                  isPlayer:false, aiType:'tactical', ignoresTerrain:true },
    shardGuardian:   { name:'Shard Guardian',   color:'#8877aa', maxHp:100, atk:20, def:16, mag:12, spd:10, luck:3, move:3, skills:['eShardSlash','eSBarrier'],               isPlayer:false, aiType:'aggressive' },
    voidShard:       { name:'Void Shard',       color:'#225577', maxHp:60,  atk:15, def:8,  mag:15, spd:8,  luck:1, move:2, skills:['eShardBlast'],                           isPlayer:false, aiType:'aggressive' },
    taxGuard:        { name:'Tax Guard',        color:'#887744', maxHp:70,  atk:15, def:10, mag:2,  spd:8,  luck:2, move:3, skills:['eStrike'],                               isPlayer:false, aiType:'aggressive' },
    corruptCollect:  { name:'Tax Collector',    color:'#996622', maxHp:100, atk:18, def:12, mag:5,  spd:9,  luck:3, move:3, skills:['eHeavyBlow','eCommand'],                  isPlayer:false, aiType:'tactical'   },

    // ── Lord Aldric (Phase 1 battle — ends at 1 HP) ─────────────
    lordAldricP1: {
      name:'Lord Aldric', color:'#8833aa', maxHp:200, atk:25, def:18, mag:20, spd:11, luck:5, move:3,
      skills:['eDarkBlade','eCorruption','eCommand','eTactRet'],
      isPlayer:false, aiType:'boss', isBoss:true,
      bossEndsAt1HP: true,   // battle ends when reduced to 1 HP (he isn't killed)
    },

    // ── Vareth Fragment (Battle 10B) ──────────────────────────
    varethFragment: {
      name:'VARETH', color:'#cc44ff', maxHp:400, atk:30, def:15, mag:35, spd:12, luck:0, move:4,
      skills:['eRealityCrack','eShardDrain','eCorruptBersk','eVoidMaw'],
      isPlayer:false, aiType:'boss', isBoss:true,
      actionsPerTurn:2,
      reviveAddsAt50: true,  // revive void shards when at 50% HP (once)
      reviveTriggered: false,
    },
  };

  // ── Battle EXP awards ────────────────────────────────────────
  const BATTLE_EXP = {
    battle1:25, battle2:35, battle3:45, battle4:55, battle5opt:30,
    battle6:65, battle7:75, battle8:90, battle9:80, battle10b:150
  };

  // Level-up skill unlocks (character key -> level -> skill key)
  const LEVEL_SKILL_UNLOCKS = {
    kael:   { 3:'bladeStorm',   6:'royalGuard',   10:'starlightStrike' },
    lyra:   { 3:'smokeBomb',    6:'assassinate',  10:'twinShadow'      },
    theron: { 3:'gravityWell',  6:'shardInfusion',10:'supernova'       },
    sera:   { 3:'barrier',      6:'massHeal',     10:'miracle'         },
  };

  // ── Battle definitions ───────────────────────────────────────
  // terrain: array of {col,row,type} — type: 'elevated','water','forest','ruins'
  const BATTLES = {
    battle1: {
      id:'battle1', label:'Battle I - First Blood', background:'village',
      expReward: 25,
      partyOverride:['kael'],  // only Kael
      enemies:[
        { key:'bandit',        col:9, row:2 },
        { key:'banditCaptain', col:11,row:3 },
      ],
      terrain:[
        {col:5,row:2,type:'elevated'},{col:6,row:2,type:'elevated'},
        {col:5,row:3,type:'elevated'},{col:6,row:3,type:'elevated'},
      ],
      preBattleDialogue:[
        { name:'Bandit Captain', color:'#cc4422', portrait:'none',
          text:"Kill 'em all! Leave nothing standing! The Broker said take what you can find!" },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"This village is under my protection. And you will answer for what you've done here." },
      ],
    },

    battle2: {
      id:'battle2', label:'Battle II — Mirewood Haunting', background:'forest',
      expReward: 35,
      partyOverride:null,
      enemies:[
        { key:'corruptSpirit', col:8, row:0 },
        { key:'corruptSpirit', col:9, row:2 },
        { key:'corruptSpirit', col:8, row:4 },
        { key:'wraith',        col:10,row:3 },
      ],
      terrain:[
        {col:3,row:1,type:'forest'},{col:4,row:1,type:'forest'},
        {col:3,row:3,type:'forest'},{col:4,row:3,type:'forest'},
        {col:5,row:2,type:'forest'},{col:2,row:2,type:'forest'},
        {col:8,row:0,type:'forest'},{col:9,row:1,type:'forest'},
      ],
      preBattleDialogue:[
        { name:'Lyra', color:'#bb55ff', portrait:'lyra',
          text:"Something's wrong. The trees... they're pulling back from that clearing." },
        { name:'Theron', color:'#ff4444', portrait:'theron',
          text:"I see them. The spirits I — I corrupted. I'm sorry. I'll fix this." },
      ],
      specialEvents:[
        { turn:3, type:'visionFlash',
          text:"Kael sees a flash — his father, speaking to a robed figure. Malachar. His father KNEW him." }
      ],
    },

    battle3: {
      id:'battle3', label:'Battle III — The Plague Enforcers', background:'town',
      expReward: 45,
      partyOverride:null,
      enemies:[
        { key:'enforcer',        col:9, row:1 },
        { key:'enforcer',        col:9, row:4 },
        { key:'enforcerCaptain', col:10,row:2 },
      ],
      terrain:[
        {col:4,row:3,type:'water'},{col:5,row:3,type:'water'},
        {col:4,row:4,type:'water'},
      ],
      theron_reinforcement: true,  // Theron spawns at col:0,row:3 on turn 3
      preBattleDialogue:[
        { name:'Enforcer Captain', color:'#557755', portrait:'none',
          text:"Quarantine order from Lord Aldric. These people have been spreading seditious rumors. Silence them." },
        { name:'Sera', color:'#ffdd44', portrait:'sera',
          text:"These are sick people. You're not quarantining them — you're silencing them. Not today." },
      ],
    },

    battle4: {
      id:'battle4', label:'Battle IV — The Guildhouse Job', background:'selvara',
      expReward: 55,
      partyOverride:null,
      enemies:[
        { key:'thief',     col:8, row:0 },
        { key:'thief',     col:9, row:2 },
        { key:'thief',     col:8, row:4 },
        { key:'thiefBoss', col:10,row:2 },
      ],
      terrain:[
        {col:5,row:1,type:'ruins'},{col:6,row:1,type:'ruins'},
        {col:5,row:3,type:'ruins'},{col:6,row:4,type:'ruins'},
      ],
      preBattleDialogue:[
        { name:'Thief Boss', color:'#aa7733', portrait:'none',
          text:"Well well. Someone sent fancy heroes to reclaim the Maskmaker's goods? Shame. We were going to sell nice things." },
        { name:'Lyra', color:'#bb55ff', portrait:'lyra',
          text:"I've dealt with worse than you in back alleys half this size. Move." },
      ],
    },

    battle5: {
      id:'battle5', label:'Battle V — Night Ambush in Selvara', background:'selvara_night',
      expReward: 55,
      partyOverride:null,
      nightBonus: true,  // enemies get +10% evasion
      enemies:[
        { key:'assassin',     col:9, row:0 },
        { key:'assassin',     col:9, row:3 },
        { key:'assassin',     col:10,row:5 },
        { key:'shadowMaster', col:10,row:2 },
      ],
      terrain:[
        {col:3,row:1,type:'forest'},{col:4,row:4,type:'forest'},
        {col:7,row:2,type:'forest'},
      ],
      preBattleDialogue:[
        { name:'Shadow Master', color:'#334466', portrait:'none',
          text:"Lord Aldric sends his regards. You should not have come this far." },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"Funny. We were just thinking the same thing about him." },
      ],
    },

    battle5opt: {
      id:'battle5opt', label:'Optional — The Corrupt Tax Collector', background:'selvara',
      expReward: 30,
      optional: true,
      partyOverride:null,
      enemies:[
        { key:'taxGuard',      col:9, row:1 },
        { key:'taxGuard',      col:9, row:4 },
        { key:'corruptCollect',col:10,row:2 },
      ],
      terrain:[],
      preBattleDialogue:[
        { name:'Tax Collector', color:'#996622', portrait:'none',
          text:"New tariff. You breathe in Selvara, you pay. And if you don't pay... well. These guards get bored." },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"Step aside." },
      ],
    },

    battle6: {
      id:'battle6', label:'Battle VI — Undercity Patrol', background:'undercity',
      expReward: 65,
      partyOverride:null,
      enemies:[
        { key:'castleGuard',    col:8, row:0 },
        { key:'castleGuard',    col:9, row:5 },
        { key:'castleGuardCap', col:9, row:2 },
        { key:'inquisitor',     col:10,row:3 },
      ],
      terrain:[
        {col:4,row:2,type:'ruins'},{col:5,row:2,type:'ruins'},
        {col:4,row:4,type:'ruins'},
        {col:7,row:1,type:'ruins'},{col:8,row:5,type:'ruins'},
      ],
      preBattleDialogue:[
        { name:'Inquisitor', color:'#884466', portrait:'none',
          text:"Unauthorized personnel in the Undercity. By order of the Inquisition — submit to mind-binding." },
        { name:'Theron', color:'#ff4444', portrait:'theron',
          text:"Mind-binding. That's what he called it. They're using Vareth's corrupted shard energy on people's thoughts." },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"Not today." },
      ],
    },

    battle7: {
      id:'battle7', label:'Battle VII — The King\'s Guard', background:'castle_hall',
      expReward: 75,
      partyOverride:null,
      enemies:[
        { key:'eliteGuard',      col:8,  row:0 },
        { key:'eliteGuard',      col:9,  row:2 },
        { key:'eliteGuard',      col:8,  row:5 },
        { key:'corruptedKnight', col:10, row:3 },
      ],
      terrain:[
        {col:0,row:0,type:'elevated'},{col:0,row:5,type:'elevated'},
        {col:10,row:0,type:'elevated'},{col:10,row:5,type:'elevated'},
        {col:5,row:0,type:'elevated'},{col:5,row:5,type:'elevated'},
      ],
      preBattleDialogue:[
        { name:'Elite Guard', color:'#aaaacc', portrait:'none',
          text:"The king cannot be disturbed. This order comes from Regent Aldric himself." },
        { name:'Sera', color:'#ffdd44', portrait:'sera',
          text:"The king is being kept in stasis. Every moment he's in there is a moment Aldric rules in his name. We are getting him out." },
      ],
      postBattleSpecial: 'freeKing',
    },

    battle8: {
      id:'battle8', label:'Battle VIII — Aldric Confronted', background:'throne_room',
      expReward: 90,
      partyOverride:null,
      enemies:[
        { key:'throneGuard',   col:9,  row:1 },
        { key:'throneGuard',   col:9,  row:4 },
        { key:'lordAldricP1',  col:10, row:2 },
      ],
      terrain:[
        {col:10,row:2,type:'elevated'},  // throne — Aldric gets ATK bonus here
        {col:5,row:0,type:'elevated'},{col:5,row:5,type:'elevated'},
      ],
      bossEndsAtOneHP:'lordAldricP1',
      preBattleDialogue:[
        { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
          text:"So you've come for a reckoning, Prince Kael. Yes — I know what you are. Do you?" },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"Give us the shards. Step down." },
        { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
          text:"I've been preparing for this for thirty years. You've been preparing for... ten minutes, give or take. Let's see how this goes." },
      ],
    },

    battle9: {
      id:'battle9', label:'Battle IX — Vareth Bleeds Through', background:'vault_cracking',
      expReward: 80,
      partyOverride:null,
      varethChoice: true,  // mid-battle prompt for Theron
      enemies:[
        { key:'voidKnight', col:8,  row:0 },
        { key:'voidKnight', col:9,  row:1 },
        { key:'voidKnight', col:8,  row:4 },
        { key:'voidKnight', col:9,  row:5 },
        { key:'voidWraith', col:10, row:3 },
      ],
      terrain:[
        {col:5,row:2,type:'ruins'},{col:6,row:3,type:'ruins'},
        {col:3,row:1,type:'ruins'},{col:8,row:4,type:'ruins'},
      ],
      dynamicTerrain: true,  // some tiles flicker each turn
      preBattleDialogue:[
        { name:'Malachar', color:'#8844cc', portrait:'malachar',
          text:"The Crown is pulsing. Vareth bleeds through the cracks. We have to hold them off while I try to contain it." },
        { name:'Theron', color:'#ff4444', portrait:'theron',
          text:"I can feel it. It's... it's so LOUD. The voice. It's offering—" },
        { name:'Kael', color:'#4488ff', portrait:'kael',
          text:"Don't listen to it. Stay with us." },
      ],
    },

    battleGuardians: {
      id:'battleGuardians', label:'Observatory Guardians', background:'selvara',
      expReward: 50,
      partyOverride:null,
      enemies:[
        { key:'shardGuardian', col:9,  row:1 },
        { key:'shardGuardian', col:9,  row:3 },
        { key:'shardGuardian', col:10, row:5 },
      ],
      terrain:[
        {col:6,row:1,type:'elevated'},{col:6,row:3,type:'elevated'},
        {col:8,row:2,type:'ruins'},
      ],
      preBattleDialogue:[
        { name:'Shard Guardian', color:'#8877aa', portrait:'none',
          text:'HALT. This site is restricted. Intruders will be removed.' },
        { name:'Malachar', color:'#8844cc', portrait:'malachar',
          text:"No no no, STAND DOWN! They are with me!" },
      ],
    },

    battle10b: {
      id:'battle10b', label:'Battle X — Vareth Manifests', background:'vault_final',
      expReward: 150,
      partyOverride:null,
      enemies:[
        { key:'varethFragment', col:9,  row:2 },
        { key:'voidShard',      col:10, row:0 },
        { key:'voidShard',      col:10, row:4 },
        { key:'voidShard',      col:10, row:5 },
      ],
      terrain:[
        {col:3,row:0,type:'ruins'},{col:4,row:1,type:'ruins'},{col:3,row:2,type:'ruins'},
        {col:4,row:3,type:'ruins'},{col:3,row:4,type:'ruins'},{col:5,row:5,type:'ruins'},
        {col:7,row:0,type:'ruins'},{col:8,row:2,type:'ruins'},{col:7,row:4,type:'ruins'},
        {col:9,row:1,type:'ruins'},{col:10,row:3,type:'ruins'},
      ],
      preBattleDialogue:[
        { name:'Malachar', color:'#8844cc', portrait:'malachar',
          text:"The swap is working but — it's waking. FAST. Contain what you can." },
        { name:'Vareth', color:'#cc44ff', portrait:'none',
          text:"...F R E E..." },
        { name:'Sera', color:'#ffdd44', portrait:'sera',
          text:"Whatever that thing is — it does NOT get out of this vault. Ready?" },
      ],
    },
  };

  // ── Story dialogues ──────────────────────────────────────────
  const STORY = {

    // ── PROLOGUE ────────────────────────────────────────────────
    prologueFrames: [
      { type:'text', scene:'stars', lines:['Ten years ago.','The night everything changed.'], narration:'Ten years ago. The night everything changed.', duration:3000 },
      { type:'text', scene:'vault', lines:['King Valdris had learned the truth about the Starlight Crown.','It was not a symbol of power. It was a prison lock.','And the prisoner... had been dreaming.'], narration:'King Valdris had learned the truth about the Starlight Crown. It was not a symbol of power. It was a prison lock. And the prisoner... had been dreaming.', duration:4000 },
      { type:'text', scene:'vault', lines:['His most trusted advisor, Aldric, stood beside him in the vault.','The king reached for the Crown to reinforce the seal.'], narration:'His most trusted advisor, Aldric, stood beside him in the vault. The king reached for the Crown to reinforce the seal.', duration:3500 },
      { type:'text', scene:'betrayal', lines:["Aldric's hand moved first.",'Not to help. To study.','He wanted to understand the god trapped within.','He thought he could control the consequences.'], narration:"Aldric's hand moved first. Not to help. To study. He wanted to understand the god trapped within. He thought he could control the consequences.", duration:4000 },
      { type:'text', scene:'shatter', lines:['The Crown shattered.','Four shards scattered into the darkness.','Vareth, the god of entropy, stirred in its weakened prison.'], narration:'The Crown shattered. Four shards scattered into the darkness. Vareth, the god of entropy, stirred in its weakened prison.', duration:3500 },
      { type:'text', scene:'prince', lines:['The king had a brother.','A prince.','Aldric had the prince hidden — for his own protection.','Or so he told himself.'], narration:'The king had a brother. A prince. Aldric had the prince hidden, for his own protection. Or so he told himself.', duration:4000 },
      { type:'text', scene:'village', lines:['The prince disappeared into the countryside.','He built a life. He had a son.','He left one shard with a village elder to keep it safe.'], narration:'The prince disappeared into the countryside. He built a life. He had a son. He left one shard with a village elder to keep it safe.', duration:4000 },
      { type:'text', scene:'castle', lines:['Ten years passed.','Aldric collected three more shards in secret.','The king fell ill. A stasis took him. Convenient.','Aldric ruled in his name.'], narration:'Ten years passed. Aldric collected three more shards in secret. The king fell ill. A stasis took him. Convenient. Aldric ruled in his name.', duration:4000 },
      { type:'text', scene:'fire', lines:['Then the fires came.'], narration:'Then the fires came.', duration:2500 },
      { type:'text', scene:'fade', lines:['Ten years later...'], narration:'Ten years later...', duration:2000 },
    ],

    // ── ACT 1 ────────────────────────────────────────────────────
    act1Pre: [
      { name:'Elder Brennan', color:'#ffddaa', portrait:'none',
        text:"Kael! The bandits — they're everywhere. They wore a sigil — a broken crown. They came looking for something." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Get inside. I'll deal with them." },
    ],
    act1Post: [
      { name:'Elder Brennan', color:'#ffddaa', portrait:'none',
        text:"Kael... come close. I don't have... much time." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"You're going to be fine. We stopped them." },
      { name:'Elder Brennan', color:'#ffddaa', portrait:'none',
        text:"Your father... he didn't die in any war. He left this with me. He said when the fires came... to give it to you." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"...What is this? It feels warm. What am I holding?" },
      { name:'Elder Brennan', color:'#ffddaa', portrait:'none',
        text:"Your father called it a piece of the Starlight Crown. He said... only his blood could feel it. He said... you'd know what to do. Find out the truth, Kael. He didn't die a simple farmer. He was—" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Don't speak. Rest." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"I've been following those bandits for three weeks. They report to someone called 'The Broker.' I wasn't expecting — that." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"You know what this is." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"It's more than a Crown shard. The Crown was a seal. These pieces are prison bars. And someone has been filing them down." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"My father knew. He hid this. I need to find out why." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Then you're going to need someone who knows how to find things. I'm Lyra. I'm coming with you." },
    ],

    // ── ACT 2 ────────────────────────────────────────────────────
    act2Pre: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"This forest feels wrong. The flowers are growing in spirals. Animals moving in unison. Something is warping this place." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"The shard is pulling toward something. There — that clearing." },
    ],
    act2Post: [
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"You handled those spirits... efficiently. I apologize — they shouldn't have attacked." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Who are you, and why are the woods full of things you've apparently 'accidentally' created'?" },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Theron. Former court mage. I was studying shard energy — trying to replicate it. Instead I corrupted part of this forest. I've been trying to fix it for three years." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"The shard — it just showed me something. A vision. My father, years ago. He was speaking to someone in robes." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"The shards hold echo-memories. Impressions of events they witnessed. May I see?" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"The robed man — I recognized his face. It was Malachar. The exile. My father knew Malachar." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"...Then your bloodline is connected to the Crown in ways you haven't been told. There's a shrine east of here where I've been cataloguing echo-impressions. We should go. I'm coming with you." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Great. A liability." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"A liability who can incinerate twenty enemies at once." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"...Welcome aboard." },
    ],

    // Shrine vision
    act2Shrine: [
      { name:'ECHO — Kael\'s Father', color:'#aaccff', portrait:'none',
        text:"\"I don't like this, Malachar. Guarding a piece of the seal in a farming village.\"" },
      { name:'ECHO — Malachar', color:'#8844cc', portrait:'none',
        text:"\"It is the safest place. No one looks for a prison bar in a haystack. Your son will never need to know.\"" },
      { name:'ECHO — Kael\'s Father', color:'#aaccff', portrait:'none',
        text:"\"And if they come for it? If the fires come?\"" },
      { name:'ECHO — Malachar', color:'#8844cc', portrait:'none',
        text:"\"Then he will be ready. The blood knows. It always knows.\"" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"My father was... guarding it. He wasn't just a farmer who happened to have a shard. He was chosen." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Not just chosen. Look at the shard when you hold it. The light responds to your touch. This isn't coincidence, Kael. Your bloodline may be literally bound to the Crown." },
    ],

    // ── ACT 3 ────────────────────────────────────────────────────
    act3Pre: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Thornhaven. Something's wrong here — the streets are too quiet." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Plague markers on the doors. Recent. But it moves strangely — only on houses with red chalk marks." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Stop! Don't enter those houses without protection. I've been treating survivors for a month." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Who are you?" },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Sera. I was the king's personal healer. I've been hiding here since Aldric tried to have me poisoned." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Why did he want you dead?" },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Because I knew the king wasn't poisoned. He's in a magical stasis — one of the shards is keeping him suspended in time. Aldric is ruling in the name of a man who can't speak to deny it." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"This plague — the pattern, the targeting... Aldric did this." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"He's done it before. Twelve years ago, there was a village called Westmarch. I had a daughter—" },
    ],
    act3Post: [
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"I can't stay here anymore. Not while Aldric is still ruling. I can heal. That's what I can give this fight." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"We'd be glad to have you." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(quietly, to Sera) I'm sorry about your daughter." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(quietly back) I know. Thank you. ...I've been angry about it for twelve years. It's either turn that into something useful, or drown in it." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"I understand that better than you'd think." },
    ],

    // ── ACT 4 — Selvara ─────────────────────────────────────────
    act4Pre: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Selvara. The merchant city. If anyone has information about Malachar's location, it's here." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Everyone wears masks here. Old custom — anonymity in trade. Which means Aldric's spies blend in perfectly." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"I've been having visions, Kael. Since I started using the shard energy to combat the corruption in the forest. I hear a voice. It's... the same voice Vareth used to speak through the shards before they were sealed." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"How bad?" },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"...Getting worse with every battle. I needed to tell someone." },
    ],
    act4Post: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"That masked woman who 'dropped' the map. Theron's right — she was testing us." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"The map leads to an observatory in the mountains to the northwest. No one who wanted us dead would send us there." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Then either it's Malachar himself, or someone who works with him." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Theron. The voice — I want you to tell me if it gets worse. Not after it's already taken hold. Immediately." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"...I will. I promise." },
    ],

    // ── ACT 5 — Observatory ──────────────────────────────────────
    act5Pre: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"This is it. The observatory. Someone's been up here recently." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"You made it. Good. I wasn't sure you would." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Malachar." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"You look exactly like your grandfather did at your age. It's... uncanny." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Talk. Who are you, what do you know, and why did you take so long to help?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I was the original Keeper of the Crown. The old king — Kael's grandfather — gave that responsibility to me. When Aldric had me exiled, the Crown's maintenance... fell apart. The shattering was Aldric's doing. He sabotaged my return to repair the seal." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"And Kael? His father? You KNEW about him." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Kael's father was the prince. The king's brother. The second heir. Aldric had him hidden — supposedly for his protection. But the prince discovered what Aldric was doing and fled. He took one of the scattered shards with him. He hid it with an elder he trusted." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Then I'm—" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The legitimate heir to the throne of Valdris, yes. And the shard you carry only responds to royal blood. Aldric has been trying to collect it for years. Every attack on you — the bandits, the enforcers, the assassins — they were never meant to kill you. They were trying to capture you and take the shard." },
    ],
    act5Guardian: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(to his guardians) Stand down! These are friends! I said STAND DOWN." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"They didn't get the message." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"They're... protective. They've watched over this place for years. Please — carefully. I'd rather not lose any of them." },
    ],
    act5Post: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(quieter, after the records are shown) I watched you, Kael. From afar. Your whole life. I was afraid Aldric's spies would find you if I reached out. I convinced myself staying away was protecting you. It was cowardice. I'm sorry." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(long pause) ...What do we do now?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Aldric has three shards. You have one. The Crown's frame is in the vault beneath Castle Valdris. We go there. We use your shard to reinforce the seal. We stop this." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(later, alone with Kael) How are you doing with all of... that? Being royal? Being the heir?" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"I don't want a throne." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"No one who should have one ever does." },
    ],

    // ── ACT 5 EXTENDED — Learning from Malachar ──────────────────
    act5MalacharLore: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The Crown was built by three mages who understood something most scholars refuse to accept: the universe is not governed by order. Order is a temporary local condition. Entropy always returns." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Vareth is not evil. It is the process by which things come apart. Everything does, eventually. The mages did not destroy it — they put a lock on a process that had been running too fast, in one place, all at once." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"And when I used shard energy to study it... I was essentially tuning myself to the same frequency. Not the lock. The thing inside the lock." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"That's precisely what happened. I'm sorry I didn't find you sooner. You've been carrying that resonance for years." },
    ],
    act5KaelMalacharAside: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Why didn't you come to me? When I was young? If you were watching — why didn't you help?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I told myself it was for your protection. If Aldric's people saw me near you, they'd have identified who you were." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"But the truth is I was afraid. Afraid of what you'd think of me. Afraid you'd blame me for your father's choice to disappear. Afraid you'd blame me for the shattering." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Do you blame yourself?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Every day." },
    ],

    // ── ACT 6 — Undercity ────────────────────────────────────────
    act6Pre: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"We can't enter through the front gate — Aldric controls every checkpoint. But there's a tunnel from the old servant passages into the Undercity. A resistance community formed there after Aldric's purges." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"I know people there. Let me lead." },
    ],
    act6Post: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"The documents confirm it. Aldric has three shards. And he knows Kael has the fourth." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Every attack has been to take the shard from me. Not to stop me — to USE me." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Kael. I need to say something. The Inquisitor — his magic. It's the same as the corruption in my visions. The same as what I hear when Vareth speaks. Aldric has been using shard energy to alter people's minds. And I..." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"The corruption in me is getting worse. Every battle, the voice is louder. I might be a danger to all of you. I wanted you to know before it became a problem you couldn't prepare for." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Then we finish this before it gets worse. I'm not leaving you behind, Theron." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(quietly) Theron. I see you. Come back to us." },
    ],

    // ── ACT 6 EXTENDED — Undercity People ────────────────────────
    act6UndercityMeet: [
      { name:'Undercity Elder', color:'#667788', portrait:'none',
        text:"Lyra said you were coming. She vouched for all of you — which is the only reason you're still standing." },
      { name:'Undercity Elder', color:'#667788', portrait:'none',
        text:"Down here we have four hundred people. Families. People who had nowhere else to go when Aldric's reforms took their land, their businesses, their futures." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"I want to help change that." },
      { name:'Undercity Elder', color:'#667788', portrait:'none',
        text:"Then listen first. Help second. The people down here have been listening to people 'wanting to help' for twenty years." },
    ],
    act6PostDocuments: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Here — look at this. Aldric's schedule for the past year. Every 'quarantine' order. Every 'civic survey' — all in areas where people voted against him or organized against the food levies." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"This is systematic. This isn't negligence. This is..." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Policy. Yes. I know." },
    ],

    // ── ACT 7 — Stasis Chamber ───────────────────────────────────
    act7Pre: [
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"There — the stasis field. Aldric used one of the shards to power it. The king is suspended in time. He's alive." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Can you break it?" },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Yes. But it will take everything I have. I won't be able to heal anyone in the fight afterward." },
    ],
    act7BreakStasis: [
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(breaking the stasis) Stay back — the field will collapse inward—" },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"(gasping) ...Where... what year is it?" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"You've been asleep for a long time, Your Majesty. We're going to get you out of here." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"(looking at Kael, recognition in his eyes) ...You look exactly like your father." },
    ],
    act7Post: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"The king is with us. Whatever Aldric says in that throne room — the king is alive to contradict it." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"Aldric. I need to see him." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Not yet. First we deal with the shards." },
    ],

    // ── ACT 7 EXTENDED — The King Wakes ──────────────────────────
    act7KingExtended: [
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"Ten years. That's..." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"My son would be — my son is dead, isn't he." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"I don't know. I — I'm his son. Your nephew, actually. My father was your brother." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"(long silence) ...Aldric told me Brennan died. Years ago." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"He hid him. Your Majesty — a lot happened. We need to get you somewhere safe. Then we'll explain everything." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"(touching Kael's face) You have his nose. He always hated it. He said it made him look stubborn." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(small, surprised laugh) ...I never knew that." },
    ],

    // ── ACT 8 EXTENDED — Sera and Aldric ─────────────────────────
    act8SeraExtended: [
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"I looked for the cause for three years. After the plague in Westmarch. I thought it was water contamination. I tested every well. Every cistern. I blamed myself for not finding the source." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"..." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Her name was Mira. She learned to read at five. She was reading my herb catalogues the week before she died. She kept asking what 'efficacious' meant." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"I told her it meant 'it works.' She said that was a boring word for such a long one." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"I have a list. Every collateral casualty from the Westmarch test. Her name is on it. I made myself read it every year." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Did it help?" },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"No." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Good." },
    ],

    // ── ACT 8 EXTENDED — Kael and Aldric confrontation ───────────
    act8KaelAldricExtended: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Why didn't you just kill us? When you had the chance. After Selvara. After the vault." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"Because you're Brennan's son. And I owed Brennan a debt." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"What debt?" },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"The night I moved on the king — Brennan found out two days before. He came to me. Alone. Without weapons." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"He said: 'I know what you're about to do. I think you're wrong. But I also know why you believe it. So I'm going to disappear, and you're going to leave my son alone, and we're going to pretend this conversation never happened.'" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"He knew." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"He knew. He chose a quiet life to protect you. And in return I kept my word. I let you grow up without becoming one of my assets." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(quietly furious) That's not mercy. That's ownership." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"(pause) ...Yes. I suppose it is." },
    ],

    // ── ACT 8 — Aldric speech ────────────────────────────────────
    act8Speech: [
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"(through a closed door, calm) Let me tell you what a king actually does. A king makes decisions that kill people. He chooses who starves so others eat. He sends men to die so borders hold." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"I have been making those decisions for ten years. You — you think heroism means finding the right enemy and stabbing him. That's not governance. That's a tantrum." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"I needed Vareth's power to END the civil war. A hundred thousand people died in ten years of chaos. Vareth's power would have let me unite the kingdom by force. A thousand deaths to end a hundred thousand. Tell me that math is wrong." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"You poisoned entire villages." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"I quarantined rebellions before they became massacres. Every man I executed would have led a faction that killed ten times his number." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"You killed my daughter." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"...The plague in Westmarch. Twelve years ago." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"She was seven." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"...That was the first test. I didn't know it would spread to civilians. I've lived with that. It's why I refined it." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"You REFINED it." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"Yes." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Then there is nothing more to say." },
    ],
    act8Post: [
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"(bleeding, laughing softly) You think I carry the shards on my person? Please." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Where are they." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"They're already assembled. In the vault below. The final shard — your shard, Kael — I don't need it. I found a substitute. A lesser binding. But... enough." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"Vareth is already waking." },
    ],

    // ── ACT 9 EXTENDED — Vault environment lore ──────────────────
    act9VaultLore: [
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"(looking around the vault) The inscriptions on these walls — they're not Valdris-era. They're older. Much older." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The vault predates the kingdom. The founders built around it because no one knew how to move it. The Crown was forged here specifically because the resonance from the vault dampens Vareth's awareness." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Dampens. As in — it can hear through the seal?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Vareth isn't a creature. It doesn't have ears. But if something disturbs the seal, it... orients. Like a sleeper shifting toward a sound. The vault kept it still." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"And Aldric's substitute shard was the wrong kind of disturbance." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"It's the wrong note in the chord. Feels almost right. Which is worse than being obviously wrong. Vareth keeps trying to adjust to it. Every adjustment crracks the seal a little more." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Can we just remove the substitute before he finishes the binding?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"We could. But then there's a shard-shaped hole in the seal and nothing in it. You have perhaps four minutes before Vareth fully orients." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"(doing the math in his head) Four minutes." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Give or take. The Crown's real shard needs to be seated in that time. Which is why I need Kael's shard. Which is why I've needed it from the beginning." },
    ],

    // ── ACT 9 EXTENDED — Party moment before the final vault ─────
    act9PartyMoment: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(quiet, to Kael) If this goes badly—" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"It won't." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"You don't know that." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"I know we've survived everything so far. Bandits, corrupted spirits, the entire Inquisition, a Shadow Master who vanished before he fell, a man with a century of plans. We're still here." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"(not looking up from his notes) He makes a reasonably strong statistical argument." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(to Theron) Don't tell me you're also reviewing your notes before the apocalyptic final battle." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"I'm noting the vault's architectural resonance patterns in case I need to improvise a counter-frequency. It's entirely practical." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(small smile) Of course it is." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"...Whatever happens next — I'm glad it was you three." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(simply) Yes." },
    ],

    // ── ACT 9 — Vault, Malachar's warning ────────────────────────
    act9Pre: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The vault is cracking. I've been trying to contain it but the substitute shard Aldric used — it's degrading the seal faster than I can patch it." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"What do we do?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Hold back what bleeds through while I work. And if the choice comes — choose carefully." },
    ],
    act9TheronChoice: [
      { name:'Vareth', color:'#cc44ff', portrait:'none',
        text:"...Theron. Yessss. I know your name. I know your shame. The forest. The spirits you hurt. Let me in. I can give you clarity. Power. Purpose. All you've ever wanted to be, I can MAKE you." },
      { name:'CHOICE', color:'#ffff88', portrait:'none', isChoice:true,
        text:"Theron hesitates. The voice is overwhelming. Accept Vareth's power?",
        choices:['RESIST — \"Get out of my head.\"', 'ACCEPT — \"...Just this once.\"'],
        choiceId:'varethChoice' },
    ],
    act9AcceptVareth: [
      { name:'Theron', color:'#cc44ff', portrait:'theron',  // corrupted color
        text:"(in a doubled voice) ...I — WE — will end this. Together." },
    ],
    act9ResistVareth: [
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"No. I know what you are. I know what you do to people. GET OUT." },
    ],
    act9Post: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The Crown needs a Keeper. Someone of the bloodline must hold the shards and reinforce the seal. It needs to be you, Kael." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"What does that mean? What happens to me?" },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Answer him." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The Keeper fuses with the Crown. Not physically — but they carry it. Always. It's why the old king gave it to me willingly. It meant never leading a normal life. Being bound to the duty." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"There has to be another way." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"There might be. If Kael's shard could replace Aldric's substitute, the seal would reform naturally — no permanent Keeper needed. But removing the substitute shard could..." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Could what?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"...Detonate. In a manner of speaking." },
    ],

    // ── ACT 10 — The Choice ──────────────────────────────────────
    act10Conversations: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"Whatever you decide — it's your decision. Not your bloodline's. Not your father's. Yours, Kael." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"I almost let Vareth in. Right there in the fight. The worst part is... for one second... it felt like it would solve everything. Don't let anyone make you feel like there's only one path." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"Malachar carried this for forty years. Look at what it cost him. I'm not saying don't do it. I'm saying look at him first, and mean it when you choose." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I watched you your whole life. From afar. I was too afraid to reach out. I should have found a way. I'm sorry. Whatever you choose — I'm proud of what you became." },
      { name:'CHOICE', color:'#ffff88', portrait:'none', isChoice:true,
        text:"The Crown pulses before you. Two paths remain.",
        choices:['Become the Keeper. Carry it forever.', 'Attempt the shard swap. Together.'],
        choiceId:'finalChoice' },
    ],
    act10PathA: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(stepping forward) I'll carry it. I'll be the Keeper." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"Kael—" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"My father chose a quiet life because he was afraid of what he'd become with power. I'm choosing this because it's what needs doing. That's different." },
    ],
    act10PathAResult: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(after the light fades, touching his eyes) ...I can feel it. Like a heartbeat that isn't mine. Is it always going to be this loud?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(a smile) You'll get used to it." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(taking his hand, saying nothing)" },
    ],
    act10PathBSuccess: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(laughing, exhausted disbelief) It... it actually worked. The seal formed without a Keeper." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"(looking at his hands) The voice is gone. Vareth is... just gone." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"It's over." },
    ],
    act10Convergence: [
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"(crawling into the chamber, wounded, looking at the sealed Crown) ...It's really over?" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"It's over." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"(sitting heavily against the wall, looking ancient) ...Good. I think I forgot, somewhere along the way, that I actually wanted this to end." },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"I'll come quietly." },
      { name:'King Valdris', color:'#ffcc55', portrait:'none',
        text:"(on a stretcher, looking at Aldric) Why?" },
      { name:'Lord Aldric', color:'#8833aa', portrait:'aldric',
        text:"Because you were too good at being king and too bad at everything else. And someone had to be bad at being king so you could be good at the rest." },
    ],

    // ── ACT 10 EXTENDED — After the sealing ──────────────────────
    // ── ACT 10 EXTENDED — Malachar's reflection ──────────────────
    act10MalacharReflect: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I've been the Keeper for forty-seven years. I was twenty-three when it came to me. I thought it would be temporary." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"How long before you accepted it wasn't?" },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I'm still not sure I have." },
    ],

    act10AfterSeal: [
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(looking at where the Crown was) It's quiet." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"The vault will need to be re-inscribed. The old wards disrupted. It'll take months." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"I'll help. When you're ready." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(surprised) ...You'd come back to the vault?" },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"Someone has to understand this place well enough to protect it. It might as well be someone who also nearly destroyed it. That feels appropriately ironic." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"What about the Undercity? Four hundred people live down there. The surface changes they don't control." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"When the king is stable — I'll make sure they have a formal recognition. Land rights. Voice in the council." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"They won't want to come up. They've built something that works." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Then they won't have to. But they should have the option." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(quietly) There's a girl down there. Seven or eight. She asked me if the fighting was done. I told her I thought so. She nodded very seriously and went back to her lessons." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"That's the thing about children. They don't wait for the world to be fixed. They just keep going." },
    ],

    // ── ACT 11 — Aftermath ───────────────────────────────────────
    act11Theron: [
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"I'm writing a new theory. I want to establish a school of shard studies — understand the Crown's energy so no one can ever exploit it again. Knowledge contained is knowledge weaponized." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"...I almost said yes to Vareth. I need you to know that." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"I know." },
      { name:'Theron', color:'#ff4444', portrait:'theron',
        text:"...Thank you for not making it a bigger moment." },
    ],
    act11Lyra: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"My brother didn't just die in the war. He died in a battle I directed for the resistance. I sent him into a trap by accident. I've been running ever since." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"You're the first thing in years I've stopped running toward instead of away from." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(they watch the sunrise. He doesn't tell her it's okay. She doesn't ask him to.)" },
    ],
    act11Sera: [
      { name:'', color:'#888888', portrait:'none',
        text:"(Sera visits Aldric's cell alone. We don't see what's said.)" },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(coming out, having been crying) I still hate you. But I understand you now. I wish I didn't." },
      { name:'Sera', color:'#ffdd44', portrait:'sera',
        text:"(she presses her locket, looks at the sky, and keeps walking)" },
    ],
    act11Malachar: [
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"I'm leaving. My work here is done. There are other things in the world that need tending to." },
      { name:'Malachar', color:'#8844cc', portrait:'malachar',
        text:"(handing Kael a letter) He wrote this the day he left you with the elder. He asked me to give it to you if things ended the way they needed to." },
    ],
    act11Letter: [
      { name:"Kael's Father (letter)", color:'#aaccff', portrait:'none',
        text:"Son, If you're reading this, the fires came. I hope someone good found you. I was a prince who chose a village. A warrior who chose peace. A man given power who chose to give it away, because I was afraid of what I'd become." },
      { name:"Kael's Father (letter)", color:'#aaccff', portrait:'none',
        text:"I don't know if that makes me wise or a coward. Probably both. You carry our blood. Use it better than I did. I love you. Find something worth protecting and protect it. — Your father." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"(folds the letter. Looks out over Valdris.)" },
    ],

    // ── ACT 12 — Epilogue ────────────────────────────────────────
    epilogueNarration: [
      "The civil war's casualties were finally counted.",
      "Aldric's estimates had not been far off.",
      "Nobody knew what to do with that.",
      "",
      "Lord Aldric stood trial.",
      "Letters came from across the kingdom — some condemning him,",
      "some, disturbingly, defending him.",
      "He was imprisoned. He never asked to be freed.",
      "",
      "Theron returned to Mirewood Forest.",
      "He spent five years healing the corruption he had caused.",
      "Then he built a school there, in the clearings where the spirits danced.",
      "He called it the Institute of Shard Studies.",
      "Students came from everywhere.",
      "",
      "Sera established the first free healing house in Castle Town,",
      "open to anyone regardless of station.",
      "She never spoke publicly about Aldric or what she said to him in that cell.",
      "Whatever it was, she kept walking after.",
      "",
      "The King recovered. He formally recognized Kael's lineage.",
      "\"What you do with that,\" he said, \"is entirely your choice.\"",
      "Kael turned down the throne three times.",
      "On the fourth time, the people stopped asking.",
      "",
      "Malachar was never seen again.",
      "But in the deep places — old forests, mountain peaks —",
      "travelers sometimes found stone pillars carved with runes they couldn't read.",
      "",
      "The Crown slept.",
      "Vareth dreamed.",
      "",
      "And Valdris, for the first time in ten years...",
      "",
      "...breathed.",
    ],
    epilogueFinal: [
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"(catching up to Kael on the road) Where are you going?" },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Somewhere there's work to do." },
      { name:'Lyra', color:'#bb55ff', portrait:'lyra',
        text:"There's work everywhere." },
      { name:'Kael', color:'#4488ff', portrait:'kael',
        text:"Exactly." },
    ],

    // ── LORE: In-world codex entries (displayed on some loading pauses / NPC tips) ─
    loreEntries: [
      "The Starlight Crown was forged by three mages in the Valdris founding era to contain a being they called Vareth — meaning 'the great unmaking' in the old tongue.",
      "Vareth is not malevolent in the human sense. It does not hate. It simply unravels. Order, pattern, meaning — these are aberrations to it. It was dreaming when imprisoned, and has been dreaming ever since.",
      "The Crown's four shard configuration is not accidental. Each shard reinforces a different aspect of the seal: one seals memory, one seals form, one seals will, one seals voice. Removing any one causes partial bleed-through.",
      "Malachar served three kings as Crown Keeper. He has watched the kingdom change for over a hundred years, though he does not discuss this. His apparent age fluctuates depending on how much of the Crown's energy he is channeling.",
      "Lyra's network predates her involvement. It was established by a collective of city scouts and traders who noticed patterns of civilian disappearances correlating with Aldric's administrative decisions — years before anyone was willing to say it aloud.",
      "Sera's healing method is unusual for the era: she uses empirical observation rather than incantation. She documented it in a manuscript that Aldric's inquisitors burned. She remembered every line of it.",
      "Theron's corruption began the night he tried to replicate shard energy in a controlled environment. What he created was not shard energy — it was a resonance frequency that Vareth's dreaming mind could follow back.",
      "The city of Selvara was built by traders who refused to pledge fealty to any single kingdom. Its mask custom originated as a privacy protection for merchants conducting sensitive negotiations. It became tradition.",
      "Lord Aldric's civil war projections were not fabricated. The documents are real. The death toll estimates he used to justify his actions are accurate. This is precisely why no one knows what to do with him.",
      "King Valdris spent his stasis period dreaming of the same moment: the night Aldric's hand moved. He has replayed it thousands of times. He says he can now see five other moments he could have acted differently. He doesn't know if that makes it better or worse.",
      "The Undercity beneath the castle was originally a cistern network. Refugees expanded it over three generations into a community of roughly four hundred people. They have their own governance, their own food stores, and no particular loyalty to whoever happens to control the surface.",
      "Vareth's fragmentary communications — the visions and voices experienced by those near the shards — are not coherent attempts at manipulation. They are echoes of its dreaming state leaking through cracks in the seal. It is, in a sense, sleeptalking.",
      "The four founding mages who imprisoned Vareth did not survive the process. Their names were Aldra, Venn, Sorath, and Mira. It is noted in no official record that Malachar was a fifth presence who arrived too late to help — and who has been trying to atone ever since.",
      "Kael's shard is different from the others. The other three were cut from a single crystal in the Vault depths. Kael's was carved from stone taken from the grave of the first Keeper. This is why it functions as a binding anchor rather than a structural piece.",
      "The mask tradition in Selvara has a darker history than most locals acknowledge. During the purge of the city's original governing council three generations ago, survivors donned masks to avoid recognition. What began as survival became custom, then culture.",
      "Aldric's inquisition tools included not only the Vareth-infused memory devices Theron identified, but an earlier generation of mundane instruments: written transcripts, paid informants, border checkpoints that tracked movement down to individuals. The magical tools came later, when the mundane ones proved insufficient.",
      "The road between Castle Town and Selvara is called the Trader's Spine. It was paved by Valdris settlers over a much older path worn by creatures that predate the kingdom. In wet seasons, the older trail sometimes surfaces through the newer stone. Rangers call this 'the old road breathing.'",
      "Kael was raised in a village called Ashhollow by an elder named Brennan — though the elder's true identity is now known. The village was chosen for its remoteness. It has no inn, no market, and appears on no official map of the kingdom. This was intentional.",
      "Sera's medicinal approach documented twelve previously unnamed plants in her burned manuscript. She subsequently memorized every page before fleeing Westmarch. Three of her documented plants have since been independently identified by healers in the eastern provinces. They named them after different things.",
    ],

    // ── EXTRA: Post-battle flavor commentary ─────────────────────
    battleCommentary: {
      battle1_win:  ["(Kael stands over the fallen bandits, breathing hard. He looks at the shard. It hums faintly — almost relieved.)"],
      battle2_win:  ["(The spirits dissipate. Theron kneels by one. It looks almost peaceful now.)",
                     "(Kael touches his shard. The vision-flash comes again — his father, younger, afraid. But also determined.)"],
      battle3_win:  ["(Sera collapses against the wall. Kael steadies her. 'Are you alright?' She laughs, exhausted. 'Define alright.')"],
      battle4_win:  ["(Lyra retrieves the Maskmaker's goods methodically. 'Everything's here.' She doesn't sound surprised.)",
                     "(The Maskmaker's masked contact nods once. 'The map you need is in the second crate. Bottom layer.')"],
      battle5_win:  ["(The Shadow Master is gone — vanished before he fell. Just a calling card with a black sun symbol.)",
                     "('Aldric's personal network,' Lyra says. 'Not city guard. Not inquisition. His.')"],
      battle6_win:  ["(Theron examines the inquisitor's instruments. His expression goes very still.)",
                     "('This is Vareth-energy,' he says. 'Used to overwrite memory. This is what they were doing to people.')"],
      battle7_win:  ["(The king's chamber is cool and pale. The stasis field crackles and dies.)",
                     "(Kael looks at the man in the pod. Looks at his own hands. Looks back.)"],
      battle8_win:  ["(Aldric doesn't seem angry. Just... tired. 'Tell me,' he says. 'What exactly do you do next?')"],
      battle9_win:  ["(The vault stops shaking. Malachar wipes blood from his hands — not his own. 'That's the third crack today.')"],
      battleGuardians_win: ["(The guardians bow — damaged but intact. Malachar looks pained. 'I'll fix them. I promise.')"],
      battle10b_win: ["(The last shard of Vareth disperses like smoke. Silence rushes in to fill the space.)",
                      "(Nobody says anything for a long time.)"],
    },

    // ── EXTRA: Character personal backstory fragments ─────────────
    backstoryFragments: {
      kael: [
        "Kael learned to fight from a wandering sellsword named Dast who passed through Ashhollow one winter. Dast charged nothing, ate their food for a week, and left him with a half-broken practice sword and the words: 'Don't look where you want to hit. Look where they don't want you to.'",
        "He spent two years as a road warden before the shard visions began. He was good at the work. He liked the straightforward nature of it: someone needed to cross a road, and he made sure they could.",
        "The first time the shard spoke to him, he thought he was having a fever dream. He nearly sold it to a trader in Selvara. The trader's hands went white when he touched it and he refused to complete the sale.",
      ],
      lyra: [
        "Lyra's network name was never 'Lyra.' Her handlers knew her as 'Cress' — a common herb found everywhere, notable for nothing, impossible to track because you don't think to. She chose it herself.",
        "She has no formal intelligence training. Everything she knows she taught herself from books stolen from the inquisition's own administrative library, which she accessed twice by posing as a records clerk.",
        "After her brother's death, she shut down entirely for three months. Her network ran itself. When she came back, she was better at every part of it. She does not think this is a good thing.",
      ],
      theron: [
        "Theron was enrolled in the Academy of Selvara at eleven and expelled at sixteen for conducting unsanctioned experiments on shard residue. He spent the next decade as a traveling theorist, unwelcome in most academic circles and invaluable to all of them.",
        "The voice he hears is not always Vareth. Sometimes it is simply the part of him that wants to take the faster, worse answer. He has learned to tell them apart, mostly.",
        "He keeps a journal. Every page after the forest incident is written in a different handwriting — smaller, more cramped, more controlled. He says it helps him think.",
      ],
      sera: [
        "Sera ran a healing house in Westmarch for eight years. She treated six hundred patients. After Mira died, she treated four hundred more before leaving. She left the building to her apprentice and never looked back.",
        "Her faith in the light is practical: it works. She can measure it, apply it, dose it. She distrusts anyone who treats belief as a substitute for observation.",
        "She joined this venture because a dying man in the road told her the name 'Valdris' and then said 'don't let them finish it.' She never found out who he was. She kept going because she had no better leads and the alternative was pretending she hadn't heard him.",
      ],
    },

    // ── EXTRA: Location flavor descriptions ─────────────────────
    locationFlavor: {
      castleTown:   "The capital has the feeling of a held breath. Everything functions. Nobody talks about why.",
      selvaraCity:  "In Selvara, your face is a choice. What you show and what you hide are both deliberate.",
      mirewoodForest: "The forest remembers. You can feel it — a heaviness, like being watched by something that doesn't blink.",
      mountainPass: "The wind here carries sound from far away. Travelers report hearing names spoken that no one nearby could know.",
      ancientVault: "The air in the vault is colder than it should be. Sound behaves strangely. Your own footsteps come back wrong.",
      undercity:    "Four hundred people built a life down here, below the politics. They have opinions about what's happening above. They mostly choose not to share them.",
      observatory:  "The astronomer who built this left no notes. Only star charts, and one phrase scratched into the lens housing: 'It comes from outside.'",
      ashhollow:    "Kael's village. Not on any map. The people here have a practice of not answering questions about where they came from. It's considered polite.",
      tradersSpine: "The road is safe in daylight. The bandits who work it at night are, ironically, the same ones who keep the road clear of worse things.",
      westmarch:    "The Westmarch plague site is still quarantined, officially. Unofficially, travelers pass through it all the time. Nothing lingers. That's almost worse.",
      ruinedBridge: "The bridge at the kingdom's edge collapsed twelve years ago. Both sides claim the other broke it. Neither side has rebuilt it. Trade flows around the gap like water around stone.",
    },

    // ── EXTRA: Character-specific battle quips ───────────────────
    battleQuips: {
      kael: [
        "Come on then.",
        "This ends here.",
        "I don't want to hurt you. But I will.",
        "(grits teeth) Not today.",
        "Move — or be moved.",
      ],
      lyra: [
        "Amateurs.",
        "(already behind them) Hi.",
        "Three opponents. Give me a moment.",
        "Did you really think that would work?",
        "I've been in worse odds. This is practically a vacation.",
      ],
      theron: [
        "Please don't make me do this.",
        "The mathematics of this are not in your favor.",
        "(adjusting glasses) Interesting. Now burn.",
        "I know what you're made of. Mostly water and poor decisions.",
        "...There's that voice again. Focus, Theron. Focus.",
      ],
      sera: [
        "Healing people. Hurting people. Different day, same principle.",
        "I have been through worse. You are not worse.",
        "I will patch everyone up afterward. Including you, probably.",
        "The light is not gentle today.",
        "(quietly) My daughter would have hated this fight. She hated violence. So do I. That's why I'm good at stopping it.",
      ],
    },
  };

  // ── Helper: build a character from template + equipment ──────
  function makeChar(tmpl) {
    const c = {
      name: tmpl.name,
      class: tmpl.class,
      color: tmpl.color,
      portrait: tmpl.portrait,
      baseMaxHp: tmpl.baseMaxHp || tmpl.maxHp,
      baseMaxMp: tmpl.baseMaxMp || tmpl.maxMp,
      baseAtk: tmpl.baseAtk || tmpl.atk,
      baseDef: tmpl.baseDef || tmpl.def,
      baseMag: tmpl.baseMag || tmpl.mag,
      baseSPD: tmpl.baseSPD || tmpl.spd,
      maxHp: tmpl.maxHp || tmpl.baseMaxHp,
      maxMp: tmpl.maxMp || tmpl.baseMaxMp,
      atk: tmpl.atk || tmpl.baseAtk,
      def: tmpl.def || tmpl.baseDef,
      mag: tmpl.mag || tmpl.baseMag,
      spd: tmpl.spd || tmpl.baseSPD,
      luck: tmpl.luck || 5,
      move: tmpl.move || 3,
      hp: tmpl.maxHp || tmpl.baseMaxHp,
      mp: tmpl.maxMp || tmpl.baseMaxMp,
      exp: 0,
      level: 1,
      skills: tmpl.skills ? tmpl.skills.slice() : [],
      ct: 0,
      dead: false,
      buffs: [],
      statusEffects: [],
      shieldActive: false,
      shieldPct: 0,
      barrierActive: false,
      doubleNextAtk: false,
      isGuarding: false,
      guardTarget: null,
      evasionBonus: 0,
      evasionTurns: 0,
      col: 0, row: 0,
      isPlayer: true,
      equipment: { weapon: null, armor: null, accessory: null },
    };
    return c;
  }

  function applyEquipment(char, equipSlots) {
    // Reset to base stats
    char.maxHp  = char.baseMaxHp;
    char.maxMp  = char.baseMaxMp;
    char.atk    = char.baseAtk;
    char.def    = char.baseDef;
    char.mag    = char.baseMag;
    char.spd    = char.baseSPD;
    // Apply each slot
    for (const slot of ['weapon','armor','accessory']) {
      const key = equipSlots ? equipSlots[slot] : null;
      if (!key) continue;
      const eq = EQUIPMENT[key];
      if (!eq) continue;
      if (eq.atk)   char.atk   += eq.atk;
      if (eq.def)   char.def   += eq.def;
      if (eq.mag)   char.mag   += eq.mag;
      if (eq.spd)   char.spd   += eq.spd;
      if (eq.maxHp) char.maxHp += eq.maxHp;
      if (eq.maxMp) char.maxMp += eq.maxMp;
      if (eq.luck)  char.luck  += eq.luck;
    }
    // Clamp HP/MP
    char.hp = Math.min(char.hp, char.maxHp);
    char.mp = Math.min(char.mp, char.maxMp);
  }

  // XP to level: level * 100 XP needed (100 at lv1, 200 at lv2, etc.)
  // Each level grants a skill unlock if defined in LEVEL_SKILL_UNLOCKS.
  function expForLevel(lvl) { return lvl * 100; }

  return {
    WORLD_MAP, TILE_COLORS, TILE_WALKABLE,
    LOCATIONS, NPCS, CHESTS,
    EQUIPMENT, SKILLS,
    CHAR_TEMPLATES, ENEMY_TEMPLATES,
    BATTLES, STORY, BATTLE_EXP, LEVEL_SKILL_UNLOCKS,
    makeChar, applyEquipment, expForLevel,
  };

})();
