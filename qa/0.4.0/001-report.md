# QA report — 0.4.0 seeded dungeon slice

## Metadata

| Field | Value |
|---|---|
| Version | `0.4.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested implementation | `11a37f8` (`feat(game): generate seeded dungeon floors and descent`) |
| Branch | `feature/0.4.0-001-dungeon-slice` |
| Date | 2026-11-07 |
| Hosted CI | Pending on GitHub; not run or emulated locally |

## Scope

Verified the seeded four-room floor generator, tile collision, enemy
distribution, stairs locking, descent, depth/exit HUD, removal of the purified
freeze, and the updated unit and Cypress coverage against
`docs/tasks/0.4.0/001-programmer.md` and `design/0.4.0/design-decisions.md`.

## Commands and evidence

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | Pass |
| Unit | `npm test` | 13 files, 132 tests, all pass |
| Production build | `npm run build` | Pass |
| Debug hook absent | `grep -c "__gameDebug" dist/assets/*.js` | `0` in the production bundle |
| Browser suite | `CYPRESS_BROWSER=chrome npm run e2e` | 16/16 pass (6 playable-slice, 10 slice-regressions) |
| Workspace | `git status --short --branch` | Clean before the QA test addition |

The browser suite was run through the approved single entry point
(`scripts/e2e.mjs`), which builds with `VITE_E2E=1`, serves the production
bundle with `vite preview`, and runs Chrome. Hosted CI is not claimed; GitHub
owns that result after the branch is pushed.

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Typecheck, unit, build pass from a clean state | Pass | Commands above |
| 2 | `npm run e2e` passes; no assertion removed without replacement | Pass | 16/16; replaced room-coordinate assertions now use floor bounds/spawn, and a new canvas HUD assertion was added |
| 3 | Same seed produces the same floor; different seed/depth differs | Pass | `floor.test.ts` determinism and variance tests |
| 4 | Four rooms and a walkable spawn-to-stairs path | Pass | `floor.test.ts` room count and BFS connectivity over 40 seeds |
| 5 | Spawn, enemy spawns, and stairs walkable | Pass | `floor.test.ts` `isWalkablePoint` / `isOnStairs` assertions |
| 6 | Tile collision blocks bodies; camera stays in the floor at 1024×640 and 1440×810 | Pass | Collision/movement/enemy/projectile/damage unit tests; resize-camera e2e uses `snapshot.floor` bounds |
| 7 | Three enemies, one per non-start room, two melee and one ranged | Pass | `floor.test.ts` distribution and composition; boot e2e checks each enemy is inside its room |
| 8 | Exit locked until all rested; opening emits `floor-purified` and keeps `status === "playing"` | Pass | `game.test.ts` locked-exit and all-rested tests |
| 9 | Conventionally killed, unrested enemy respawns and keeps the exit locked | Pass | Respawn test now explicitly asserts `exitOpen` and `floorPurified` stay false before and after respawn (QA-added assertion) |
| 10 | Open stairs descend, increment depth, reset spirit/projectiles, preserve HP | Pass | `game.test.ts` descent test; geometry, generation, and presentation change together |
| 11 | HUD shows depth and stairs status; no purified overlay or status | Pass | Unit/state tests; top-right HUD canvas pixel check; `grep` found no `"purified"` status or purified overlay |
| 12 | Production bundle has no `__gameDebug` | Pass | Bundle grep returned 0; hook remains gated by `import.meta.env.DEV \|\| VITE_E2E` |
| 13 | Findings include severity, reproduction, expected vs actual, evidence, owner, rerun | Pass | This report |

## Visual verification

A temporary Cypress capture at 1024×600 was inspected and then removed. It
showed:

- generated floor tiles and wall frames around rooms and corridors;
- the player spawn inside the first room and a corridor exiting right;
- the top-right `Depth 1` / `Stairs sealed` HUD in the approved positions;
- the heart and spirit HUD unchanged at the top-left;
- the control hint unchanged at the bottom-left.

A second capture after walking through the corridor showed the second room,
a melee enemy, and the corridor wall silhouette reading correctly. The
permanent pixel check for the depth HUD remains in `playable-slice.cy.ts`.

## Findings

No blocking or major findings.

### Minor observations (non-blocking)

1. **Discrete collision stops bodies slightly before a wall.** The sub-stepped
   circle collision can leave up to half a radius of clearance instead of the
   exact old clamp position. Reproduction: push into a room edge for one
   second. Expected: the body never crosses the wall. Actual: it stops at or
   before the wall. Owner: none required; the observable rule is preserved and
   the tests assert body containment rather than an exact pixel.
2. **No end-to-end full-clear descent scenario.** Resting three enemies
   through the browser suite would add a slow, timing-sensitive test. The
   generator, exit unlock, descent, HP preservation, spirit reset, and seed
   change are covered by deterministic engine tests. Residual risk: an
   integration-only wiring break in the browser flow. Mitigation: the boot e2e
   already exercises the same snapshot/state path and the descent branch is a
   single `Game.step` call site covered by unit tests.
3. **Stairs status text is not pixel-asserted.** The canvas HUD test proves
   the depth line is painted; the stairs wording is derived directly from
   `run.exitOpen`, which is unit-tested. Owner: none.

## Regressions checked

- Combat timing, combo chaining, hitstop, dodge, projectile damage, and
  fragment restoration still pass their unit and browser tests.
- Conventional kills still respawn; rested enemies do not.
- Restart still resets depth, HP, spirit, fragments, projectiles, and enemy
  state.
- Death still freezes the run and repeated restarts remain stable.
- Camera and pointer conversion still behave across 1024×640 and 1440×810.
- No new asset, dependency, shop, loot, boss, or safe-room work entered the
  diff.

## Residual risk

- Hosted CI is pending on GitHub.
- The visual review was limited to canvas captures in a headless Chrome
  environment; no human art-direction review was requested for this slice.
- Depth scaling and later floor themes remain deferred by design.

## Verdict

**Passed.** The implementation meets the approved `0.4.0/001` scope and
acceptance criteria, with all local automated checks green. Hosted CI must be
confirmed on GitHub after the branch is pushed.
