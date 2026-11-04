# Design decisions — 0.2.0 spirit purification

Status: approved by the operator on 2026-11-04. This document replaces the `001` skill-point/challenge scope; the hard-timed combo, in-world chain pips, and combat values are retained from the earlier `0.2.0` decisions (operator revisions 2026-11-03).
Sources: `docs/tasks/0.2.0/002-design.md`, `docs/about-the-project.md` §3.2–§3.4, §5.1, §7; `design/0.1.0/design-decisions.md`; `programmer/0.1.0/CoT.md`.

All coordinates and distances are **world pixels** (1 tile = 16 world px). Timings are seconds. `ZOOM = 3` CSS pixels per world pixel. Everything in `0.1.0` §1 (viewport, scaling, pointer mapping) and §10 (camera) is unchanged and is not repeated here.

## 1. Theme and loop

The version is a dark-fantasy **liberation** slice. A mob is not defeated by damage alone: damage only sustains the fight. The player must break the spirit fragments binding it, then land the final blow. A mob killed before the rite is complete returns; a mob put to rest grants spirit and never returns.

The approved loop is:

1. Engage a mob carrying two spirit fragments.
2. Break both fragments with the light attack without losing HP.
3. Kill the mob permanently; it grants spirit and stays down.
4. Fill the spirit meter.
5. The run freezes on a **Floor purified** overlay; `R` restarts.

## 2. Combo chain

### 2.1 Sequence

- The player has a **three-step chain**. The first press starts step 1; a further step advances only when the player presses attack **inside that step's reply window**.
- There is **no input buffer**. A press before or after the window ends the chain. A steady mash cannot complete it.
- Step 3 is the **finisher**: wider arc, more damage, knockback, stagger, and hitstop. It holds the completed chain on screen for a short beat after it lands. Presses after it lands are ignored; presses before it lands break the chain.
- After the hold the chain returns to idle. The next press starts a fresh chain at step 1.

### 2.2 Timing table

| Step | Windup | Active | Recovery | Reach | Half-angle | Damage |
|---|---|---|---|---|---|---|
| 1 | 0.08 s | 0.10 s | 0.12 s | 34 px | 55° | 2 |
| 2 | 0.07 s | 0.09 s | 0.10 s | 36 px | 55° | 2 |
| 3 (finisher) | 0.12 s | 0.12 s | 0.20 s | 40 px | 80° | 4 |

Recovery is the visual tail of the swing; it does not gate the reply window. The window is anchored to the end of the active frames.

- **Reply window:** opens `0.06 s` after the current step's active window ends and stays open for `0.10 s`.
- **Input model:** a press inside the reply window starts the next step immediately. A press at any other time — during windup, active, the 0.06 s beat before the window, or after it closes — ends the chain (`mistime`). A press that arrives while a step has not landed is early and ends the chain. There is no buffer.
- **Presses while idle** always start step 1.
- **No global attack cooldown.** The step timings are the cadence; `0.1.0`'s 0.45 s cooldown is removed.
- **Whiff:** a step whose active window ends without touching an enemy body or a spirit fragment ends the chain (`whiff`). Presses during the whiffed step do not save it.
- **Timeout:** if no press arrives by the end of the reply window, the chain ends (`timeout`). Presses after that start step 1 (`mistime` or a new chain press).
- **Hit resolution:** on the first active frame of a step, every alive enemy whose center is inside the step's reach and half-angle takes that step's damage, once per step. Every intact fragment inside the same arc breaks on that frame, before the enemy damage resolves.
- **Hitstop:** presses during the finisher's 0.06 s hitstop are dropped, not punished; the reply window is frozen with the simulation.
- **Dodge** during any step cancels the swing and returns the chain to step 1. Dodge still behaves as in `0.1.0`.
- **Movement** stays available during every step (unchanged from `0.1.0`).
- **Taking damage** ends the chain (`damage`). A swing that already resolved in its active window still lands; only the remaining chain is lost. Damage taken during death does not emit a chain break.

### 2.3 Finisher impact

- On the first enemy damaged by a finisher active frame: **0.06 s hitstop**. The simulation pauses (no timers, movement, projectiles, or enemy logic advance); rendering continues; attack presses made during the freeze are dropped rather than buffered or punished. Hitstop never applies while dead or purified.
- **Hold:** once the finisher lands, it stays on screen for `0.12 s` before the chain hands back to idle.
- **Knockback:** 6 px along the aim direction for every enemy hit by the finisher, clamped to the room bounds.
- **Stagger:** 0.15 s per enemy hit by the finisher. Stagger cancels the enemy's windup/active windows and blocks movement and attacks; the enemy can still take damage and can be staggered again.
- Multiple enemies hit by one finisher each get knockback, damage, and stagger; the hitstop is applied once.

### 2.4 Combo presentation

- **Swing arc:** steps 1–2 keep the `0.1.0` look — `rgba(255,214,120,0.35)`, thickness 8, radius 34 / 36, spanning `aim ± 55°`, fading for 0.12 s after the active window.
- **Finisher arc:** radius 40, thickness 10, `rgba(255,226,150,0.55)`, spanning `aim ± 80°`, fading for 0.18 s after the active window.
- **Sword sweep:** steps 1–2 sweep from `aim − 70°` to `aim + 70°` across windup + active (unchanged). The finisher sweeps from `aim − 90°` to `aim + 90°` across its 0.24 s windup + active.
- **Hit spark:** steps 1–2 keep 4 lines × 8 px for 0.12 s. The finisher draws 6 lines × 12 px for 0.16 s.
- **Chain pips:** three world-space dots centered above the player at `y − 34`, 7.6 px apart, radius 2.2 px (the finisher pip is 3.1 px), each with a 0.6 px `rgba(0,0,0,0.55)` outline. Connected steps are gold `#f2d38a`; the step in progress is white `rgba(255,255,255,0.92)`; the next step is dim `rgba(255,255,255,0.28)`. While the reply window is open, the next pip pulses between 1.3× and 1.5× its radius at about 8 Hz. The pips are hidden while idle, dead, or purified.
- **Break feedback:** a non-completing chain end collapses the three pips into a red (`255, 92, 82`) burst at the break position for 0.18 s, shrinking and rising slightly. A completed finisher shows no break burst; its three pips stay gold during the 0.12 s hold and then disappear.
- **No HUD combo meter, no hit counter, no screen shake.** The arc size, spark size, hitstop, knockback, and the in-world pips communicate the step.

## 3. Spirit fragments

### 3.1 Layout and motion

| Value | Setting |
|---|---|
| Fragments per mob | 2 |
| Orbit centre | `10 px` above the enemy's feet |
| Orbit radius | 12 px |
| Fragment angles | `−135°` and `−45°` (upper-left and upper-right) |
| Fragment radius | 3.2 px |
| Fragment colour | `#bfe9ff` |
| Fragment core | 1.1 px `rgba(255,255,255,0.9)`, offset `0.6 px` up |
| Glow | radius 5.8 px, `rgba(191,233,255,0.18)` |
| Idle bob | ±1.2 px vertical at 3 rad/s, opposite phase per fragment |

Fragments are drawn above the enemy sprites and below projectiles, the swing arc, and sparks. They exist only while the enemy is `alive`; broken fragments are not drawn.

### 3.2 Breaking

- The existing **light attack** breaks fragments. A fragment breaks when its centre lies inside the current step's reach and half-angle.
- A single swing can break both fragments. Whether it does depends on positioning and aim; no separate purify input exists.
- A swing that breaks a fragment counts as a connected step for the combo, even if it misses the enemy's body.
- Fragment hits use the step's reach and arc from §2.2; the finisher's wider arc makes it the easiest step for lining up both fragments.
- Each broken fragment emits **6 pale-blue lines × 7 px for 0.18 s** at the fragment's position.

### 3.3 Restoration

- **Any HP loss** restores every broken fragment on every living enemy. This includes melee hits and projectiles.
- A dodge, an i-frame, or any other effect that prevents the HP loss is **not** a failure and does not restore fragments.
- Restoration does not heal, move, or otherwise reset the enemy; only a conventional death does that.
- Each restored enemy emits **5 pale-blue lines × 9 px for 0.22 s** at its feet.

### 3.4 Ready to rest

When the enemy is alive and all fragments are broken:

- Its sprite is tinted `rgba(191,233,255,0.4)` (below the red telegraph tint in priority).
- A pale ring of radius 13 px and line width 1.4 px is drawn 10 px above its feet. Its alpha pulses between `0.27` and `0.63` at 6 rad/s.
- The fragments are gone, so the empty orbit plus the tint and ring read as “the rite is complete; finish it.”

## 4. Death, respawn, and permanent rest

### 4.1 Permanent rest

- A mob can be killed permanently only when it is alive and every fragment is broken at the moment of the killing blow.
- Fragments resolve before damage on the same swing, so the final blow may also break the last fragment.
- A rested mob stays in the `dying` → `dead` animation and never respawns. It emits an **8-line pale burst × 14 px for 0.35 s**.
- Resting grants **34 spirit**, capped at the meter threshold, and emits `enemy-rested`.

### 4.2 Failed rite

- A mob killed while at least one fragment is intact is a failed rite.
- It plays the normal `0.25 s` death fade, then waits **2 s** before returning.
- It returns at its original spawn with full HP, every fragment restored, no aggro, no cooldown, no stagger, and no windup. This is a full reset of the mob.
- It emits an `enemy-respawned` burst of **4 lines × 8 px for 0.20 s** in muted violet `rgba(150,120,200,0.85)`.
- A failed rite grants no spirit.
- Movement, attacks, projectiles, and respawn timers freeze while the player is dead.

## 5. Spirit meter

- **Text:** `Spirit: N%` where `N` is the rounded spirit value, at `x = 24`, text top at `y = 74`, `14px system-ui, sans-serif`, baseline `top`.
- **Text colour:** `rgba(255,255,255,0.7)` at 0 spirit; `#bfe9ff` from 1 upward.
- **Bar:** `x = 24`, `y = 92`, `120 × 6 px`.
- **Track:** `rgba(191,233,255,0.16)`.
- **Fill:** `#bfe9ff`, width `120 × spirit / 100`, rounded to whole pixels.
- **Border:** 1 px `rgba(191,233,255,0.45)`.
- **Threshold:** 100. Spirit is clamped at 100. Each rested mob grants 34, so three rested mobs fill the meter.
- The meter is drawn while the run is playable. The death and purified overlays cover it.
- The `001` skill-point counter and the “Combo complete” notice are removed.

## 6. Floor purified

- When spirit reaches 100, the run enters the `purified` state and stops simulating. Rendering continues on the frozen frame.
- The overlay covers the whole viewport with `rgba(5,10,16,0.72)`.
- Text is centered horizontally:
  - **`Floor purified`** — `48px system-ui, sans-serif`, `#e8f7ff`, vertically centered at `height/2 − 30`.
  - **`The boss awaits`** — `20px system-ui, sans-serif`, `rgba(191,233,255,0.9)`, at `height/2 + 22`.
  - **`Press R to restart`** — `16px system-ui, sans-serif`, `rgba(255,255,255,0.75)`, at `height/2 + 60`.
- No boss is spawned and no floor transition occurs in this version. The overlay is the finish line.
- `R` resets the run exactly like the death restart.

## 7. Death and restart

- Death freezes simulation and presentation as in `0.1.0`; projectiles, telegraphs, stagger, hitstop, and respawn timers all stop.
- `R` restores: three enemies at their spawns with full HP, intact fragments, no timers, no respawn, and no rest flag; zero projectiles; idle chain; zero spirit; `floorPurified` false; full player HP; camera snapped; time 0.
- The death overlay text and layout are unchanged.
- The purified overlay is separate from the death overlay; only one can be shown.

## 8. Removed from this version

- Skill points, skill-point HUD counter, combo challenge awarding, and the earn notice.
- Room-clear flag, `room-cleared` event, and “nothing respawns” behavior.
- Drops, currency, inventory, shops, consumables, and skill spending.
- Boss fight, floor transitions, floor scaling, and procedural generation.
- Ordered or moving fragments, per-mob fragment-count variation, and sequence rules. These are future difficulty levers.

## 9. Approved numeric values

| Value | Setting |
|---|---|
| **Combo** | |
| Step 1/2/3 windup | 0.08 / 0.07 / 0.12 s |
| Step 1/2/3 active | 0.10 / 0.09 / 0.12 s |
| Step 1/2/3 recovery | 0.12 / 0.10 / 0.20 s |
| Step 1/2/3 reach | 34 / 36 / 40 px |
| Step 1/2/3 half-angle | 55° / 55° / 80° |
| Step 1/2/3 damage | 2 / 2 / 4 |
| Reply-window delay after active | 0.06 s |
| Reply window | 0.10 s |
| Finisher hold after it lands | 0.12 s |
| Chain pips | 3, `y − 34`, 7.6 px spacing, 2.2 px radius (finisher 3.1), pulse 1.3–1.5× at 8 Hz |
| Finisher hitstop | 0.06 s |
| Finisher knockback | 6 px |
| Stagger | 0.15 s |
| **Purification** | |
| Fragments per mob | 2 |
| Fragment angles / orbit radius | −135°, −45° / 12 px |
| Orbit centre above feet | 10 px |
| Fragment radius / colour | 3.2 px / `#bfe9ff` |
| Fragment bob | ±1.2 px at 3 rad/s |
| Spirit per rested mob | 34 |
| Spirit threshold | 100 |
| Respawn delay | 2 s |
| Ready-to-rest ring | radius 13 px, alpha 0.27–0.63 at 6 rad/s |
| **Spirit HUD** | |
| Text | `Spirit: N%`, x 24, top y 74, 14 px |
| Bar | x 24, y 92, 120 × 6 px |
| Colour | `#bfe9ff` |
| **Melee enemy** | unchanged: 10 HP, 55 px/s, radius 6, aggro 160, range 26, windup 0.45, active 0.1, cooldown 1.1, damage 1 |
| **Ranged enemy** | unchanged: 6 HP, 70 px/s, radius 6, aggro 260, near 110, far 240, telegraph 0.5, cooldown 1.6, projectile 150 px/s / r4 / 1.6 s / 1 HP |
| **Player** | unchanged: 120 px/s, radius 6, 6 HP, 0.6 s i-frames, dodge 64 px / 0.18 s / 0.25 s / 0.9 s |
| **Camera** | unchanged: τ = 0.12 s |
| **Enemy death fade** | 0.25 s |

## 10. Explicit non-goals

No secondary attack, skills, skill-point spending, shop, consumables, currency, loot, drops, boss, procedural floors, safe rooms, persistence, audio, or menus. No enemy type beyond melee and ranged; no enemy-enemy collision; no projectile-enemy damage; no waves; no screen shake; no new art or dependencies.

## 11. Assumptions and deviations from `001`

- **Purification replaces the skill-point reward** (operator re-baseline, 2026-11-04). The `001` challenge, point counter, notice, and room-clear flag are removed rather than left dormant.
- **Fragments are broken by the existing light attack** (operator-approved 2026-11-04). Ordered breaks, moving orbits, and fragment sequences are deferred.
- **Any HP loss restores all fragments** (operator-approved 2026-11-04). I-frames and dodges that prevent HP loss are safe. Restoration never resets the mob's current HP.
- **Conventional death respawns the mob** (operator-approved 2026-11-04) after 2 s at its spawn with a full rite. This replaces the `001` rule that clearing the room leaves it empty.
- **Spirit meter only; no boss** (operator-approved 2026-11-04). The meter's full state is a frozen “Floor purified” overlay.
- **No drops** (operator-approved 2026-11-04). Purification grants spirit only.
- **Ready-to-rest cue** is a reversible implementation default: pale tint plus pulsing ring. It was not separately specified by the operator, but the design task requires every state to be visible.
- **Fragments resolve before damage** so a final blow can break the last fragment and rest the mob. This is the generous reading of “once all fragments are broken, the mob can be killed permanently.”
- The hard-timed combo, in-world pips, combat values, enemy archetypes, and `0.1.0` behavior are retained from the approved `001` design.

## 12. Mapping to the design task's acceptance criteria

1. Fragment count, angles, orbit, size, colour, and motion: §3.1, §9.
2. Break, restore, ready-to-rest, permanent-rest, and respawn cues: §3.2–§3.4, §4.
3. Spirit-meter placement, text, colour, and fill: §5, §9.
4. Floor-purified overlay text and restart: §6.
5. Removal of skill-point/challenge/drop/boss presentation: §8.
6. Implementable values and testable rules: §2–§9; every value is a config constant and the rules live in pure systems.
