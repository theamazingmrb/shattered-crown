# Shattered Crown — Upgrade Plan

**Design north star:** a tactical RPG in the lineage of *Final Fantasy Tactics*, *Fire Emblem*, and *Octopath Traveler* — inspired by, not derived from. We take the *ideas* (grid/CT tactics, weapon counters & stakes, break-and-boost rhythm) and build our own named systems. No copied names, numbers, art, or music.

**Combat identity chosen:** *Even hybrid* — positioning (FFT/FE) and the break/boost loop (Octopath) matter equally.
**Stakes chosen:** *Always meaningful* — death inflicts a lasting **Wounded** penalty, healed only at town shrines for gold.

Baseline: ~10,513 LOC, 8 modules. The CT turn engine, 12×7 grid, 12-act story, save/difficulty/bestiary/banter all exist and are good. **Your CT engine is the hardest part of FFT and it's already done** — we build on it.

> **STATUS (current):** Phase 1 ✅ complete · Phase 2 ✅ complete · Phase 3 (economy/path actions/**Wounded** stakes) not started · Phase 4 (audio/polish) not started. Now in **playtest**.
> The *Wounded penalty + town shrines* stakes above are the chosen design; they land in **Phase 3** (not yet built).

---

## How the influences map to our (original) systems

| Inspiration | Our system |
|---|---|
| FFT grid + CT turns | Keep & deepen the existing engine |
| FFT job system | **Disciplines** — unlockable secondary skill sets (Phase 3d) |
| FE weapon triangle | **Counter Web** — weapon & element advantage matrix |
| FE positioning & bonds | **Flanking / facing** + **Support Bonds** (adjacency already tracked in code) |
| FE permadeath | **Wounded** status scaled by difficulty; healed at shrines for gold |
| Octopath Break | **Stagger** — break a unit's guard via counter-matchup → it loses its next turn |
| Octopath Boost | **Momentum** — bank a resource, spend to amplify actions |

---

## Phase 1 — Combat Depth (highest impact, most isolated)

Files: `js/data.js`, `js/battle.js`, `js/ui.js`. Hook points are already clean: `calcPhysDmg`/`calcMagDmg` (~1258–1300) and `applyHit` (~1302).

Progress: **PHASE 1 COMPLETE — 1a ✅ · 1b ✅ · 1c ✅ · 1d ✅ · 1e ✅ (all done & verified in-browser).**

### 1a. Counter Web (FE weapon triangle + elements) — ✅ DONE
- `WEAPON_BEATS` table + `DATA.counterMult()` / `DATA.weaknessTokens()` in `js/data.js`.
- Every player skill tagged `weaponType`/`element`; every enemy template tagged `guardType`/`weak[]`/`resist[]`/`guardMax`.
- Multiplier applied at top of `applyHit()` (battle.js): weakness ×1.25, weapon disadvantage ×0.75, element resist ×0.5, weapon+element stack. Shows `WEAK!`/`RESIST` floats.
- Discovered weaknesses persist to `bestiary[key].weakKnown` via `persistBattleStats()` (main.js).
- **Known issue surfaced:** live `onBattleEnd` (main.js ~734) is the 3-arg one; the 6-arg version is dead (hoisting-shadowed). Enemy drops are still not awarded in the live path — deferred to Phase 3 economy.

### 1b. Positioning: Flanking, Facing & Support Bonds (FFT/FE) — ✅ DONE
- **Facing:** units carry `facing` ('L'/'R'); set at placement, updated on move and on attack (caster faces target, in `applyHit`). A back-attack (attacker on the side the target faces away from) deals **×1.30** — `DATA.backAttackMult`. Small facing chevron drawn per unit. Verified live: back-attack Slash = 28 (>front max 27).
- **Flanking:** target sandwiched by attacker + a same-side ally on the opposite side (same row, within 2 cols) → **×1.20** and **+1 breakPower** (helps Stagger). `DATA.isFlanked`. Only for physical/hybrid melee.
- **Support Bonds:** each orthogonally-adjacent ally gives **+8% DEF** (cap +24%, in `getBuffedStat`) and **+3% evasion** (cap +9%, in `applyHit`). `DATA.adjacentAllies`. (Growing/saved bond counter deferred as polish.)
- Positional bonuses are gated to melee attacks with real positions, computed in `applyHit` before the Counter Web block so flank break-bonus feeds Stagger.
- Height/terrain tier: deferred (terrain bonuses already exist via `terrainAtkBonus`).

### 1c. Stagger (our Break) — ✅ DONE
- Enemies init `guard`/`guardMax`/`staggered` at placement (battle.js). Weakness hits deplete guard via `onWeaknessHit(caster, target, sk, breakPower)`.
- At guard 0 → `triggerStagger()`: sets `staggered` + `staggerSkipPending`, `BREAK!` float, flash + shake, battle-log entry.
- Staggered targets take ×1.5 (applied in `applyHit` before the counter block, so it stacks with weakness). Recovery in `doEnemyTurn`: consumes `staggerSkipPending` (skips the turn), clears `staggered`, refills `guard`.
- Draw: gold guard pips above the enemy HP bar; pulsing red ring while staggered.
- Verified end-to-end in real battle: deplete → BREAK → ×1.5 hits → skip-turn → guard refill, zero console errors.
- `breakPower` param reserved for Phase 1d Momentum (boosted hits break faster).

### 1d. Momentum (our Boost) — ✅ DONE
- Player units gain `momentum` +1/turn (start 1, cap `MOMENTUM_MAX`=5), granted in `startUnitTurn`; battle-only (not saved).
- `pendingBoost` (0–3, clamped to available momentum) chosen via a **−/+ BOOST control** + momentum pips drawn at the panel bottom (`drawMomentumStrip`, fixed y=556 so it doesn't collide with the flowing action menu). Click handled at top of `handlePanelClick`.
- In `executeSkill`: `boost` spent from momentum; `boostMult = 1 + 0.5·boost` scales damage & heals; `boostedSk` carries `breakPower = 1+boost` into `applyHit`→`onWeaknessHit` so boosted weakness hits break guard faster. Momentum refunded on invalid casts (e.g. Assassinate on acted target).
- Verified in real battle: `Boost ×3` Slash dealt 51 (=18 ATK ×3.0 − 3), momentum spent + control reset correctly, zero errors.
- UI shows only the active caster's momentum (per-party-member pips deferred as polish).

### 1e. Latent Power (character ultimate) — ✅ DONE
- Player units carry a `latent` gauge (0..`LATENT_MAX`=100), charged in `applyHit`: dealer +25% of damage dealt, taker +40% of damage taken (via `gainLatent`). Resets each battle (not saved).
- When full, a glowing signature button appears in the panel (`drawLatentBar` above the momentum strip); click handled at top of `handlePanelClick`. `useLatent(caster)` dispatches per character, then empties the gauge and ends the turn:
  - **Kael — Aegis Vow:** party-wide 60% shield + 35% max-HP heal.
  - **Lyra — Shadow Flurry:** refill Momentum + 3 boosted dagger strikes on nearest enemy.
  - **Theron — Vareth Surge:** 3.0× dark magic to all enemies.
  - **Sera — Dawn's Grace:** revive fallen allies (60%) + full-heal the living.
- Verified live: Aegis Vow shielded + healed Kael (40→72 HP), gauge emptied, turn ended, zero errors. (Lyra/Theron/Sera reuse verified `applyHit`/heal/revive primitives; testable battle2+.)

**Deliverable:** ✅ a battle where facing/flanking, weapon counters, staggering, banked Momentum, and character ultimates all matter — an FFT/FE/Octopath fusion that's ours.

---

## Phase 2 — HD-2D-style Visual Overhaul + Juice

Files: `js/world.js`, `js/battle.js`, `js/ui.js`. Additive rendering passes; no data changes.

Progress: **battle pass ✅ · overworld grade ✅ (done & verified).** DOF/parallax deferred (see note).

- **Juice ✅:** hit-stop (`hitStop()`/`hitStopTimer`, freezes sim ≤120ms on crit/BREAK/kill while flash+shake keep ticking); crit/kill flash + screen-shake; additive-blend flash for a bloom pop (`globalCompositeOperation='lighter'`).
- **Damage-number pop ✅:** `drawFloatingTexts` — entry scale-overshoot; emphatic keywords (CRIT/WEAK/BREAK/BACK/FLANK/RESIST/LATENT) drawn bigger with additive glow halo.
- **Element particles ✅:** impact burst in `applyHit` now element-aware via `elementParticle()` (fire→embers, ice→shards, lightning→sparks, light→holy, dark→void, else blood/magic). Reuses the existing UI particle vocabulary.
- **Color grade + vignette ✅:** battle `drawGrade()` — per-`background` tint + radial vignette over the diorama (left of the panel). Overworld `drawWorldGrade()` — per-region tint + vignette + soft player light (screen-space, after camera restore).
- **Deferred (bad cost/benefit on procedural canvas):** DOF/tilt-shift blur (ctx.filter blur is per-frame expensive), full parallax of hand-drawn backgrounds, rim-lighting. Revisit only if a scene feels flat after playtest.

**Deliverable:** ✅ battles have punch (hit-stop, bloom, element bursts, popping numbers) and both battle + overworld are color-graded with vignettes. Verified in-browser, zero errors.

**Playtest fixes:**
- Fixed a pre-existing crash: `updateTileHoverInfo` referenced `dt` without receiving it → `Uncaught ReferenceError: dt is not defined` (world.js) when hovering a tile in free-roam overworld. Now `updateTileHoverInfo(dt, game)`.
- Fixed banter immersion bug: `getBanter` picked from the whole quote pool regardless of who was in the fight, so absent characters spoke (e.g. Lyra "I'll flank" in the Kael-only Act 1 battle). `getBanter(trigger, present)` now filters to present speakers; battle.js passes `presentNames` (crit → attacker, allyDeath → a survivor). NOTE: battle 1 being Kael-only is *intended* (Lyra joins after it).

---

## Phase 3 — World & Content Systems

Files: `js/data.js`, `js/world.js`, `js/ui.js`, `js/main.js`.

- **3a. Economy — ✅ shops+gold DONE (shrines pending Wounded):** `gold` in state+save (v2.1, default-filled); enemies award derived gold on kill (tallied in `battleStats.goldEarned`, banked in `persistBattleStats`, shown on the victory screen); items carry a `price` (consumables hand-set, equipment auto-derived from stat power). **Shop** = a `SHOP` state + `UI.openShop/updateShop/drawShop`; a shopkeeper NPC (`shop:{...}` in `data.js`, Selvara Quartermaster) opens it via `game.openShop` from `world.js`. Buy (full price) / Sell (half) tabs, keyboard+click nav, equipped-gear sell guard. Verified in-browser: buy 300→270, sell →312, zero errors. **Shrines heal Wounded** — deferred until the Wounded status lands (below); shrine is the gold-sink that makes positioning matter.
- **3b. Path/Field Actions (FFT/Octopath overworld):** per-character NPC interactions — Kael *Challenge*, Lyra *Pickpocket*, Theron *Intimidate*, Sera *Inquire* — gated by level/gold/bond.
- **3c. Town NPCs & side stories:** backstories + optional quests/side battles reusing the act/battle pipeline.
- **3d. Disciplines (FFT jobs):** optional secondary skill set per character, unlockable mid-game.

---

## Phase 4 — Audio & Final Polish

Files: `js/audio.js` + cross-cutting.

- Adaptive battle music (calm → staggered stinger → boss), per-region overworld variation, performance-tied victory fanfare.
- Distinct element/stagger/momentum SFX.
- Skill tooltips (weapon/element/stagger), battle results screen, transition wipes, settings pass.
- **Balance pass** across all 12 acts with the new counter/stagger/Momentum/Wounded math.

---

## Sequencing & risk
- **Phase 1 first** — the identity lives here and the hooks are isolated (lowest risk, highest payoff). Within it: 1a→1c→1b→1d→1e is the natural build order (matchups → stagger → positioning → momentum → ultimates).
- Phases 2–4 are additive and reorderable (visual "wow" can jump ahead if you want).
- Each phase ends runnable and is verified in-browser.
- **Save safety:** bump save `version`, default-fill new fields (gold, bonds, weakKnown, wounded); Momentum/Stagger are battle-only and not persisted. Old saves keep loading.
