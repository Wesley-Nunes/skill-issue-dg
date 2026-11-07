# Implementation log — 0.4.0 seeded dungeon slice

Owner: `programmer` · Task `0.4.0/001` · Branch
`feature/0.4.0-001-dungeon-slice`.

## 1. What shipped

- Deterministic four-room floor generated from a seed and depth.
- Tile-grid collision for the player, enemies, projectiles, knockback, and
  line of sight.
- Three enemies spread across the three non-start rooms, two melee and one
  ranged.
- Stairs in the final room that stay sealed until every enemy is rested.
- Automatic descent to a newly generated floor when the player walks onto
  open stairs.
- Depth and stairs HUD, floor-entry flash and depth banner.
- Removal of the run-ending `"purified"` status and the full-screen purified
  overlay.

## 2. Main decisions

### Generation

`src/game/data/floor.ts` owns `generateFloor(seed, depth)` and a small
`mulberry32`-style PRNG. The layout is a left-to-right chain:

- Four rooms with seeded widths (12–17 tiles) and heights (10–14 tiles).
- Seeded gaps (4–6 tiles) between rooms.
- Two-tile-high corridors on rows 15–16 join each pair.
- The chain is centred horizontally in a 96 × 30-tile map.
- Spawn is the centre of the first room; stairs are a 2 × 2-tile marker near
  the right side of the last room.
- Enemy spawns are the centre of each non-start room, in the order
  `melee`, `melee`, `ranged`.

`nextSeed(seed)` advances the seed with an LCG step so depth transitions and
restarts are deterministic but different. `randomSeed()` uses
`crypto.getRandomValues` and falls back to time plus `Math.random`.

A horizontal chain was chosen over a graph generator because it is the
smallest structure that proves traversal, encounters, and descent while
staying reviewable. It also removes the need for pathfinding.

### Collision and vision

- `moveCircle(floor, x, y, dx, dy, radius)` resolves X and Y separately and
  splits long frames into sub-steps no larger than half the radius.
- `isCircleWalkable` checks only non-walkable tiles around the body and uses
  closest-point distance, so circles slide along tile corners.
- `hasLineOfSight` samples the segment and rejects it when it leaves walkable
  tiles. In-room sight is unchanged; corridor walls now block ranged enemies
  as intended.
- `clampCamera` takes floor bounds instead of the old fixed room.

### Exit and descent

- `RunState` is now `{ depth, spirit, floorPurified, exitOpen }`.
- `floorPurified` and `exitOpen` are set together when every enemy on the
  floor has `rested === true`. Opening emits `floor-purified` and does **not**
  change `status`.
- `Game.step` checks `isOnStairs` after movement. When `exitOpen` is true,
  `descend` creates the next floor with `nextSeed`, increments depth, resets
  spirit/projectiles/enemies, preserves the player's HP, snaps the camera, and
  emits `floor-descended`.
- `reset()` starts a fresh depth-1 run with `nextSeed(currentSeed)`.
- The constructor accepts `new Game(viewportSource, seed = randomSeed())`, so
  tests can pin the floor.

### Rendering

- The renderer caches one background canvas keyed by `seed:depth`. It is
  rebuilt only when the floor changes.
- Walkable tiles use the existing `floor_1`–`floor_8` frames chosen by a
  coordinate hash.
- Solid tiles that border walkable space are drawn with `wall_mid`,
  `wall_left`, `wall_right`, and the `wall_top_*` cap row.
- Stairs are procedural: an inset slab, step lines, and chevrons. The sealed
  state is dim grey; the open state is cyan with a slow pulse.
- Top-right HUD adds `Depth N` and `Stairs sealed` / `Stairs open`.
- The old purified overlay is gone. A short cyan flash plus a fading
  `Depth N` banner marks floor entry; it does not pause play.

## 3. Files changed

- Added: `src/game/data/floor.ts`, `src/game/data/floor.test.ts`,
  `src/game/systems/testFloor.ts`.
- Removed: `src/game/data/room.ts`.
- Updated: `src/game/data/config.ts`, `src/game/types/index.ts`,
  `src/game/engine/game.ts`, `src/game/engine/game.test.ts`,
  `src/game/systems/{camera,collision,damage,dodge,enemy,movement,projectile,vision}.ts`
  and their tests, `src/state/initialState.ts`,
  `src/ui/rendering/renderer.ts`.
- Cypress: `cypress/support/game.ts`, `cypress/e2e/playable-slice.cy.ts`,
  `cypress/e2e/slice-regressions.cy.ts`.
- `package.json` and `package-lock.json` version `0.4.0`.

## 4. Coverage added

Unit (132 total, all passing):

- Generator determinism; different seed/depth changes the floor.
- Four rooms inside bounds with seeded size ranges.
- Spawn-to-stairs connectivity across 40 seeds.
- Spawn, stairs, and enemy spawns walkable; one enemy per non-start room;
  no enemy in the start room.
- Exit stays locked while any enemy is unrested.
- All-rested opens the exit without changing `status`, and play continues.
- Open stairs descend, increment depth, change seed, reset spirit and
  projectiles, preserve HP, and spawn a fresh set of enemies.
- Collision, camera, projectiles, vision, knockback, dodge, and restart tests
  moved to the generated-floor model.

Cypress (16 total, all passing in Chrome):

- Boot asserts depth 1, sealed stairs, four rooms, player/enemy/stairs room
  placement, and floor size.
- A canvas pixel check confirms the top-right depth HUD is painted.
- Resize/camera checks and spawn/restart assertions use the generated floor
  spawn and bounds instead of hard-coded 640 × 384 / 320,320 values.
- Ranged-projectile test targets the actual generated ranged enemy.

## 5. Assumptions recorded

- HP persists between floors; no healing on descent (no rest rooms yet).
- Spirit is per floor and resets on descent.
- Restart begins at depth 1 with a new seed.
- Walking onto opened stairs descends automatically; no new key.
- Enemy distance aggro is unchanged; corridors naturally separate rooms.
- Four rooms is the slice size; only their dimensions and gaps vary.

## 6. Verification

Run from the branch:

```text
npm run typecheck   # pass
npm test            # 13 files, 132 tests pass
npm run build       # pass; dist bundle has no __gameDebug
CYPRESS_BROWSER=chrome npm run e2e   # 16/16 pass
```

The production bundle was checked with `grep -c "__gameDebug"` against
`dist/assets/*.js` and returned `0`.

## 7. Known limits

- No e2e scenario rests all three enemies and walks onto the stairs; the
  generator, exit unlock, and descent loop are covered by engine unit tests,
  and the browser suite covers floor boot, traversal, combat, camera, and HUD.
- Safe rooms, shop, currency, loot, boss, difficulty scaling, floor themes,
  menus, audio, persistence, and a final floor remain deferred.
