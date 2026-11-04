# Implementation decision log — 0.2.0 combat depth

Owner: `programmer` · Task `0.2.0/001` · Inputs: `design/0.2.0/design-decisions.md` (approved, combo input revised 2026-11-03), `docs/tasks/0.2.0/001-programmer.md`, `programmer/0.1.0/CoT.md`.

## Summary

The `0.1.0` single-enemy slice now runs a hand-placed encounter of two melee chasers and one kiting ranged enemy, fought with a three-step combo chain. The chain uses hard timing: a short reply window opens after each swing lands, and any press outside it ends the chain, so mashing cannot complete it. Three in-world pips show chain progress and pulse on the open window. Landing all three steps of one clean chain awards one skill point for the run, shown in the HUD. Spawns, timings, damage, arcs, telegraph, projectile values, stagger, knockback, hitstop, and HUD values are the approved design values.

## Source changes

```text
src/game/types/index.ts        Enemy kind/id/timers, Projectile, RunState, combo player state, ComboEndReason, combo-ended event, extended snapshot
src/game/data/config.ts        COMBO (reply delay/window/finisher hold), MELEE, RANGED, PROJECTILE, ENEMY_SPAWNS, IMPACT, ENEMY_FADE; ATTACK/ENEMY removed
src/game/data/sprites.ts       imp idle/run frames registered in the manifest
src/game/systems/combo.ts      chain state machine: phase, step lookup, reply window, advance, break reasons, finisher hold
src/game/systems/challenge.ts  pure once-per-run award predicate
src/game/systems/vision.ts     4 px segment sampling against the walkable room
src/game/systems/projectile.ts spawn, advance with wall/lifetime checks, player overlap
src/game/systems/enemy.ts      melee + ranged AI, telegraph, shot release, stagger
src/game/systems/attack.ts     arc test now takes reach/half-angle (no swing timers)
src/game/systems/damage.ts     per-enemy hurt flash, enemy knockback, player damage unchanged
src/game/engine/game.ts        multi-enemy stepping, combo resolution, hitstop, projectiles, challenge, room clear
src/state/initialState.ts      three spawns, projectile/combo/run factories
src/ui/input/input.ts          edge-triggered attack press (mousedown), no hold repeat
src/ui/rendering/effects.ts    per-step swing/spark sizes, chain-break effect, award notice, reset clearing
src/ui/rendering/renderer.ts   multi-enemy draw order, imp, projectiles, finisher arc, chain pips, skill HUD/notice
package.json / lock           version 0.1.0 → 0.2.0
```

No new dependencies, no new layers, and no asset changes beyond the supplied `imp` frames.

## Frame flow

`input.sample` → `game.step` (hitstop gate → player timers/dodge/movement → combo tick → first-active-frame hit resolution → enemy AI and damage → projectiles → room clear → camera → time) → `renderer.draw` (events into transient effects, then world, entities, projectiles, sword/arc, telegraphs, sparks, chain pips, HUD).

Domain rules stay in `src/game/systems`; the engine only sequences them. Rendering and input never decide hits, damage, or death.

## Key decisions and interpretations

- **Press-per-hit.** `Input` queues one attack on each left `mousedown`; holding no longer repeats. This is the approved `0.1.0` change, so every Cypress attack step dispatches its own press.
- **Hard-timed chain.** `comboStep` 0–3 plus `comboTime`, `comboHits`, `comboResolved`, `comboHitThisStep`. The reply window opens at `activeEnd + 0.06 s` and closes `0.10 s` later. A press while idle starts step 1; a press inside the window starts the next step immediately; any other press ends the chain. There is no buffer, so a regular click cadence cannot carry the chain.
- **Break reasons.** `tickCombo` returns `ComboTick { player, started?, ended? }`; the engine emits `combo-ended` with `mistime | whiff | timeout | damage | complete`. `mistime` covers early and late presses and an interrupted finisher; `whiff` covers a step that connects with nothing; `timeout` covers an expired window; `damage` is emitted by the engine when HP is lost mid-chain; `complete` is the successful finisher hand-back.
- **Finisher.** Before it lands, a press breaks the chain. Once it lands, presses are ignored and the chain holds for `0.12 s` before returning to idle. Hitstop drops presses instead of buffering or punishing them, and freezes the window with the simulation.
- **Damage break.** Taking damage resets the chain after the current step's hit resolution, so a swing that already resolved still lands. Damage during death does not emit a break because the run is over.
- **Hit resolution.** Each step resolves once, on its first active frame, against every alive enemy in its reach/cone. The `comboResolved` guard is what prevents a second hit in the same step.
- **Hitstop.** The finisher sets 0.06 s of hitstop once per swing when at least one enemy is hit; `Game.step` freezes all simulation while it lasts. It never applies while dead.
- **Finisher impact.** Stagger is applied before knockback; a dying enemy is neither staggered nor moved. Stagger takes the max of the current and new duration and cancels windup/active, so a stunned enemy cannot release an attack.
- **Ranged spacing priority.** Retreating (< 110 px) and closing (> 240 px) take priority over firing; the imp fires only while holding inside the 110–240 px band, on a ready cooldown, with a clear line of sight. This is how the design's "retreat inside the near threshold" and "fire within 240 px" rules coexist.
- **Line of sight.** A segment from imp center to player center sampled every 4 px against the room's walkable bounds. The shipped room is a convex rectangle with no interior walls, so the check always passes in play; it is unit-tested and keeps the rule explicit for future rooms. `docs/tasks/0.2.0/001-qa.md` scenario 14 was reconciled to that fact.
- **Projectiles.** Spawned 10 px from the imp toward the player's position at the moment of firing (no leading), 150 px/s, 4 px radius, 1.6 s lifetime. The `dt` clamp (≤ 0.05 s in `src/index.ts`) moves a projectile at most 7.5 px per frame, and any position outside the room bounds is destroyed, so it cannot reach a walkable area through a wall. They damage only the player, are consumed on a player hit even when invulnerability blocks the damage, and are cancelled by walls and lifetime.
- **Hurt feedback.** The global "last hit time" was replaced by a per-enemy `hurtFlash` timer (0.08 s), because several enemies can be hit in one frame. The imp has no hurt frame in the pack, so its flash is a code tint.
- **Chain pips.** `drawComboGauge` reads `comboWindowOpen` and `comboHits` and draws three dots at `y − 34`. Connected steps are gold, the current step white, the next dim; the next pip pulses 1.3–1.5× while the window is open. `chainBreaks` effects from `combo-ended` (except `complete`) collapse the pips in red for 0.18 s at the break position. The pips are hidden while idle or dead. Rendering only samples state and effects; it never decides a hit.
- **Challenge.** A chain counts a step when it damaged at least one enemy. When step 3 resolves with all three counted, the run sets `challengeEarned`, adds 1 skill point, emits `challenge-complete`, and shows the notice. Later full chains award nothing. The flag and points persist while dead so `R` is the reset point; the counter and notice are hidden by the death overlay, matching "lost from the HUD view".
- **Room clear.** Checked after enemy updates; `roomCleared` plus a single `room-cleared` event. The run keeps playing.
- **Restart.** `R` is read only while dead, as in `0.1.0`; `createInitialState()` restores spawns, projectiles, combo state, skill points, and the challenge flag, and the camera snaps. A `run-reset` event clears transient effects.
- **HUD.** Hearts unchanged. `Skill point: N` is drawn with its text top at y = 74 (the design's value), white-70 at 0 and `#f2d38a` above 0. The centered notice uses 0.15 s in / 1.1 s hold / 0.35 s out.
- **Death.** The skill counter and notice are not drawn while dead; the death overlay covers the HUD as before.

## Deviations, assumptions, and trade-offs

1. **No input buffer (operator revision, 2026-11-03).** The original implementation buffered presses and used a 0.30 s window after recovery, which a steady mash could complete. The revised rule opens the window 0.06 s after the active frames for 0.10 s and treats any off-window press as a break. A local simulation showed 5 Hz+ mashing failing while a deliberate 3.3–4.4 Hz reply succeeds; a clean chain deals about 9 DPS versus about 5 DPS for mash-only step-1 pokes.
2. **Damage breaks the chain (operator-approved, 2026-11-03).** The original design let the chain continue through damage. The revised rule resets it after the current swing resolves.
3. **In-world pips (operator-approved, 2026-11-03).** The original design omitted combo UI. The reply window was unreadable without a cue, so three pips now show progress and pulse on the window; this is not a HUD meter.
4. **Arc "thickness".** The design repeats `0.1.0`'s "thickness 8/10" language, but the shipped `0.1.0` arc is a filled sector from the player center, not a stroked ring. The finisher keeps that same visual language at radius 40, alpha 0.55, ±80°, with the 0.18 s fade. No separate thickness parameter exists; adding one would change the `0.1.0` look.
5. **In-flight projectiles after the shooter dies.** The design is silent. A projectile already fired keeps travelling until it hits a wall, the player, or expires; only the dead imp stops producing new ones. QA scenario 18 was clarified accordingly.
6. **LOS no-op.** The convex room means the rule cannot be exercised manually; coverage is the pure `hasLineOfSight` tests, the ranged "does not fire without line of sight" test, and code inspection.
7. **Version bump.** `package.json` and the lockfile move to `0.2.0` so the shipped artifact matches the version directory.
8. **No extra abstractions.** The combo is a small pure state machine, the challenge is one predicate, and projectiles are a plain array on the run state; no ECS, no generic ability system.

## Tests and commands

Unit (`npm test`, 111 tests across 12 files): arc boundaries and finisher arc; combo start, phase, reply-window delay and width, early/late press breaks, hitstop drop, whiff, timeout, finisher interrupt/hold/complete, damage break, and reset; challenge predicate; line of sight; projectile spawn/travel/wall/lifetime/player overlap; melee AI, ranged band movement, no-fire without cooldown or LOS, telegraph, shot release, wall clamping, stagger; per-enemy damage and knockback; engine-level multi-enemy hits, held-button non-repeat, timed full-chain award and once-per-run gating, mash and 5 Hz non-completion, finisher stagger/knockback/hitstop, projectile damage and dodge/invulnerability, room clear, death, restart reset, camera; visual-effect bookkeeping.

Browser (`npm run e2e`, 15 tests): boot with three enemies, painted floor/hearts, movement; one press damages a melee enemy; death and `R`; timed chain awards a point; mashing never reaches the finisher; no second award; restart clears it; ranged projectile fires and damages; death freeze and repeated restart; plus the `0.1.0` resize/camera/pointer/dodge/aim-away regressions.

Visual capture (temporary Cypress canvas captures in `/tmp/opencode/qa-shots/`, not committed): idle hides the pips; an open step-1 window shows one gold, one white, one dim pip above the player; the landed finisher shows three gold pips with a larger third; the completed chain hides them; an early press shows the red collapse.

Commands run:

```text
npm run typecheck   pass
npm test            pass, 111/111
npm run build       pass (25 modules; no __gameDebug in the production bundle)
npm run e2e         pass, 15/15
```

## Known limitations

- Cypress throttles `requestAnimationFrame` in headless Electron, so specs poll the debug snapshot at 25 ms and settle the camera before clicking a world position.
- The LOS rule is only meaningful for rooms with interior walls; none are in this version.
- No audio, menus, persistence, skill spending, or secondary attack by design.
