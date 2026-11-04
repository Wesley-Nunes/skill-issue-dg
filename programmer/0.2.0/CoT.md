# Implementation decision log — 0.2.0 spirit purification

Owner: `programmer` · Task `0.2.0/002` · Inputs: `design/0.2.0/design-decisions.md` (approved 2026-11-04), `docs/tasks/0.2.0/002-programmer.md`, `programmer/0.1.0/CoT.md`.

## Summary

The `0.1.0` combat slice now runs a dark-fantasy liberation loop. Each of the two melee enemies and the ranged imp carries two orbiting spirit fragments. The hard-timed light combo breaks intact fragments inside its arc. Any HP loss restores every broken fragment on every living enemy; dodges and i-frames that prevent the loss are safe. A mob killed with fragments intact is a failed rite and returns to its spawn after 2 s with full HP and a fresh rite. A mob killed with all fragments broken is put to rest permanently and grants 34 spirit. At 100 spirit the run freezes on a “Floor purified / The boss awaits” overlay; `R` restarts.

Skill points, the combo challenge, the earn notice, room clear, and drops are removed. The combo, chain pips, two melee + one ranged composition, projectiles, camera, death, and restart are retained.

## Source changes

```text
src/game/types/index.ts        GameStatus "purified", enemy fragments/home/rested/respawn, run spirit/floorPurified, new events, snapshot fields
src/game/data/config.ts        PURIFICATION values (angles, orbit, colour, spirit, respawn)
src/state/initialState.ts      fragment arrays, home position, rested/respawn, run spirit
src/game/systems/purification.ts  fragment positions, arc breaking, restoration, revive, respawn tick, spirit clamp
src/game/engine/game.ts        fragment-before-damage resolution, rest vs respawn death, spirit/purified state, HP-loss restoration, respawn ticking, snapshot
src/ui/rendering/effects.ts    fragment/restore/rest/respawn sparks; notice removed
src/ui/rendering/renderer.ts   fragment orbs, ready aura/tint, spirit HUD, purified overlay; skill counter/notice removed
src/game/systems/challenge.ts  removed
```

No new dependency and no new asset.

## Frame flow

`input.sample` → `game.step` (non-playing restart gate → hitstop gate → player timers/dodge/movement → combo tick → first-active-frame fragment and damage resolution → enemy AI and respawns → projectiles → camera → time) → `renderer.draw` (events into transient effects, then world, entities, fragments, projectiles, sword/arc, telegraphs, sparks, chain pips, HUD, overlay).

Domain rules live in `src/game/systems`; the engine sequences them. Rendering only samples state and events.

## Key decisions and interpretations

- **Fragment model.** `Enemy.fragments` is a boolean array, one entry per angle in `PURIFICATION.angles`. `true` means intact. This keeps per-fragment rendering and partial progress simple without a fragment entity system.
- **Fragment position.** `fragmentPosition(enemy, index)` uses the enemy's current position, an orbit centre 10 px above its feet, radius 12 px, and the approved −135° / −45° angles. The renderer adds the ±1.2 px idle bob; hit detection uses the fixed orbit so timing is deterministic.
- **Break ordering.** `resolveComboStep` breaks fragments before applying enemy damage. A final swing can therefore break the last fragment and kill the mob in the same step, which is the generous reading of “once all fragments are broken, the mob can be killed permanently.”
- **Connected-step definition.** A step counts as connected when it breaks at least one fragment or damages at least one enemy body. Breaking an orb while missing the body still advances the combo, so fragment aiming does not fight the combo timing.
- **Rest snapshot.** The engine captures `canRest(next)` before applying damage, because `damageEnemy` moves the enemy to `dying`. A dying enemy is not “alive” for `canRest`.
- **Permanent rest vs failed rite.** On a lethal hit, `rested` is set and `respawn` stays 0 when all fragments were broken. Otherwise `respawn` is set to 2 s and `enemy-died` is emitted. Both still play the 0.25 s fade; the rested one simply never returns.
- **Respawn.** `tickRespawn` only advances a `dead`, non-rested enemy with a positive timer. It returns the enemy to `homeX/homeY`, restores HP, clears timers, restores all fragments, and clears `rested`/`respawn`. The engine emits `enemy-respawned`.
- **HP-loss restoration.** The engine restores fragments only after `damagePlayer` reports `applied: true`. Invulnerability that blocks damage never restores anything, so dodge and i-frame play is safe. Restoration maps every living enemy and emits one event per changed enemy.
- **No HP reset on restoration.** `restoreFragments` changes only the fragment array. Position, HP, AI timers, and aggro are untouched.
- **Spirit.** `addSpirit` clamps at 100. Each rest adds 34. The run sets `floorPurified` and `GameStatus = "purified"` once, then emits `floor-purified`. The third rested mob fills the meter (3 × 34 = 102 → 100).
- **Freeze.** `Game.step` treats every non-playing status the same: ignore gameplay, accept `R`, reset. The purified overlay is drawn after the HUD, so it covers the frozen frame.
- **Renderer cues.** Intact fragments are pale-blue orbs with a soft glow and a white core. A ready mob gets a `rgba(191,233,255,0.4)` tint and a pulsing 13 px ring. Rest, restore, break, and respawn events use different spark counts/colours/lifetimes.
- **Spirit HUD.** `Spirit: N%` is drawn at x 24 / top y 74 in `#bfe9ff` from 1 upward and white-70 at 0. The 120 × 6 bar sits at y 92 with a translucent track and 1 px border. The old skill-point counter and notice are gone.
- **Purified overlay.** Full-viewport `rgba(5,10,16,0.72)`, `Floor purified` at 48 px, `The boss awaits` at 20 px, and `Press R to restart` at 16 px, all centered.
- **Removed code.** `challenge.ts`, `challenge.test.ts`, `comboAwardsPoint`, `challenge-complete`, `room-cleared`, `roomCleared`, `challengeEarned`, `skillPoints`, and the notice timer were deleted rather than left dormant.

## Deviations, assumptions, and trade-offs

1. **Fragment hit is generous.** Because the two fragments sit 49° apart and the step-1 arc is 110° wide, a swing aimed between them at close range usually breaks both. This matches “a swing can break multiple fragments” and keeps the rite readable; increasing difficulty later should come from fragment count/order/movement, not a hidden narrower arc.
2. **Same-swing completion.** Fragments resolve before damage so the killing swing can complete the rite. This was not separately specified; it is recorded in the design as an assumption.
3. **Ready-to-rest cue.** The operator did not specify the cue. A pale tint plus pulsing ring was chosen as a reversible default because the design task requires every state to be visible.
4. **Respawn timing.** The 2 s timer starts at the lethal hit, but the 0.25 s fade also runs, so the mob reappears about 2.25 s after death. This matches “~2 s” without adding a second timer.
5. **Spirit total.** Three mobs grant 102 raw spirit, clamped to 100. The meter therefore fills on the third rest without requiring a fourth mob.
6. **Visual capture.** A temporary Cypress spec captured the boot frame, a broken fragment, and the ready-to-rest tint/ring. It was deleted and is not part of the test suite.

## Tests and commands

Unit (`npm test`, 123 tests across 12 files): fragment positions, arc break, out-of-arc and dead-enemy cases, restoration, restability, revive, respawn countdown, rested-never-revives, spirit clamp; engine fragment breaking, fragment-break-as-connected-step when the body misses (QA-added regression), conventional respawn, permanent rest + spirit, HP-loss restoration, i-frame/dodge safety, purified freeze + restart, restart reset; retained combo, attack, damage, dodge, camera, enemy, projectile, vision, movement, and effect tests.

Browser (`npm run e2e`, 15 tests): boot with three enemies and intact fragments, floor/hearts HUD, movement, one-press damage, death + `R`, a fragment break with the light attack, mash never reaches the finisher, restart clears spirit/fragments, projectile fire/hit, death freeze and repeated restarts, plus the `0.1.0` resize/camera/pointer/dodge/aim-away regressions.

Commands run:

```text
npm run typecheck   pass
npm test            pass, 123/123
npm run build       pass (25 modules; no __gameDebug in the production bundle)
npm run e2e         pass, 15/15
```

## Known limitations

- Headless Cypress throttles `requestAnimationFrame`; tests poll the debug snapshot and settle the camera before world-space clicks.
- The purified overlay was not reached through a full three-mob browser clear; it is covered by the engine unit test and code inspection, and the ready/fragment visuals were captured separately.
- No audio, menus, persistence, skill spending, drops, boss, or floors by design.
