# Implementation decision log — 0.2.0 combat depth

Owner: `programmer` · Task `0.2.0/001` · Inputs: `design/0.2.0/design-decisions.md` (approved), `docs/tasks/0.2.0/001-programmer.md`, `programmer/0.1.0/CoT.md`.

## Summary

The `0.1.0` single-enemy slice now runs a hand-placed encounter of two melee chasers and one kiting ranged enemy, fought with a three-step combo chain. Landing all three steps of one chain awards one skill point for the run, shown in the HUD. Spawns, timings, damage, arcs, telegraph, projectile values, stagger, knockback, hitstop, and HUD values are the approved design values.

## Source changes

```text
src/game/types/index.ts        Enemy kind/id/timers, Projectile, RunState, combo player state, extended events/snapshot
src/game/data/config.ts        COMBO, MELEE, RANGED, PROJECTILE, ENEMY_SPAWNS, IMPACT, ENEMY_FADE; ATTACK/ENEMY removed
src/game/data/sprites.ts       imp idle/run frames registered in the manifest
src/game/systems/combo.ts      chain state machine: phase, step lookup, buffer, advance, whiff/timeout reset
src/game/systems/challenge.ts  pure once-per-run award predicate
src/game/systems/vision.ts     4 px segment sampling against the walkable room
src/game/systems/projectile.ts spawn, advance with wall/lifetime checks, player overlap
src/game/systems/enemy.ts      melee + ranged AI, telegraph, shot release, stagger
src/game/systems/attack.ts     arc test now takes reach/half-angle (no swing timers)
src/game/systems/damage.ts     per-enemy hurt flash, enemy knockback, player damage unchanged
src/game/engine/game.ts        multi-enemy stepping, combo resolution, hitstop, projectiles, challenge, room clear
src/state/initialState.ts      three spawns, projectile/combo/run factories
src/ui/input/input.ts          edge-triggered attack press (mousedown), no hold repeat
src/ui/rendering/effects.ts    per-step swing/spark sizes, award notice, reset clearing
src/ui/rendering/renderer.ts   multi-enemy draw order, imp, projectiles, finisher arc, skill HUD/notice
package.json / lock           version 0.1.0 → 0.2.0
```

No new dependencies, no new layers, and no asset changes beyond the supplied `imp` frames.

## Frame flow

`input.sample` → `game.step` (hitstop gate → player timers/dodge/movement → combo tick → first-active-frame hit resolution → enemy AI and damage → projectiles → room clear → camera → time) → `renderer.draw` (events into transient effects, then world, entities, projectiles, sword/arc, telegraphs, sparks, HUD).

Domain rules stay in `src/game/systems`; the engine only sequences them. Rendering and input never decide hits, damage, or death.

## Key decisions and interpretations

- **Press-per-hit.** `Input` queues one attack on each left `mousedown`; holding no longer repeats. This is the approved `0.1.0` change, so every Cypress attack step dispatches its own press.
- **Chain model.** `comboStep` 0–3 plus `comboTime`, `comboHits`, `comboQueued`, `comboResolved`, `comboHitThisStep`. A press while idle starts step 1; a press during a step buffers the next step. Advancing happens when the step's windup+active+recovery ends (or immediately when a press arrives inside the window); a whiffed step ends the chain at the end of its recovery and discards the buffered press; an expired window resets it.
- **Hit resolution.** Each step resolves once, on its first active frame, against every alive enemy in its reach/cone. The `comboResolved` guard is what prevents a second hit in the same step.
- **Hitstop.** The finisher sets 0.06 s of hitstop once per swing when at least one enemy is hit; `Game.step` freezes all simulation while it lasts but still buffers attack presses. It never applies while dead.
- **Finisher impact.** Stagger is applied before knockback; a dying enemy is neither staggered nor moved. Stagger takes the max of the current and new duration and cancels windup/active, so a stunned enemy cannot release an attack.
- **Ranged spacing priority.** Retreating (< 110 px) and closing (> 240 px) take priority over firing; the imp fires only while holding inside the 110–240 px band, on a ready cooldown, with a clear line of sight. This is how the design's "retreat inside the near threshold" and "fire within 240 px" rules coexist.
- **Line of sight.** A segment from imp center to player center sampled every 4 px against the room's walkable bounds. The shipped room is a convex rectangle with no interior walls, so the check always passes in play; it is unit-tested and keeps the rule explicit for future rooms. `docs/tasks/0.2.0/001-qa.md` scenario 14 was reconciled to that fact.
- **Projectiles.** Spawned 10 px from the imp toward the player's position at the moment of firing (no leading), 150 px/s, 4 px radius, 1.6 s lifetime. The `dt` clamp (≤ 0.05 s in `src/index.ts`) moves a projectile at most 7.5 px per frame, and any position outside the room bounds is destroyed, so it cannot reach a walkable area through a wall. They damage only the player, are consumed on a player hit even when invulnerability blocks the damage, and are cancelled by walls and lifetime.
- **Hurt feedback.** The global "last hit time" was replaced by a per-enemy `hurtFlash` timer (0.08 s), because several enemies can be hit in one frame. The imp has no hurt frame in the pack, so its flash is a code tint.
- **Challenge.** A chain counts a step when it damaged at least one enemy. When step 3 resolves with all three counted, the run sets `challengeEarned`, adds 1 skill point, emits `challenge-complete`, and shows the notice. Later full chains award nothing. The flag and points persist while dead so `R` is the reset point; the counter and notice are hidden by the death overlay, matching "lost from the HUD view".
- **Room clear.** Checked after enemy updates; `roomCleared` plus a single `room-cleared` event. The run keeps playing.
- **Restart.** `R` is read only while dead, as in `0.1.0`; `createInitialState()` restores spawns, projectiles, combo state, skill points, and the challenge flag, and the camera snaps. A `run-reset` event clears transient effects.
- **HUD.** Hearts unchanged. `Skill point: N` is drawn with its text top at y = 74 (the design's value), white-70 at 0 and `#f2d38a` above 0. The centered notice uses 0.15 s in / 1.1 s hold / 0.35 s out.
- **Death.** The skill counter and notice are not drawn while dead; the death overlay covers the HUD as before.

## Deviations, assumptions, and trade-offs

1. **Arc "thickness".** The design repeats `0.1.0`'s "thickness 8/10" language, but the shipped `0.1.0` arc is a filled sector from the player center, not a stroked ring. The finisher keeps that same visual language at radius 40, alpha 0.55, ±80°, with the 0.18 s fade. No separate thickness parameter exists; adding one would change the `0.1.0` look.
2. **In-flight projectiles after the shooter dies.** The design is silent. A projectile already fired keeps travelling until it hits a wall, the player, or expires; only the dead imp stops producing new ones. QA scenario 18 was clarified accordingly.
3. **LOS no-op.** The convex room means the rule cannot be exercised manually; coverage is the pure `hasLineOfSight` tests, the ranged "does not fire without line of sight" test, and code inspection.
4. **Version bump.** `package.json` and the lockfile move to `0.2.0` so the shipped artifact matches the version directory.
5. **No extra abstractions.** The combo is a small pure state machine, the challenge is one predicate, and projectiles are a plain array on the run state; no ECS, no generic ability system.

## Tests and commands

Unit (`npm test`, 105 tests across 12 files): arc boundaries and finisher arc; combo start/phase/advance/buffer/whiff/timeout/finisher hand-back/reset; challenge predicate; line of sight; projectile spawn/travel/wall/lifetime/player overlap; melee AI, ranged band movement, no-fire without cooldown or LOS, telegraph, shot release, wall clamping, stagger; per-enemy damage and knockback; engine-level multi-enemy hits, held-button non-repeat, full-chain award and once-per-run gating, finisher stagger/knockback/hitstop, hitstop freeze and buffering, projectile damage and dodge/invulnerability, room clear, death, restart reset, camera; visual-effect bookkeeping.

Browser (`npm run e2e`, 14 tests): boot with three enemies, painted floor/hearts, movement; one press damages a melee enemy; death and `R`; combo chain awards a point; no second award; restart clears it; ranged projectile fires and damages; death freeze and repeated restart; plus the `0.1.0` resize/camera/pointer/dodge/aim-away regressions.

Commands run:

```text
npm run typecheck   pass
npm test            pass, 105/105
npm run build       pass (25 modules, dist built)
npm run e2e         pass, 14/14
```

## Known limitations

- Cypress throttles `requestAnimationFrame` in headless Electron, so specs poll the debug snapshot and settle the camera before clicking a world position.
- The LOS rule is only meaningful for rooms with interior walls; none are in this version.
- No audio, menus, persistence, skill spending, or secondary attack by design.
