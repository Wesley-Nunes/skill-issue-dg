# 001 — Design: combat depth

## Metadata

| Field | Value |
|---|---|
| Version | `0.2.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Passed` |
| Depends on | Docs task `001` (this package), operator asset handoff (`imp` frames) |
| Produces | `design/0.2.0/design-decisions.md` |
| Next task | `docs/tasks/0.2.0/001-programmer.md` |

Source links: `docs/about-the-project.md` §2 (visual direction, assets), §3.2 (combo identity), §3.3 (skill challenges), §5.1 (enemy archetypes), §7–§8 (platform, architecture), §11 priority 4; `design/0.1.0/design-decisions.md`; `programmer/0.1.0/CoT.md`; `src/game/data/config.ts`.

## Context

- `0.1.0` shipped one hand-authored room (40 × 24 tiles, 640 × 384 world px, 3× zoom), one player, one melee enemy, a single melee swing, dodge, heart HUD, death overlay, and `R` restart. All of its visual language (effects, telegraph tint, hurt flash, death overlay) is approved and carries over.
- `0.2.0` adds three things to the same room: a **three-hit light combo**, a **ranged enemy archetype**, and **one earn-only combo challenge** with a HUD skill-point counter.
- The room now holds **2 melee + 1 ranged enemy** at fixed hand-placed spawns, and clears when all three die. Nothing respawns; clearing does not win the run.
- Assets in `public/assets/dungeon-tileset-ii/frames/`: the melee `chort` (16 × 23), the player `knight_m` (16 × 28), the new ranged `imp` (16 × 16, idle/run), sword, hearts, floor and wall frames. There is **no projectile frame, no attack frame, and no death animation**, and the `imp` has no hurt frame.
- The engine currently models one enemy (`GameState.enemy`). `0.2.0` turns that into a list, so the design must state depth ordering and overlap rules for several enemies plus projectiles.

## Objective

Decide the visual and interaction treatment of the combo, the ranged enemy, its projectile, and the skill-point HUD, with concrete numeric values, so the programmer can implement combat depth without inventing feel.

## In scope

- **Combo chain:** per-step windup/active/recovery, chain-window start and length, input-buffer window, per-step reach and arc angle, damage ladder confirmation, finisher arc bonus, stagger duration and its visible feedback, and what the player sees when the chain resets (whiff or timeout).
- **Swing presentation:** how the three steps differ visually (arc size/color/offset), how the player can tell which step is next and when the chain window is open, without adding UI clutter.
- **Ranged enemy:** `imp` idle/run/telegraph/hit presentation, horizontal facing, distance-band behaviour values (retreat and approach thresholds), line-of-sight rule, fire cadence, and death removal reusing the existing fade.
- **Projectile:** code-drawn appearance (shape, size, color, glow, trail), spawn offset from the imp, speed, radius, lifetime/range, wall-destruction visual, and the player-hit feedback it triggers.
- **Challenge:** skill-point HUD element (position, icon/text, resting and earned states), the earn notification's style, duration, and placement, and how the reset (death/`R`) is communicated.
- **Room composition:** the three spawn positions in the existing room, chosen so the fight is readable and the ranged enemy has room to kite, with no spawn overlapping walls or each other.
- **Death and restart:** what happens to an in-progress chain, live projectiles, and earned points.
- **Concrete values** for every timing, distance, angle, speed, radius, duration, and offset above.

## Out of scope

- Secondary attack, skills, skill-point spending, shop, consumables, currency, loot, boss, procedural floors, safe rooms, persistence, audio, menus.
- Enemy types beyond melee and ranged; enemy-enemy collision; crowd-control beyond the finisher stagger.
- New art or asset acquisition. The projectile is code-drawn; the `imp` frames are the only new assets.
- New UI screens; the skill-point counter and its notice live inside the existing HUD.
- Balance work beyond what this version needs: no difficulty scaling, waves, or progression.

## Approved behavior the design must respect

Operator-approved on 2026-11-02:

1. **Combo:** three-hit light chain. Damage escalates **2 / 2 / 4**; the third hit has a wider arc and a brief stagger; the chain window is about **0.30 s** after a swing; attack input during a swing is buffered into the next step; **a whiff or an expired window ends the chain**.
2. **Ranged enemy:** kiter that holds a mid-range distance band (retreats inside ~110 px, closes beyond ~240 px), fires only with line of sight after a ~0.5 s telegraph, and fires a slow projectile (~150 px/s) that deals 1 damage and is destroyed by walls.
3. **Room:** fixed composition of **2 melee + 1 ranged**, hand-placed, room clears when all die, no respawn, clearing does not win the run.
4. **Challenge:** earn **1 skill point** the first time in a run that all three hits of one chain connect (hits may land on different enemies); shown in the HUD; lost on death; cleared by `R`.
5. **Art:** the ranged enemy uses the supplied `imp` frames; the projectile is drawn procedurally as a small glowing orb with a short trail.

Additional approved rules:

- A swing damages every enemy inside its arc, each enemy at most once per swing; a chain step may hit several enemies.
- Projectiles damage only the player, never enemies, and do not collide with enemies.
- The player keeps the `0.1.0` movement, dodge, HP, i-frame, camera, and death/restart behavior. Taking damage does not reset the chain.
- Enemy HP is re-tuned so the approved chain does not trivially delete a full-health enemy; the proposed values are part of the design decisions and need operator approval with the rest of the design.

## Constraints

- KISS/YAGNI: no visual system the version does not use; no new dependency.
- Only the committed frames are available. The `imp` is 16 × 16 and the `chort` 16 × 23, so the design may not assume a shared sprite size or a shared foot offset.
- Pixel art stays crisp (no smoothing) and the 3× zoom framing from `0.1.0` is unchanged.
- Presentation must not decide outcomes: all timings and values are passed to domain systems as data, and rendering only reads state and events.
- Combat state must be readable without relying on color alone, so a telegraph or hit cue needs a shape or motion cue as well.
- Every value the design specifies must be expressible in one authored config module and assertable in unit tests.

## Acceptance criteria

The design decisions document must:

1. Give a complete combo timing table (windup/active/recovery per step, chain window, buffer window, cooldown if any) and the damage/arc/reach/stagger values for each step.
2. Specify how each of the three steps looks different, how the chain window is communicated, and how a reset is shown — using only existing frames plus code-drawn effects.
3. Specify the ranged enemy's state presentation and concrete band/fire/line-of-sight values, including the telegraph duration and what the telegraph looks like on a 16 × 16 sprite.
4. Specify the projectile's full visual and physical definition (size, radius, speed, lifetime, spawn offset, trail, wall-hit effect) and its damage interaction with the player.
5. Specify the skill-point HUD element and earn notice with exact placement, wording, duration, and behavior on earn, death, and restart.
6. Specify the three spawn positions and the resulting opening framing, confirming none overlaps a wall or another enemy.
7. Confirm the enemy HP values that make the 2 / 2 / 4 chain meaningful, and state any re-tuning of `0.1.0` values with the reason.
8. Require no asset outside the committed set and no new dependency.
9. Avoid adding out-of-scope systems or UI.
10. Be implementable as pure, testable rules with no DOM or Canvas dependency in `src/game/systems`.

## Dependencies and handoff

Inputs: this task, `docs/about-the-project.md`, the committed asset frames including the new `imp` idle/run frames, the `0.1.0` design decisions and implementation.

Outputs: `design/0.2.0/design-decisions.md`, reviewed and accepted by the orchestrator, then handed to the programmer stage.

The design agent must ask the operator one question at a time for decisions that materially affect feel, and may not treat non-blocking polish as approved scope.

## Open assumptions / unresolved items

- Exact timing, arc, reach, stagger, projectile, and band values: **owner design**, resolved with the operator and recorded in the design decisions.
- Whether dodge cancels an in-progress swing and ends the chain: **owner design**, default is yes (cancel and reset) unless the operator approves otherwise.
- Whether the player can steer while swinging (movement during attack): **owner design**, default keeps `0.1.0` behaviour (movement remains available).
- Enemy HP re-tuning: **owner design**, proposed with the design decisions and approved by the operator together with the design.
- Hit feedback for the `imp`, which has no hurt frame: **owner design**, expected to be a flash/knockback only.
