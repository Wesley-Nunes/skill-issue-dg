# QA report — 0.2.0 combat depth

Task: `0.2.0/001` · Verifier: `qa` · Date: 2026-11-04
Tested commit: `7f6f055` (implementation `3eef641`, design/task docs `04253cf`; this report supersedes the earlier `7743e81` verdict)
Verdict: **Passed** — 0 blocking findings, 0 high findings

Inputs: `docs/tasks/0.2.0/001-programmer.md`, `docs/tasks/0.2.0/001-qa.md`, `design/0.2.0/design-decisions.md`, `programmer/0.2.0/CoT.md`, `docs/about-the-project.md` §3.2–§3.4, §5.1, §7–§8.

The combo was reworked after the operator declined the first PR: the previous design buffered attack input and rewarded a steady click. This pass verifies the revised hard-timed chain, the in-world pips, and the damage-break rule, plus the unchanged `0.2.0` scope.

## Environment

| Item | Value |
|---|---|
| OS | Linux (x86_64) |
| Node / npm | v22.23.4 / 10.9.9 |
| Build | Vite 8.3.5, TypeScript 7.0.2 (strict) |
| Unit tests | Vitest 5.0.5 (node environment) |
| Browser tests | Cypress 16.2.1, Electron 146 headless, viewport 1440 × 810, DPR 1 |
| E2E target | production build served by `vite preview` on `127.0.0.1:4173`, built with `VITE_E2E=1` so the read-only debug snapshot exists |
| App version | `0.2.0` (`package.json` and lockfile) |

## A. Automated checks

| # | Check | Command | Result |
|---|---|---|---|
| A1 | Clean install | `rm -rf node_modules && npm ci --prefer-offline` | Pass — 212 packages, 0 vulnerabilities |
| A2 | Type check | `npm run typecheck` | Pass — no errors |
| A3 | Unit tests | `npm test` | Pass — 12 files, **111 tests** |
| A4 | Production build | `npm run build` | Pass — 25 modules, `dist/assets/index-*.js` 27.05 kB (9.15 kB gzip) |
| A5 | Browser tests | `npm run e2e` | Pass — 2 specs, **15 tests** (5 + 10); three consecutive full passes after one transient failure noted in G2 |

A4/A5 follow-ups: the normal production build contains the 43 asset frames (35 existing + 8 `imp`) matching `public/assets/dungeon-tileset-ii/frames/`, and **no** `__gameDebug` reference (`grep -c` = 0). The debug hook exists only in the `VITE_E2E=1` build.

A5 details: `playable-slice.cy.ts` (boot with three enemies, painted floor/hearts, WASD, one-press damage, death + `R`), `slice-regressions.cy.ts` (no console errors/uncaught exceptions, resize/camera/pointer, dodge distance, one hit per press, aim-away miss, timed full-chain award, mash never completes the chain, point persistence until restart, restart clear, projectile fired and damaging, death freeze + three consecutive restarts).

## B. Acceptance criteria — `001-programmer.md`

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Exactly three enemies at boot, designed spawns, no overlap | Pass | `game.test.ts` start-state test asserts kinds `[melee, melee, ranged]`, HP `[10, 10, 6]`, and exact `ENEMY_SPAWNS` coordinates; browser boot test asserts the same three enemies |
| 2 | Three-step chain with approved timings/arcs/reach/damage; finisher wider + stagger; pips show progress and pulse | Pass | `config.ts` matches design §7 (0.08/0.10/0.12, 0.07/0.09/0.10, 0.12/0.12/0.20; 34/36/40 px; 55/55/80°; 2/2/4); `combo.test.ts` covers phases and the reply window; `game.test.ts` asserts 8 total damage and finisher stagger; captures below show the three pips, larger finisher pip, and window pulse |
| 3 | Only an in-window press advances; any other press ends the chain; a mash cannot reach step 3 | Pass | `combo.test.ts` early, pre-window, late, and finisher-interrupt breaks; `game.test.ts` continuous-mash and steady 5 Hz tests assert no step > 1 and no skill point; Cypress mash test asserts `comboStep < 3` and 0 points |
| 4 | Whiff, timeout, mistime, and damage end the chain; next press starts step one; a resolved swing still lands | Pass | `combo.test.ts` whiff/timeout/reset; `game.test.ts` damage-break test asserts the first 2 damage landed and the chain reset; `Game.step` damage path inspected |
| 5 | A step damages every enemy in the arc, once per step | Pass | `game.test.ts` two-enemies-in-arc test and exact HP after one press; `comboResolved` guard inspected in `game.ts` |
| 6 | Ranged retreats inside the near band, closes beyond the far band, holds otherwise, respects walls, no fire without LOS/telegraph | Pass | `enemy.test.ts` retreat/close/hold, cooldown block, telegraph release, wall clamp, no-LOS no-fire; `vision.test.ts` open/blocked/same-point segments. In-play LOS is a documented no-op in the convex room |
| 7 | Projectile speed/lifetime/damage, invulnerability gate, wall/hit destruction, no tunneling | Pass | `projectile.test.ts` spawn/travel/wall/lifetime/overlap; `game.test.ts` projectile damage, dodge avoids, i-frames block; `dt` clamp (≤0.05 s) limits a frame to 7.5 px and any outside-bounds position is destroyed |
| 8 | First fully connected chain awards exactly one point, HUD reflects it, later chains award nothing | Pass | `challenge.test.ts` predicate; `game.test.ts` timed-chain award and a second full chain that awards nothing; Cypress award and point persistence |
| 9 | `R` resets points, flag, combo state, projectiles and enemies; death loses the point from the HUD | Pass | `game.test.ts` restart reset; Cypress restart test asserts 0 points, three full-HP enemies, no projectiles; counter and notice are not drawn while dead (inspection + death capture) |
| 10 | Killing all three marks the room clear without ending the run | Pass | `game.test.ts` room-clear flag/event with status `playing`; no respawn path exists |
| 11 | Gameplay including projectiles freezes while dead; only `R` accepted | Pass | Cypress death-freeze test compares player and enemy snapshots after input; restart gating inspected in `Game.step` |
| 12 | Debug snapshot exposes enemies, projectiles, combo state, points, flag, room clear; read-only | Pass | `types/index.ts` snapshot shape now includes `comboWindowOpen`; `game.snapshot()` is a pure read; hook only installed in dev/`VITE_E2E=1` builds |
| 13 | `typecheck`, `test`, `build`, `e2e` pass; unit coverage of every new rule | Pass | A1–A5 above; 111 unit tests cover the hard-timed chain, break reasons, damage break, hitstop drop, mash/5 Hz non-completion, pips bookkeeping, plus the earlier `0.2.0` systems |
| 14 | Cypress verifies combo damage, mash failure, ranged fire/hit, award + HUD, restart clear | Pass (dodge via unit + observed projectile) | Cypress covers one-press damage, timed full-chain award, a mash that never reaches step 3, point persistence, restart clear, projectile fire+hit. Dodge immunity and the once-per-run gate are covered by `game.test.ts` |
| 15 | No out-of-scope implementation; `0.1.0` behaviour still passes | Pass | Diff inspection (see F); all `0.1.0` regressions in `playable-slice.cy.ts` and `slice-regressions.cy.ts` pass |

## C. Design compliance (spot checks)

| Item | Expected | Observed |
|---|---|---|
| Combo values | Design §7 | `COMBO` matches exactly |
| Reply-window delay / width | 0.06 s / 0.10 s | `COMBO.windowDelay = 0.06`, `COMBO.window = 0.1`; `windowStart`/`windowEnd` use them |
| Finisher hold | 0.12 s after the swing lands | `COMBO.finisherHold = 0.12`; `combo.test.ts` holds then ends with `complete` |
| Input buffer | None | `comboQueued` removed from types, state, engine, and imports; `tickCombo` only advances inside the window |
| Break reasons | `mistime / whiff / timeout / damage / complete` | `ComboEndReason` and `combo-ended` event; renderer suppresses the break burst only for `complete` |
| Chain pips | 3 at `y − 34`, 7.6 px apart, 2.2 px radius, finisher 3.1, pulse 1.3–1.5× at 8 Hz | Constants in `renderer.ts`; pulse `1.4 + 0.1·sin(t·π·16)` gives 1.3–1.5× |
| Pip states | connected gold, current white, next dim, hidden idle/dead, red collapse on break | `drawComboGauge`/`drawPip`; captures below |
| Damage break | HP loss ends the chain, resolved swing still lands, no break effect on death | `Game.damage` resets after the step resolves and skips the event when `died` |
| Hitstop presses | dropped, not buffered or punished | `Game.step` hitstop gate returns before sampling input |
| Melee HP / speed / range | 10 / 55 / 26 | `MELEE` matches; `0.1.0` melee behaviour retained |
| Ranged values | 6 HP, 70 px/s, 260/110/240, 0.5 s, 1.6 s | `RANGED` matches |
| Projectile | 150 px/s, r4, 1.6 s, 1 dmg, 10 px offset | `PROJECTILE` matches |
| Stagger / hitstop / knockback | 0.15 s / 0.06 s / 6 px | `COMBO` matches; applied only on finisher hits |
| HUD counter / notice | `Skill point: N`; centered gold notice | Renderer matches; captured gold `Skill point: 1` and `Combo complete · +1 skill point` |
| Spawns / room clear | (448,128) / (224,112) / (560,96); all dead, run continues | `ENEMY_SPAWNS` matches; engine test + inspection |

## D. Manual / visual verification

Temporary Cypress captures (not committed) were written to `/tmp/opencode/qa-shots/` with `canvas.toDataURL` and inspected:

| Scenario | Result | Evidence |
|---|---|---|
| Idle hides the pips | Pass | `01-idle.png` shows no pips while the chain is idle |
| Window opens after the first hit | Pass | `02-window-step1.png` shows one gold pip, the next pip enlarged/brighter, and the third dim above the player |
| Landed finisher | Pass | `03-finisher.png` shows three gold pips with a larger third, the wide bright arc, large spark burst, and gold `Skill point: 1` |
| Completed chain hides the pips | Pass | `04-complete-pips-gone.png` shows the earn notice with the pips gone |
| Break collapse | Pass | `05-break.png` shows the three pips collapsed in red above the player after an early press |
| Boot, room, hearts, counter at 0, hint | Pass | Boot capture; snapshot asserts three enemies and 0 points |
| Ranged telegraph / projectile / death overlay | Pass | Existing `0.2.0` captures (`03`, `05-*`, `06-projectile`, `07-death`) remain consistent with the unchanged ranged/projectile code |

The earlier `0.2.0` visual checks (finisher arc, award notice, telegraph, projectile, death overlay) still apply; this revision changed combo input, chain state, and the gauge only.

## E. Regression results (`0.1.0`)

Movement/collision, diagonal normalization, aim mapping, camera clamp/smoothing, dodge distance/cooldown/i-frames, melee telegraph/active/cooldown, hearts, death overlay, and restart all pass their retained unit and Cypress tests. The `0.1.0` behaviours changed by approval remain the press-per-hit attack and per-enemy hurt flash (design §9).

## F. Scope and architecture

- `git diff dev...HEAD` adds only `src/` code, tests, the programmer/QA/state/design documents, `package.json`/lockfile version, and the 8 supplied `imp` frames. No other asset changed; no dependency added.
- `src/game/systems`, `src/state`, and `src/game/types` contain no `document`/`window`/canvas/DOM, `performance.now`, `Date.now`, `Math.random`, or `requestAnimationFrame` references (the only "window" hit in that search is a comment in `combo.ts`).
- Rendering and input do not resolve hits, apply damage, or decide death; they read state and emit an edge-triggered attack flag. The pips sample `comboWindowOpen` and `comboHits`.
- No out-of-scope features found: no secondary attack, skills/spending, shop, consumables, currency, loot, boss, procedural floors, safe rooms, persistence, audio, menus, extra enemy types, enemy-enemy collision, or projectile-enemy damage.

## G. Findings

No blocking, high, or medium findings.

Low / informational:

1. **Pip pulse range (fixed before acceptance).** The first implementation pulsed at 1.1–1.5× (`1.3 + 0.2·sin`), but design §1.4 specifies 1.3–1.5×. Corrected in `7f6f055` to `1.4 + 0.1·sin`; the visual style is unchanged.
2. **Transient Cypress failure (not reproduced).** One full `npm run e2e` run during this pass reported 14/15 passing in `playable-slice.cy.ts`; the failure text was not captured. Three consecutive full reruns and a solo run of that spec passed 15/15. The spec has no new timing-sensitive combo logic; recorded as a headless-browser flake risk, not a product defect.
3. **Arc "thickness" terminology (informational).** Design §1.4 repeats `0.1.0`'s "thickness 8/10" wording, but the shipped arc is a filled sector from the player center. The finisher keeps that language at radius 40, alpha 0.55, ±80°, documented in the CoT.
4. **Line-of-sight is unexercisable in the convex room (documented assumption).** Verified by the pure vision tests, the ranged no-fire-without-LOS test, and code inspection.
5. **In-flight projectiles survive the shooter's death (design silent).** Only new shots stop; documented in the CoT and QA scenario 18.

## H. Residual risks

- Cypress throttles `requestAnimationFrame`; timing-sensitive combo rules are covered by deterministic unit tests, and browser specs poll the snapshot at 25 ms. The reply window is 0.10 s, so browser timing tests remain close to the polling margin.
- A deliberate click cadence around 4.4 Hz can still complete the chain; 5 Hz and faster mashing cannot. This is the approved skill band, not a defect.
- Full three-enemy manual clear was not performed end-to-end; the room-clear rule is covered by the engine unit test and inspection.
- The ranged band/LOS rule has no in-room wall to hide behind, so wall-blocked LOS remains future-room coverage only.

## Verdict

**Passed.** All automated checks pass on a clean install; every acceptance criterion has evidence; the one design mismatch found during review was fixed and re-verified; no blocking finding remains; no out-of-scope work was found.
