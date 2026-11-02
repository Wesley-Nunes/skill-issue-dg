# 001 — Programmer: combat depth

## Metadata

| Field | Value |
|---|---|
| Version | `0.2.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Not started` |
| Depends on | Approved `design/0.2.0/design-decisions.md` |
| Produces | Implementation in `src/`, unit and Cypress tests, `programmer/0.2.0/CoT.md` |
| Next task | `docs/tasks/0.2.0/001-qa.md` |

Source links: `docs/about-the-project.md` §3.2–§3.4, §5.1, §7–§8, §11 priority 4; `design/0.2.0/design-decisions.md`; `programmer/0.1.0/CoT.md`.

## Context

- `0.1.0` is merged to `dev`. The app has one hand-authored room, one player, one melee enemy, a single-swing attack, dodge, hearts, camera, death overlay, and `R` restart, with 56 unit tests and 11 Cypress tests.
- `GameState` holds a single `enemy`. `0.2.0` requires several enemies plus projectiles, so the list refactor touches spawns, hit resolution, enemy stepping, draw order, camera bounds, debug snapshot, and restart.
- All rules live in pure `src/game/systems` functions and are orchestrated by `src/game/engine/game.ts`; tuning lives in `src/game/data/config.ts`; rendering and input live under `src/ui/`.
- The new `imp` frames (16 × 16, idle/run) are committed in `public/assets/dungeon-tileset-ii/frames/`. There is no projectile sprite and no `imp` hurt frame, so the projectile is drawn procedurally and the ranged enemy's hit feedback is code-drawn.

## Objective

Deliver a room where the player fights two melee enemies and one kiting ranged enemy with a three-hit combo chain, earns one skill point by landing a full chain, and sees it in the HUD — with every new rule covered by pure unit tests and browser coverage.

## In scope

1. **State refactor**
   - Replace `GameState.enemy` with `enemies: Enemy[]` and add `projectiles: Projectile[]`.
   - Give each enemy an archetype (`melee` | `ranged`) and its own timers/state so several enemies act independently.
   - Add run-scoped combo state on the player and run-scoped challenge state (`skillPoints`, challenge-earned flag).
2. **Three-hit combo**
   - Replace the single swing with a three-step chain using the design's windup/active/recovery timings, arcs, reach, and damage ladder (2 / 2 / 4).
   - Buffer attack input during a swing into the next step; advance only inside the chain window.
   - End the chain on a whiff or an expired window; the next press starts again at step one.
   - Each step damages every enemy inside its arc, each enemy at most once per step.
   - The finisher applies the designed stagger to enemies it hits and uses its wider arc.
   - Dodge during a swing cancels the swing and ends the chain (unless the design says otherwise).
3. **Ranged enemy archetype**
   - Kiting behaviour: retreat inside the near threshold, approach beyond the far threshold, hold otherwise; respect walls.
   - Fire only with line of sight, after the designed telegraph, on the designed cooldown; one projectile per attack.
   - Projectile travel, radius, speed, lifetime, wall destruction without tunneling, and player damage gated by the existing invulnerability timer; a projectile is consumed on hit and damages only the player.
4. **Room composition and clear state**
   - Two melee and one ranged enemy at the design's fixed spawns; no spawn overlaps a wall or another enemy.
   - Room clears when all enemies are dead; nothing respawns; clearing does not end the run.
5. **Skill challenge and HUD**
   - Track a chain's connected hits; award exactly 1 skill point the first time all three hits of one chain connect.
   - Render the skill-point counter in the HUD and the designed earn notice; counter and notice reset on death/restart.
6. **Death and restart**
   - Freeze all gameplay (including projectiles and telegraphs) while dead; `R` restores the exact initial state including all enemies, projectiles, combo state, skill points, and challenge flag.
7. **Debug snapshot**
   - Extend the read-only snapshot with the enemy list, projectiles, combo step/chain state, skill points, challenge flag, and room-clear flag so browser tests can assert them.
8. **Tests**
   - Unit tests for every new rule; Cypress coverage for the combo, ranged projectile, challenge award, restart, and existing behaviour regressions.

## Out of scope

- Secondary attack, skills or skill-point spending, shop, consumables, currency, loot, boss, procedural floors, safe rooms, persistence, audio, menus.
- Enemy types beyond melee and ranged; enemy-enemy collision; projectile-enemy damage; waves or respawns; difficulty scaling.
- New art, new dependencies, engine/framework rewrites, ECS or entity-component abstraction.
- Rewriting `0.1.0` systems beyond what the list refactor and combo require.

## Approved behavior

Operator-approved on 2026-11-02 (recorded in `docs/about-the-project.md` §3.2, §3.3, §5.1):

- Three-hit chain, damage 2 / 2 / 4, wider finisher arc, brief stagger on the finisher, ~0.30 s chain window, buffered input, whiff or timeout ends the chain.
- Ranged enemy kites in a mid-range band, fires only with line of sight after a ~0.5 s telegraph, projectile ~150 px/s, 1 damage, destroyed by walls.
- Fixed composition of 2 melee + 1 ranged at hand-placed spawns; room clears when all die; no respawn; clearing does not win the run.
- 1 skill point the first time all three hits of one chain connect in a run; shown in the HUD; lost on death; cleared by `R`.
- Ranged enemy uses the supplied `imp` frames; the projectile is procedural.

Rules to preserve from `0.1.0`:

- Attack direction is the mouse aim direction; no auto-targeting.
- Movement, diagonal normalization, wall sliding, dodge distance/duration/cooldown/i-frames, player HP, enemy melee telegraph/cooldown, camera clamping and smoothing, and the death overlay behave as in `0.1.0` unless the design changes a value.
- Taking damage does not reset the chain.
- Game outcomes are decided only in `src/game/systems` and `src/state`; rendering and input never decide hits, damage, or death.

## Constraints

- Architecture per `docs/about-the-project.md` §8: authored data in `src/game/data/`, pure rules in `src/game/systems/`, orchestration in `src/game/engine/`, runtime state in `src/state/`, presentation in `src/ui/`. No new layers or abstractions.
- `src/game/systems` functions stay pure: same inputs, same outputs, no DOM, no Canvas, no globals, no wall-clock reads.
- Every tuning value comes from the approved design and lives in `src/game/data/config.ts`; do not duplicate values across systems or rendering.
- No new dependencies. Existing scripts (`dev`, `build`, `preview`, `typecheck`, `test`, `e2e`) keep working; `npm run e2e` continues to run against the built bundle.
- TypeScript strict mode; no `any` in domain code without a documented reason.
- Do not modify the asset pack or its license files; register the new `imp` frames in the existing sprite manifest.
- Keep the existing event/effect mechanism for feedback; no new rendering framework.

## Acceptance criteria

1. The room contains exactly three enemies at boot: two melee at the design spawns and one ranged at its design spawn, none overlapping walls or each other.
2. Attack input produces a three-step chain with the approved timings, arcs, reach, and damage; the finisher uses its wider arc and staggers enemies it hits for the approved duration.
3. Attack input during a swing is buffered and advances the chain inside the window; pressing after the window starts a new chain at step one.
4. A whiff and a timeout each end the chain, and the next press starts at step one.
5. A step damages every enemy inside its arc and never damages the same enemy twice in one step.
6. The ranged enemy retreats inside the near band, approaches beyond the far band, holds otherwise, respects walls, and does not fire without line of sight or before its telegraph completes.
7. A fired projectile travels at the approved speed, damages the player once for 1, is blocked by invulnerability, is destroyed on a wall or on hit, and cannot tunnel through walls at the clamped frame delta.
8. The first chain in a run whose three hits all connect awards exactly 1 skill point once; subsequent full chains award nothing, and the HUD counter and earn notice reflect the award.
9. Skill points, the challenge flag, combo state, projectiles, and all enemies reset exactly on `R`; death clears the earned point as designed.
10. Killing all three enemies marks the room clear and does not end the run; the player can still move, attack, and die.
11. Gameplay including projectiles freezes while dead; only `R` is accepted.
12. The debug snapshot exposes the enemy list, projectiles, combo step, chain state, skill points, challenge flag, and room-clear flag, and grants no gameplay control.
13. `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` pass; unit tests cover the combo state machine, multi-enemy hit resolution, stagger, ranged spacing and line of sight, projectile travel/wall/hit, challenge award and once-per-run gating, room clear, and restart.
14. Cypress verifies a combo damages enemies, the ranged enemy fires and its projectile can be dodged, a full chain awards the point and updates the HUD, and restart clears it.
15. No "Out of scope" item is implemented, and the `0.1.0` behaviours above still pass their tests.

## Dependencies and handoff

Inputs: approved design decisions, this task, committed assets, the `0.1.0` implementation.

Outputs: working implementation, tests, and `programmer/0.2.0/CoT.md` documenting decisions, final tuning values, deviations, and the commands run. Then hand off to QA.

## Open assumptions / unresolved items

- Any value missing from the design decisions: **owner design**; return it to design instead of inventing it.
- Line-of-sight sampling strategy (tile stepping vs segment sampling) is an implementation choice; document it in the `CoT.md`.
- Frame-time clamp behaviour for fast projectiles: reuse the existing clamp; document any additional sub-stepping.
- Enemy HP values arrive with the approved design; if the design does not settle them, ask the orchestrator.
