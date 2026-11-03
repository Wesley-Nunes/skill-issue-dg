# QA report — 0.2.0 combat depth

Task: `0.2.0/001` · Verifier: `qa` · Date: 2026-11-03
Tested commit: `7743e81` (programmer handoff; QA task notes `8f67d5a`)
Verdict: **Passed** — 0 blocking findings, 0 high findings

Inputs: `docs/tasks/0.2.0/001-programmer.md`, `docs/tasks/0.2.0/001-qa.md`, `design/0.2.0/design-decisions.md`, `programmer/0.2.0/CoT.md`, `docs/about-the-project.md` §3.2–§3.4, §5.1, §7–§8.

## Environment

| Item | Value |
|---|---|
| OS | Linux (x86_64) |
| Node / npm | v22.23.4 / 10.9.9 |
| Build | Vite 8.3.5, TypeScript 7.0.2 (strict) |
| Unit tests | Vitest 5.0.5 (node environment) |
| Browser tests | Cypress 16.2.1, Electron 41.7.0 headless, viewport 1440 × 810 (also 1024 × 640), DPR 1 |
| E2E target | production build served by `vite preview` on `127.0.0.1:4173`, built with `VITE_E2E=1` so the read-only debug snapshot exists |
| App version | `0.2.0` (`package.json` and lockfile) |

## A. Automated checks

| # | Check | Command | Result |
|---|---|---|---|
| A1 | Clean install | `rm -rf node_modules && npm ci` | Pass — completed, 0 vulnerabilities; Cypress binary 16.2.1 present |
| A2 | Type check | `npm run typecheck` | Pass — no errors |
| A3 | Unit tests | `npm test` | Pass — 12 files, **105 tests** |
| A4 | Production build | `npm run build` | Pass — 25 modules, `dist/assets/index-*.js` 25.47 kB (8.65 kB gzip) |
| A5 | Browser tests | `npm run e2e` | Pass — 2 specs, **14 tests** (5 + 9), ~62 s |

A4/A5 follow-ups: the normal production build contains 43 asset frames (35 existing + 8 `imp`) matching `public/assets/dungeon-tileset-ii/frames/`, and **no** `__gameDebug` reference (`grep -c` = 0). The debug hook exists only in the `VITE_E2E=1` build.

A5 details: `playable-slice.cy.ts` (boot with three enemies, painted floor/hearts, WASD, one-press damage, death + `R`), `slice-regressions.cy.ts` (no console errors/uncaught exceptions, resize/camera/pointer, dodge distance, one hit per press, aim-away miss, full-chain award, once-per-run gating + restart clear, projectile fired and damaging, death freeze + three consecutive restarts).

## B. Acceptance criteria — `001-programmer.md`

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Exactly three enemies at boot, designed spawns, no overlap | Pass | `game.test.ts` start-state test asserts kinds `[melee, melee, ranged]`, HP `[10, 10, 6]`, and exact `ENEMY_SPAWNS` coordinates; browser boot test asserts the same three enemies; spawn distances 230.6 / 229.0 / 328.0 px are outside aggro (160/260) by inspection |
| 2 | Three-step chain with approved timings/arcs/reach/damage; finisher wider + stagger | Pass | `config.ts` matches design §7 exactly (0.08/0.10/0.12, 0.07/0.09/0.10, 0.12/0.12/0.20; 34/36/40 px; 55/55/80°; 2/2/4); `combo.test.ts` covers phase transitions; `game.test.ts` asserts 8 total damage, finisher stagger/knockback; `attack.test.ts` asserts the finisher-only arc |
| 3 | Buffered input advances inside the window; press after the window starts step one | Pass | `combo.test.ts` buffered-press, window-press, and post-window tests; Cypress full-chain test awards a point through buffered presses |
| 4 | Whiff and timeout end the chain; next press starts step one | Pass | `combo.test.ts` whiff + timeout + post-timeout press; `game.test.ts` miss leaves the enemy untouched |
| 5 | A step damages every enemy in the arc, once per step | Pass | `game.test.ts` two-enemies-in-arc test (both lose 2 HP) and exact HP after one press; `comboResolved` guard inspected in `game.ts` |
| 6 | Ranged retreats inside the near band, closes beyond the far band, holds otherwise, respects walls, no fire without LOS/telegraph | Pass | `enemy.test.ts` retreat/close/hold, cooldown block, telegraph release, wall clamp, no-LOS no-fire; `vision.test.ts` open/blocked/same-point segments. In-play LOS is a documented no-op in the convex room |
| 7 | Projectile speed/lifetime/damage, invulnerability gate, wall/hit destruction, no tunneling | Pass | `projectile.test.ts` spawn/travel/wall/lifetime/overlap; `game.test.ts` projectile damage, dodge avoids, i-frames block; `dt` clamp (≤0.05 s) limits a frame to 7.5 px and any outside-bounds position is destroyed |
| 8 | First fully connected chain awards exactly one point, HUD reflects it, later chains award nothing | Pass | `challenge.test.ts` predicate; `game.test.ts` award + once-per-run; Cypress award, notice capture, and second-chain no-award test |
| 9 | `R` resets points, flag, combo state, projectiles and enemies; death loses the point from the HUD | Pass | `game.test.ts` restart reset; Cypress restart test asserts 0 points, three full-HP enemies, no projectiles; the counter and notice are not drawn while dead (code inspection + death capture) |
| 10 | Killing all three marks the room clear without ending the run | Pass | `game.test.ts` room-clear flag/event with status `playing`; renderer/engine inspection; no respawn path exists |
| 11 | Gameplay including projectiles freezes while dead; only `R` accepted | Pass | Cypress death-freeze test compares player and enemy snapshots after input; restart gating inspected in `Game.step` |
| 12 | Debug snapshot exposes enemies, projectiles, combo state, points, flag, room clear; read-only | Pass | `types/index.ts` snapshot shape; `game.snapshot()` is a pure read; hook only installed in dev/`VITE_E2E=1` builds |
| 13 | `typecheck`, `test`, `build`, `e2e` pass; unit coverage of every new rule | Pass | A1–A5 above; 105 unit tests across combo, challenge, vision, projectile, enemy/ranged, damage/knockback, effects, engine |
| 14 | Cypress verifies combo damage, ranged fire/dodge, award + HUD, restart clear | Pass (dodge via unit + observed projectile) | Cypress covers one-press damage, full-chain award, notice screenshot, second-chain gating, restart clear, projectile fire+hit. Dodge immunity to a projectile is covered by `game.test.ts`; the browser run did not script a frame-perfect dodge |
| 15 | No out-of-scope implementation; `0.1.0` behaviour still passes | Pass | Diff inspection (see G); all `0.1.0` regressions in `slice-regressions.cy.ts` pass |

## C. Design compliance (spot checks)

| Item | Expected | Observed |
|---|---|---|
| Combo values | Design §7 | `COMBO` matches exactly |
| Melee HP / speed / range | 10 / 55 / 26 | `MELEE` matches; 0.1.0 melee behaviour retained |
| Ranged values | 6 HP, 70 px/s, 260/110/240, 0.5 s, 1.6 s | `RANGED` matches |
| Projectile | 150 px/s, r4, 1.6 s, 1 dmg, 10 px offset | `PROJECTILE` matches |
| Stagger / hitstop / knockback | 0.15 s / 0.06 s / 6 px | `COMBO` matches; applied only on finisher hits |
| HUD counter | `Skill point: N`, x24, top y74, gold at ≥1 | Renderer matches; captured gold `Skill point: 1` |
| Earn notice | centered, top y72, 18 px, `#f2d38a`, 0.15/1.1/0.35 | Renderer matches; captured `Combo complete · +1 skill point` |
| Controls hint | `WASD move · Mouse aim · LMB combo · Space dodge · R restart` | Captured verbatim |
| Spawns | (448,128) / (224,112) / (560,96) | `ENEMY_SPAWNS` matches |
| Room clear | all dead, no respawn, run continues | Verified by engine test and code inspection |

## D. Manual / visual verification

Temporary Cypress captures (not committed) were written to `/tmp/opencode/qa-shots/` with `canvas.toDataURL` and inspected:

| Scenario | Result | Evidence |
|---|---|---|
| Boot, room, hearts, counter at 0, updated hint | Pass | Boot screenshot; snapshot asserts three enemies and 0 points |
| Finisher arc, 6-line spark, stagger/knockback | Pass | `03-finisher.png` shows the wide bright arc, large spark burst, mid-sweep sword, gold `Skill point: 1` |
| Earn notice | Pass | `04-award-notice.png` shows the centered gold notice while the counter is gold |
| Ranged telegraph readability | Pass | `03`/`05-*` captures show the red imp tint and 1 px sight line |
| Projectile travel and hit | Pass | `06-projectile.png` shows the purple/white orb between imp and player; HP dropped after the hit |
| Melee telegraph ring | Pass | `05-ranged-9.png` shows the red ring around the player at the enemy's range |
| Death overlay, HUD loss of point | Pass | `07-death.png` shows empty hearts, "You died", "Press R to restart", and no skill counter/notice |
| Death freeze | Pass | Cypress freeze test; overlay hides the HUD |

## E. Regression results (`0.1.0`)

Movement/collision, diagonal normalization, aim mapping, camera clamp/smoothing, dodge distance/cooldown/i-frames, melee telegraph/active/cooldown, hearts, death overlay, and restart all pass their retained unit and Cypress tests. The `0.1.0` behaviours changed by approval are the press-per-hit attack (replaces hold) and per-enemy hurt flash (replaces the global timestamp); both match design §9.

## F. Scope and architecture

- `git diff dev...HEAD` adds only `src/` code, tests, the programmer/QA/state/design documents, `package.json`/lockfile version, and the 8 supplied `imp` frames. No other asset changed; no dependency added.
- `src/game/systems`, `src/state`, and `src/game/types` contain no `document`/`window`/canvas/DOM, `performance.now`, `Date.now`, `Math.random`, or `requestAnimationFrame` references (the only "window" hits are the combo-window concept).
- Rendering and input do not resolve hits, apply damage, or decide death; they read state and emit an edge-triggered attack flag.
- No out-of-scope features found: no secondary attack, skills/spending, shop, consumables, currency, loot, boss, procedural floors, safe rooms, persistence, audio, menus, extra enemy types, enemy-enemy collision, or projectile-enemy damage.

## G. Findings

No blocking, high, or medium findings.

Low / informational:

1. **Arc "thickness" terminology (informational).** Design §1.4 repeats `0.1.0`'s "thickness 8/10" wording, but the shipped arc is a filled sector from the player center. The finisher keeps that visual language at radius 40, alpha 0.55, ±80°. This is inherited from `0.1.0` and documented in `programmer/0.2.0/CoT.md`; no correction required.
2. **Line-of-sight is unexercisable in the convex room (documented assumption).** Verified by the pure vision tests, the ranged no-fire-without-LOS test, and code inspection. QA scenario 14 was reconciled to this fact in `8f67d5a`.
3. **In-flight projectiles survive the shooter's death (design silent).** Only new shots stop. Documented in the CoT and QA scenario 18; no product rule was contradicted.

## H. Residual risks

- Cypress throttles `requestAnimationFrame`; timing-sensitive combo rules are covered by deterministic unit tests, and browser specs poll the snapshot. Camera settling is awaited before aiming to avoid screen-space pointer drift.
- Full three-enemy manual clear was not performed end-to-end; the room-clear rule is covered by the engine unit test and inspection.
- The ranged band/LOS rule has no in-room wall to hide behind, so wall-blocked LOS remains future-room coverage only.

## Verdict

**Passed.** All automated checks pass on a clean install; every acceptance criterion has evidence; no blocking finding remains; no out-of-scope work was found.
