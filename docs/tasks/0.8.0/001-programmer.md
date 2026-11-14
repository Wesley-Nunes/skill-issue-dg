# 0.8.0 / 001 — Programmer task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.8.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Blocked — waiting for design decisions` |
| Depends on | `docs/tasks/0.8.0/001-design.md`; `design/0.8.0/design-decisions.md` |
| Produces | `programmer/0.8.0/CoT.md`, source and test changes |
| Hands off to | `docs/tasks/0.8.0/001-qa.md` |

## 2. Context

- The three-hit chain lives in `src/game/systems/combo.ts`, with state fields
  in `src/game/types/index.ts` and `src/state/initialState.ts`, orchestration in
  `src/game/engine/game.ts`, a gauge and per-step sweep in
  `src/ui/rendering/renderer.ts`, break effects in
  `src/ui/rendering/effects.ts`, tuning in `COMBO` (`src/game/data/config.ts`),
  and coverage in `game.test.ts`, `combo.test.ts`, and the Cypress specs.
- `cypress/support/commands.ts` uses `comboStep` and `comboResolved` to decide
  whether a retry is safe. That heuristic must keep working after the fields
  are removed.
- Enemy and boss stats are flat constants (`MELEE`, `RANGED`, `BOSS`); the
  floor's three spawns are hardcoded in `src/game/data/floor.ts`. A `depth`
  value already exists on the generated floor and the run state.
- Spirit fragments, the spirit meter, the shop, the Warden summon, the arena
  gate, and descent are working behavior and must not regress.

## 3. Objective

Replace the three-hit light chain with one clearly defined light attack, and
apply a deterministic depth-scaled difficulty curve to mobs and the Warden,
including a melee-only teaching floor at depth 1 — with no other gameplay,
economy, or presentation change.

## 4. In scope

1. **Remove the chain completely.** Delete the combo system and its tests, the
   chain state fields, the `combo-ended` event and its effect handler, the
   chain gauge, per-step sweep geometry, the finisher hold, and the `COMBO`
   config. Remove dead config such as `BOSS.staggerScale` and any stagger
   application that existed only for the finisher.
2. **Implement the single attack.** Add one attack definition using the values
   from `design/0.8.0/design-decisions.md` and a pure rule module that resolves
   its windup, active window, recovery, arc, damage, and knockback. Preserve the
   existing input semantics: one press produces one swing; holding does not
   repeat.
3. **Preserve fragment interaction.** A swing breaks any intact fragment inside
   its arc, including several at once. Existing restoration on HP loss and the
   failed-rite respawn are unchanged.
4. **Add depth scaling.** Add one pure function in `src/game/systems/` that maps
   depth to the scaled statistics in the design table. Apply it when mobs and
   the Warden are instantiated, including after descent. Movement speed is not
   scaled. The function must be exhaustive, deterministic, and clamped at the
   design's stated cap.
5. **Depth-1 composition.** Depth 1 spawns melee mobs only; every later depth
   keeps two melee and one ranged mob. Preserve spawn ids and positions.
6. **Rework test infrastructure.** Replace the combo-dependent retry heuristic
   in `cypress/support/commands.ts` with one based on observable combat facts
   that still exist, without weakening its safety guarantees.
7. **Update the debug snapshot** used by Cypress: remove chain fields, keep the
   `VITE_E2E`/DEV gate, and expose whatever depth-scaling state the tests need.
8. **Tests.** Unit coverage for the attack rules, fragment interaction, the
   scaling function, and depth composition. Cypress coverage for the affected
   flows, including the depth-1 to depth-2 transition.
9. **Documentation of decisions.** Record non-obvious implementation choices in
   `programmer/0.8.0/CoT.md`.

## 5. Out of scope

- Challenge cards, combo rewards, buffs, or status effects.
- Economy changes: skill points, prices, healing, and Vigor stay as they are.
- New enemy archetypes, enemy counts, rooms, branch topology, or boss patterns.
- Tutorial prompts, overlays, hints, settings, key remapping, persistence, or
  meta-progression.
- New art, new audio, new dependencies, and unrelated refactors.

## 6. Approved behavior

- One click performs one swing with the design's timings, arc, damage, and
  knockback. Repeated clicks are limited only by recovery.
- A swing breaks every intact fragment inside its arc.
- Taking damage still restores every broken fragment on every living mob.
- A mob killed with an intact fragment still respawns after the configured
  delay with full HP and fragments.
- Enemies and the Warden follow the design's depth table at every depth; depth
  is the run's current floor depth and updates on descent.
- Depth 1 contains three melee mobs; later depths contain two melee and one
  ranged mob.
- Nothing staggers or interrupts the Warden; telegraphed melee and bombs are
  avoided by movement and dodging.
- The HUD no longer shows chain pips and gains no new element.
- Skill points, draught, Vigor, spirit, gate, shop, summon, and descent behave
  exactly as in `0.7.0`.

## 7. Constraints

- KISS and YAGNI: one attack definition and one scaling function; no
  configurable difficulty, no registry of curves, no extension points.
- SoC: rules stay pure and side-effect-free in `game/systems/`; no rendering
  decisions inside rules and no game outcomes decided in rendering.
- Keep existing TypeScript, naming, formatting, and test conventions.
- No new runtime dependencies.
- Preserve deterministic seeded behavior.

## 8. Acceptance criteria

1. `src/` contains no chain system, state, event, gauge, or config: no
   `comboStep`, `comboHits`, `comboResolved`, `comboWindowOpen`, `combo-ended`,
   `ComboStep`, or `COMBO` references remain, and no orphaned stagger config
   remains.
2. A single press produces exactly one swing; holding the button does not
   repeat and does not buffer a second swing.
3. The swing breaks fragments per §6 and this is covered by unit tests.
4. `scalingForDepth` is pure, deterministic, monotonic in the intended
   directions, clamps at the design cap, and returns the design's depth-1
   values; unit tests assert each scaled statistic at depth 1, an intermediate
   depth, and the cap.
5. Depth 1 generates three melee spawns; depth 2 and later generate two melee
   and one ranged spawn with unchanged ids and positions; a unit test asserts
   both cases.
6. Mobs and the Warden receive the scaled values on generation and after
   descent; an automated test proves a later depth's mob has different HP from
   depth 1.
7. Repeated hits never delay or interrupt the Warden's melee or bomb; the
   removal is covered by a regression test or an equivalent assertion.
8. The HUD renders no chain pips, and no new HUD element appears.
9. Cypress retry helpers no longer reference removed fields and the suite is
   stable across three consecutive runs.
10. `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` pass.
11. The production bundle contains no `__gameDebug` hook, and no new asset or
    dependency is added.
12. `programmer/0.8.0/CoT.md` records the code-to-decision mapping and the
    commit hashes.

## 9. Dependencies and handoff

- **Inputs:** this task, `design/0.8.0/design-decisions.md`, the product
  overview, and the `0.7.0` implementation.
- **Output:** implementation, tests, `programmer/0.8.0/CoT.md`, and one or more
  commits in the repository commit format.
- **Next owner:** `qa` (`001-qa.md`). The orchestrator reviews the diff before
  QA starts.

## 10. Open assumptions / unresolved items

- The design document owns every numeric value; if a value is missing, stop and
  ask the orchestrator rather than inventing one.
- Assumption: the attack's sweep art can be drawn procedurally with the
  existing effects code, so no new asset is required.
- Unresolved: none.
