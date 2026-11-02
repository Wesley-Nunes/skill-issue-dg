# QA report — 0.1.0 playable combat slice

Task: `0.1.0/001` · Verifier: `qa` · Date: 2026-11-02
Verdict: **Pass** (2 findings raised, both fixed and re-verified; 0 open blockers)

Inputs: `docs/tasks/0.1.0/001-programmer.md`, `design/0.1.0/design-decisions.md`, `programmer/0.1.0/CoT.md`, implementation commits `ab61870`, `f482f4c`, `5e7e872`.

## Environment

| Item | Value |
|---|---|
| OS | Linux (x86_64) |
| Node / npm | v22.23.4 / 10.9.9 |
| Build | Vite 8.3.5, TypeScript 7.0.2 (strict) |
| Unit tests | Vitest 5.0.5 (node environment) |
| Browser tests | Cypress 16.2.1, Electron 146 headless, viewport 1440 × 810 (also 1024 × 640), DPR 1 |
| E2E target | production build served by `vite preview` (built with `VITE_E2E=1` so the read-only debug snapshot exists) |

## A. Automated checks

| # | Check | Command | Result |
|---|---|---|---|
| A1 | Clean install | `rm -rf node_modules && npm ci` | Pass — 210 packages, 0 vulnerabilities |
| A2 | Type check | `npm run typecheck` | Pass — no errors |
| A3 | Unit tests | `npm test` | Pass — 8 files, 56 tests |
| A4 | Production build | `npm run build` | Pass — `dist/index.html`, one CSS, one JS bundle (17.8 kB / 6.4 kB gzip) |
| A5 | Browser tests | `npm run e2e` | Pass — 2 specs, 11 tests, twice consecutively (~42 s each) |

A5 details: `playable-slice.cy.ts` (5 tests: boot state, canvas painting, WASD movement, attack damage, death + restart) and `slice-regressions.cy.ts` (6 tests: no console errors/uncaught exceptions during play, resize canvas/viewport/camera/pointer mapping, dodge distance, one hit per swing, swing aimed away misses, freeze after death + three consecutive restarts).

A2/A4 follow-up checks: `dist/` contains all 35 asset frames under `assets/dungeon-tileset-ii/frames/`, and the normal production bundle contains **no** `__gameDebug` reference (`grep -c` = 0). The debug snapshot exists only in dev builds and in `VITE_E2E=1` builds.

## B. Boot and presentation

| # | Scenario | Result | Evidence |
|---|---|---|---|
| B4 | Canvas fills the window, pixel art crisp, room/player/enemy/HUD per design | Pass | `paints the room and the heart HUD on the canvas` asserts lit floor pixels and bright heart pixels at the 24 px inset; visual screenshots (temporary, not committed) confirmed floor variety, walls, feet-anchored sprites, sword, reticle |
| B5 | Resize keeps scaling, pointer aiming and camera correct | Pass | `keeps the canvas, viewport and camera correct across resizes` (1024 × 640 → world 341.3 × 213.3, camera clamped ≤ 170.7, pointer = camera + client/3; back to 1440 × 810 → world 480 × 270, camera settles to 80/114) |
| B6 | No uncaught console errors during boot, play, death, restart | Pass | `plays without uncaught exceptions or console errors`; boot failures render a `pre.boot-error` screen, asserted absent in the boot test |

## C. Movement and collision

| # | Scenario | Result | Evidence |
|---|---|---|---|
| C7 | WASD in eight directions; diagonal speed equals cardinal | Pass | `movement.test.ts` (normalization + diagonal distance = 120 px/s); browser movement test for `D` |
| C8 | Walls and corners stop and slide without tunneling | Pass | `movement.test.ts` (boundary clamp, wall slide), `enemy.test.ts` (chase clamp); browser run reached the bottom wall clamp at y = 362 and the right clamp at x = 618 during exploration |
| C9 | Dodge into walls never leaves the room | Pass | `dodge.test.ts` "stops moving at the wall" |
| C10 | Movement stays responsive while attacking | Pass (code inspection + shared frame test) | Movement and attack advance from the same input frame with independent timers; `game.test.ts` steps attack while movement input is available; no separate frame-rate measurement was taken |

## D. Aim, attack, combat

| # | Scenario | Result | Evidence |
|---|---|---|---|
| D11 | Aim indicator and attack direction agree with the cursor | Pass | Pointer mapping asserted after resize; the aim view is derived from the same world pointer; visual screenshots showed the reticle and sword aligned |
| D12 | Hits inside the arc, misses outside | Pass | `attack.test.ts` (54° hit, 56° miss, 34 px reach, behind = miss); browser `does not damage the enemy when the swing aims away` |
| D13 | One hit per swing, cooldown gating | Pass | `attack.test.ts` (cooldown start/gating, `attackHit`), `game.test.ts` (exactly one `enemy-hit` per swing); browser `damages the enemy exactly once per swing` (HP 6 → 4) |
| D14 | Windup → active → recovery timing and hit feedback | Pass | `attack.test.ts` phase transitions; `game.test.ts` hit lands inside the active window; renderer draws the arc during active + 0.12 s fade |
| D15 | Enemy pursuit, wall avoidance, telegraph, range, cooldown | Pass | `enemy.test.ts` covers idle outside 160 px, re-idle on escape, chase speed, windup start, active window, single damage per window, cooldown after active, wall clamp |
| D16 | Enemy death removes it and stops damage | Pass | `damage.test.ts` (dying state clears windup), `enemy.test.ts` (fade → dead, no damage), renderer skips `dead` |

## E. Health, dodge, death, restart

| # | Scenario | Result | Evidence |
|---|---|---|---|
| E17 | HP decrements one step per hit, i-frames prevent multi-hit, HUD matches | Pass | `damage.test.ts` (apply, i-frame block, expiry, clamp at 0, death), heart mapping `floor(hp/2)` + `hp%2` matches the HUD sprite test |
| E18 | Dodge through an attack takes no damage; damage after the window | Pass | `dodge.test.ts` (0.25 s invulnerability applied at dodge start), `damage.test.ts` (blocked while invulnerable, applied after expiry); same `invulnerable` timer gates enemy damage in `game.test.ts` |
| E19 | Dodge cooldown; cannot dodge while on cooldown | Pass | `dodge.test.ts` (`canDodge` false, `startDodge` returns the same player); browser confirms the dodge displacement is 40–65 px and ends |
| E20 | Kill the enemy, then die; restart restores it | Pass | `game.test.ts` restart restores enemy HP/status; browser `freezes after death and restores the initial state on repeated restarts` |
| E21 | Gameplay frozen after death, only `R` accepted | Pass | `game.test.ts` "ignores gameplay input while dead"; browser asserts position and enemy HP unchanged after movement + attack input while dead |
| E22 | Repeated restarts keep a clean state | Pass | Browser restarts three times; each time HP 6, player (320, 320), enemy (448, 128) HP 6 alive |

## F. Scope and architecture

| # | Scenario | Result | Evidence |
|---|---|---|---|
| F23 | No out-of-scope features, dependencies, or asset changes | Pass | `package.json` has only `vite`, `typescript`, `vitest`, `cypress`, `@types/node`; `git diff 24b49df..HEAD -- public/` is empty; no combo/skill/loot/shop/boss/menu/persistence code |
| F24 | Pure systems, no DOM in rules, no hit/death logic in UI | Pass | `grep` for `document|window|canvas|Image|requestAnimationFrame` in `src/game/systems`, `src/state`, `src/game/engine` returns nothing; rendering only reads state and events |
| F25 | Decision log documents tuning values and deviations | Pass | `programmer/0.1.0/CoT.md` |

## Findings

| # | Severity | Finding | Status | Evidence after fix |
|---|---|---|---|---|
| 1 | Medium | Dodge could travel past 64 px when a frame outlived the remaining dodge time (`movePlayer` integrated a full `dt`). Browser measured 66.7 px. | **Fixed** in `5e7e872`: dodge movement is capped at `min(dt, dodgeTime)`; new unit test "does not overshoot the distance on long frames" | Browser dodge distance now 40–65 px; 56 unit tests pass |
| 2 | Low | `src/game/engine/game.ts` imported `DebugSnapshot` from `src/ui/debug.ts`, so the domain depended on a UI module for its own data shape. | **Fixed** in `f482f4c`: the type moved to `src/game/types`; `ui/debug.ts` re-exports it and keeps the `Window` augmentation | Type check passes; debug snapshot unchanged for Cypress |

### Environment notes (not product defects)

- Parallel preloading of the 35 frames intermittently produced "The source image cannot be decoded." in headless Electron. Sequential loading with up to three retries plus running e2e against the built bundle removed the flake (five consecutive clean runs). A normal browser dev session was not observed failing.
- Headless Cypress throttles `requestAnimationFrame`, so browser tests poll the debug snapshot instead of relying on wall-clock waits; timing-sensitive rules are covered by unit tests instead.

## Design compliance

Every value in design §9 is present in `src/game/data/config.ts` and covered as listed above: player 120 px/s, radius 6, 6 HP, 1 damage taken, 0.6 s i-frames; dodge 64 px / 0.18 s / 0.25 s / 0.9 s; attack windup 0.08 / active 0.10 / recovery 0.12 / cooldown 0.45 / reach 34 / ±55° / 2 damage; enemy 6 HP, 55 px/s, aggro 160, range 26, windup 0.45, active 0.1, cooldown 1.1; camera τ 0.12; enemy fade 0.25. Presentation items checked visually: 2-tile top wall, side/bottom walls, 8 floor variants by deterministic hash, 3× zoom, hearts at the 24 px inset, hint bottom-left, no enemy health bar, death overlay at 60 % dim with the two text lines.

Documented deviations (accepted in `CoT.md`, all non-blocking): sword pivot 8 px above the feet and a 12 px aim line drawn 8–20 px out (both so the sprite does not hide them), sequential/retrying asset preload, and e2e running against the built bundle with a `VITE_E2E`-gated debug hook.

## Verdict

**Pass.** All automated checks pass on a clean install, all task acceptance criteria and design values are verified by test or inspection, out-of-scope systems and dependencies are absent, and the two findings raised during verification are fixed with regression coverage.
