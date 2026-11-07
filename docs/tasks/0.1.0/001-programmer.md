# 001 — Programmer: playable combat slice

## Metadata

| Field | Value |
|---|---|
| Version | `0.1.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Passed` |
| Depends on | Approved `design/0.1.0/design-decisions.md` |
| Produces | `src/`, `index.html`, project scripts, tests, `programmer/0.1.0/CoT.md` |
| Next task | `docs/tasks/0.1.0/001-qa.md` |

Source links: `docs/about-the-project.md` §3, §5.1, §7, §8, §9, §11 priorities 1–3.

## Context

- There is no `package.json`, no `src/`, and no build configuration yet.
- `docs/about-the-project.md` §8 defines the target source layout; §7 fixes native Canvas + TypeScript, with Vite allowed as dev server/build tool.
- Version `0.1.0` implements development priorities 1–3 only: application foundation, player foundation, and combat foundation.
- Art comes from `public/assets/dungeon-tileset-ii/frames/` (CC0, DungeonTileset II v1.7). The pack ships a single player hurt frame and no attack/death frames; hurt feedback uses that frame plus a code-drawn flash.

## Objective

Deliver a browser app that boots into one hand-authored room where the player can move, aim, attack, dodge, take damage, kill the enemy, die, and restart, with game rules implemented as testable pure systems.

## In scope

1. **Application foundation**
   - Vite + TypeScript project with `index.html` and `src/index.ts`.
   - Canvas sized and scaled per the design decisions, pixel art unsmoothed.
   - Asset loader for the agreed frames with explicit failure reporting.
   - `requestAnimationFrame` game loop with clamped delta and no catch-up spiral.
2. **Player foundation**
   - WASD movement at a constant speed, normalized diagonals.
   - Circle-vs-wall collision with wall sliding; no tunneling.
   - Mouse-to-world aiming through the camera transform.
   - Camera follow, clamped to room bounds and centered when the room is smaller than the viewport.
   - Idle/run/hit animation switching and horizontal facing.
3. **Combat foundation**
   - Left-mouse melee attack in the aim direction with windup/active/recovery behavior and cooldown.
   - Arc/range hit detection; each enemy is hit at most once per swing.
   - Enemy HP, hit reaction, death and removal.
   - One melee enemy: pursues the player, attacks in range with a telegraph and cooldown, respects walls.
   - Player HP, damage with temporary invulnerability after a hit, and heart HUD.
   - Space dodge: displacement, invulnerability window, cooldown, wall-safe.
   - Player death freezes gameplay and shows the minimal restart prompt; `R` resets the slice to its initial state.
4. **Tests**
   - Vitest unit tests for pure systems.
   - Cypress browser smoke/behavior coverage.

## Out of scope

- Combo system, secondary attack, skills, skill points, challenges, consumables, currency, loot, shop, safe rooms, boss, procedural generation, floors/stairs, artifacts, persistence, audio, menus, meta-progression.
- Full death/post-death/restart lifecycle from `docs/about-the-project.md` §6; only the minimal freeze-and-restart behavior is included.
- Extra enemy types, spawning waves, or difficulty scaling.
- Extra dependencies beyond the build, type, unit-test, and e2e tooling listed below.

## Approved behavior

- Movement, aim, attack, dodge, and HP behavior follow `docs/about-the-project.md` §3.1–3.4 as narrowed by this task.
- Attack direction is the mouse aim direction. No automatic targeting.
- The room is static; entities spawn at fixed positions defined in game data.
- Values that define feel (speeds, damage, ranges, timings) come from the approved design decisions and live in one authored data module; they are not duplicated across systems or rendering.
- Game outcomes are decided only by `game/systems` and `state`; rendering and input never decide hits, damage, or death.
- `src/game/systems` functions are pure: same inputs produce same outputs, no DOM, no Canvas, no globals.
- No randomness is required by this slice; if any is introduced it must accept an injectable seed.

## Constraints

- Follow the layout and responsibilities in `docs/about-the-project.md` §8:
  - `src/game/data/` — authored constants and room/entity definitions;
  - `src/game/types/` — shared domain types;
  - `src/game/systems/` — pure rules;
  - `src/game/engine/` — per-frame orchestration;
  - `src/state/` — runtime state;
  - `src/ui/input/`, `src/ui/rendering/`, `src/ui/screens/`, `src/ui/styles/`;
  - `src/index.ts` — entry and initial setup.
- Dependencies: `vite`, `typescript`, `vitest`, `cypress` only (plus their required typings). No game engine, ECS, physics, or canvas helper libraries.
- TypeScript strict mode. No `any` in domain code without a documented reason.
- Use `public/assets/dungeon-tileset-ii/` paths; do not duplicate or rename the pack frames.
- Do not modify files outside the task scope, including the asset pack license/README files.
- Scripts must include at least: `dev`, `build`, `preview`, `typecheck`, `test`, `e2e`.

## Acceptance criteria

1. `npm install && npm run dev` serves the game; the page renders the room, player, enemy, and HUD on the canvas.
2. `npm run build` succeeds and the production bundle loads assets from the copied public path.
3. `npm run typecheck`, `npm run test`, and `npm run e2e` pass.
4. WASD moves the player; diagonal speed equals cardinal speed; the player cannot cross room walls and slides along them.
5. Mouse position determines the aim indicator and attack direction; the camera follows the player and stays inside room bounds.
6. Left click performs one melee swing per press (or repeated swings at cooldown if the design says hold-to-attack), damaging the enemy at most once per swing when inside the arc.
7. The enemy chases the player, attacks in range after its telegraph, and cannot pass through walls.
8. Taking a hit reduces HP once, applies temporary invulnerability, and updates the heart HUD; HP never goes below zero.
9. Dodge displaces the player per the design values, grants the approved invulnerability window, has a cooldown, and cannot push the player through walls.
10. Enemy HP reaching zero removes it from play and stops its damage.
11. Player HP reaching zero freezes gameplay and shows the restart prompt; `R` restores the exact initial state (positions, HP, timers, enemy alive).
12. Unit tests cover attack arc hit/miss, cooldown gating, damage/death, invulnerability, dodge timing and cooldown, wall collision/sliding, and diagonal normalization.
13. Cypress verifies: app boots without uncaught errors, canvas has non-zero size, HUD renders, movement changes the player position, an attack damages the enemy, and death/restart works.
14. For browser-level gameplay checks, expose a read-only development/test snapshot (for example `window.__gameDebug.getSnapshot()`); it must not grant gameplay control and must not be presented as a public API.
15. No scope from "Out of scope" is implemented.

## Dependencies and handoff

Inputs: approved design decisions, copied asset files, this task.

Outputs: working app, tests, scripts, `programmer/0.1.0/CoT.md` describing decisions, tuning constants, and any deviation. Then hand off to QA.

## Open assumptions / unresolved items

- Final numeric feel values: **owner design**; if a value is missing when implementation starts, ask the orchestrator to return it to design instead of inventing it.
- Exact package-manager command style (npm scripts) is an implementation assumption; document it in the CoT.
- Browser support target is current desktop Chrome/Firefox; document any limitation found.
- Room dimensions and entity spawn positions are authored data; pick values that fit the design camera framing.
