# QA report — 0.2.0 spirit purification

Task: `0.2.0/002` · Verifier: `qa` · Date: 2026-11-04
Tested implementation: `2df7615` (programmer change set), with the QA-added fragment/combo regression committed alongside this report
Verdict: **Passed** — 0 blocking, 0 high, 0 medium findings

Inputs: `docs/tasks/0.2.0/002-qa.md`, `docs/tasks/0.2.0/002-programmer.md`, `design/0.2.0/design-decisions.md`, `programmer/0.2.0/CoT.md`, `docs/about-the-project.md` §3.2–§3.5, §5.1, §7–§8.

The operator declined the `001` skill-point/challenge reward loop and re-based `0.2.0` on spirit purification. This pass verifies the re-based liberation loop independently of the programmer's description, including the removal of the old reward code and the retained combat foundation.

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
| A3 | Unit tests | `npm test` | Pass — 12 files, **123 tests** |
| A4 | Production build | `npm run build` | Pass — 25 modules, `dist/assets/index-B5hVq-lc.js` 30.42 kB (9.99 kB gzip) |
| A5 | Browser tests | `npm run e2e` | Pass — 2 specs, **15 tests** (5 + 10) |

A4 follow-up: the production bundle contains **no** `__gameDebug` reference (`grep -c` = 0). The debug hook exists only in the `VITE_E2E=1` build.

A5 details: `playable-slice.cy.ts` covers boot with three enemies and intact fragments, painted floor/hearts, WASD, one-press damage, death + `R`. `slice-regressions.cy.ts` covers no console errors, resize/camera/pointer, dodge distance, one hit per press, aim-away miss, a fragment break with the light attack, mash never reaching the finisher, restart clearing spirit/fragments, projectile fire/hit, and death freeze with repeated restarts.

## B. Acceptance criteria — `002-qa.md`

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Two fragments per mob at the approved orbit, size, colour, and bob | Pass | `purification.test.ts` asserts the −135°/−45° orbit, 12 px radius, 10 px offset; `config.ts` matches; captures show the pale orbs. `renderer.ts` draws radius 3.2, `#bfe9ff`, ±1.2 px bob at 3 rad/s |
| 2 | A light-attack step breaks every intact fragment in its arc; outside fragments stay | Pass | `purification.test.ts` inside/outside/dead-enemy cases; `game.test.ts` “breaks every intact fragment inside the swing arc”; Cypress breaks a fragment through a real click |
| 3 | Breaking a fragment counts as a connected combo step | Pass | QA-added `game.test.ts` regression places the body outside the arc, breaks a fragment, and asserts `comboHits === 1`, `comboResolved === true`, and no `enemy-hit`; engine sets `hitAny` on a break before `markStepResolved` |
| 4 | Any HP loss restores all broken fragments on every living mob; blocked damage and dodges do not | Pass | `game.test.ts` projectile HP loss restores `[true, true]` and emits `fragments-restored`; i-frame and dodge tests keep `[false, false]`; engine restores only after `damagePlayer.applied` |
| 5 | Restoration does not reset the mob's HP | Pass | `restoreFragments` changes only the fragment array; the HP-loss test starts at 8 HP and keeps 8 while fragments return |
| 6 | A mob killed with intact fragments fades, then respawns after ~2 s at spawn with full HP and fragments | Pass | `purification.test.ts` revive and countdown; `game.test.ts` asserts `dying`, `respawn = 2`, zero spirit, then alive at `homeX/homeY` with 10 HP and `[true, true]`; `enemy-respawned` emitted |
| 7 | A mob killed with all fragments broken rests permanently, grants 34 spirit once, never respawns | Pass | `game.test.ts` rest test asserts `rested`, `respawn = 0`, 34 spirit, `enemy-rested`, no `enemy-died`; after 3 s it is still dead; `tickRespawn` never revives a rested enemy |
| 8 | Fragments resolve before damage on the same swing | Pass | `resolveComboStep` breaks fragments first, then captures `canRest(next)` and applies damage; a unit test sets `hp = step-1 damage` with all fragments broken and gets a rest |
| 9 | Spirit clamps at 100, freezes the run, shows the purified overlay | Pass | `addSpirit` clamp test; engine test fills to exactly 100, sets `floorPurified` and `status = "purified"`, emits `floor-purified`, then asserts time and player position do not advance; overlay text/layout verified by inspection and the frozen-frame render path |
| 10 | `R` clears spirit, fragments, respawn, rest flags and restores the initial room | Pass | `game.test.ts` restart reset from the purified state and from death; Cypress restart test asserts 0 spirit, no purified flag, three enemies, all fragments intact |
| 11 | No skill-point, challenge, notice, room-clear, or drop behavior remains | Pass | Repository-wide search for `skillPoints`, `challengeEarned`, `roomCleared`, `challenge-complete`, `room-cleared`, `comboAwardsPoint`, and `noticeAt` returns no matches in `src` or `cypress`; `challenge.ts`/`challenge.test.ts` are deleted; no drop/currency code exists |

## C. Design compliance (spot checks)

| Item | Expected (design §3–§9) | Observed |
|---|---|---|
| Fragments per mob | 2 | `PURIFICATION.angles` has two entries; every spawn starts `[true, true]` |
| Orbit | −135°/−45°, radius 12, centre 10 px above feet | `config.ts` + `fragmentPosition` match |
| Fragment look | radius 3.2, `#bfe9ff`, 1.1 px white core 0.6 px up, 5.8 px glow | `renderer.ts` matches; capture shows pale orbs with a core |
| Bob | ±1.2 px at 3 rad/s, opposite phase | `config.ts` + `Math.sin(time·3 + index·π)` |
| Break effect | 6 lines × 7 px, 0.18 s, pale blue | `effects.ts` matches |
| Restore effect | 5 lines × 9 px, 0.22 s | `effects.ts` matches |
| Rest effect | 8 lines × 14 px, 0.35 s | `effects.ts` matches |
| Respawn effect | 4 lines × 8 px, 0.20 s, muted violet | `effects.ts` matches |
| Ready cue | tint `rgba(191,233,255,0.4)`, ring radius 13 / 1.4 px, alpha 0.27–0.63 at 6 rad/s | `renderer.ts`: `0.45 + 0.18·sin(time·6)` and radius 13; capture shows tint and ring |
| Spirit HUD | `Spirit: N%`, x 24 / top 74, 14 px; 120 × 6 bar at y 92 | `renderer.ts` constants match; capture shows the text and bar |
| Spirit colours | `#bfe9ff`, track 0.16, border 0.45; white-70 at 0 | Renderer matches |
| Spirit values | 34 per rest, threshold 100 | `config.ts` matches; 3 × 34 clamps to 100 |
| Respawn delay | 2 s after the 0.25 s fade | `respawnDelay = 2`; the timer only counts down once the enemy is `dead` |
| Purified overlay | `Floor purified` 48 px, `The boss awaits` 20 px, `Press R to restart` 16 px | `drawPurifiedOverlay` matches the text and positions |
| Retained combat | combo values, enemies, projectiles, dodge, camera, death | `config.ts` retains the approved `001` values; all retained tests pass |

## D. Manual / visual verification

Temporary Cypress captures (not committed) were written to `/tmp/opencode/qa-shots/` with `canvas.toDataURL` and inspected:

| Scenario | Result | Evidence |
|---|---|---|
| Boot frame | Pass | `01-boot.png` shows the room, hearts, `Spirit: 0%`, the 120 × 6 empty bar, and a melee mob carrying two pale-blue fragments |
| One fragment broken | Pass | `02-one-fragment.png` shows one orb gone and one intact after a real light-attack click |
| Ready to rest | Pass | `03-ready-to-rest.png` shows both orbs gone, the pale sprite tint, and the pulsing ring around the mob |
| Spirit HUD at 0 | Pass | Boot capture; snapshot asserts `spirit = 0` and `floorPurified = false` |
| Purified overlay | Pass (inspection + engine test) | Not reached through a three-mob browser clear; `drawPurifiedOverlay` inspected and the freeze/restart is covered by `game.test.ts`. Reason recorded instead of claiming a visual capture |

The captures show only one enemy because the camera framing at boot is clamped to the room; this is expected and not a rendering defect.

## E. Regression results (`0.1.0` and `0.2.0/001`)

Movement/collision, diagonal normalization, aim mapping, camera clamp/smoothing, dodge distance/cooldown/i-frames, melee telegraph/active/cooldown, hearts, death overlay, and restart all pass their retained unit and Cypress tests. The hard-timed three-step chain, reply window, finisher hold, hitstop, knockback, stagger, chain pips, two melee + one ranged composition, and projectile behavior remain and pass. No retained behavior was weakened by the purification change.

## F. Scope and architecture

- `git diff` for `002` changes only `src/`, tests, Cypress, and the requested docs/design/programmer/QA files. No dependency, asset, or package-script change.
- `src/game/systems`, `src/state`, and `src/game/types` contain no DOM, canvas, `performance.now`, `Date.now`, `Math.random`, or `requestAnimationFrame` references.
- Rendering samples state and events; it does not decide fragment breaks, rest, respawn, or spirit.
- Pure rules live in `purification.ts`; the engine sequences them. The fragment array is plain state, not an entity system.
- Removed scope is actually absent: no skill points, challenge predicate, notice, room-clear flag/event, drops, boss, floors, inventory, or currency.
- UI text uses the approved phrasing; no placeholder or debug UI remains.

## G. Findings

No blocking, high, or medium findings.

Low / informational:

1. **Fragment hit is deliberately generous.** The two fragments sit 49° apart inside the 110° step-1 arc, so a close swing between them often breaks both. This matches “a swing can break multiple fragments”; future difficulty should come from count/order/movement, not a hidden narrower arc (recorded in the CoT and design).
2. **Same-swing completion.** Fragments resolve before damage, so the killing swing can also break the last fragment. This is a design assumption, not an operator-specified detail; it is recorded in `design-decisions.md` §11.
3. **Ready-to-rest cue is an implementation default.** The pale tint and ring were not separately specified by the operator; the design task required every state to be visible, and the cue is reversible.
4. **Respawn timing reads ~2.25 s after the lethal hit.** The 2 s timer only counts down after the 0.25 s death fade, consistent with “fade, then waits 2 s”. No second timer was added.
5. **Purified overlay not reached through a full browser clear.** The state transition, freeze, clamp, and restart are covered by the engine unit test; the overlay itself was verified by code inspection rather than a three-mob Cypress clear. Recorded as a coverage limitation, not a defect.
6. **Transient Cypress flake.** One earlier full `npm run e2e` run during this pass reported 14/15 in `playable-slice.cy.ts`; the failure text was not captured. A solo rerun passed 5/5 and the final full run passed 15/15. Recorded as a headless-browser timing risk.

## H. Residual risks

- Cypress throttles `requestAnimationFrame`; tests poll the snapshot and settle the camera before world-space clicks. The purified overlay has no browser-level end-to-end path yet.
- A deliberate click cadence just inside the reply window can still chain; that is the approved skill band, not a defect.
- The ranged band/LOS rule has no in-room wall to hide behind, so wall-blocked LOS remains future-room coverage only.
- No audio, menus, persistence, skill spending, drops, boss, or floors by design.

## Verdict

**Passed.** All automated checks pass on a clean install; every `002-qa.md` acceptance criterion has unit, browser, or inspected evidence; the removed reward loop is absent; the one added QA regression closes the fragment-as-combo-hit coverage gap; no blocking finding remains.
