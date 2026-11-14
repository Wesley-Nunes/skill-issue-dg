# QA report — 0.8.0 single light attack and depth difficulty curve

## Metadata

| Field | Value |
|---|---|
| Version | `0.8.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested implementation | `ae1b1fe` (`feat(game): replace light chain with committed swing and depth curve`) |
| Contract commits | `2a763d2` (tasks/docs), `6bf19de` (design decisions) |
| Implementation log | `programmer/0.8.0/CoT.md` |
| Branch | `feature/0.8.0-001-combat-feel` (local only) |
| Base | `dev` / `origin/dev` at `da17b57` (PR #11 merged `0.7.0`) |
| Date | 2026-11-13 |
| Hosted CI | Pending on GitHub; not run or emulated locally |
| Vercel | Pending operator connection; deployment not verified |

## Independence and limitation (read first)

The orchestrator executed the docs, design, implementation, and QA stages
because no specialist subagent was available for this version. Verification was
therefore performed by the same author who wrote the implementation. This is a
real reduction in independence and is not equivalent to a separate-agent QA
pass:

- the implementation and the verification share one author;
- no second agent reviewed the diff against the contract;
- the judgment-based part of §6.2 ("forgiving but not inert") was assessed from
  the numeric model, automated playthroughs, and canvas captures, not from a
  fresh human playtest.

To reduce the risk, every check below was executed against the actual branch,
test suite, production build, and rendered game instead of being accepted from
`programmer/0.8.0/CoT.md`. Commands were rerun after a clean `npm ci`, and the
curve was recomputed independently from the design table rather than read from
the implementation. The operator should weigh the independence caveat before
merging.

## Scope verified

- Removal of the three-hit light chain and every chain-only state, visual,
  effect, event, config value, and test.
- One committed light swing: press edge, windup/active/recovery, damage, reach,
  arc, knockback, hitstop, no stagger, no buffering.
- Fragment rules: in-arc breaks, multiple breaks per swing, restoration on HP
  loss, respawn on an intact fragment, rest on a fully broken mob.
- Depth curve: HP and cadence for mobs and the Warden, damage thresholds,
  rounding, depth-10 cap, application on creation and after descent.
- Depth-1 composition: three melee mobs, no tutorial UI or state.
- Regression surface from `0.7.0`: spirit, gate, explicit summon, shop,
  draught, Vigor, stairs, descent, death, restart, audio/mute, debug gating.
- Tests, build, documentation alignment, and diff scope.

## Commands and evidence

| Command | Result | Notes |
|---|---|---|
| `npm ci` | Pass | 212 packages in ~3 s from the lockfile |
| `npm run typecheck` | Pass | `tsc --noEmit`, no output |
| `npm test` | Pass | 17 files, 187/187 tests |
| `npm run build` | Pass | `dist/assets/index-eXqgvbdh.js` 80.46 kB (24.11 kB gzip), CSS 4.28 kB |
| Production bundle check | Pass | `grep -c "__gameDebug" dist/assets/*.js` → `0`; no chain fields |
| `CYPRESS_BROWSER=chrome npm run e2e` (run 1) | Pass | 32/32 across 5 specs, 2 m 53 s |
| `CYPRESS_BROWSER=chrome npm run e2e` (run 2) | Pass | 32/32 across 5 specs, 2 m 54 s |
| `CYPRESS_BROWSER=chrome npm run e2e` (run 3) | Pass | 32/32 across 5 specs, 2 m 55 s |
| Static chain scan | Pass | No `combo`/`finisher`/`chainBreak`/`staggerScale`/`knifeSlice2`/`challenge`/`tutorial` match in `src/` or `cypress/` `.ts` files |
| Independent curve computation | Pass | Recomputed from `0.80 + 0.08 × (depth − 1)` and `1.15 − 0.03 × (depth − 1)`; matches §5.2/§5.3 rows below |

Spec breakdown of the 32 Cypress tests:

| Spec | Tests | Result |
|---|---|---|
| `loading-screen.cy.ts` | 7 | Pass |
| `playable-slice.cy.ts` | 6 | Pass |
| `portfolio-release.cy.ts` | 4 | Pass |
| `reward-loop.cy.ts` | 5 | Pass |
| `slice-regressions.cy.ts` | 10 | Pass |

Three consecutive Chrome passes were required because the shared `attackWorld`
helper was rewritten: a press dropped during hitstop must not be mistaken for a
started swing, and the suite has to remain stable without the removed chain
fields.

## A. Attack behavior

| # | Check | Verdict | Evidence |
|---|---|---|---|
| A1 | One click = one swing; holding neither repeats nor buffers | Pass | `attack.test.ts` press/swing/hold cases; `game.test.ts` "produces exactly one swing from a single press", "ignores a press made during the committed swing", "starts a new swing only after the recovery completes"; Cypress "damages a melee enemy exactly once per press" and "does not repeat the swing while the button is held" |
| A2 | Windup/active/recovery/reach/arc/damage/knockback/hitstop match §2.1 | Pass | `ATTACK` in `src/game/data/config.ts` equals 0.10/0.09/0.22/36/60°/2/6/0.05; `attackPhase()` boundaries at 0.10 and 0.19 and `attackTotal()` 0.41; arc tests at 59°/61° and reach ±1; `game.test.ts` knockback and hitstop assertions |
| A3 | One swing can break both fragments; feedback does not imply a single target | Pass | `game.test.ts` "breaks every intact fragment inside the swing arc" expects both; fragment shatter burst is emitted per fragment; capture `qa-fragment-break-1440.png` |
| A4 | HP loss restores every broken fragment; an intact-fragment kill respawns | Pass | `game.test.ts` "restores every broken fragment when the player loses HP" and "respawns a conventionally killed mob with its fragments restored"; Cypress restart/fragment reset case |
| A5 | Dodge and i-frames still apply; i-frames keep fragments broken | Pass | `game.test.ts` dodge, projectile i-frame, and "keeps fragments broken when invulnerability blocks the HP loss"; Cypress "dodges the configured distance" |

Timing note: the press is consumed by the input layer before the engine's
hitstop gate, so a click during hitstop is dropped rather than buffered. This is
existing behavior, is consistent with the committed-swing rule, and is why
`attackWorld` only retries when no swing started and no enemy HP changed. See
observation O2.

## B. Chain removal

| # | Check | Verdict | Evidence |
|---|---|---|---|
| B1 | No pips, reply pulse, finisher hold, or chain-break effect visible | Pass | Renderer/effects diff removes the gauge, per-step sweep, hold, and break effect; captures show only hearts, spirit, points, draught, depth; no chain affordance |
| B2 | No chain state, type, event, or config remains | Pass | `Player` has `attacking`/`attackTime`/`attackResolved` only; `GameEvent` has no `combo-ended`; `COMBO` deleted; static scan clean; debug snapshot exposes attack fields, not chain fields |
| B3 | No orphaned stagger configuration or application | Pass with note | `BOSS.staggerScale`, `staggerEnemy()`, and the attack's stagger application are gone; the attack applies knockback and hitstop only. A zero-valued `Enemy.stagger` timer and its renderer tint remain without any production producer (observation O1) |
| B4 | No part of the deferred challenge system was built | Pass | No challenge card, popup, buff, per-floor progression, reward, or new hotkey; static scan for `challenge` is empty; §10 deferred items untouched |

## C. Depth scaling

| # | Check | Verdict | Evidence |
|---|---|---|---|
| C1 | Depth 1 uses the teaching values | Pass | Generated mobs have 8 HP, Warden 24 HP, cadence 1.27/1.84/2.99, damage 1/1/2/2; asserted in `depth.test.ts` and observed in captures/snapshots |
| C2 | Depth 2 uses the next curve row after descent | Pass | `depth.test.ts` rows; `game.test.ts` descent preserves run state and regenerates the floor; Cypress depth-2 capture shows melee 9 HP and ranged 5 HP |
| C3 | Independently computed rows match, including the cap | Pass | Table below; depth 11 and 40 reuse depth 10 |
| C4 | Movement, roster, count, and topology do not scale | Pass | `depth.test.ts` asserts the scaling payload carries only HP/damage/interval fields and base speed/aggro/projectile values are unchanged; `floor.ts` keeps one spawn table and three mobs |
| C5 | Scaled values apply to the new floor; no stale leak | Pass | `createEnemy`/`createBoss` receive `scalingForDepth(depth)`; `descend()` rebuilds the state at the new depth; engine descent test and depth-2 capture confirm new values |

### Computed versus implemented curve

Computed independently with `hp = min(1.52, 0.80 + 0.08 × (d − 1))` and
`cadence = max(0.88, 1.15 − 0.03 × (d − 1))`, then rounded (HP nearest integer,
cooldowns to two decimals with half-up epsilon):

| Depth | Melee HP (10) | Ranged HP (6) | Warden HP (30) | Melee cd (1.1) | Ranged/Warden cd (1.6) | Bomb cd (2.6) |
|---|---|---|---|---|---|---|
| 1 | 8 | 5 | 24 | 1.27 | 1.84 | 2.99 |
| 2 | 9 | 5 | 26 | 1.23 | 1.79 | 2.91 |
| 5 | 11 | 7 | 34 | 1.13 | 1.65 | 2.68 |
| 6 | 12 | 7 | 36 | 1.10 | 1.60 | 2.60 |
| 10 (cap) | 15 | 9 | 46 | 0.97 | 1.41 | 2.29 |

All computed cells equal the implementation's `scalingForDepth()` output and
the §5.2/§5.3 tables. `depth.test.ts` also asserts monotonic HP, a minimum of 1,
the depth-10 cap at depths 11 and 40, and the damage thresholds:

| Source | Depth 1–4 | 5 | 6 | 7 | 8–10 |
|---|---|---|---|---|---|
| Melee hit | 1 | 2 | 2 | 2 | 2 |
| Projectile | 1 | 1 | 2 | 2 | 2 |
| Warden melee | 2 | 2 | 3 | 3 | 3 |
| Warden bomb | 2 | 2 | 2 | 3 | 3 |

## D. Composition and teaching floor

| # | Check | Verdict | Evidence |
|---|---|---|---|
| D1 | Depth 1 is three melee; depth 2 is two melee + one ranged with stable ids/positions | Pass | `floor.test.ts` "keeps depth 1 melee-only and adds the ranged mob from depth 2"; ids `melee-1`, `melee-2`, `mob-3` and spawn coordinates match across depths; `playable-slice.cy.ts` asserts three melee at 8 HP |
| D2 | Depth 1 is forgiving but not inert, with no tutorial overlay | Pass (model + automation) | Melee 8 HP = 4 body hits and roughly 5–6 swings including fragments (≈2.1–2.5 s); player 6 HP survives 6 melee hits, 3 Warden melee hits, or 3 bombs; the full rest → summon → defeat → descend flow is exercised across `reward-loop.cy.ts`, `portfolio-release.cy.ts`, and `game.test.ts`; no human playtest this session |
| D3 | No tutorial prompt, overlay, hint, tooltip, or tutorial state | Pass | No `tutorial` match in `src/`/`cypress/`; the start room uses only the existing controls legend; captures show no added copy |

## E. Regression matrix

| Area | Verdict | Evidence |
|---|---|---|
| Title screen and boot loading | Pass | `loading-screen.cy.ts` 7/7; `game.test.ts` title does not simulate until started |
| Pause and death screens | Pass | Engine pause/resume and death tests; Cypress death/restart specs; captures unaffected |
| Spirit, gate, explicit summon, shop closure on summon | Pass | `game.test.ts` rest/unlock/summon/repeat/shop-close cases; `reward-loop.cy.ts` 5/5 |
| Shop purchases, draught, healing caps | Pass | `shop.test.ts`, engine purchase/use/heal-cap tests, `reward-loop.cy.ts` |
| Stairs open, descent heals 2, floor regenerates, run state persists | Pass | Engine descent/heal/persistence tests; `portfolio-release.cy.ts`; depth-2 Cypress flow |
| Death, summary, restart, `R` | Pass | Cypress restart cases; engine reset asserts spirit, fragments, attack state, and projectiles reset |
| Audio cues and `M` mute; playable muted | Pass | `audio.ts` gates every cue on `muted`, `index.ts` maps `mute` to `toggleMute()`, manifest/file tests pass; no direct playback assertion in e2e (observation O3) |
| Debug hooks only under `DEV`/`VITE_E2E` | Pass | `src/index.ts` gates `__gameDebug`; production build contains 0 occurrences |

## F. Quality and documentation

| # | Check | Verdict | Evidence |
|---|---|---|---|
| F1 | `docs/about-the-project.md` matches delivered behavior | Pass | §1, §3.2, §4.1, §5, §6, §9–§12 describe the single attack, boss uninterruptibility, depth curve, depth-1 composition, flat economy, and deferred challenge; `GOAL.md` refreshed in `2a763d2` |
| F2 | No dead code, debug artifacts, unused exports, or unrelated refactors | Pass with note | Chain files/tests deleted; diff is scoped to attack, depth, enemies, wiring, presentation, and tests; `dist` has no debug hook; one inert stagger timer remains (O1) |
| F3 | Cypress helpers reworked, not weakened | Pass | `attackWorld` retries only while `attacking` is false and no enemy HP changed; a committed swing is visible for 0.41 s, longer than the 100 ms observation window; three consecutive full passes |
| F4 | Tests updated rather than deleted where behavior survives | Pass | Chain-specific tests replaced by single-swing, phase, cancel, double-break, depth-2 projectile, and Warden non-interruption coverage; `combo.test.ts` removed with the feature it tested |

## Design decision traceability

| Design section | Verdict | Evidence |
|---|---|---|
| §2.1 Attack contract | Pass | `ATTACK` constants and timing tests match every value |
| §2.2 Fragment interaction | Pass | Double break, restoration on HP loss, intact-kill respawn, full-break rest |
| §2.3 What the attack does not do | Pass | No stagger, chain, input window, or depth scaling of the player attack; Warden telegraph survives a landed swing |
| §3 Chain feedback removal | Pass | Every listed element removed; no replacement affordance |
| §4 Presentation | Pass | One 36 px/120° sweep, existing hit flash, 0.05 s hitstop, 6 px knockback, per-fragment burst; capture `qa-fragment-break-1440.png` |
| §5.1 Scaling rules | Pass | Numbers only; count/roster/topology stable; rounding and cap verified |
| §5.2–5.4 HP, cadence, damage | Pass | Tables above |
| §5.5 Application points | Pass | Creation and descent receive the floor depth; `staggerScale` deleted |
| §6 Depth-1 teaching floor | Pass | Three melee spawns; computed targets match; no tutorial UI |
| §7 Difficulty communication | Pass | Only the existing depth HUD and floor banner; no new element or copy |
| §8 Accessibility | Pass | No shake/flash/inversion added; knockback unchanged; telegraph remains visible; mute and reduced-motion paths intact |
| §9 Verification hooks | Pass | All 10 hooks covered by unit/Cypress checks or source inspection |
| §10 Deferred ideas | Pass | No heavy attack and no challenge card/progression/reward |

## Visual verification

A temporary `qa-captures.cy.ts` spec rendered the real game and saved viewport
screenshots, then was deleted before handoff. The images are gitignored and were
not committed.

| Capture | Size | Observed |
|---|---|---|
| `qa-depth1-1024.png` | 1024 × 633 | Depth 1, three hearts, spirit 0%, 0 points, empty draught, no chain pips, controls legend, start room plus the fixed branch |
| `qa-depth1-1440.png` | 1280 × 633 | Depth 1 at the larger request; camera framing and HUD unchanged, no clipping or overlap |
| `qa-fragment-break-1440.png` | 1280 × 633 | One wide sweep and two distinct shatter bursts on a melee mob; no chain gauge or reply window |
| `qa-depth2-1440.png` | 1280 × 633 | Depth 2 banner, two melee mobs at 9 HP and the ranked imp (ranged) at 5 HP in the same room layout |
| `qa-warden-1440.png` | 1280 × 633 | `Arena open`, boss bar `Floor Warden`, depth 1 HUD, Warden with its red aggro ring; 3 points after the rests |

Capture limitation: in this X11 session the browser window is clamped, so a
`cy.viewport(1440, 810)` request yields a 1280 × 633 image and a
`cy.viewport(1024, 640)` request yields 1024 × 633; scrollbars appear in the
clamped images. The live e2e suite independently asserts the canvas is exactly
1024 × 640 and that the game's internal viewport is 480 × 270 units (the
1440 × 810 framing) after the resize, so layout at both target sizes is
verified even though the saved images are clipped. This is an environment
limitation, not a product failure.

## Findings

No blocking findings. The version meets the approved contract and the `0.7.0`
regression surface.

### F1 — Low — Cypress projectile regression assumed a depth-1 ranged mob — **Closed in `ae1b1fe`**

- Requirement: depth 1 is melee-only; the ranged mob first appears at depth 2.
- Observed: the old spec looked for a depth-1 `ranged` enemy and failed with
  `Cannot read properties of undefined`.
- Correction: the spec now calls `cy.descend()` and asserts the depth-2 ranged
  mob before teleporting into its firing band. Verified by the three full
  Chrome passes; no product change was needed.
- Owner: programmer (test update).

### F2 — Low — design §6.1 said the second and third mobs' kinds differ at depth 1 — **Closed in `ae1b1fe`**

- Requirement: only the third spawn changes kind; ids and positions are stable.
- Observed: §6.1 read "the second and third mobs' kinds differ", contradicting
  the code and the rest of the contract.
- Correction: the sentence now says "only the third mob's kind differs at depth
  1", matching `floor.ts` and `floor.test.ts`.
- Owner: design/docs (wording only, no behavior change).

### F3 — Low — exact-size canvas captures are clipped by the browser window — **Open, non-blocking**

- Requirement: captures at 1024 × 640 and 1440 × 810.
- Observed: images saved at 1024 × 633 and 1280 × 633 because the X11 browser
  window is clamped; game-internal viewport assertions still pass at both sizes.
- Impact: evidence is slightly smaller than requested; layout at 1440 × 810 is
  still proven by the resize test, not by the saved pixels.
- Owner: environment / future QA tooling. Route: orchestrator, no code change.

### O1 — Observation — inert `Enemy.stagger` timer remains — non-blocking

`Enemy.stagger` is still decremented in `updateEnemy()` and read by the
renderer's tint, but no production action sets it above 0 anymore; only engine
tests use `stagger: 9` to hold enemies still. The attack no longer staggers
anything, `BOSS.staggerScale` and `staggerEnemy()` are gone, and the type
comment documents the field as an internal freeze timer. This does not change
observable behavior, but it is a YAGNI/cleanup candidate for a future version.
The QA task's B3 is satisfied in the behavioral sense: no stagger configuration
or application remains.

### O2 — Observation — a press during hitstop is dropped, not buffered

The input layer consumes the press before the engine's hitstop early return, so
a click inside the 0.05 s hitstop is lost. This is unchanged behavior and is
consistent with "does not buffer", but it can occasionally feel like an ignored
input. Recorded for design/programmer consideration beyond `0.8.0`; the Cypress
retry helper is deliberately limited to the no-swing, no-HP-change case.

### O3 — Observation — audio mute is verified structurally, not acoustically

`M` maps to `toggleMute()`, every playback path checks `muted`, and the manifest
contains existing files only, but no e2e test asserts audible output. This
matches the previous versions' coverage and is non-blocking because no gameplay
state depends on audio.

### O4 — Observation — `knifeSlice2.ogg` remains on disk, unused

The finisher cue was removed from `AUDIO_MANIFEST` and is no longer played; the
file and its attribution entry remain, per the no-asset-change scope. No action
required this version.

## Residual risks and not verified

- **Independent QA:** performed by the implementing orchestrator; see the
  independence caveat.
- **Hosted CI:** GitHub Actions has not run; local typecheck, unit, build, and
  three Chrome e2e passes are the available evidence.
- **Vercel:** deployment not verified; the operator connects the repository.
- **Human feel:** the "forgiving but not inert" judgment is based on the
  numeric model, automated full-flow coverage, and captures, not a fresh
  hands-on playtest at depth 1.
- **Long-run balance:** only depths 1, 2, 5, 6, and 10 are asserted; values are
  a first baseline, and the flat economy / shop decay remain the recorded
  future balance question, out of scope here.

## Verdict

**Passed.** The three-hit chain is fully removed with no leftover behavior or
configuration, the single committed swing matches §2.1, the depth curve matches
every asserted row and the depth-10 cap, depth 1 is melee-only with the
teaching values and no tutorial UI, and the `0.7.0` regression matrix holds.
Local checks pass: typecheck, 187 unit tests in 17 files, production build, and
32/32 Cypress tests across 5 specs in three consecutive Chrome runs. Two low
findings were closed during implementation; one low evidence limitation and
four non-blocking observations remain. Hosted CI and Vercel remain pending.
