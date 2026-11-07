# Implementation decision log — 0.1.0 playable combat slice

Owner: `programmer` · Task `0.1.0/001` · Inputs: `design/0.1.0/design-decisions.md` (approved), `docs/tasks/0.1.0/001-programmer.md`.

## Stack and scripts

| Choice | Value |
|---|---|
| Runtime | Browser, native Canvas 2D, no game framework |
| Build/dev | Vite 8, TypeScript 7 strict (`noUnusedLocals`, `noUnusedParameters`) |
| Unit tests | Vitest 5, Node environment, `src/**/*.test.ts` |
| Browser tests | Cypress 16 (Electron), `cypress/e2e/**/*.cy.ts` |
| Scripts | `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`, `test`, `test:watch`, `e2e` |

`npm run e2e` builds the app in `e2e` mode and serves `dist/` with `vite preview` on `127.0.0.1:4173` before running Cypress. Running against the built bundle removes dev-server HMR flakiness and exercises the shipped artifact.

## Source layout

```text
src/
  index.ts                     entry: assets → renderer/input/game → rAF loop, debug hook, boot error screen
  game/
    data/config.ts             every tuning value, spawns, tile/zoom constants
    data/room.ts               wall layout + deterministic floor hash
    data/sprites.ts            frame lists and the full asset manifest
    types/index.ts             domain types (Player, Enemy, GameState, InputFrame, events)
    systems/                   pure rules: movement, collision, attack, damage, dodge, enemy, camera
    engine/game.ts             per-frame orchestration: input → systems → events → state
  state/initialState.ts        factory for the initial run (used by boot and restart)
  ui/
    input/input.ts             keyboard/mouse capture, pointer→world mapping
    rendering/assets.ts        resilient image preload
    rendering/renderer.ts      world, entities, effects, HUD, death overlay
    rendering/effects.ts       transient visual state (sparks, swings, afterimages)
    debug.ts                   `window.__gameDebug` typing for tests
    styles/main.css            full-window canvas, pixelated scaling
```

Rules live in `game/systems` and `state`; rendering and input never decide hits, damage, or death. Every `systems` function is pure and returns new objects.

## Frame flow

1. `input.sample(player, camera)` reads keys/mouse and converts the pointer to world coordinates.
2. `game.step(dt, input)` advances timers, dodge, movement, attack, hit resolution, enemy AI, damage, and camera, and returns typed events.
3. `renderer.draw(state, events)` consumes the events for transient effects, then draws the world, entities, effects, HUD, and death overlay.

`dt` is clamped to `[0, 0.05]` in `src/index.ts` so a backgrounded tab or a stalled frame cannot tunnel through walls or trigger catch-up spirals. No fixed timestep is used (KISS for this slice).

## Tuning values

All values in `src/game/data/config.ts`, exactly as approved in design §9: player 120 px/s, radius 6, 6 HP, 1 damage taken, 0.6 s i-frames; dodge 64 px / 0.18 s / 0.25 s invulnerability / 0.9 s cooldown; attack windup 0.08 / active 0.10 / recovery 0.12 / cooldown 0.45 / reach 34 px / ±55° / 2 damage; enemy 6 HP, 55 px/s, aggro 160 px, range 26 px, windup 0.45 s, active 0.1 s, cooldown 1.1 s; camera τ 0.12 s.

Room: 40 × 24 tiles (640 × 384 world px), walkable area `x ∈ [16, 624]`, `y ∈ [32, 368]`, player spawn `(320, 320)`, enemy spawn `(448, 128)`.

## Decisions and interpretations

- **Enemy attack cooldown semantics.** The 1.1 s cooldown starts when the active window ends, not when the windup begins. Otherwise a 0.45 s windup + 0.1 s active + 1.1 s cooldown would make the design's "cooldown" value ambiguous. Effective cycle: 1.65 s.
- **Enemy aggro is not latched.** Design §9 says the enemy idles when the player is farther than 160 px and chases otherwise, so the enemy returns to idle when the player escapes the radius. It re-engages on re-entry.
- **Hit resolution.** One melee check per swing, evaluated on the first active frame; the enemy can be hit at most once per swing (`attackHit`). Distance is center-to-center against the 34 px reach and the ±55° cone.
- **Dodge** uses the movement input direction, or the aim direction when idle, and grants `max(current, 0.25 s)` invulnerability so a dodge cannot shorten existing post-hit i-frames.
- **Damage** is gated by a single `invulnerable` timer shared by post-hit i-frames and dodge i-frames; enemy damage applies once per active window (`attackHit`).
- **Hurt feedback.** The asset pack ships a single hurt frame, so the hurt state is that frame for 0.15 s with a white flash for the first 0.08 s (design §4).
- **Sword pivot.** The sword is drawn rotating around a point 8 px above the player's feet (hand height) and 6 px along the aim direction, instead of the sprite's geometric center. Visually the knight holds the sword rather than being pierced by it.
- **Aim line.** The 12 px aim line is drawn from 8 px to 20 px along the aim direction so it is not hidden under the player sprite; length and opacity match design §6.
- **Afterimages.** Exactly two per dodge, captured at 40 ms intervals, drawn above the entities with the other combat effects (design §3 ordering).
- **Floor variety.** `Math.imul`-based mixed hash of the tile column/row selects `floor_1…8`; deterministic across reloads, verified visually to produce all eight variants.
- **Camera.** Exponential smoothing toward a clamped target, recomputed every frame from the current viewport; snapped at boot and restart. A viewport larger than the room centers it (negative camera origin).
- **Device pixel ratio.** `min(2, max(1, round(devicePixelRatio)))`; the backing store and camera clamp follow the canvas size each frame, so resizing never restarts the run.
- **Death overlay** freezes gameplay; only `R` is read while dead.

## Deviations from the approved design

1. **Sword pivot and aim line** — see above; both are deliberate so the sprite does not obscure them.
2. **Asset preload** — images load one at a time with up to 3 attempts (cache-busted) because concurrent requests intermittently aborted and surfaced as an undecodable image in the test browser. A genuinely missing file still fails loudly with the file name.
3. **e2e target** — Cypress runs against the built bundle served by `vite preview`, not the HMR dev server. The read-only debug snapshot stays dev-only for normal builds and is enabled for e2e builds through the `VITE_E2E=1` build flag.
4. **No death animation, no enemy health bar, no screen shake** — as designed.

## Tests

Unit (`npm test`, 55 tests): diagonal normalization and wall sliding, attack phases/cooldown/arc boundaries, damage and death for both actors, invulnerability, dodge distance/cooldown/direction, enemy idle/chase/telegraph/active window/cooldown/wall clamping/fade-out, camera clamping and smoothing, engine-level attack hit/miss, death + restart, input lockout while dead, reset, and visual-effect bookkeeping.

Browser (`npm run e2e`, 5 tests): boot with no error screen, full-health player and live enemy; canvas actually paints floor and heart pixels; WASD movement; attack reduces enemy HP; death and `R` restart restore the initial state.

Visual checks (temporary Cypress screenshots, not committed): room floor variety, wall rows/columns, feet-anchored sprites and shadows, sword, aim reticle, enemy telegraph tint, HUD hearts, death overlay text. Screenshots surfaced and fixed a missing floor/wall asset registration, a negative first-frame `dt`, a floor hash that selected too few variants, and a canvas sizing overflow.

## Known limitations

- Cypress throttles `requestAnimationFrame` in headless Electron, so tests drive gameplay in short polling loops rather than long waits.
- No audio, menus, persistence, or mobile input by design.
- `window.__gameDebug` is read-only and absent from normal production builds.
