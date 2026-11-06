# 001 — Design: seeded dungeon slice

## Metadata

| Field | Value |
|---|---|
| Version | `0.4.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Ready for design` |
| Depends on | Operator approval of the dungeon-slice direction (2026-11-06) |
| Produces | `design/0.4.0/design-decisions.md` |

## Context

`0.3.0` is merged. The game still has one hand-authored 40 × 24-tile room,
and a successful purification freezes the run on “Floor purified — the boss
awaits”. The next approved development priority is the dungeon slice
(`docs/about-the-project.md` §11.5). The operator approved a simple seeded
generator rather than a hand-authored multi-room floor.

## Objective

Define the player-visible and interaction decisions for a generated,
traversable floor with an exit, so the programmer can replace the fixed room
without inventing presentation rules.

## In scope

- Floor composition and how generated rooms and corridors read on the canvas.
- Wall and floor treatment using the existing DungeonTileset II frames.
- Stairs/exit marker, locked and unlocked states.
- Floor-depth and exit-status HUD information.
- Removal of the full-screen purified overlay and its replacement feedback.
- Camera framing in a world larger than the viewport.
- Floor-entry and descent feedback.

## Out of scope

- New art assets, new dependencies, safe rooms, shops, currency, loot, boss,
  difficulty scaling, floor themes, audio, menus, or persistence.
- Changes to combat timing, enemy stats, or the purification rules.
- A hand-authored floor variant.

## Approved behaviour

Operator-approved on 2026-11-06:

1. Build a simple seeded room-and-corridor generator for one traversable floor.
2. Use the existing melee and ranged enemies for encounters.
3. Add an exit/stairs and let the player continue downward.
4. Keep the first slice small and testable.

## Constraints

- Reuse existing tiles, sprites, and the current visual language.
- Do not introduce a new asset pipeline or a new runtime dependency.
- Keep the HUD readable at the existing 1024×640 and 1440×810 viewports.
- The floor and camera must remain deterministic for a given seed.
- Design decisions must be concrete enough for QA to verify states and cues.

## Acceptance criteria

1. The design file specifies room/corridor rendering, stair states, HUD
   placement, and camera behaviour.
2. The design file explicitly states that the purified freeze is removed and
   what replaces it.
3. Every visual choice uses existing assets or procedural canvas drawing.
4. Deferred work is listed without implying approval.

## Open assumptions / unresolved items

- No blocking design question remains. Low-impact defaults are recorded in the
  design decision document.
