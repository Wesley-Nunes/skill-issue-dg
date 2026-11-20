# Implementation decisions — 0.9.1 combat integrity

Owner: `programmer` · Task `0.9.1/001` · Implemented on 2026-11-15.
Commits: `6538005` (`feat(game): reset the rite on a hit, count every enemy
hit, and separate mobs`) and `18a24d2` (`test(game): cover bomb resets and
blocked separation`, the QA follow-up below).

Source contract: `docs/tasks/0.9.1/001-programmer.md` and
`design/0.9.1/design-decisions.md`. No product scope was added.

## 1. Scope delivered

- **Melee reset ordering.** `Game.updateEnemies` now returns
  `{ enemies, damageToPlayer }`. `step` publishes and separates the enemy array
  first, then applies the summed melee damage, so the rite reset is no longer
  overwritten by the enemy-update result.
- **Rite reset.** `purification.restoreFragments` became
  `resetEnemyRite(enemy)`: every broken fragment returns and HP returns to
  `maxHp` for a living non-boss enemy. The Warden and dead/dying/rested enemies
  are untouched. One `rite-reset` event is emitted per changed enemy.
- **Damage attribution.** `damagePlayer` no longer grants post-hit
  invulnerability; `PLAYER.damageInvulnerability` was removed. Dodge i-frames
  and the per-attack `attackHit` guard are unchanged.
- **Enemy separation.** New pure `enemy.separateEnemies` runs after enemy
  movement. Living enemies keep `radiusA + radiusB` centre distance, the Warden
  is immovable, dead/dying enemies do not participate, and pushes go through
  `moveCircle` so floor geometry and blockers are respected.
- **Tests.** Engine coverage for melee/projectile resets, HP reset, Warden
  exception, three simultaneous melee hits, and separation; pure coverage for
  reset and separation; a browser regression at
  `cypress/e2e/combat-integrity.cy.ts`.
- **Version hygiene.** `package.json` and the lockfile root report `0.9.1`.

## 2. QA follow-up (`18a24d2`)

QA returned the task with **Changes requested** in `qa/0.9.1/001-report.md`
(commit `dd3731b`): no behavioral defect, only missing required automated
coverage. This follow-up is test-only; no application source, copy, HUD, audio,
economy, tuning, or dependency changed.

- **QA-001 (medium) — bomb-hit reset coverage.** Added the engine test
  `resets fragments and HP when a bomb costs the player HP` in
  `src/game/engine/game.test.ts`. A damaged mob with two broken fragments and a
  pre-damaged Warden are placed, every enemy is staggered so the only damage is
  the bomb, and the test asserts the player loses `BOMB.damage`, the mob returns
  to full HP and intact fragments, exactly one `rite-reset` event fires, and
  the Warden's HP is unchanged.
- **QA-002 (medium) — wall/blocker separation coverage.** Added
  `keeps a wall-edge push inside the floor geometry` and
  `keeps a blocked-rect push out of the gate and shop safe zone` in
  `src/game/systems/enemy.test.ts`. Both use the existing `openFloor()` helper,
  assert every separated body remains walkable under the same `moveCircle`
  geometry (and outside the blocker rect), assert the pass actually moves the
  pair, and assert two runs over the same inputs produce identical positions.
  The blocker rect models the arena gate / shop safe zone; `separateEnemies`
  treats every blocked rect identically.
- **QA-003 (low) — dead/dying evidence.** Extended
  `ignores dead and dying bodies` so a living enemy overlaps both a dying and a
  dead body at the same point and all three positions are asserted unchanged.
  The old test could not fail for a living body pushed by a non-living one.
- **QA-004 (low) — dev-only hook retained.** `debugSetPlayerInvulnerable`
  remains necessary for e2e isolation and stays inside the existing
  `DEV`/`VITE_E2E` gate; production still has no `__gameDebug`. The test-only
  hook is now also used by `slice-regressions.cy.ts` "damages a melee enemy
  exactly once per press": with every distinct hit applying damage, the player
  can die during the scripted approach, which made that outgoing-damage
  assertion flaky. Setting 30 s of invulnerability isolates incoming damage
  without changing what the test asserts. The first full e2e run failed only
  there (33/34); the stabilized rerun passed 34/34.

## 3. Decisions and rationale

### Publish before applying damage

The defect was an ordering bug, not a missing predicate. `updateEnemies` used
to call `applyDamageToPlayer` from inside `state.enemies.map(...)`; the reset
rewrote `state.enemies`, and the map's return value immediately replaced it.
Returning the wave to `step` gives one owner for the order: tick, move, separate,
publish, then damage. Projectile and bomb damage already ran after publication,
which is why they reset correctly and melee did not.

### Sum melee damage into one HP loss

`damageToPlayer` accumulates every enemy's contribution in the wave and
`applyDamageToPlayer` is called once. This preserves each attacker's damage
without emitting one hurt flash and one `player-hit` event per attacker. It is
presentation consolidation, not damage reduction: the HP loss is the sum.

### Reset HP with the fragments

Without the HP reset, a player could damage a mob to 1 HP, take a hit, then break
the restored fragments and land the killing blow in the same swing. The reset
therefore restores `hp` and `fragments` together. It also treats "HP already
full but a fragment broken" as a change, so the event still fires when only the
rite was disturbed. Returning the same object for an already-full enemy keeps
the per-frame map allocation-free.

### Remove the post-hit window, keep dodge i-frames

The shared 0.6 s timer made a three-mob pile deal one hit's damage. `damagePlayer`
now only checks `player.invulnerable`, which is set by the dodge system and by
the test-only isolation hook. The per-attack `attackHit` guard still limits one
enemy's active window to one hit, and projectiles/bombs are consumed on impact.
The accepted balance consequence is recorded in the design document: at depth 5+
three melee hits equal the base 6 HP bar, which separation makes avoidable.

### Post-movement separation

Enemies are not added to each other's movement blockers. A kiting ranged enemy
must not be trapped behind an ally, and a blocker would also change aggro
approach paths. Instead the pass resolves overlaps after movement:

- up to four passes settle ordinary two- and three-mob piles;
- an exact overlap uses a deterministic angle from the pair's indices, so the
  same inputs produce the same result;
- a boss/mob pair moves only the mob;
- `moveCircle` means a wall can leave an overlap for one frame, and the next
  frame retries.

### Test-only isolation hook

`debugSetPlayerInvulnerable(seconds)` was added because the new HP reset made
the existing "does not repeat the swing while the button is held" regression
observe the mob's counter-hit (HP 8 instead of 6). The hook isolates that
assertion from damage; it is not a rule-verification shortcut and the rule
itself is verified through real hits in `combat-integrity.cy.ts`. It stays
inside the existing `DEV`/`VITE_E2E` gate. Production still has no
`__gameDebug`.

## 4. Files

Changed:

- `src/game/engine/game.ts` — ordering, separation call, `rite-reset`, hook.
- `src/game/systems/enemy.ts` — `separateEnemies`, `pushEnemy`.
- `src/game/systems/purification.ts` — `resetEnemyRite` replacement.
- `src/game/systems/damage.ts` — no post-hit invulnerability.
- `src/game/data/config.ts` — removed `PLAYER.damageInvulnerability`.
- `src/game/types/index.ts`, `src/ui/rendering/effects.ts` — event rename.
- `src/ui/debug.ts`, `src/index.ts` — debug hook type and wiring.
- `package.json`, `package-lock.json` — `0.9.1`.
- `src/game/engine/game.test.ts`, `src/game/systems/enemy.test.ts` — QA follow-up
  coverage (bomb reset, wall/blocker separation, dead/dying living overlap).
- `cypress/e2e/slice-regressions.cy.ts` — damage isolation for the exact-HP
  outgoing-damage assertion.

Added:

- `cypress/e2e/combat-integrity.cy.ts` — real melee-hit reset regression.
- `cypress/support` commands/types for `setPlayerInvulnerable`.
- Engine and pure tests listed in §5.

## 5. Verification evidence

Rerun after the QA follow-up (`18a24d2`):

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | Pass — 18 files, 210 tests |
| `npm run build` | Pass — `dist/assets/index--MKoW431.js`, 82.33 kB |
| Production bundle scan | No `__gameDebug` in `dist/assets/*.js` |
| `DISPLAY=:0 CYPRESS_BROWSER=chrome npm run e2e` | Pass — 7 specs, 34/34 tests, 3 m 03 s |

The first full e2e run failed 1/34 ("damages a melee enemy exactly once per
press": the player died during the scripted approach now that every hit
applies). The test was isolated with the existing dev hook and the rerun
passed 34/34. `DISPLAY=:0` is an environment requirement; the inherited `:1`
has no X server.

New/updated unit coverage:

- reset: fragments + HP restored, HP-only reset when fragments intact, Warden
  untouched, dying enemy untouched, identity when already full;
- damage: no post-hit window, second hit applies immediately, dodge blocks,
  dodge expiry allows damage;
- engine: projectile hit resets fragments and HP, **bomb hit resets every
  living mob's fragments and HP while the Warden's HP is unchanged**, melee hit
  resets instead of discarding, three enemies in one step deal
  `3 × MELEE.damage`, stacked bodies separate, dodge keeps fragments broken;
- separation: two superimposed, three superimposed, Warden immovable,
  dead/dying ignored (including a living body overlapping a dying one), **wall
  edge respected, blocked rect (gate / shop safe zone) respected, deterministic
  repeatability**.

## 6. Assumptions and follow-ups

- The `rite-reset` event replaces `fragments-restored`; no audio mapping or
  Cypress selector referenced the old name.
- The separation angle for exact overlaps is arbitrary but deterministic; the
  design only requires that stacked bodies resolve reproducibly.
- The Warden is excluded from HP reset by `kind === "boss"` rather than by the
  absence of fragments, so a future fragment-bearing boss stays excluded.
- Hosted CI is unverified until the branch is pushed.

## 7. Handoff

QA must verify the behavior in `docs/tasks/0.9.1/001-qa.md` against the
implementation (`6538005`) plus the coverage follow-up (`18a24d2`), including
melee/projectile/bomb resets, dodge safety, Warden HP, simultaneous hits,
separation near geometry, and the full loop regression. QA-001 through QA-004
are addressed as described in §2. The known non-blocking evidence limitations
from `0.9.0` (no live Warden lure, capture size) still apply.
