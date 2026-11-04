# Design decisions — 0.2.0 combat depth

Status: approved by the operator on 2026-11-02. The combo input model, in-world chain pips, and damage-break rule were revised with the operator on 2026-11-03 and supersede the original buffered-input text.
Sources: `docs/tasks/0.2.0/001-design.md`, `docs/about-the-project.md` §3.2–§3.4, §5.1, §7; `design/0.1.0/design-decisions.md`; `programmer/0.1.0/CoT.md`.

All coordinates and distances are **world pixels** (1 tile = 16 world px). Timings are seconds. `ZOOM = 3` CSS pixels per world pixel. Everything in `0.1.0` §1 (viewport, scaling, pointer mapping) and §10 (camera) is unchanged and is not repeated here.

## 1. Combo chain

### 1.1 Sequence

- The player has a **three-step chain**. The first press starts step 1; a further step advances only when the player presses attack **inside that step's reply window**.
- There is **no input buffer**. A press before or after the window ends the chain. This is what makes the combo an execution test instead of a click rhythm: a steady mash cannot complete it.
- Step 3 is the **finisher**: wider arc, more damage, knockback, stagger, and hitstop. It holds the completed chain on screen for a short beat after it lands. Presses after it lands are ignored; presses before it lands break the chain.
- After the hold the chain returns to idle. The next press starts a fresh chain at step 1.

### 1.2 Timing table

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
- **Whiff:** a step whose active window ends without damaging any enemy ends the chain (`whiff`). Presses during the whiffed step do not save it.
- **Timeout:** if no press arrives by the end of the reply window, the chain ends (`timeout`). Presses after that start step 1 (`mistime` or a new chain press).
- **Hit resolution:** on the first active frame of a step, every alive enemy whose center is inside the step's reach and half-angle takes that step's damage, once per step.
- **Hitstop:** presses during the finisher's 0.06 s hitstop are dropped, not punished; the reply window is frozen with the simulation.
- **Dodge** during any step cancels the swing and returns the chain to step 1. Dodge still behaves as in `0.1.0`.
- **Movement** stays available during every step (unchanged from `0.1.0`).
- **Taking damage** ends the chain (`damage`). A swing that already resolved in its active window still lands; only the remaining chain is lost. Damage taken during death does not emit a chain break.

### 1.3 Finisher impact

- On the first enemy damaged by a finisher active frame: **0.06 s hitstop**. The simulation pauses (no timers, movement, projectiles, or enemy logic advance); rendering continues; attack presses made during the freeze are dropped rather than buffered or punished. Hitstop never applies while dead.
- **Hold:** once the finisher lands, it stays on screen for `0.12 s` before the chain hands back to idle.
- **Knockback:** 6 px along the aim direction for every enemy hit by the finisher, clamped to the room bounds.
- **Stagger:** 0.15 s per enemy hit by the finisher. Stagger cancels the enemy's windup/active windows and blocks movement and attacks; the enemy can still take damage and can be staggered again.
- Multiple enemies hit by one finisher each get knockback, damage, and stagger; the hitstop is applied once.

### 1.4 Combo presentation

- **Swing arc:** steps 1–2 keep the `0.1.0` look — `rgba(255,214,120,0.35)`, thickness 8, radius 34 / 36, spanning `aim ± 55°`, fading for 0.12 s after the active window.
- **Finisher arc:** radius 40, thickness 10, `rgba(255,226,150,0.55)`, spanning `aim ± 80°`, fading for 0.18 s after the active window.
- **Sword sweep:** steps 1–2 sweep from `aim − 70°` to `aim + 70°` across windup + active (unchanged). The finisher sweeps from `aim − 90°` to `aim + 90°` across its 0.24 s windup + active.
- **Hit spark:** steps 1–2 keep 4 lines × 8 px for 0.12 s. The finisher draws 6 lines × 12 px for 0.16 s.
- **Chain pips:** three world-space dots centered above the player at `y − 34`, 7.6 px apart, radius 2.2 px (the finisher pip is 3.1 px), each with a 0.6 px `rgba(0,0,0,0.55)` outline. Connected steps are gold `#f2d38a`; the step in progress is white `rgba(255,255,255,0.92)`; the next step is dim `rgba(255,255,255,0.28)`. While the reply window is open, the next pip pulses between 1.3× and 1.5× its radius at about 8 Hz. The pips are hidden while idle and while dead.
- **Break feedback:** a non-completing chain end collapses the three pips into a red (`255, 92, 82`) burst at the break position for 0.18 s, shrinking and rising slightly. A completed finisher shows no break burst; its three pips stay gold during the 0.12 s hold and then disappear.
- **No HUD combo meter, no hit counter, no screen shake.** The arc size, spark size, hitstop, knockback, and the in-world pips communicate the step.
- **Reset feedback:** the red pip collapse is the only break cue; there is no failure message or text.

## 2. Enemies

### 2.1 Shared

- Enemies are drawn sorted with the player by feet `y` ascending; shadows under all living/dying entities.
- Hit reaction: white flash for 0.08 s (a domain timer, `hurtFlash`), replacing the single global "last hit time". The `imp` has no hurt frame, so its flash is code-drawn only.
- Death: 0.25 s fade, no collision, no damage, no projectiles.
- Stagger visual: the moving animation stops and the sprite is tinted `rgba(180,200,255,0.35)` for the stagger duration. Movement pausing is the non-color cue.
- Enemies do not collide with each other and projectiles do not hit enemies.

### 2.2 Melee chaser

Unchanged from `0.1.0` §5 and §9 except:

- **Max HP 10** (was 6) so a full chain (8) does not delete it.
- Stagger support as above.
- Spawn at `(448, 128)`.

### 2.3 Ranged kiter (`imp`)

| Value | Setting |
|---|---|
| Max HP | 6 |
| Move speed | 70 px/s |
| Collision radius | 6 px |
| Aggro radius | 260 px |
| Near threshold (retreat inside) | 110 px |
| Far threshold (approach beyond) | 240 px |
| Telegraph | 0.5 s |
| Attack cooldown | 1.6 s from the shot |
| Projectile speed | 150 px/s |
| Projectile radius | 4 px |
| Projectile lifetime | 1.6 s |
| Projectile damage | 1 HP |
| Spawn offset | 10 px from the imp center toward the player center |

Behaviour:

- Ignore the player and idle when farther than 260 px.
- Inside 260 px: retreat at 70 px/s when closer than 110 px, approach at 70 px/s when farther than 240 px, hold position between the thresholds.
- Fire only when the cooldown is ready, the player is within 240 px, and the line of sight is clear. Line of sight is a segment from imp center to player center that must not cross a wall tile; it is sampled every 4 px.
- The imp stops moving during the telegraph and fires one projectile at the end of it. Movement resumes during the cooldown.
- No leading: the projectile travels toward the player's position at the moment of firing.
- The imp keeps facing the player horizontally.

Presentation:

- Idle `imp_idle_anim_f0..f3` at 6 fps; moving `imp_run_anim_f0..f3` at 10 fps; sprite 16 × 16, drawn with its bottom edge on the feet `y`.
- Telegraph: red tint `rgba(255,70,60,0.55)` plus a 1 px `rgba(255,70,60,0.35)` sight line from the imp center to the player center for the full 0.5 s. The line also communicates the line-of-sight rule.
- No additional ring: the sprite is small and the sight line is the readable cue.

### 2.4 Room composition

- **Melee A** at `(448, 128)` — the `0.1.0` spot.
- **Melee B** at `(224, 112)`.
- **Ranged** at `(560, 96)`.
- Player at `(320, 320)`. All three enemies start outside their aggro radii (229 / 229 / 328 px), so the fight begins when the player engages.
- Room clears when all three enemies are dead (`status === "dead"`). Nothing respawns; clearing does not end the run.

## 3. Projectile presentation

- Drawn above all entities and below the swing arc and sparks.
- Core: 2 px radius, `rgba(255,255,255,0.95)`.
- Body: 4 px radius, `rgba(200,166,255,0.85)`.
- Trail: three dots of decreasing alpha (`0.45`, `0.28`, `0.14`), 3 px apart along the travel direction, radius 2 px.
- Wall destruction: a 4-line white spark burst (`rgba(220,210,255,0.9)`, 6 px, 0.10 s). No sound.
- Player hit: the standard hit spark plus the existing hurt flash and i-frame rules.
- Projectiles are removed on wall contact, on hitting the player, or on lifetime expiry; they never pass through a wall.

## 4. HUD

- Hearts unchanged: top-left inset 24 px, three 39 × 36 px hearts with 6 px gaps.
- **Skill point counter:** `Skill point: N` at x = 24, text top at y = 74 (10 px below the hearts), `14px system-ui, sans-serif`, baseline `top`. Colour `rgba(255,255,255,0.7)` at 0 and `#f2d38a` from 1 onward.
- **Earn notice:** `Combo complete · +1 skill point`, centered horizontally, text top at y = 72, `18px system-ui, sans-serif`, `#f2d38a`. Fade in 0.15 s, hold 1.1 s, fade out 0.35 s (1.6 s total). One notice per award; a new award restarts the timer.
- Controls hint updated to `WASD move · Mouse aim · LMB combo · Space dodge · R restart`.
- No enemy health bars, no HUD combo meter (the chain pips are drawn in the world), no score.

## 5. Challenge

- A chain tracks how many of its three steps damaged at least one enemy.
- When step 3 resolves and all three steps connected, the run earns **1 skill point**. Award happens once per run (`challengeEarned` flag), even if several chains qualify.
- The award emits `challenge-complete`, updates the HUD counter, and shows the notice.
- On death the point is lost from the HUD view; `R` resets the counter, the flag, and the notice.
- No other challenge and no spending in this version.

## 6. Death, restart, and room clear

- Death freezes simulation and presentation as in `0.1.0`; projectiles, telegraphs, stagger, and hitstop all stop.
- `R` restores: three enemies at their spawns with full HP and no timers, zero projectiles, idle chain, zero skill points, challenge flag false, no notice, full player HP, camera snapped, time 0.
- Room clear sets a flag for the debug snapshot and a single `room-cleared` event; nothing else changes.

## 7. Approved numeric values

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
| Finisher spark | 6 lines × 12 px, 0.16 s |
| **Melee enemy** | |
| Max HP | 10 (was 6) |
| Speed / radius / aggro | 55 px/s / 6 px / 160 px |
| Attack range / telegraph / active / cooldown | 26 px / 0.45 s / 0.1 s / 1.1 s |
| **Ranged enemy** | |
| Max HP | 6 |
| Speed / radius / aggro | 70 px/s / 6 px / 260 px |
| Near / far thresholds | 110 px / 240 px |
| Telegraph / cooldown | 0.5 s / 1.6 s |
| Projectile speed / radius / lifetime / damage | 150 px/s / 4 px / 1.6 s / 1 HP |
| Line-of-sight sample step | 4 px |
| **Player** | unchanged from `0.1.0`: 120 px/s, radius 6, 6 HP, 1 damage taken, 0.6 s i-frames, dodge 64 px / 0.18 s / 0.25 s / 0.9 s |
| **Camera** | unchanged: τ = 0.12 s |
| **Enemy death fade** | 0.25 s |

## 8. Explicit non-goals

No secondary attack, skills, skill-point spending, shop, consumables, currency, loot, boss, procedural floors, safe rooms, persistence, audio, menus. No enemy type beyond melee and ranged; no enemy-enemy collision; no projectile-enemy damage; no waves or respawns; no screen shake; no new art beyond the supplied `imp` frames.

## 9. Assumptions and deviations from `0.1.0`

- **Press-per-hit** replaces `0.1.0`'s hold-to-repeat attack; the operator approved this on 2026-11-02.
- **Hard timing replaces input buffering** (operator revision, 2026-11-03). The original design buffered presses and used a 0.30 s window after recovery, which a steady click could complete. The approved revision removes the buffer, opens a 0.10 s window 0.06 s after the swing lands, and ends the chain on any off-window press. A simulation of steady cadences confirmed that 5 Hz and faster mashing fails while a deliberate reply near 3.3–4.4 Hz succeeds.
- **Taking damage ends the chain** (operator-approved 2026-11-03). The original design left the chain running through damage; the revision makes damage a break reason while preserving a hit that already resolved.
- **In-world chain pips** (operator-approved 2026-11-03). The original design deliberately omitted combo UI; playtesting showed the reply window was unreadable without a cue, so three pips above the player now show progress and pulse on the open window.
- **Hit reaction** moves from a global "last hit timestamp" in the visual-effects layer to a per-enemy `hurtFlash` domain timer, because several enemies can be hit at once.
- **Difficulty:** melee HP rises 6 → 10 and the ranged enemy has 6 HP so the 2/2/4 chain has meaning (operator-approved).
- **Projectile art** is procedural; the pack has no projectile frame and no new art was supplied.
- The `imp` has no hurt frame, so its hit feedback is the white flash only.

## 10. Mapping to the design task's acceptance criteria

1. Combo timing/damage/arc/stagger table: §1.2, §7.
2. Per-step visuals, window feedback, reset: §1.4 (including the in-world pips and break burst).
3. Ranged state presentation, band/fire/LOS values: §2.3.
4. Projectile visual and physical definition: §3, §7.
5. Skill-point HUD and notice: §4.
6. Spawn positions and opening framing: §2.4.
7. Enemy HP values and re-tuning: §2, §7, §9.
8. No new assets or dependencies: §8.
9. No scope expansion: §8.
10. Pure, testable rules: every value in §7 is a config constant; §1–§5 contain no presentation dependency.
