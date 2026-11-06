# 001 — Programmer: seeded dungeon slice

## Metadata

| Field | Value |
|---|---|
| Version | `0.4.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Ready for implementation` |
| Depends on | `docs/tasks/0.4.0/001-design.md`, `design/0.4.0/design-decisions.md` |
| Produces | Generated floor, tile collision, descent flow, renderer/HUD updates, tests, `programmer/0.4.0/CoT.md` |

## Context

The current engine assumes one rectangular room (`ROOM`) and one fixed set
of spawns (`ENEMY_SPAWNS`). Collision, line of sight, projectiles, enemy
movement, and camera clamping all use that rectangle. Purification fills the
spirit meter and changes `status` to `purified`, which freezes the run.

`0.4.0` introduces the first dungeon slice: a seeded floor made of rooms and
corridors, encounters using the existing enemies, and stairs that lead to the
next floor.

## Objective

Replace the single fixed room with a deterministic, seeded, traversable floor
and make the exit/descent loop work without freezing the run.

## In scope

- A seeded floor generator with four rooms connected by corridors.
- A tile map and tile-grid collision for player, enemies, and projectiles.
- Line of sight over the tile map.
- Walkable spawn and stairs placement; three enemies distributed across the
  non-start rooms.
- Stairs that unlock when every enemy on the floor is rested.
- Automatic descent when the player steps on unlocked stairs: new floor,
  depth +1, spirit reset, HP preserved.
- Camera clamping to the generated floor bounds.
- Renderer support for generated floors, corridors, walls, stairs, depth HUD,
  and floor-entry feedback.
- Removing the run-ending purified status and overlay.
- Unit and Cypress coverage; update shared Cypress helpers and snapshot data.
- Update `package.json` to `0.4.0`.
- Record implementation decisions in `programmer/0.4.0/CoT.md`.

## Out of scope

- Safe rooms, shops, currency, consumables, loot, artifacts, skill points.
- Boss, difficulty scaling, floor themes, enemy pools, audio, menus,
  persistence, or a final floor.
- New enemies, new combat mechanics, new assets, or new dependencies.
- Hand-authored multi-room floors.
- Cypress Cloud, component testing, or pipeline changes.

## Approved behaviour

1. **Seeded generation.** The same seed and depth produce the same floor;
   different seeds produce a different layout. The production run starts from
   a random seed. A restart starts a new run at depth 1 with a new seed.
2. **Floor shape.** A floor has four rooms in a left-to-right chain, joined by
   walkable corridors. The start room has no enemies. The remaining three
   rooms each contain one enemy (two melee and one ranged by default). The
   final room contains the stairs.
3. **Traversal.** The player, enemies, and projectiles cannot cross solid
   tiles. The camera follows the player and stays inside the generated floor.
4. **Exit condition.** `exitOpen` becomes true when all enemies have
   `rested === true`. A conventionally killed enemy that has not been rested
   still respawns and keeps the exit locked. Opening the exit emits
   `floor-purified`; it does **not** change `status` or freeze the run.
5. **Descent.** While `exitOpen` is true, the player stepping onto the stairs
   regenerates the next floor at `depth + 1` with a new seed, resets spirit
   and projectiles, and preserves the player's current HP. The player is
   placed at the new floor's spawn. The floor-entry HUD shows the new depth.
6. **HUD.** Depth and stairs status remain visible while playing. The player
   can keep moving and fighting after the floor is cleared; there is no
   purified overlay and no `"purified"` game status.
7. **Determinism.** The floor generator and its enemy/stairs placement are
   pure functions of the seed and depth. No gameplay rule depends on
   rendering or wall-clock time.

## Constraints

- Keep game rules pure and side-effect-free in `src/game/systems/` where
  practical; keep generation deterministic.
- Keep orchestration in `src/game/engine/`, runtime state in `src/state/`,
  presentation in `src/ui/rendering/`, and input in `src/ui/input/`.
- Reuse the existing DungeonTileset II frames. Do not add assets.
- Apply KISS/YAGNI: a horizontal chain is sufficient for this slice; do not
  add pathfinding, a graph generator, minimaps, or difficulty scaling.
- Do not weaken existing unit or e2e coverage without replacing the covered
  behaviour.
- Keep the debug hook behind the existing DEV/`VITE_E2E` condition and out of
  the production bundle.

## Acceptance criteria

1. `generateFloor(seed, depth)` produces a floor with four rooms, connected
   walkable tiles from spawn to stairs, and a deterministic layout for the
   same seed.
2. The player spawn, all enemy spawns, and the stairs are on walkable tiles.
3. Three enemies spawn in the three non-start rooms; the default composition
   remains two melee and one ranged.
4. Tile-grid collision prevents the player, enemies, and projectiles from
   entering solid tiles; camera clamping uses the floor bounds.
5. The exit stays locked while any enemy is not rested and opens when every
   enemy is rested. Opening it emits `floor-purified` and leaves
   `status === "playing"`.
6. Stepping on unlocked stairs creates a new floor, increments depth, resets
   spirit/projectiles, preserves player HP, and emits a descent event.
7. The HUD shows the current depth and stairs state; no purified overlay or
   `"purified"` status remains.
8. `npm run typecheck`, `npm test`, and `npm run build` pass.
9. `CYPRESS_BROWSER=chrome npm run e2e` passes with specs updated to use the
   generated floor rather than hard-coded room coordinates.
10. The production bundle contains no `__gameDebug` hook.

## Dependencies and handoff

Inputs: approved design decisions, current combat/purification behavior.
Outputs: generated floor and collision systems, engine/descent flow, renderer
and HUD updates, unit/e2e tests, implementation log.

Hand off to QA with the tested commit and the commands run.

## Open assumptions / unresolved items

- **HP between floors:** HP persists; no healing is granted on descent because
  safe/rest rooms are out of scope.
- **Spirit between floors:** spirit resets to 0 on descent; it is a per-floor
  meter.
- **Restart:** `R` starts a fresh run at depth 1 with a new seed.
- **Descent input:** walking onto unlocked stairs descends automatically; no
  new key is added.
- **Enemy activation:** enemies use their existing distance aggro. Because
  rooms are separated by corridors and walls, they do not all engage at once.
- **Floor count:** four rooms is the fixed slice size; room dimensions and
  horizontal spacing vary by seed.
