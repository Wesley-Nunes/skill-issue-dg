# 0.9.1 / 001 — Programmer task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.9.1` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Not started` |
| Depends on | `design/0.9.1/design-decisions.md` |
| Produces | `programmer/0.9.1/CoT.md`, source and test changes, version hygiene |
| Hands off to | `docs/tasks/0.9.1/001-qa.md` |

## 2. Context

- `src/game/engine/game.ts` `updateEnemies` applies melee damage from inside
  `state.enemies.map(...)`. `applyDamageToPlayer` then rewrites
  `state.enemies` with the reset rites, but the outer map's returned array is
  assigned over it. Projectile and bomb damage run after the assignment, which
  is why they reset correctly.
- `src/game/systems/purification.ts` `restoreFragments` only flips fragments.
  Enemy HP is untouched.
- `src/game/systems/enemy.ts` steers every enemy at the exact player point.
  `enemyBlockers()` contains only the shop safe zone and the arena gate, so
  enemy bodies never collide.
- `src/game/systems/damage.ts` sets a shared 0.6 s `invulnerable` timer on every
  hit. `PLAYER.damageInvulnerability` only exists for that timer; dodge
  i-frames use the same field.
- The debug snapshot already exposes enemy `x`, `y`, `hp`, `maxHp`, `status`,
  and `fragments`; the 198-test unit baseline passes today, which is why the
  melee path and simultaneous-hit path slipped through.

## 3. Objective

Fix the combat-integrity defects while preserving the existing rite, rest,
respawn, spirit, shop, and boss flows.

## 4. In scope

1. **Damage ordering.** Make `updateEnemies` return the updated enemies and the
   total melee damage, then publish the enemies and apply the damage in `step`.
2. **Rite reset.** Replace fragment-only restoration with a pure reset that
   restores all fragments and HP for every living non-boss enemy. Emit one
   `rite-reset` event per changed enemy.
3. **Damage attribution.** Remove the post-hit invulnerability assignment and
   the now-unused `PLAYER.damageInvulnerability` value. Keep dodge i-frames and
   the per-attack `attackHit` guard.
4. **Enemy separation.** Add a deterministic pure separation pass that keeps
   living enemy bodies at least `radiusA + radiusB` apart, treats the Warden as
   immovable, ignores dead/dying enemies, and respects floor/blocked geometry.
   Run it after enemy movement in `step`.
5. **Tests.** Add or update unit/engine coverage for the melee reset, HP reset,
   Warden exception, multi-enemy damage, dodge safety, and separation.
6. **Version hygiene.** Bump `package.json` and the lockfile root version to
   `0.9.1`.
7. **Decision log.** Map each change to the design decision in
   `programmer/0.9.1/CoT.md`, including the commit hash.

## 5. Out of scope

- Enemy pathfinding, group AI, flanking, new archetypes, or room changes.
- Changes to fragment count, spirit values, economy, enemy HP/damage/cooldowns,
  depth scaling, boss patterns, or the safe-room ward.
- New HUD elements, copy, audio, art, hotkeys, settings, or persistence.
- Rewriting historical design/QA records.
- Unrelated refactors.

## 6. Approved behavior

- A damage hit that reduces player HP resets every living mob's rite: all
  fragments return and HP returns to `maxHp`. The Warden's HP is never reset.
- A hit blocked by dodge invulnerability changes nothing.
- Every distinct enemy attack that connects deals its damage. The shared
  post-hit i-frame is removed; dodge i-frames remain.
- One enemy's attack still hits at most once.
- Living enemies keep a minimum body distance; the Warden does not move for
  separation, and dead/dying enemies do not participate.
- No new player-facing copy or HUD.

## 7. Constraints

- Pure rules stay pure: reset and separation must be deterministic and
  unit-testable without a browser.
- Reuse `moveCircle` for separation so walls and blockers are respected.
- Do not add dependencies, assets, or debug hooks.
- Preserve the existing `attackHit`, respawn, rest, spirit, shop, and boss
  behavior.
- Keep the production bundle free of `__gameDebug`.

## 8. Acceptance criteria

1. A melee hit resets fragments and HP on every living mob.
2. Projectile and bomb hits do the same.
3. The Warden's HP is unchanged by a player hit.
4. Three melee enemies hitting in one simulation step contribute three separate
   damage amounts (summed into the player's HP loss).
5. Dodge invulnerability still prevents damage and keeps fragments broken.
6. Two or three living enemies cannot occupy the same point after a step; the
   Warden's position is unchanged by separation.
7. `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` pass.
8. `programmer/0.9.1/CoT.md` records the mapping, assumptions, and commit.

## 9. Dependencies and handoff

Implement only after `design/0.9.1/design-decisions.md` is approved. Hand QA the
behavior list above, the new regression tests, and the commit hash.

## 10. Open assumptions / unresolved items

- The `rite-reset` event name replaces `fragments-restored`. No audio mapping
  or Cypress selector depends on the old name.
- Separation runs after movement; it does not add enemies to movement blockers,
  so a kiting ranged enemy cannot be trapped behind an ally.
