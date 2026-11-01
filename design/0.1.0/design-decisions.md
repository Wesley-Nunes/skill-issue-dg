# Design decisions — 0.1.0 playable combat slice

Status: approved by the operator on 2026-11-01.
Sources: `docs/tasks/0.1.0/001-design.md`, `docs/about-the-project.md` §2–§3, §5.1, §7.

All coordinates and distances below are **world pixels** (1 tile = 16 world px). The renderer draws one world pixel as 3 CSS pixels (`ZOOM = 3`). Timings are seconds unless stated otherwise.

## 1. Viewport, scaling, and pointer mapping

- The canvas fills the browser window. There is no letterboxing and no fixed internal buffer.
- Backing-store resolution: `canvas.width = round(cssWidth * dpr)`, `canvas.height = round(cssHeight * dpr)`, where `dpr = min(2, max(1, round(devicePixelRatio)))`. Context transform uses `devicePxPerWorldPx = ZOOM * dpr`.
- `imageSmoothingEnabled = false`; CSS `image-rendering: pixelated`.
- Visible world area is `cssWidth / 3` × `cssHeight / 3` (e.g. 480 × 270 world px at a 1440 × 810 window).
- Sprite and effect positions are rounded to whole world pixels at draw time so pixels stay aligned.
- Pointer mapping ignores DPR: `worldX = camera.x + (clientX - rect.left) / 3`, same for Y.
- On resize, recompute the backing store and camera clamp. Do not restart the game.
- Device pixel ratio changes are handled on the next resize.

## 2. Room composition

- Hand-authored room of **40 × 24 tiles** = 640 × 384 world px.
- Void fill outside the room: `#0b0a0f`.
- Walkable interior: `x ∈ [16, 624]`, `y ∈ [32, 368]`; the collision boundary is the inner face of the wall tiles.
- Walls:
  - row 0: `wall_top_left`, `wall_top_mid` (30 tiles), `wall_top_right`;
  - row 1: `wall_mid` across the full width (gives the top wall visual thickness);
  - column 0 and column 39: `wall_left` / `wall_right`;
  - row 23: `wall_mid` across the full width.
- Floor: `floor_1`…`floor_8`, chosen by `((x * 73856093) ^ (y * 19349663)) % 8` for each walkable tile, so variation is deterministic across reloads.
- Spawns: player feet at `(320, 320)`; enemy feet at `(448, 128)`. Facing: player aim starts up-right; enemy starts facing down-left.

## 3. Draw order and entity anchoring

1. Void background.
2. Floor tiles.
3. Wall tiles (top, sides, bottom).
4. Shadows: ellipse 12 × 5 world px, `rgba(0,0,0,0.35)`, centered under each entity's feet.
5. Entities sorted by feet `y` ascending (player and enemy).
6. Combat effects (arc, sparks, afterimages) above entities.
7. HUD and death overlay.

Entity sprite anchor is feet-center: horizontally centered, bottom edge on the entity's `y`. Player frames are 16 × 28; enemy frames are 16 × 23; sword is 10 × 29.

## 4. Player presentation

- Idle: `knight_m_idle_anim_f0..f3` at 6 fps.
- Moving: `knight_m_run_anim_f0..f3` at 12 fps; use the run animation whenever movement input is active, even while attacking or dodging.
- Hurt: show `knight_m_hit_anim_f0` for 0.15 s with a white flash overlay (`rgba(255,255,255,0.8)`, 0.08 s) and then return to idle/run. Damage still applies through the normal rules.
- Horizontal facing: mirror the sprite when `aim.x < player.x`. No up/down variants exist.
- Dodge: sprite alpha 0.55 for the 0.18 s dodge, plus 2 afterimages captured at 40 ms intervals, each fading out over 0.2 s.
- Death: gameplay freezes on the last frame; the death overlay covers presentation. No death animation.
- Sword: drawn over the player at the aim angle, offset 6 world px from the player center along the aim direction. During an attack, the sword sweeps linearly from `aim - 70°` to `aim + 70°` across windup + active time (0.18 s), then returns to the aim angle.

## 5. Enemy presentation

- Idle: `chort_idle_anim_f0..f3` at 6 fps.
- Moving: `chort_run_anim_f0..f3` at 10 fps.
- Horizontal facing mirrors on the sign of `player.x - enemy.x`.
- Windup telegraph: sprite tinted red (`source-atop` fill `rgba(255,70,60,0.55)`) and a red arc ring of radius 26 world px, thickness 3, alpha 0.35, for the full 0.45 s windup.
- Hit reaction: white flash `rgba(255,255,255,0.85)` for 0.08 s.
- Death: fade out over 0.25 s with no collision and no damage, then remove.

## 6. Combat feedback

- Aim reticle: 8 × 8 world px crosshair at the world cursor, white at 70% opacity with a 1 px black outline; plus a 12 px aim line from the player center toward the cursor at 50% opacity.
- Attack arc: during the active window plus 0.12 s fade, draw a gold arc `rgba(255,214,120,0.35)`, radius 34, thickness 8, spanning `aim ± 55°`.
- Hit spark: 4 white lines radiating 8 world px from the hit point, fading over 0.12 s.
- No screen shake in this version.
- Telegraph and hurt states never rely on color alone: the enemy also visibly pauses movement and the player's heart HUD changes shape.

## 7. HUD

- Hearts: top-left inset 24 px, three 39 × 36 px hearts in a row with 6 px gaps, sourced from `ui_heart_full`, `ui_heart_half`, `ui_heart_empty`. HP 6 = three full; each heart maps 2 HP (2 full, 1 half, 0 empty).
- Controls hint: bottom-left inset 24 px, `14px system-ui, sans-serif`, `rgba(255,255,255,0.7)`: `WASD move · Mouse aim · LMB attack · Space dodge · R restart`.
- No enemy health bar, no score, no timers, no minimap.

## 8. Death overlay

- Full-viewport `rgba(0,0,0,0.6)`.
- `You died` centered 48 px above the midpoint, `#f2e9da`.
- `Press R to restart` centered 20 px below it, `rgba(255,255,255,0.8)`.
- Gameplay input except `R` is ignored while dead. `R` restores the exact initial state defined in §2, §4, and §9.

## 9. Approved numeric values

| Value | Setting |
|---|---|
| Player move speed | 120 px/s |
| Player collision radius | 6 px |
| Player max HP | 6 (3 hearts, half-heart precision) |
| Player damage per enemy hit | 1 HP |
| Invulnerability after damage | 0.6 s |
| Dodge distance / duration | 64 px / 0.18 s |
| Dodge invulnerability | 0.25 s from dodge start |
| Dodge cooldown | 0.9 s from dodge start |
| Dodge direction | current movement input; aim direction if idle |
| Attack windup / active / recovery | 0.08 s / 0.10 s / 0.12 s |
| Attack cooldown | 0.45 s from press |
| Attack reach / arc | 34 px center-to-center / ±55° |
| Attack damage | 2 enemy HP |
| Attack input | hold LMB repeats at cooldown |
| Enemy max HP | 6 |
| Enemy move speed | 55 px/s |
| Enemy aggro radius | 160 px |
| Enemy attack range / telegraph / active | 26 px / 0.45 s / 0.1 s |
| Enemy attack cooldown | 1.1 s |
| Enemy collision radius | 6 px |
| Camera response | exponential smoothing, τ = 0.12 s |
| Enemy death fade | 0.25 s |

Rules: the enemy ignores the player and idles when farther than 160 px; it chases otherwise, stops moving during windup and active attack, and deals damage only during its active window to a player inside 26 px. Player damage invulnerability and dodge invulnerability both block enemy damage. The enemy does not respawn.

## 10. Camera

- Target is the player's feet position.
- Smooth follow with exponential response `τ = 0.12 s` (`alpha = 1 - exp(-dt / τ)`).
- Clamp so the viewport stays inside the 640 × 384 world; center the room if the viewport is larger than the world.
- Snap the initial camera to the player target on load and on restart.

## 11. Explicit non-goals

No combos, secondary attack, skills/skill points, challenges, consumables, currency, loot, shops, safe rooms, boss, procedural generation, multiple enemies, persistence, audio, menus, settings, or mobile controls. No art outside `public/assets/dungeon-tileset-ii/frames/`.

## 12. Mapping to the design task's acceptance criteria

1. Resolution/scaling/resize: §1.
2. Room drawing and depth order: §2, §3.
3. Player state frames and rates: §4.
4. Aim/attack/hit/dodge/damage/death feedback: §4–§6, §8.
5. HUD layout and HP representation: §7.
6. All required timings: §9.
7. No new assets or dependencies: §11.
8. No scope expansion: §11.
