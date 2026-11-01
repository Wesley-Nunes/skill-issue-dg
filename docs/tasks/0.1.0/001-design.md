# 001 — Design: playable combat slice

## Metadata

| Field | Value |
|---|---|
| Version | `0.1.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Not started` |
| Depends on | Docs task `001` (this package), operator asset handoff |
| Produces | `design/0.1.0/design-decisions.md` |
| Next task | `docs/tasks/0.1.0/001-programmer.md` |

Source links: `docs/about-the-project.md` §2 (visual direction, assets), §3.1–3.4 (controls, combat, health), §7 (platform), §9 (MVP), §10 (open presentation questions).

## Context

- The repository has no application code yet. Version `0.1.0` creates the first browser app.
- The playable space is **one hand-authored room**. Procedural floors, safe rooms, and multi-floor runs are out of scope for this version.
- The player, enemy, room tiles, and HUD heart sprites come from DungeonTileset II v1.7 (CC0), stored in `public/assets/dungeon-tileset-ii/`.
- The asset pack has **no attack and no death animations**. Combat feedback must therefore be built from existing frames plus code-drawn effects.
- Only one enemy type is in scope: a melee chaser (`chort` frames).

## Objective

Decide the visual and interaction treatment for `0.1.0` so the programmer can implement a readable, responsive playable combat slice without making visual or interaction decisions themselves.

## In scope

- Canvas viewport strategy: internal resolution, CSS scaling, pixel-art sharpness, resize behavior.
- Room presentation: floor/wall composition, 3/4 perspective impression, depth ordering between entities and walls, camera framing.
- Player presentation: idle/run/hit frames, horizontal facing, hurt flash, dodge presentation.
- Aim feedback: cursor/reticle or equivalent readable aim indicator.
- Basic attack presentation: sword swing visualization, cooldown/readiness feedback, hit confirmation on the enemy.
- Enemy presentation: idle/run states, aggro/attack telegraph, hit reaction, death removal.
- HUD: heart-based player health, minimal status text, control hints.
- Minimal death overlay and restart prompt.
- Concrete timing/values needed by the programmer: dodge distance, dodge duration, dodge cooldown, invulnerability windows, attack windup/recovery, attack reach/arc, attack cooldown, hit flash duration, camera smoothing.

## Out of scope

- Title screen, menus, shop, skill UI, boss UI, run summary.
- Combo presentation (combos are a later version).
- Audio direction and implementation.
- Procedural floor themes, lighting systems, particles beyond simple combat feedback.
- Mobile/touch controls and remapping UI.
- Accessibility settings beyond readable contrast and non-color-only state cues.
- New art production or asset acquisition beyond the agreed copied frames.

## Approved behavior the design must respect

- WASD movement, mouse aiming, left mouse basic attack, Space dodge (`docs/about-the-project.md` §3.1).
- Basic attack resolves in the aim direction; it is a melee swing, not auto-targeting (§3.2).
- One melee enemy archetype that pursues and attacks at close range (§5.1).
- HP is shown with the heart sprites; damage and healing values remain programmer-tunable constants (§3.4).
- Player death ends the slice with a minimal restart prompt; the full run lifecycle is deferred.

## Constraints

- KISS/YAGNI: no visual system that the slice does not use.
- Only the copied DungeonTileset II frames are available; the design may not assume attack/death sprites exist.
- Presentation must not decide game outcomes. Visual timing values are passed to domain systems as data.
- Pixel art must stay crisp: no smoothing.
- Dark fantasy, readable combat feedback (§2).

## Acceptance criteria

The design decisions document must:

1. Specify an internal canvas resolution, scaling rule, and resize behavior that keep pixel art crisp.
2. Specify how the room is drawn from the available floor/wall frames and how entities are ordered relative to walls and each other.
3. Enumerate every visible player state and the frame sequence/animation rate used for each.
4. Specify aim, attack, hit, dodge, damage, death, and restart feedback with concrete durations/colors/offsets.
5. Specify the HUD layout and how current/max HP is represented with the heart sprites.
6. Define concrete numeric values for all timings listed in "In scope" so the programmer does not invent feel.
7. Require no asset outside the agreed copied set and no new dependency.
8. Avoid adding scope: no combos, consumables, skill points, shop, boss, or procedural generation.

## Dependencies and handoff

Inputs: this task, `docs/about-the-project.md`, the copied asset folder.

Outputs: `design/0.1.0/design-decisions.md`, accepted by the orchestrator, then handed to the programmer stage.

The design agent must ask the operator one question at a time for decisions that materially affect feel, and may not treat non-blocking polish as approved scope.

## Open assumptions / unresolved items

- Exact dodge distance, duration, cooldown, and invulnerability window: **owner design**, resolved with the operator and recorded in the design decisions.
- Attack reach, arc, windup, and cooldown: **owner design**, resolved with the operator.
- Whether holding the attack button repeats attacks: **owner design**, resolved with the operator.
- HUD placement and death overlay wording: **owner design**, resolved with the operator.
- Whether the camera follows with smoothing or locks: **owner design**.
