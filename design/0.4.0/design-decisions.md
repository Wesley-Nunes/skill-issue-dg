# Design decisions — 0.4.0 seeded dungeon slice

Owner: `design` · Task `0.4.0/001` · Approved for implementation on
2026-11-06 under the operator's direction to build the simple seeded
generator.

## 1. Source and status

- Product context: `docs/about-the-project.md` §4 and §11.5.
- Task: `docs/tasks/0.4.0/001-design.md`.
- Status: approved; no blocking operator design question remains.
- The operator approved the feature direction, not a new art direction. This
  document reuses the existing dark-dungeon visual language.

## 2. Design goals

- Make the floor read as a place to explore, not one rectangle repeated.
- Make the route from the start room to the stairs legible without a minimap.
- Make “the floor is clear” and “the stairs are open” understandable without
  a full-screen modal.
- Keep combat readability unchanged: enemies, fragments, swords, projectiles,
  and HUD elements keep their current treatment.

## 3. Floor rendering

- Use the existing 16 × 16 DungeonTileset II floor variants (`floor_1` to
  `floor_8`) for every walkable tile. Variant selection stays deterministic
  per tile coordinate.
- Use the existing wall frames for solid tiles adjacent to walkable space:
  `wall_mid` for top/bottom wall bodies, `wall_left` and `wall_right` for side
  walls, and `wall_top_left` / `wall_top_mid` / `wall_top_right` for the cap
  row above a top wall body where the map has room.
- Everything outside rooms and corridors stays the existing void colour
  (`#0b0a0f`). There is no new background, parallax, or theme.
- Rooms are rectangular and connected by two-tile-high corridors. Corridor
  junctions and room mouths use floor tiles, not special transition art.
- No new asset is required. Stairs, glows, and HUD cues are drawn on the
  canvas with simple shapes.

## 4. Stairs and exit states

The stairs are a 2 × 2-tile marker centred in the final room.

| State | Visual |
|---|---|
| Locked | Dark inset slab with a muted stone border and three shallow step lines. A small centred chevron is dim grey. No glow. |
| Unlocked | The same steps plus a cyan (`#bfe9ff`) inner glow, a brighter border, and a slow pulse. Cyan chevrons point downward. |

- The stairs remain visible while locked so the player understands where the
  exit is.
- The stairs are not a modal prompt. Walking onto unlocked stairs descends
  immediately.
- Color is not the only cue: the unlocked state changes border brightness,
  adds the downward chevrons, and changes the HUD text to “Stairs open”.

## 5. HUD

The existing top-left heart and spirit layout stays. Add to the top-right,
using the same system font and inset:

- `Depth N` in light text (16 px), where `N` starts at 1.
- `Stairs sealed` in muted grey or `Stairs open` in spirit cyan (13 px),
  directly below the depth line.

Bottom control hint stays unchanged. A centred `Depth N` banner appears at
the top of the screen for roughly 1.5 seconds after a floor is entered. It
fades out; it does not pause the game.

The full-screen “Floor purified — the boss awaits” overlay is removed. When
the floor is cleared, the HUD changes to `Stairs open`, the stairs begin to
glow, and play continues. There is no `"purified"` game status.

## 6. Camera and viewport

- The camera follows the player smoothly as it does now, but clamps to the
  generated floor bounds rather than the old fixed room.
- On spawn and descent, the camera snaps to the clamped framing around the
  new player position so the first frame is not a long pan.
- The world is larger than the 480 × 270 world-space viewport at 1440 × 810;
  scrolling is expected.
- At smaller viewports the same rule applies. The floor may be fully visible
  in one axis; the existing “centre when the viewport is larger” behaviour is
  retained.

## 7. Floor entry and descent feedback

- Descending is instant: the next floor is generated and the player appears
  at its spawn. There is no loading screen.
- A short cyan screen flash (about 0.3 s) and the `Depth N` banner communicate
  the transition.
- The player's HP is preserved; the spirit meter resets to empty because it is
  a per-floor meter. The HUD reflects both immediately.

## 8. Interaction rules

- Controls do not change: WASD, mouse aim, left-click combo, Space dodge, R
  restart.
- No new key is added for descending.
- Restart starts a fresh run at depth 1 with a new seed.

## 9. Accessibility and readability

- The exit state uses text, shape, and brightness in addition to color.
- AST-sensitive feedback such as hit flashes and telegraphs keeps its existing
  timing; this version does not add screen shake or motion that affects play.
- The depth banner is non-blocking text and does not cover the player or the
  heart HUD.

## 10. Deferred work

Safe rooms, shops, currency, consumables, loot, artifacts, boss encounters,
difficulty scaling, floor themes, enemy-pool variation, audio, menus, and a
final floor are deferred. A minimap, fog of war, doors, keys, and room
transitions are also out of scope for this slice.

## 11. Assumptions

- A left-to-right four-room chain is enough to prove the loop and keeps the
  first generated floor legible.
- The existing enemy distance-aggro is sufficient; no room-entry cutscene or
  lock-in is added.
- The current tile and sprite scale is retained; no zoom change is needed.
