# Implementation decisions — 0.9.0 safe-room ward

Owner: `programmer` (executed by the orchestrator) · Task `0.9.0/001` ·
Implemented on 2026-11-14.

Source contract: `docs/tasks/0.9.0/001-programmer.md` and
`design/0.9.0/design-decisions.md`.

## 1. Scope delivered

- One pure rule module, `systems/safeRoom.ts`, derives the combat predicate
  `status === "alive" && aggro` and exports the refusal copy.
- The player cannot cross into `floor.shop.safe` while the predicate is true,
  by walking or dodging. Leaving is never blocked, and the player is not pushed.
- Damage inside the safe zone is ignored only while no enemy hunts; melee,
  projectile, and bomb damage all flow through `applyDamageToPlayer`, so one
  condition covers every source.
- `E` in the stall zone refuses to open the shop while an enemy hunts and emits
  `shop-unavailable` with the same copy. Purchasing, closing, and the
  summon-closes-shop rule are unchanged.
- The threshold band turns ember and shows `WARD SEALED`; the existing floating
  text shows the refusal, throttled to `SHOP.wardMessageCooldown = 2` seconds.
- `DebugSnapshot.inCombat` and the test-only `setEnemyAggro(id, aggro)` hook
  make the rule observable. The hook stays inside the existing `DEV`/`VITE_E2E`
  gate; the production bundle still contains no `__gameDebug`.
- `README.md` describes the single attack, the ward, and the current loop;
  `package.json` and the lockfile report `0.9.0`.

## 2. Decisions and rationale

### Predicate module

`isInCombat(enemies)` is pure and has no timer or stored run flag. Dying, dead,
rested, and emerging enemies do not seal the ward, and the ward reopens on the
same simulation step the last hunter drops aggro. Keeping the predicate derived
avoids new runtime state and reset paths.

`WARD_MESSAGE` lives next to the predicate so the entry and interaction
refusals cannot drift apart.

### One-way movement rule

The engine snapshots the position before `movePlayer()` and compares it with the
resolved position. A transition from outside to inside while `isInCombat()` is
true restores the previous position and emits the throttled event. Because the
result is fed through the normal per-frame collision resolution, the existing
step splitting still prevents tunnelling, and a dodge is refused by the same
path while still spending its timer and i-frames.

A player already inside is never checked out, so exiting is allowed in every
state. This also preserves the design's "not trapped" rule for a player who was
inside when an enemy aggroed.

### Damage and interaction

The old absolute immunity inside `floor.shop.safe` is now conditional on the
same predicate. The shop's interaction branch checks combat before the existing
availability branches, so sealed feedback always wins and the panel cannot open
during a hunt. Enemy exclusion is unchanged: enemies still cannot enter the safe
zone, so the player must leave or break pursuit.

### Presentation

The renderer reads `isInCombat()` and only switches the existing threshold
colour and adds the `WARD SEALED` world label. The refusal reuses the floating
text pipeline with the ember tone. Reduced motion removes only the pulse; the
label and colour remain, so the state never depends on animation or audio.

### Test and debug support

`debugSetEnemyAggro` sets the flag on one enemy. It is a test-only hook, not a
shortcut for play. The Cypress ward spec uses a real pursuit: the player
teleports into the second melee mob's aggro range, lets it close in, then runs
for the ward while it follows. That avoids relying on a remote synthetic flag
that would clear before the player reaches the door.

## 3. Files

Added:

- `src/game/systems/safeRoom.ts`, `src/game/systems/safeRoom.test.ts`
- `cypress/e2e/safe-room.cy.ts`
- `programmer/0.9.0/CoT.md`

Changed:

- `src/game/engine/game.ts`, `src/game/engine/game.test.ts`
- `src/game/data/config.ts`, `src/game/types/index.ts`
- `src/ui/rendering/renderer.ts`, `src/ui/rendering/effects.ts`
- `src/ui/debug.ts`, `src/index.ts`
- `cypress/support/commands.ts`, `cypress/support/index.d.ts`
- `README.md`, `package.json`, `package-lock.json`

## 4. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 198 tests in 18 files, pass |
| `npm run build` | Pass |
| Production bundle `__gameDebug` scan | 0 matches |
| `CYPRESS_BROWSER=chrome npm run e2e` | 33/33 pass across 6 specs in 2 m 58 s |

New unit coverage: predicate states (alive/aggro, idle, dying, dead, rested,
emerging boss, mixed list); entry refusal and event copy; 2-second throttle
(three refusals in five seconds); already-inside exit; dodge refusal; conditional
bomb damage inside the safe zone; shop refusal while hunted. Cypress proves a
lured mob refuses entry, a dodge cannot slip through, and the ward reopens after
the hunt ends.

The existing reward-loop, boss, descent, and restart specs still pass unchanged.

## 5. Assumptions and residual risks

- **Aggro is authoritative:** the rule consumes the existing per-archetype aggro
  radius and adds no combat memory. Running far enough from a mob therefore
  opens the ward, which is the design's intended disengage.
- **Enemy exclusion:** enemies still cannot enter the safe zone, so damage
  inside while sealed comes from ranged attacks, bombs, or contact at the
  threshold. This is the approved rule, not an omission.
- **Test-only bypass:** `debugTeleport` still bypasses the ward because it is not
  a gameplay movement path. The Cypress entry assertions use real movement.
- **Hosted CI** has not been run; only local checks are recorded here.
