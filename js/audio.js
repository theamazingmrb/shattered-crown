// ============================================================
// audio.js  —  Web Audio API music engine + sound effects
//              No external files needed — 100% procedural
// ============================================================

const AUDIO = (() => {
  let ctx         = null;
  let masterGain  = null;
  let musicGain   = null;
  let sfxGain     = null;
  let reverbGain  = null;
  let currentTrack = null;
  let loopTimer    = null;
  let musicEnabled = true;
  let sfxEnabled   = true;

  // ── Note frequency table ───────────────────────────────────
  const N = {
    B1:61.74, C2:65.41, Db2:69.30, D2:73.42, Eb2:77.78, E2:82.41,
    F2:87.31, Gb2:92.50, G2:98.00, Ab2:103.83, A2:110.00, Bb2:116.54, B2:123.47,
    C3:130.81, Db3:138.59, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61,
    Gb3:185.00, G3:196.00, Ab3:207.65, A3:220.00, Bb3:233.08, B3:246.94,
    C4:261.63, Db4:277.18, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23,
    Gb4:369.99, G4:392.00, Ab4:415.30, A4:440.00, Bb4:466.16, B4:493.88,
    C5:523.25, Db5:554.37, D5:587.33, Eb5:622.25, E5:659.25, F5:698.46,
    Gb5:739.99, G5:783.99, Ab5:830.61, A5:880.00, Bb5:932.33, B5:987.77,
    C6:1046.50,
    R: 0,
  };

  // ── Init ───────────────────────────────────────────────────
  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }

    masterGain = ctx.createGain(); masterGain.gain.value = 0.8;
    musicGain  = ctx.createGain(); musicGain.gain.value  = 0;
    sfxGain    = ctx.createGain(); sfxGain.gain.value    = 0.6;

    // Simple reverb via convolution
    const revConv = buildReverb(1.6, 2.2);
    reverbGain = ctx.createGain(); reverbGain.gain.value = 0.18;
    if (revConv) { musicGain.connect(revConv); revConv.connect(reverbGain); reverbGain.connect(masterGain); }

    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }

  function buildReverb(dur, decay) {
    if (!ctx) return null;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++)
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      const conv = ctx.createConvolver();
      conv.buffer = buf;
      return conv;
    } catch (e) { return null; }
  }

  function ensureCtx() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Low-level note player ──────────────────────────────────
  function playNote(freq, dur, vol, wave, startTime, dest) {
    if (!ctx || freq <= 0 || vol <= 0) return;
    const t    = startTime !== null ? startTime : ctx.currentTime + 0.01;
    const g    = ctx.createGain();
    const osc  = ctx.createOscillator();
    osc.type   = wave || 'sine';
    osc.frequency.setValueAtTime(freq, t);

    const atk  = Math.min(0.025, dur * 0.1);
    const rel  = Math.min(0.12,  dur * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    if (dur - atk - rel > 0)
      g.gain.setValueAtTime(vol * 0.75, t + dur - rel);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Schedule one layer of a music track; return total duration in seconds
  function scheduleLayer(notes, bpm, wave, baseVol, startTime) {
    const beat = 60 / bpm;
    let t = startTime;
    for (const n of notes) {
      const freq = n[0], beats = n[1];
      const vol  = n[2] !== undefined ? n[2] : baseVol;
      const w    = n[3] || wave;
      if (freq > 0) playNote(freq, beats * beat * 0.88, vol, w, t, musicGain);
      t += beats * beat;
    }
    return t - startTime;
  }

  // ── Music track definitions ────────────────────────────────
  const TRACKS = {};

  // ──── TITLE: "Before the Crown" — A minor, 68 BPM ────────
  TRACKS.title = {
    bpm: 68,
    layers: [
      // Slow haunting melody
      { wave:'sine', vol:0.26, notes:[
        [N.E4,2],[N.R,0.5],[N.D4,1.5],[N.C4,2],[N.R,2],
        [N.B3,3],[N.R,1],[N.C4,2],[N.R,0.5],[N.A3,1.5],
        [N.C4,2],[N.R,2],[N.A3,3],[N.R,1],
        [N.G3,2],[N.R,0.5],[N.A3,1.5],[N.B3,2],[N.R,2],
        [N.E4,3],[N.R,1],[N.D4,2],[N.R,0.5],
        [N.C4,1.5],[N.E4,2],[N.R,2],[N.A3,4],
      ]},
      // Arpeggiated chords: Am F C Em
      { wave:'triangle', vol:0.10, notes:[
        [N.A3,0.5],[N.C4,0.5],[N.E4,0.5],[N.A4,0.5],[N.E4,0.5],[N.C4,0.5],[N.A3,0.5],[N.C4,0.5],
        [N.F3,0.5],[N.A3,0.5],[N.C4,0.5],[N.F4,0.5],[N.C4,0.5],[N.A3,0.5],[N.F3,0.5],[N.A3,0.5],
        [N.C3,0.5],[N.E3,0.5],[N.G3,0.5],[N.C4,0.5],[N.G3,0.5],[N.E3,0.5],[N.C3,0.5],[N.E3,0.5],
        [N.E3,0.5],[N.G3,0.5],[N.B3,0.5],[N.E4,0.5],[N.B3,0.5],[N.G3,0.5],[N.E3,0.5],[N.G3,0.5],
        [N.A3,0.5],[N.C4,0.5],[N.E4,0.5],[N.A4,0.5],[N.E4,0.5],[N.C4,0.5],[N.A3,0.5],[N.C4,0.5],
        [N.F3,0.5],[N.A3,0.5],[N.C4,0.5],[N.F4,0.5],[N.C4,0.5],[N.A3,0.5],[N.F3,0.5],[N.A3,0.5],
        [N.C3,0.5],[N.E3,0.5],[N.G3,0.5],[N.C4,0.5],[N.G3,0.5],[N.E3,0.5],[N.C3,0.5],[N.E3,0.5],
        [N.E3,0.5],[N.G3,0.5],[N.B3,0.5],[N.E4,0.5],[N.B3,0.5],[N.G3,0.5],[N.E3,0.5],[N.G3,0.5],
      ]},
      // Deep warm bass
      { wave:'sine', vol:0.16, notes:[
        [N.A2,4],[N.R,4],[N.F2,4],[N.R,4],
        [N.C2,4],[N.R,4],[N.E2,4],[N.R,4],
        [N.A2,4],[N.R,4],[N.F2,4],[N.R,4],
        [N.C2,2],[N.E2,2],[N.A2,4],
      ]},
    ],
  };

  // ──── WORLD: "Wanderer's Road" — G major, 95 BPM ─────────
  TRACKS.world = {
    bpm: 95,
    layers: [
      // Main hopeful melody
      { wave:'triangle', vol:0.20, notes:[
        [N.G4,0.5],[N.A4,0.5],[N.B4,1],[N.D5,0.5],[N.R,0.5],[N.B4,0.5],[N.A4,0.5],[N.G4,2],
        [N.E4,0.5],[N.G4,0.5],[N.A4,1],[N.C5,0.5],[N.R,0.5],[N.A4,0.5],[N.G4,0.5],[N.E4,2],
        [N.D4,0.5],[N.E4,0.5],[N.G4,1],[N.A4,0.5],[N.G4,0.5],[N.E4,0.5],[N.D4,0.5],[N.B3,2],
        [N.G3,0.5],[N.A3,0.5],[N.B3,1],[N.D4,0.5],[N.G4,0.5],[N.D4,0.5],[N.B3,0.5],[N.G3,2],
        [N.G4,0.5],[N.B4,0.5],[N.D5,1],[N.G5,0.5],[N.R,0.5],[N.D5,0.5],[N.B4,0.5],[N.G4,2],
        [N.E4,0.5],[N.A4,0.5],[N.C5,1],[N.E5,0.5],[N.R,0.5],[N.C5,0.5],[N.A4,0.5],[N.E4,2],
        [N.D4,0.5],[N.G4,0.5],[N.B4,1],[N.D5,0.5],[N.B4,0.5],[N.G4,0.5],[N.D4,0.5],[N.G3,3],[N.R,1],
      ]},
      // Walking bass
      { wave:'triangle', vol:0.18, notes:[
        [N.G2,1],[N.B2,1],[N.D3,1],[N.G3,1],
        [N.E2,1],[N.G2,1],[N.B2,1],[N.E3,1],
        [N.D2,1],[N.Gb2,1],[N.A2,1],[N.D3,1],
        [N.G2,1],[N.D2,1],[N.G2,1],[N.D2,1],
        [N.G2,1],[N.B2,1],[N.D3,1],[N.G3,1],
        [N.C2,1],[N.E2,1],[N.G2,1],[N.C3,1],
        [N.D2,1],[N.Gb2,1],[N.A2,1],[N.G2,4],
      ]},
      // Counter melody (harmony)
      { wave:'sine', vol:0.10, notes:[
        [N.D4,2],[N.R,2],[N.C4,2],[N.R,2],
        [N.B3,2],[N.R,2],[N.A3,2],[N.R,2],
        [N.G3,2],[N.R,2],[N.Gb3,2],[N.R,2],
        [N.G3,4],[N.R,4],
        [N.B4,2],[N.R,2],[N.A4,2],[N.R,2],
        [N.G4,2],[N.R,2],[N.E4,2],[N.R,2],
        [N.D4,2],[N.G3,2],[N.D4,4],
      ]},
    ],
  };

  // ──── BATTLE: "Edge of Ruin" — D minor, 150 BPM ──────────
  TRACKS.battle = {
    bpm: 150,
    layers: [
      // Driving sawtooth melody
      { wave:'sawtooth', vol:0.15, notes:[
        [N.D4,0.5],[N.F4,0.5],[N.A4,0.5],[N.R,0.25],[N.A4,0.25],[N.F4,0.5],[N.D4,0.5],[N.R,0.5],
        [N.C4,0.5],[N.Eb4,0.5],[N.G4,0.5],[N.R,0.25],[N.G4,0.25],[N.Eb4,0.5],[N.C4,0.5],[N.R,0.5],
        [N.Bb3,0.5],[N.D4,0.5],[N.F4,0.5],[N.R,0.25],[N.F4,0.25],[N.D4,0.5],[N.Bb3,0.5],[N.R,0.5],
        [N.A3,0.5],[N.C4,0.5],[N.D4,0.5],[N.F4,0.5],[N.A4,0.5],[N.D4,0.5],[N.A3,1],
        [N.D4,0.5],[N.F4,0.25],[N.G4,0.25],[N.A4,0.5],[N.R,0.5],[N.C5,0.5],[N.A4,0.25],[N.G4,0.25],[N.F4,1],
        [N.E4,0.5],[N.G4,0.5],[N.C5,0.5],[N.R,0.5],[N.Bb4,0.5],[N.G4,0.5],[N.E4,1],
        [N.F4,0.5],[N.A4,0.5],[N.C5,0.5],[N.R,0.5],[N.C5,0.5],[N.A4,0.5],[N.F4,1],
        [N.E4,0.5],[N.G4,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.G4,0.5],[N.F4,0.5],[N.D4,2],
      ]},
      // Aggressive bass pattern
      { wave:'sawtooth', vol:0.22, notes:[
        [N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],
        [N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],
        [N.Bb1,0.25],[N.R,0.25],[N.Bb1,0.25],[N.R,0.25],[N.Bb1,0.25],[N.R,0.25],[N.Bb1,0.25],[N.R,0.25],
        [N.A1,0.5],[N.R,0.25],[N.A1,0.25],[N.D2,0.5],[N.R,0.25],[N.A1,0.25],
        [N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],[N.D2,0.25],[N.R,0.25],
        [N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],
        [N.F2,0.25],[N.R,0.25],[N.F2,0.25],[N.R,0.25],[N.F2,0.25],[N.R,0.25],[N.F2,0.25],[N.R,0.25],
        [N.E2,0.5],[N.R,0.25],[N.D2,0.25],[N.A1,0.5],[N.R,0.5],
      ]},
      // Kick pulse (low sine)
      { wave:'sine', vol:0.30, notes:[
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[55,0.12,0.28],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.38],[60,0.10,0.24],[N.R,0.40],
        [60,0.12,0.38],[N.R,0.25],[55,0.12,0.28],[N.R,0.25],
      ]},
      // Snare (hi square buzz)
      { wave:'square', vol:0.03, notes:[
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
        [N.R,1],[N.A5,0.10,0.05],[N.R,0.90],
      ]},
    ],
  };

  // ──── BOSS: "God of Chains" — B minor, 170 BPM ───────────
  TRACKS.boss = {
    bpm: 170,
    layers: [
      // Menacing chromatic lead
      { wave:'sawtooth', vol:0.17, notes:[
        [N.B3,0.25],[N.R,0.25],[N.B3,0.5],[N.C4,0.25],[N.B3,0.25],[N.Bb3,0.5],[N.B3,1],
        [N.R,0.25],[N.B3,0.25],[N.D4,0.5],[N.Eb4,0.5],[N.D4,0.5],[N.C4,1],
        [N.B3,0.25],[N.R,0.25],[N.B3,0.5],[N.A3,0.5],[N.G3,0.5],[N.Gb3,1],
        [N.B3,0.25],[N.D4,0.25],[N.F4,0.25],[N.A4,0.25],[N.B4,1.5],[N.R,0.5],
        [N.B3,0.25],[N.R,0.25],[N.D4,0.5],[N.F4,0.5],[N.A4,0.5],[N.D5,1],
        [N.C5,0.5],[N.B4,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.Ab4,0.5],[N.G4,1],
        [N.Gb4,0.25],[N.R,0.25],[N.F4,0.5],[N.Eb4,0.5],[N.D4,0.5],[N.C4,1],
        [N.B3,0.25],[N.Db4,0.25],[N.B3,0.5],[N.A3,0.5],[N.G3,0.5],[N.B3,2],
      ]},
      // Heavy sub bass
      { wave:'sawtooth', vol:0.27, notes:[
        [N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],
        [N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],
        [N.G1,0.25],[N.R,0.25],[N.G1,0.25],[N.R,0.25],[N.G1,0.5],[N.G1,0.5],[N.R,0.5],
        [N.A1,0.5],[N.R,0.25],[N.B1,0.5],[N.R,0.25],[N.B1,1],
        [N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],[N.B1,0.25],[N.R,0.25],
        [N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],[N.C2,0.25],[N.R,0.25],
        [N.Gb1,0.5],[N.R,0.25],[N.G1,0.25],[N.Ab1,0.5],[N.R,0.5],[N.A1,1],
        [N.B1,0.5],[N.R,0.25],[N.B1,0.5],[N.B1,0.5],[N.R,0.25],
      ]},
      // Rapid arp
      { wave:'square', vol:0.08, notes:[
        [N.B4,0.25],[N.D5,0.25],[N.F5,0.25],[N.A5,0.25],[N.B4,0.25],[N.D5,0.25],[N.F5,0.25],[N.A5,0.25],
        [N.C5,0.25],[N.Eb5,0.25],[N.G5,0.25],[N.C5,0.25],[N.Eb5,0.25],[N.G5,0.25],[N.C5,0.25],[N.Eb5,0.25],
        [N.G4,0.25],[N.B4,0.25],[N.D5,0.25],[N.F5,0.25],[N.G4,0.25],[N.B4,0.25],[N.D5,0.25],[N.F5,0.25],
        [N.A4,0.5],[N.R,0.5],[N.B4,0.5],[N.R,0.5],
        [N.B4,0.25],[N.D5,0.25],[N.F5,0.25],[N.A5,0.25],[N.B4,0.25],[N.D5,0.25],[N.F5,0.25],[N.A5,0.25],
        [N.Eb5,0.25],[N.G5,0.25],[N.Bb5,0.25],[N.Eb5,0.25],[N.G5,0.25],[N.Bb5,0.25],[N.Eb5,0.25],[N.G5,0.25],
        [N.D5,0.25],[N.F5,0.25],[N.Ab5,0.25],[N.D5,0.25],[N.F5,0.25],[N.Ab5,0.25],[N.D5,0.5],
        [N.B4,0.5],[N.R,0.5],[N.B4,1],
      ]},
      // Heavy kick
      { wave:'sine', vol:0.36, notes:[
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[48,0.14,0.32],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.38],[52,0.10,0.28],[N.R,0.40],
        [52,0.12,0.42],[N.R,0.25],[48,0.14,0.32],[N.R,0.25],
      ]},
    ],
  };

  // ──── VICTORY: "Crown Restored" — G major, 145 BPM ───────
  TRACKS.victory = {
    bpm: 145,
    loops: false,   // play once then stop
    layers: [
      { wave:'triangle', vol:0.30, notes:[
        [N.G4,0.5],[N.G4,0.25],[N.A4,0.25],[N.G4,0.5],[N.R,0.5],[N.C5,0.5],[N.B4,2],[N.R,0.5],
        [N.G4,0.5],[N.G4,0.25],[N.A4,0.25],[N.G4,0.5],[N.R,0.5],[N.D5,0.5],[N.C5,2],[N.R,0.5],
        [N.G4,0.5],[N.G4,0.25],[N.G5,0.25],[N.E5,0.5],[N.C5,0.5],[N.D5,0.5],[N.B4,2],[N.R,0.5],
        [N.F5,0.5],[N.F5,0.25],[N.E5,0.25],[N.C5,0.5],[N.D5,0.5],[N.G4,3],
      ]},
      { wave:'sine', vol:0.18, notes:[
        [N.C3,2],[N.R,2],[N.F3,2],[N.R,2],[N.G3,2],[N.R,2],[N.C3,2],[N.R,2],
        [N.E3,2],[N.R,2],[N.C3,2],[N.R,2],[N.G3,2],[N.C3,6],
      ]},
    ],
  };

  // ──── GAMEOVER: "The Fallen Road" — descending, 58 BPM ───
  TRACKS.gameover = {
    bpm: 58,
    loops: false,
    layers: [
      { wave:'sine', vol:0.24, notes:[
        [N.E4,2],[N.Eb4,2],[N.D4,2],[N.Db4,2],
        [N.C4,3],[N.B3,3],[N.Bb3,4],[N.A3,4],[N.R,8],
      ]},
      { wave:'triangle', vol:0.14, notes:[
        [N.A2,4],[N.R,4],[N.Ab2,4],[N.R,4],[N.G2,4],[N.R,4],[N.F2,8],[N.R,8],
      ]},
    ],
  };

  // ── Music playback engine ──────────────────────────────────
  function fadeMusic(target, dur) {
    if (!musicGain) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(target, ctx.currentTime + dur);
  }

  function playMusic(name) {
    if (!ctx || !musicEnabled) return;
    if (currentTrack === name) return;
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    currentTrack = name;

    const track = TRACKS[name];
    if (!track) return;

    fadeMusic(0.36, 1.2);

    function loop() {
      if (currentTrack !== name || !ctx) return;
      ensureCtx();
      const start = ctx.currentTime + 0.06;
      let maxDur = 0;
      for (const layer of track.layers) {
        const d = scheduleLayer(layer.notes, track.bpm, layer.wave, layer.vol, start);
        if (d > maxDur) maxDur = d;
      }
      if (track.loops === false) return;          // play once
      loopTimer = setTimeout(loop, Math.max(200, (maxDur - 0.4) * 1000));
    }
    loop();
  }

  function stopMusic() {
    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    currentTrack = null;
    fadeMusic(0, 0.5);
  }

  function crossfadeTo(name, ms) {
    if (!ctx) return;
    const half = (ms || 1200) / 2;
    fadeMusic(0, half / 1000);
    setTimeout(() => playMusic(name), half);
  }

  // ── SFX ───────────────────────────────────────────────────
  function sfxN(freq, dur, vol, wave, delay) {
    if (!ctx || !sfxEnabled) return;
    playNote(freq, dur, vol, wave || 'sine', ctx.currentTime + (delay || 0.01), sfxGain);
  }

  const sfx = {
    menuSelect() {
      ensureCtx();
      sfxN(N.G5,  0.055, 0.26, 'sine');
      sfxN(N.B5,  0.070, 0.20, 'sine', 0.055);
    },
    menuBack() {
      ensureCtx();
      sfxN(N.D4, 0.12, 0.22, 'sine');
    },
    menuOpen() {
      ensureCtx();
      sfxN(N.G4, 0.08, 0.22, 'sine');
      sfxN(N.D5, 0.10, 0.20, 'sine', 0.08);
    },
    menuClose() {
      ensureCtx();
      sfxN(N.D5, 0.08, 0.18, 'sine');
      sfxN(N.G4, 0.10, 0.16, 'sine', 0.07);
    },

    sword() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.36, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 0.26);
      sfxN(N.B5, 0.05, 0.16, 'square', 0.015);
    },

    hit() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'square';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.30, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 0.18);
    },

    fire() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0.30, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
      [0.04, 0.14, 0.26].forEach(d => sfxN(450 + Math.random()*250, 0.07, 0.10, 'square', d));
    },

    ice() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      [0, 0.05, 0.10, 0.16].forEach((d, i) => sfxN(1400 + i*280, 0.18, 0.15, 'sine', d));
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.setValueAtTime(2300, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.7);
      g.gain.setValueAtTime(0.20, ctx.currentTime + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.72);
      osc.connect(g); g.connect(sfxGain);
      osc.start(ctx.currentTime + 0.1); osc.stop(ctx.currentTime + 0.8);
    },

    magic() {
      ensureCtx();
      [400, 600, 800, 1000].forEach((f, i) => {
        sfxN(f,       0.35, 0.15, 'sine', i * 0.06);
        sfxN(f * 1.5, 0.25, 0.09, 'sine', i * 0.06 + 0.02);
      });
    },

    gravity() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.6);
      g.gain.setValueAtTime(0.28, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    },

    heal() {
      ensureCtx();
      [N.C4, N.E4, N.G4, N.C5, N.E5].forEach((f, i) =>
        sfxN(f, 0.45, 0.19, 'sine', i * 0.09));
    },

    holy() {
      ensureCtx();
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) =>
        sfxN(f, 0.5, 0.20, 'triangle', i * 0.08));
    },

    void() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.setValueAtTime(58, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(26, ctx.currentTime + 1.2);
      g.gain.setValueAtTime(0.40, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 1.5);
      sfxN(666, 0.9, 0.10, 'sawtooth', 0.08);
      sfxN(667, 0.9, 0.07, 'sawtooth', 0.08);
    },

    death() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.setValueAtTime(460, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 1.0);
      g.gain.setValueAtTime(0.36, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.connect(g); g.connect(sfxGain);
      osc.start(); osc.stop(ctx.currentTime + 1.2);
    },

    levelUp() {
      ensureCtx();
      [N.C4,N.E4,N.G4,N.C5,N.E5,N.G5,N.C6].forEach((f, i) =>
        sfxN(f, 0.18, 0.24, 'triangle', i * 0.075));
    },

    victoryJingle() {
      ensureCtx();
      [N.G4,N.G4,N.A4,N.G4,N.C5,N.B4].forEach((f, i) =>
        sfxN(f, i === 5 ? 0.45 : 0.15, 0.28, 'triangle', i * 0.13));
    },

    step() {
      ensureCtx();
      sfxN(95 + Math.random() * 30, 0.04, 0.05, 'sine');
    },

    chestOpen() {
      ensureCtx();
      [N.C4,N.E4,N.G4,N.B4,N.D5,N.G5].forEach((f, i) =>
        sfxN(f, 0.15, 0.22, 'triangle', i * 0.055));
    },

    equip() {
      ensureCtx();
      sfxN(N.C5, 0.06, 0.25, 'triangle');
      sfxN(N.E5, 0.08, 0.20, 'triangle', 0.08);
      sfxN(N.G5, 0.10, 0.15, 'triangle', 0.16);
    },

    dialogue() {
      ensureCtx();
      sfxN(N.G5, 0.022, 0.04, 'square');
    },

    bossPhase() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      [0, 0.12, 0.24, 0.38, 0.52].forEach((d, i) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.setValueAtTime(900 - i * 120, ctx.currentTime + d);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + d + 0.75);
        g.gain.setValueAtTime(0.30, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.85);
        osc.connect(g); g.connect(sfxGain);
        osc.start(ctx.currentTime + d); osc.stop(ctx.currentTime + d + 0.95);
      });
    },

    varethWake() {
      ensureCtx();
      if (!ctx || !sfxEnabled) return;
      [0, 0.2, 0.5, 1.0].forEach((d, i) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type  = 'sine';
        osc.frequency.setValueAtTime(80 - i * 15, ctx.currentTime + d);
        g.gain.setValueAtTime(0.32, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.8);
        osc.connect(g); g.connect(sfxGain);
        osc.start(ctx.currentTime + d); osc.stop(ctx.currentTime + d + 0.9);
      });
      sfxN(666, 1.5, 0.12, 'sawtooth', 0.3);
    },
  };

  // ── Settings toggles ───────────────────────────────────────
  function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (!musicEnabled) stopMusic();
    return musicEnabled;
  }
  function toggleSfx() { sfxEnabled = !sfxEnabled; return sfxEnabled; }

  return {
    init, ensureCtx,
    playMusic, stopMusic, crossfadeTo,
    sfx,
    toggleMusic, toggleSfx,
    isMusicEnabled: () => musicEnabled,
    isSfxEnabled:   () => sfxEnabled,
  };
})();
