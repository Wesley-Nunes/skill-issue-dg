# QA report — 0.7.0 skill-point economy, branch shop, and explicit Warden summon

## Metadata

| Field | Value |
|---|---|
| Version | `0.7.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed after fixes` |
| Tested implementation (final) | `99787aa` (`fix(ui): remove junction waystone`) |
| Earlier tested implementation | `6e377d3` (`fix(ui): clear transient effects on descent`) |
| Initial implementation | `17510eb` (`feat(game): add 0.7.0 reward loop`) |
| Implementation log | `programmer/0.7.0/CoT.md` |
| Branch | `feature/0.7.0-001-reward-loop` |
| Date | 2026-11-11 |
| Hosted CI | Pending on GitHub; not run or emulated locally |
| Vercel | Pending operator connection; deployment not verified |

## Independence and limitation (read first)

The independent QA subagent could not start: the provider refused the child
session at its free-usage limit. To avoid stalling the version, the
**orchestrator performed the verification and authored this report**. The same
orchestrator also authored the two application fixes (`6e377d3`, `99787aa`)
after reproducing finding F1 and after the operator requested the junction
change, because no programmer subagent could be started either.

This is a real reduction in independence and is not equivalent to a
separate-agent QA pass:

- verification and implementation shared one author for the single fix;
- the fix commit is programmer-scoped but was not written by the programmer
  agent;
- the report was not reviewed by an agent that did not write the fix.

Every check below was still executed against the actual branch, tests, and
build rather than accepted from the programmer's log. The verdict is therefore
evidence-based, but the operator should weigh the independence caveat before
merging.

## Scope

Verified the `0.7.0` reward loop against `docs/tasks/0.7.0/001-qa.md`,
`docs/tasks/0.7.0/001-programmer.md`, and
`design/0.7.0/design-decisions.md`:

- fixed six-room branch, shop dead end, gated arena, altar, and stairs;
- skill-point awards, persistence, and reset;
- safe-room shop, draught, Vigor, and shop closure;
- explicit Warden summon and boss/descent flow;
- HUD, feedback, controls, and accessibility;
- regressions in title, loading, combat, purification, boss, death, pause,
  restart, audio, and descent;
- build, bundle, dependency, version, and diff-scope checks;
- visual verification at 1024 × 640 and 1440 × 810.

## Commands and evidence

Run from a clean dependency state on the tested branch:

| Check | Command | Result |
|---|---|---|
| Clean install | `npm ci` | Exit 0; 212 packages added, 213 audited, 0 vulnerabilities, 3 s |
| Types | `npm run typecheck` | Exit 0 |
| Unit | `npm test` | 17 files, 190/190 tests pass, ~1.0 s |
| Production build | `npm run build` | Exit 0; 32 modules; `index.html` 2.06 kB (gzip 0.76), CSS 4.28 kB (gzip 1.49), JS 82.87 kB (gzip 24.84) |
| Browser suite | `CYPRESS_BROWSER=chrome npm run e2e` | 5 specs, 32/32 pass, 3 m 05 s |
| Debug hooks absent | `grep -R "__gameDebug\|__audioDebug\|__bootDebug" dist` | No matches |
| External runtime requests | Inspect `dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css` | No `http(s)` URLs; font served from `/assets/fonts/GrenzeGotisch-Variable.woff2` |
| Version | `package.json`, `package-lock.json` | `0.7.0` / `0.7.0` |
| Diff scope | `git diff --name-status 60318be..HEAD` | 37 files; no `public/` changes |

The browser suite uses the approved single entry point (`scripts/e2e.mjs`),
which builds with `VITE_E2E=1`, serves through `vite preview`, and runs Chrome.
Hosted CI is not claimed; GitHub owns that result after the branch is pushed.

Per-spec e2e result:

| Spec | Tests | Result | Duration |
|---|---|---|---|
| `loading-screen.cy.ts` | 7 | Pass | 15 s |
| `playable-slice.cy.ts` | 6 | Pass | 31 s |
| `portfolio-release.cy.ts` | 4 | Pass | 21 s |
| `reward-loop.cy.ts` | 5 | Pass | 48 s |
| `slice-regressions.cy.ts` | 10 | Pass | 1 m 08 s |

Unit breakdown:

| File | Tests |
|---|---|
| `src/game/data/floor.test.ts` | 11 |
| `src/game/engine/game.test.ts` | 50 |
| `src/game/systems/attack.test.ts` | 5 |
| `src/game/systems/bomb.test.ts` | 5 |
| `src/game/systems/camera.test.ts` | 5 |
| `src/game/systems/combo.test.ts` | 13 |
| `src/game/systems/damage.test.ts` | 11 |
| `src/game/systems/dodge.test.ts` | 6 |
| `src/game/systems/enemy.test.ts` | 26 |
| `src/game/systems/movement.test.ts` | 7 |
| `src/game/systems/projectile.test.ts` | 6 |
| `src/game/systems/purification.test.ts` | 10 |
| `src/game/systems/shop.test.ts` | 17 |
| `src/game/systems/vision.test.ts` | 3 |
| `src/ui/audio/audio.test.ts` | 4 |
| `src/ui/boot/progress.test.ts` | 3 |
| `src/ui/rendering/effects.test.ts` | 8 |
| **Total** | **190** |

## Scenario matrix

| ID | Scenario | Verdict | Evidence |
|---|---|---|---|
| S1 | Fixed branch topology | Pass | `floor.test.ts` asserts six stable roles, fixed junction/shop/gate/altar/stairs anchors, spawn→stairs reachability on seeds 1–60, one shop entrance on seeds 1–60, no start/shop enemies, and the arena-contained boss spawn; `playable-slice.cy.ts` asserts six rooms and the role order in the live game |
| S2 | Arena locked | Pass | `reward-loop.cy.ts` walks to the gate before resting; `game.test.ts` "blocks the player at the arena gate until the floor is purified"; screenshots `03-gate-locked` show the barred gate and `Arena sealed · 0/3 at rest` |
| S3 | Arena unlocked | Pass | `game.test.ts` "rests the last mob, awards a point, and unlocks the arena without summoning"; `reward-loop.cy.ts` asserts `gateOpen` with no boss; screenshots `10-gate-open` |
| S4 | Skill points earned | Pass | Real killing blow in `reward-loop.cy.ts`; `game.test.ts` awards one point for a rest and none for a conventional kill; `enemy-rested` + `skill-points-earned` events drive the floating text and HUD highlight |
| S5 | Warden points | Pass | `game.test.ts` "defeats the Warden, opens the stairs, and ignores knockback"; `reward-loop.cy.ts` asserts +3 and `exitOpen`; banner text is `Warden defeated · +3 skill points` |
| S6 | Draught purchase | Pass | `shop.test.ts` exact-cost purchase; `reward-loop.cy.ts` and temporary edge-case spec buy for 1 point and observe carried state with no immediate heal; screenshot `07-shop-draught-carried` |
| S7 | Draught use and cap | Pass | Temporary edge-case spec: full HP blocked and not consumed, 5/6 HP heals 1, 3/7 HP heals 2; `shop.test.ts` covers the pure rules |
| S8 | Draught purchase blocks | Pass | `shop.test.ts` blocks 0 points and a second carried draught without deduction; `reward-loop.cy.ts` observes `Need 1 more skill point`; screenshot `06-shop-blocked` |
| S9 | Vigor purchase | Pass | `shop.test.ts` exact-cost and one-time rules; temporary edge-case spec buys at full HP and asserts max/current HP 7, Vigor row absent, hearts 4 slots; screenshots `08-shop-vigor-bought`, `09-hud-vigor-draught` |
| S10 | Vigor one-time | Pass | `shop.test.ts` blocks a repeat purchase; temporary edge-case spec descends and asserts Vigor absent from the next shop and no duplicate max-HP gain |
| S11 | Shop closes on summon | Pass | `game.test.ts` "closes the shop for the floor when the Warden is summoned"; `reward-loop.cy.ts` backtracks and confirms the closed shop; screenshots `14-shop-closed`, `15-shop-closed-press` |
| S12 | Explicit summon | Pass | `game.test.ts` explicit-altar summon; `reward-loop.cy.ts` presses `E` at the altar and asserts the Warden emerges, stairs stay sealed, and the shop closes; screenshots `11-summon-prompt`, `12-boss-emerging`, `13-boss-fight` |
| S13 | Summon guards | Pass | `game.test.ts` blocks a pre-purification summon and a repeat altar interaction; `reward-loop.cy.ts` covers the sealed gate |
| S14 | Shop safety | Pass | `game.test.ts` "does not let enemies enter the shop or damage the player inside"; temporary edge-case spec aggroes a melee enemy, waits inside the shop, and asserts no HP loss |
| S15 | Persistence across descent | Pass | `game.test.ts` preserves run-scoped rewards and resets per-floor state; temporary edge-case spec asserts points, draught, Vigor, max HP 7 persist while spirit, purification, gate, boss, exit, and shop closure reset; snapshot evidence `after-descent`, `next-floor-shop` |
| S16 | Death/restart reset | Pass | `game.test.ts` "clears run-scoped rewards on death and restart"; `reward-loop.cy.ts` covers restart reset; `playable-slice.cy.ts` asserts a fresh run |
| S17 | HUD and controls | Pass | Screenshots show the diamond/count, flask/`Q` keycap, four-heart row, two-line legend, and `Arena open`/`Boss awakened` state lines at both sizes; README documents `E`, `Q`, `W`/`S`/arrows, `Enter`, and `Esc`; no legend overflow observed |
| S18 | Feedback and accessibility | Pass | Text-first cues for rest, unlock, summon, boss defeat, purchase, heal, and blocked actions; keyboard-only shop; `M` remains global while the shop is open (temporary edge-case spec); reduced-motion branches inspected in `renderer.ts` and `effects.ts` |
| S19 | Full Cypress flow | Pass | `reward-loop.cy.ts` 5/5 performs a real earn → traverse → buy → use → summon → defeat → descend path, plus sealed-gate, blocked-purchase, one-time Vigor, closed-shop, persistence, and restart cases |
| S20 | Regressions | Pass | 32/32 Chrome e2e across all five specs; existing assertions were extended, not weakened (see Regressions) |

## Edge-case checks

| Check | Verdict | Evidence |
|---|---|---|
| Exactly enough points succeeds and leaves 0 | Pass | `shop.test.ts` draught and Vigor exact-cost cases; temporary edge-case spec |
| One point short fails with no deduction | Pass | `shop.test.ts`; temporary edge-case spec asserts 2 points remain and max HP unchanged |
| Buy at full HP allowed; use at full HP blocked and not consumed | Pass | Temporary edge-case spec + snapshot `draught-full-blocked` |
| Use at 1 HP below max heals 1 and consumes | Pass | Temporary edge-case spec |
| Buy while carrying is blocked; use then rebuy works | Pass | `shop.test.ts` + temporary edge-case spec |
| Vigor at full HP raises max and current HP by 1 | Pass | Temporary edge-case spec asserts 7/7 + snapshot `vigor-at-full-hp` |
| Vigor absent on floor 2 | Pass | Temporary edge-case spec + snapshot `next-floor-shop` |
| Carried draught survives descent and shows carried | Pass | Snapshot `after-descent` (`draughtCarried: true`, row state `carried`) |
| Failed rite / conventional kill / respawn grants nothing | Pass | `game.test.ts` conventional-kill and respawn cases |
| Last rest awards 1, fills spirit, unlocks, does not summon | Pass | `game.test.ts` dedicated case; `reward-loop.cy.ts` |
| Gate and stairs cannot be bypassed | Pass | `floor.test.ts` gate placement; `game.test.ts` gate blocker and stairs-locked cases; temporary edge-case spec teleports onto sealed stairs and stays at depth 1 |
| Fixed branch traversable across seeds, no overlaps/unintended dead ends | Pass | `floor.test.ts` reachability on seeds 1–60 and single-entrance shop check |

## Programmer acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Fixed six-room branch, connectivity, shop dead end, gated arena, summon point, stairs; traversable; one shop entrance | Pass | `floor.test.ts` 11 tests across seeds 1–60; live six-room assertion in `playable-slice.cy.ts` |
| 2 | Resting all three unlocks the arena and fills spirit; no automatic summon; shop-first backtrack allowed | Pass | `game.test.ts` unlock-without-summon case; `reward-loop.cy.ts`; screenshots `10-gate-open`, `11-summon-prompt` |
| 3 | Summon only via the altar in the unlocked arena; pre-unlock and repeat blocked; shop closes on summon | Pass | `game.test.ts` explicit/blocked/repeat cases; `reward-loop.cy.ts` |
| 4 | Points start at 0, +1 per rest, +3 for the Warden, persist, reset; HUD updates | Pass | `game.test.ts` award/persistence/reset; snapshots and screenshots |
| 5 | Draught 1 point/2 HP/one slot/second purchase blocked; Vigor 3 points/+1 max/one-time/absent later | Pass | `shop.test.ts` 17 tests; temporary edge-case spec; screenshots `07`–`09` |
| 6 | Insufficient, duplicate, full-HP, exact-point, one-short, post-summon purchase edge cases | Pass | `shop.test.ts` + engine tests + temporary edge-case spec |
| 7 | Shop safe: no enemy entry or damage inside | Pass | `game.test.ts` safe-room case; temporary edge-case spec with an aggroed enemy |
| 8 | HUD points/draught, heart row adapts, readable at both sizes, legend and README updated | Pass | 30 canvas captures at exact sizes; README controls table |
| 9 | Gate, stairs, boss fight/defeat, descent end to end; +3 once; stairs open | Pass | `game.test.ts`; `reward-loop.cy.ts`; screenshots `12`, `13` |
| 10 | Run state persists across descent, resets on death/restart; per-floor state resets | Pass | `game.test.ts` + temporary edge-case spec snapshot `after-descent` |
| 11 | Feedback/accessibility; no required state depends on audio or colour alone | Pass | Text cues for every new event; reduced-motion branches; keyboard-only shop; source inspection |
| 12 | Unit + Cypress coverage for topology, economy, shop, summon, gate/stairs, persistence, reset, full flow | Pass | 190 unit tests; `reward-loop.cy.ts` 5 tests |
| 13 | Existing coverage updated, not weakened; typecheck/test/build/e2e pass | Pass | Diff review of `playable-slice.cy.ts` and `slice-regressions.cy.ts`; all commands pass |
| 14 | Version `0.7.0`; README controls; no debug hooks, no runtime dependency, no external request | Pass | `package.json`/lock; bundle greps; devDependencies unchanged |
| 15 | Diff limited to approved scope; `CoT.md` records decisions and commands | Pass | 37-file diff, no `public/` changes, no new runtime dependency; `CoT.md` present |

## Design decision traceability

| Design section | Verdict | Evidence |
|---|---|---|
| §3 Palette, typography, shape rules | Pass | Canvas captures show the existing palette/display font with cyan/ember state colours and procedural glyphs |
| §4.1 Counted rooms and junction hub | Pass | Six counted rooms; junction is a hub, not a seventh room; screenshot `01-branch-junction` |
| §4.2 Branch reads as a choice | Pass | Junction is an unmarked crossroad; the gate state label and shop sign appear only at their destinations; screenshots `junction`, `gate-label`, `shop-sign` at both sizes |
| §4.3 Shop dead end | Pass | Single east entrance; stall, counter, and threshold drawn; screenshots `02`, `04` |
| §4.4 Gate, altar, stairs | Pass | Bars, lock glyph, `Arena sealed · N/3 at rest` → `Arena open`; altar sigil; screenshots `03`, `10`, `11` |
| §5 Shop interaction | Pass | Canvas modal; `E` opens near stall; `W`/`S`/arrows select; `Enter` buys; `Escape` closes without pausing; `E`/mouse ignored; `M` global (temporary edge-case spec) |
| §5.2–5.4 Panel layout and states | Pass | Empty, blocked, carried, Vigor-purchased, and closed states captured (`05`–`08`, `14`, `15`); footer message and row labels readable |
| §5.5 Shop safety | Pass | Engine safe-room blocker + damage early-return; aggro test |
| §6 Explicit Warden summon | Pass | Altar `E`, 0.8 s emergence with no movement/attack/damage, summon banner, shop closes; screenshots `11`–`13` |
| §7 HUD | Pass | Points at x 24/y 112, draught at y 136, `ceil(maxHp/2)` hearts, state line, two-line legend; captures at 1024 × 640 and 1440 × 810 |
| §8 Feedback, motion, audio | Pass | Rest/unlock/summon/defeat/purchase/heal/blocked cues present; no new audio required; reduced-motion branches inspected |
| §9 Controls and accessibility | Pass | README + in-game legend; keyboard-only shop; text-first feedback |
| §10–11 Assets and constraints | Pass | No new art/audio, dependency, DOM overlay, or external request |
| §12 Deferred work | Pass | No shopkeeper, inventory, loot, meta-progression, persistence, difficulty scaling, or graph generator added |

## Visual verification

Temporary Cypress capture specs rendered the real game and saved the canvas
backing store at the exact required sizes (Cypress viewport screenshots clip to
the browser window, so the canvas was captured directly). Fifteen states were
captured at each viewport:

1. branch junction; 2. shop room; 3. locked gate; 4. shop prompt; 5. empty
shop; 6. blocked draught; 7. draught carried; 8. Vigor purchased; 9. HUD with
Vigor + draught; 10. open gate; 11. summon prompt; 12. Warden emerging;
13. Warden fight; 14. closed shop; 15. closed shop after pressing `E`.

A separate title capture at 1024 × 640 confirmed the title screen and controls
line. The images were inspected directly; the expected text, colours, layout,
and heart row were present with no clipping or overlap. They are gitignored and
are wiped by the next Cypress run, so copies are retained at
`/tmp/opencode/qa-0.7.0-evidence/` for this session. The capture spec was
removed before handoff.

The original junction capture (`01-branch-junction`) is superseded by the
post-QA amendment below. The replacement captures (`junction-1024x640`,
`junction-1440x810`, `gate-label-*`, `shop-sign-*`) show the unmarked junction
and confirm the two remaining contextual labels.

## Findings

### F1 — Medium — transient effects from the old floor reappear after descent — **Closed in `6e377d3`**

- **Requirement:** design §8 feedback map and programmer criteria 9–10; a new
  floor must start with only its own presentation state.
- **Reproduction:** rest all three mobs, summon the Warden, weaken it to one
  HP, land the killing blow, walk onto the stairs, then wait about 1.3 s on the
  new floor. A temporary probe spec reproduced it reliably.
- **Expected:** the new floor shows the `Depth 2` entry banner and nothing
  from floor 1.
- **Actual:** `Warden defeated · +3 skill points` reappeared after the new
  floor's clock passed the old event's age, and the skill-point highlight
  re-fired. Root cause: effects store `born` in the previous floor's clock,
  `descend()` restarts `state.time` at 0, and `prune()` only removes effects
  whose age is already past their life, so future-born effects survived.
- **Evidence:** descent probe captures before/after the fix; the pre-fix
  `descent-t1.3` capture showed the banner over the new floor.
- **Owner / correction:** programmer. `6e377d3` clears all transient effect
  state on `floor-descended` (shared with `run-reset`) and adds a regression
  unit test in `effects.test.ts`.
- **Rerun after correction:** `npm run typecheck`, `npm test` (190 pass),
  `npm run build`, `CYPRESS_BROWSER=chrome npm run e2e` (32/32), and the
  descent probe (banner absent at 0.6 s, 1.3 s, and 2.3 s). All pass.
- **Independence note:** this fix was authored by the orchestrator, not the
  programmer agent, and was verified by the same author.

No blocker or high findings remain open.

### Observations (non-blocking)

1. **`DebugSnapshot.summonAvailable` means "summon permitted on this floor"**
   (gate open, no boss, exit closed), not "the player is in altar range". It is
   test-only and the e2e combines it with an altar teleport, so there is no
   product impact; the field name is slightly broader than its meaning.
2. **Viewport screenshots are clipped by the browser window** (1280 × 720
   Chrome). Exact 1024 × 640 and 1440 × 810 evidence was captured from the
   canvas backing store instead.
3. **Audible output is not asserted.** Headless Cypress verifies audio
   readiness and mute state through debug state; the new events are text-first
   and reuse existing cues or are silent by design.
4. **Reduced motion is verified by source inspection**, not by an emulated
   `prefers-reduced-motion` e2e run.
5. **Visual evidence is not committed.** `cypress/screenshots/` is gitignored
   and cleared at the start of each Cypress run, matching prior versions.

## Post-QA amendment — junction waystone removed (2026-11-11)

**Trigger:** operator playtest found the `SHOP` / `WARDEN` world labels at the
junction overlapping each other and the player sprite, and noted that the
chevrons pointed left/right even though the shop route turns north then west.

**Decision:** remove the waystone entirely rather than re-space the labels.
Navigation is now discovery: the junction is an unmarked crossroad, and the
gate state label and the `SHOP · SAFE` stall sign appear only when the player
reaches them. This keeps the immersive intent and removes the misleading
directions.

**Change:** `99787aa` removes the `drawWaystone` call and method, the
`waystone` field from `Floor` and `DebugSnapshot.floor`, the floor generation
and test-floor stubs, and the fixed-anchor assertions. The design contract was
amended in §3, §4.1, §4.2, §11, and §13, with a dated amendment note.

**Re-verification:** `npm run typecheck` passes; `npm test` 190/190 in 17
files; `npm run build` passes (82.22 kB JS / 24.69 kB gzip, no debug hooks);
`CYPRESS_BROWSER=chrome npm run e2e` 32/32 across 5 specs in 3 m 03 s. Fresh
exact-size captures show a clean, unmarked junction at 1024 × 640 and
1440 × 810, and confirm the gate label (`Arena sealed · 0/3 at rest`) and the
shop sign (`SHOP · SAFE`) still render without overlap.

**Criteria impact:** design §4.2 is amended; no other acceptance criterion is
affected. S1 and the §4.2 traceability row were updated. The verdict remains
`Passed after fixes`.

**New residual risk:** without a sign, a player who never explores the west
dead end can summon the Warden with unspent points and lose the shop for the
floor. Accepted for this slice because the shop sits off the second-mob room
the player must clear; a future level-design pass should improve the sightline
or light spill from the stall rather than reintroduce text.

## Regressions checked

- `playable-slice.cy.ts` 6/6: title start, floor/room assertions, camera,
  movement, dodge, combo damage, death, and restart. New gate/summon/shop
  assertions were added; none were removed.
- `portfolio-release.cy.ts` 4/4: title, pause/resume, Warden, bombs.
- `slice-regressions.cy.ts` 10/10: canvas/viewport, dodge distance, melee
  damage, aimed swings, fragment break, combo mashing, restart reset,
  projectiles, death freeze.
- `loading-screen.cy.ts` 7/7: boot overlay, progress, audio unlock, degradation
  paths, and restart.
- `reward-loop.cy.ts` 5/5: the new flow and its guards.
- Unit suite 190/190 across 17 files.
- Production bundle has no debug hooks and no external runtime request; the
  font is served locally; `package.json` and the lock are `0.7.0`.

## Residual risks

- **Independence:** the QA role and both fixes shared one author because the QA
  and programmer subagents were unavailable. A truly independent review of
  `6e377d3` and `99787aa` has not happened.
- **Hosted CI:** pending on GitHub; the first hosted run must be confirmed
  after the branch is pushed or the PR is opened.
- **Vercel:** staging/production deployment remains pending the operator.
- **Audio:** loudness, mix, and cue timing were not measured; only readiness,
  mute state, and source-level cue mapping were verified.
- **Debug-assisted setup:** the full-flow spec performs the real earn, buy/use,
  summon, boss, and descent actions, but uses test helpers for positioning and
  state setup. The helpers remain gated behind `DEV || VITE_E2E`.
- **Seed coverage:** topology and traversal are proven for seeds 1–60 in unit
  tests and one live seed per e2e run, not for every possible seed.
- **Reduced motion and colour-independence:** verified by source inspection and
  text-first cues, not by automated accessibility tooling.

## Verdict

**Passed after fixes.** The implementation at `99787aa` meets the approved
`0.7.0/001` scope, all 18 QA acceptance criteria, the programmer criteria, and
the amended design decisions, with every local check green from a clean
dependency state. F1 is closed with its regression test, and the post-QA
junction amendment was re-verified with fresh captures. Hosted CI and Vercel
must still be confirmed by the operator, and the independence limitation above
must be weighed before merge.
