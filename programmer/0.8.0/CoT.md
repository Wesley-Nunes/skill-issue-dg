# Implementation decisions — 0.8.0 one committed light attack and depth curve

Owner: `programmer` (executed by the orchestrator) · Task `0.8.0/001` ·
Implemented on 2026-11-13.

Source contract: `docs/tasks/0.8.0/001-programmer.md` and
`design/0.8.0/design-decisions.md`.

## 1. Scope delivered

- The three-hit light chain is deleted: `systems/combo.ts`, its tests, the
  `COMBO` config, chain player fields, `combo-ended`, the three-pip gauge,
  per-step sweep geometry, the finisher hold, the chain-break effect, the
  finisher spark and audio cue, and `BOSS.staggerScale`.
- One committed light swing replaces it: 0.10 s windup, 0.09 s active, 0.22 s
  recovery, 2 damage, 36 px reach, 60° half-angle, 6 px knockback, 0.05 s
  hitstop, no stagger. One press starts one swing; holding does not repeat and
  a press during a swing is ignored rather than buffered.
- Fragments still break before damage and a single swing can break both; HP
  loss still restores every broken fragment; a failed rite still respawns.
- A pure depth curve (`systems/depth.ts`) scales HP and attack cadence, and
  steps damage at the design thresholds. The Warden and every mob receive the
  scaled numbers when instantiated, including after descent.
- Depth 1 spawns three melee mobs; depth 2 and later spawn two melee and one
  ranged. Spawn ids and positions are unchanged apart from the documented
  `ranged-3` → `mob-3` id, which no longer describes a fixed kind.
- Existing speed, aggro radius, attack range, windup, projectile speed/size,
  economy, HUD layout, art, audio assets, and hotkeys are unchanged.

## 2. Decisions and rationale

### Attack rule module

`systems/attack.ts` now owns the single-swing state machine. `tickAttack()` is
pure and receives a press edge; it starts a swing at time 0, advances while
attacking, and resets after the 0.41 s commitment. `attackPhase()` exposes
`idle`/`windup`/`active`/`recovery`, and `markAttackResolved()` prevents a
second damage application inside one active window. The engine calls
`resolveAttack()` only when the phase is `active` and unresolved.

`Player` replaces the five chain fields with `attacking`, `attackTime`, and
`attackResolved`. `input.ts` already produced one queued press per mouse-down,
so holding the button cannot restart the swing. A dodge cancels an in-progress
swing through `cancelAttack()` and suppresses a same-frame press.

### Arc, knockback, and hitstop

`resolveAttack()` resolves fragments first, then body damage. It applies
knockback on every landed hit, including the Warden, but never applies stagger
or an attack cancel. A landed hit sets the single hitstop value; the Warden's
telegraph keeps ticking through it and is never interrupted. The renderer's
sweep and the one effect record use the same `ATTACK` constants, so the visual
and the rule cannot drift.

### Depth scaling

`scalingForDepth(depth)` is a pure, deterministic function clamped at depth 10.
It returns a `DepthStats` payload per creature kind: maximum HP, own-attack
damage, own attack interval, and (for the Warden) bomb damage and bomb interval.
`createEnemy()` and `createBoss()` consume that payload; `Enemy` stores the
result, and `systems/enemy.ts` reads `damage`, `attackInterval`, and
`bombInterval` from the instance instead of the flat constants. This keeps all
per-depth variation in one place and leaves movement, aggro, ranges, and
telegraph timings at their base values.

The interval rounding helper adds a tiny epsilon before rounding, so the exact
half in `1.1 × 1.15 = 1.265` rounds up to the design's `1.27` instead of down
because of binary floating-point error.

### Depth-1 composition

`data/floor.ts` keeps one spawn table. The third spawn's id is `mob-3` and its
kind is `melee` at depth 1, `ranged` afterwards. The first two spawns stay
melee. No runtime branch adds or removes enemies; the enemy count and topology
are always three mobs.

### Test and debug support

`attackWorld()` in `cypress/support/commands.ts` no longer reads chain fields.
It retries a click only while `attacking` is false and no enemy HP changed; a
committed swing stays visible for 0.41 s, which is longer than the 100 ms
observation window, so a started swing cannot be mistaken for a dropped press.
The projectile Cypress regression descends to depth 2 first because the ranged
mob no longer exists at depth 1.

## 3. Files

Added:

- `src/game/systems/depth.ts`, `src/game/systems/depth.test.ts`
- `programmer/0.8.0/CoT.md`

Removed:

- `src/game/systems/combo.ts`, `src/game/systems/combo.test.ts`

Changed:

- `src/game/data/config.ts`, `src/game/data/floor.ts`,
  `src/game/data/floor.test.ts`
- `src/game/engine/game.ts`, `src/game/engine/game.test.ts`
- `src/game/systems/attack.ts`, `attack.test.ts`, `bomb.ts`, `bomb.test.ts`,
  `damage.test.ts`, `enemy.ts`, `enemy.test.ts`, `projectile.ts`,
  `projectile.test.ts`
- `src/game/types/index.ts`, `src/state/initialState.ts`
- `src/ui/audio/audio.ts`, `src/ui/input/input.ts`,
  `src/ui/rendering/effects.ts`, `effects.test.ts`, `renderer.ts`
- `cypress/support/commands.ts`, `cypress/e2e/playable-slice.cy.ts`,
  `cypress/e2e/slice-regressions.cy.ts`, `cypress/e2e/portfolio-release.cy.ts`
- `design/0.8.0/design-decisions.md` (one composition-wording correction)

## 4. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 187 tests in 17 files, pass |
| `npm run build` | Pass |
| `CYPRESS_BROWSER=chrome npm run e2e` | 32/32 pass across 5 specs in 2 m 53 s |

New coverage: attack timing/phase/cancel unit tests; depth rows at 1, 2, 5, 6,
and 10 plus monotonicity, cap, cooldown rows, and damage thresholds; floor
composition at depths 1 and 2; engine tests for one press → one swing, ignored
mid-swing presses, a second swing only after recovery, double fragment breaks,
and a Warden telegraph surviving a landed hit. Cypress now verifies one press,
a held button, aiming away, and the depth-2 projectile path.

## 5. Assumptions and residual risks

- **Press-edge input:** `tickAttack()` treats its `pressed` argument as a single
  sampled press, matching the input layer. Holding is tested through the real
  browser event path, not by feeding `attack: true` every engine tick.
- **Hitstop drops input:** this is unchanged engine behavior. The Cypress retry
  heuristic is deliberately limited to the no-swing, no-health-change case.
- **Depth-1 Warden:** the Warden at depth 1 has 24 HP (12 landed swings) and
  still awards 3 points; the economy is unchanged.
- **Composition wording:** `design-decisions.md` §6.1 now says only the third
  mob's kind differs at depth 1; spawn ids and positions otherwise match the
  previous fixed branch at the same seed.
- **Unused audio asset:** `knifeSlice2.ogg` is no longer in the manifest or
  played, but the file and its attribution entry remain on disk. No asset was
  added or removed, per scope.
- **Hosted CI** has not been run; only local checks are recorded here.
