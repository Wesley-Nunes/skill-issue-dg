# QA report — 0.9.1 combat integrity

## Metadata

| Field | Value |
|---|---|
| Version | `0.9.1` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | **Failed** (changes requested — return to `programmer`) |
| Tested implementation | `6538005` (`feat(game): reset the rite on a hit, count every enemy hit, and separate mobs`) |
| Tested repository head | `8591614` (`docs(programmer): record the 0.9.1 implementation decisions`) |
| Contract commits | `870c31b` (docs), `186bf71` (design), `065d64f` (agent tooling) |
| Branch | `feature/0.9.1-001-combat-integrity` |
| Date | 2026-11-15 |
| Hosted CI | **Pending** — branch not pushed; no GitHub run exists yet |

## Independence and limitation (read first)

This pass was executed by the `qa` subagent, independently of the `programmer`
subagent. The programmer's decision log was read for intent only. Every rule
below was checked against `src/`, and the behavior was re-exercised with a
separate QA probe suite and a separate full-loop browser spec, both created
outside the repository (`/tmp/opencode/qa-probe`, `/tmp/opencode/qa-loop`) and
not committed: no QA scaffolding was left in `src/` or `cypress/`.

To prove the new tests are meaningful, the new unit tests were run against the
pre-implementation commit `065d64f` in a throwaway worktree
(`/tmp/opencode/qa-old`). 13 of them fail there, and the new browser spec fails
there after the player's HP has verifiably dropped. Details in
[Old-behavior proof](#old-behavior-proof).

No application or existing test file was modified by QA. The only repository
change from this stage is this report.

## Environment

| Item | Value |
|---|---|
| OS | Linux (X11), `DISPLAY=:0` |
| Node / npm | `v22.23.4` / `10.9.9` |
| Vitest | 5.0.5 |
| Vite | 8.3.5 |
| Cypress | 16.2.1, Chrome 153 headless |
| Install | Clean `npm ci` before the gate run: 212 packages, 18 s, 0 vulnerabilities |

`DISPLAY` had to be set explicitly to `:0`; the inherited `:1` had no X server
and made Cypress fail with `Missing X server or $DISPLAY`. This is an
environment issue, not a repository defect.

## Commands and evidence

| Command | Result | Notes |
|---|---|---|
| `npm ci` | Pass | 212 packages, 18 s, 0 vulnerabilities |
| `npm run typecheck` | Pass | `tsc --noEmit`, exit 0 |
| `npm test` | Pass | 18 files, **207/207** tests, 1.00 s (clean-install run: 1.22 s) |
| `npm run build` | Pass | `dist/assets/index--MKoW431.js` **82.33 kB** (24.76 kB gzip), CSS 4.28 kB, 210 ms |
| Production bundle scan | Pass | 0 matches for `__gameDebug`, `__audioDebug`, `__bootDebug` in `dist/assets/*.js` |
| `DISPLAY=:0 CYPRESS_BROWSER=chrome npm run e2e` | Pass | **7 specs, 34/34**, 3 m 00 s (log `/tmp/qa-e2e-clean.log`); earlier run 34/34 in 2 m 59 s |
| Same suite on `065d64f` + new specs | Expected fail | 13 failed, 194 passed (207) — `/tmp/qa-old-unit.log` |
| `combat-integrity.cy.ts` on `065d64f` build | Expected fail | Fails at the fragments assertion after the HP-drop wait passes; screenshot recorded |
| Independent QA probes (14 cases) | Pass | 14/14, 812 ms — `/tmp/opencode/qa-probe/src/game/qa-probe.test.ts` |
| Continuous full-loop browser spec | Pass | 1/1, 33.6 s — `/tmp/opencode/qa-loop/cypress/e2e/qa-full-loop.cy.ts` |
| `git diff --check` | Pass | No whitespace errors |
| Hosted CI | **Pending** | Not visible on GitHub; not claimed |

## Acceptance-criteria checklist

Required evidence from `docs/tasks/0.9.1/001-qa.md` §4, plus the design
contract `design/0.9.1/design-decisions.md` §6.

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1a | Melee hit resets fragments and HP and emits `rite-reset` | **Pass** | `game.test.ts` "resets the rite on a melee hit instead of discarding the reset"; `combat-integrity.cy.ts` real hit; probe duplicates it |
| 1b | Projectile hit does the same | **Pass** | `game.test.ts` "resets fragments and HP when a projectile costs the player HP" (old code: expected 6, got 8) |
| 1c | Bomb hit does the same | **Behavior pass / coverage fail** | Only the QA probe covers it; no engine/browser test — see **QA-001** |
| 2 | Dodging the hit resets nothing and deals no damage | **Pass** | `game.test.ts` dodge test asserts no `rite-reset`; probe drives a real dodge through an active melee window |
| 3 | Damaged Warden's HP is unchanged by the reset | **Pass** | `purification.test.ts` "never resets the Warden"; probe "Warden HP is untouched by a melee hit that resets a mob" |
| 4 | Conventional kill still respawns with full HP and a fresh rite | **Pass** | `game.test.ts` respawn test (`revived.hp === maxHp`); full-loop descent rebuilds the floor with three fresh mobs |
| 5 | Rest still awards spirit and skill points; arena unlocks | **Pass** | Existing rest test; continuous full-loop spec rests a mob, receives the point, and opens the gate at six points |
| 6 | Two or three simultaneous melee attacks sum their damage | **Pass** | `game.test.ts` three-attacker test asserts `3 × MELEE.damage` (old code: 5 instead of 3); probe sums two |
| 7 | One active window over several frames damages once | **Pass** | Probe "an active window spanning several frames damages only once"; `attackHit` guard unchanged |
| 8 | Dodge through an attack: no damage, no reset | **Pass** | Same evidence as item 2; probe also asserts HP is full and fragments stay `[false, false]` |
| 9 | Two or three lured mobs stay visually distinct | **Pass** | Probe tracks three chasing mobs for 2.4 s; worst pair distance 11.929 px (nominal 12, sub-pixel residual); engine stack tests |
| 10 | Warden immovable; dead/dying bodies do not block living mobs | **Behavior pass / test quality fail** | Probe "moves a mob overlapping the Warden and keeps the Warden fixed" and "dying bodies do not push living bodies"; existing dead/dying test is vacuous — see **QA-003** |
| 11 | Separation respects walls, arena gate, shop safe zone | **Behavior pass / coverage fail** | Probe "never pushes a living mob into the shop safe zone or the gate"; no automated wall/blocker test — see **QA-002** |
| 12 | Full loop: title → fight/rest → shop → Warden → descend → death/restart | **Pass** | Continuous single-run spec (33.6 s) plus `reward-loop.cy.ts` 5/5 and `slice-regressions.cy.ts` 10/10 |
| 13 | `0.9.0` safe-room ward and shop still work | **Pass** | `safe-room.cy.ts` 1/1; full-loop buys and uses the draught and buys Vigor |
| 14 | No new HUD, copy, hotkey, audio, or production debug hook | **Pass** | Diff touches only `systems/`, engine ordering, the event rename, and version files; production scan clean; dev-only hook noted in **QA-004** |
| 15 | Clean-install gates with counts/runtimes; no `__gameDebug` in `dist` | **Pass** | Table above |
| 16 | Hosted CI recorded as pending, not claimed | **Pass** | Pending as stated in Metadata |

## Rule traceability

| Design section | Verdict | Evidence |
|---|---|---|
| §2 Rite reset contents and exclusions | Pass | `resetEnemyRite` resets `hp`/`fragments` for `alive && kind !== "boss"`; untouched otherwise; one event per changed enemy; identity returned when already full |
| §2 Reset ordering | Pass | `step` publishes `state.enemies` before `applyDamageToPlayer`; melee damage is accumulated by `updateEnemies` and applied once |
| §2 Edge cases | Pass | Melee, projectile, bomb, dodge, death, already-full, Warden, dying/dead/rested all exercised by tests or probes |
| §3 Every distinct hit counts | Pass | Post-hit timer removed from `damagePlayer`; `PLAYER.damageInvulnerability` gone; `attackHit` and dodge i-frames remain |
| §4 Minimum distance and deterministic settle | Pass | Two/three superimposed bodies resolve deterministically; four passes; exact-overlap angle derived from pair indices |
| §4 Warden immovable; dead/dying ignored | Pass (behavior) | Engine Warden test and QA probes; test-quality gap in **QA-003** |
| §4 Geometry and blockers | Pass (behavior) | `pushEnemy` uses `moveCircle` with floor blockers; QA probe checks gate and shop zone; coverage gap in **QA-002** |
| §5 Feedback | Pass | `rite-reset` reuses the existing restoration sparks; no new copy, HUD, hotkey, or audio |
| §6 Verification hooks | **Fail** | Bomb reset and wall/blocker separation coverage missing — **QA-001**, **QA-002** |
| §7 Deferred scope | Pass | No pathfinding, new archetype, tuning, asset, or economy change in the diff |

## Old-behavior proof

| Check | Old code (`065d64f` + new tests) | Current code |
|---|---|---|
| `resets fragments and HP when a projectile costs the player HP` | Fails: `expected 6 to be 8` | Pass |
| `resets the rite on a melee hit instead of discarding the reset` | Fails: fragments `[false, false]` | Pass |
| `applies every enemy's damage when several attacks land together` | Fails: `expected 5 to be 3` | Pass |
| `separates enemy bodies lured onto the same point` | Fails: distance `0` | Pass |
| `applies damage without a post-hit invulnerability window` | Fails: `expected 0.6 to be +0` | Pass |
| `lets a second distinct hit apply immediately` | Fails: `expected false to be true` | Pass |
| Separation and purification suites (7 tests) | Fail | Pass |
| **Total** | **13 failed / 194 passed** | **207/207 passed** |

Browser non-vacuity: on the old build, `combat-integrity.cy.ts` reaches and
passes `player.hp < player.maxHp` (a real mob hit) and then fails on the
fragments assertion. Screenshot:
`/tmp/opencode/qa-old/cypress/screenshots/combat-integrity.cy.ts/0.9.1 combat integrity -- resets fragments and HP when a mob lands a melee hit (failed).png`.

## Independent probe coverage

`/tmp/opencode/qa-probe/src/game/qa-probe.test.ts` (outside the repository,
14/14 pass) covers: bomb reset on every living mob; a real dodge; Warden HP
untouched; dead/dying/rested untouched while living reset; no event when every
mob is full; one multi-frame active window; two-enemy damage sum; no push into
the shop zone or gate; three-stack settle; three chasing mobs distinct over
2.4 s; determinism for identical inputs; boss/mob push with the boss fixed;
dying bodies not pushing living bodies; fragment-count sanity.

## Findings

### QA-001 — Medium — Required bomb-hit reset coverage is missing — **Open; owner `programmer`**

- **Unmet requirement:** `design/0.9.1/design-decisions.md` §6, "engine reset:
  melee, projectile, and bomb hits"; `docs/tasks/0.9.1/001-qa.md` §4.1.
- **Reproduction:** `grep -n "bomb" src/game/engine/game.test.ts` finds only the
  older bomb-damage tests (lines 1002, 1027, 1336, 1351). The engine reset tests
  at lines 296 and 325 cover projectile and melee only. No Cypress spec covers
  the bomb path.
- **Expected:** an engine test that damages a mob, breaks its fragments, lands a
  bomb on the player, and asserts `fragments === [true, true]`,
  `hp === maxHp`, and a `rite-reset` event.
- **Actual:** the rule works — the QA probe passes — but a later change to bomb
  ordering could regress it silently. This is the exact class of ordering defect
  this hotfix exists to prevent.
- **Required correction:** add the bomb case to `src/game/engine/game.test.ts`,
  alongside the projectile case.
- **Regression checks after correction:** `npm test`,
  `CYPRESS_BROWSER=chrome npm run e2e`, `npm run typecheck`, `npm run build`.

### QA-002 — Medium — Required separation wall/blocker coverage is missing — **Open; owner `programmer`**

- **Unmet requirement:** design §6, "separation: … wall/blocker respect"; task
  §4.11.
- **Reproduction:** `src/game/systems/enemy.test.ts` lines 332–378 test two
  stacked, three stacked, Warden immovable, and dead/dying with `ROOM` and no
  blockers. `separateEnemies` is never called with a blocking wall, the arena
  gate, or the shop zone in any test.
- **Expected:** a test placing a superposition next to a wall/blocker and
  asserting that the push goes through `moveCircle`, no body ends inside
  geometry, and any residual overlap is retried rather than tunnelled.
- **Actual:** the behavior is correct — the QA probe confirms the shop zone and
  gate are respected — but the approved design requires the automated check.
- **Required correction:** add one focused `separateEnemies` test using the
  existing room/floor fixtures and a blocker.
- **Regression checks after correction:** `npm test`, then the full gate set.

### QA-003 — Low — The dead/dying separation test cannot fail for a living body — **Open; owner `programmer`**

- **Unmet requirement:** design §4 "Dying body does not block or push"; §6
  "dead/dying ignored".
- **Reproduction:** `src/game/systems/enemy.test.ts` lines 372–378 pass only a
  `dead` and a `dying` body and assert the dead body's position. A bug where a
  dying body pushes a living one would still pass.
- **Expected:** include a living body overlapping a dying body and assert the
  living body does not move (or moves only by its own logic).
- **Actual:** the QA probe covers the real case and passes; the committed test
  overstates its scope.
- **Required correction:** extend the test with a living neighbour and assert
  its position is unchanged.
- **Regression checks after correction:** `npm test`.

### QA-004 — Low — A new dev-only debug hook was added although the design said none was needed — **Open; owner `programmer` / `design` if retained**

- **Requirement:** design §6: "No new debug hook is needed."
- **Observed:** `debugSetPlayerInvulnerable` was added to `Game`, wired through
  `src/ui/debug.ts`/`src/index.ts` and `cypress/support/commands.ts`, and used
  to isolate the held-swing regression.
- **Impact:** the hook is inside the existing `DEV`/`VITE_E2E` gate and does not
  reach production (0 `__gameDebug` and 0 `setPlayerInvulnerable` matches in
  `dist/assets/*.js`; the class method name survives only like the other inert
  debug methods). No product risk, but it is test-only surface the design did
  not ask for.
- **Required correction:** either isolate the held-swing test without a new hook
  (for example, keep the target out of counter-hit range) or record a design
  amendment authorizing the hook. Not blocking on its own.

## Regressions verified

| Area | Result | Evidence |
|---|---|---|
| Respawn after a conventional kill | Pass | Engine respawn test; full-loop descent yields three fresh mobs |
| Rest, spirit, skill points, arena unlock | Pass | Rest test; `reward-loop.cy.ts`; continuous full-loop spec |
| Safe-room ward | Pass | `safe-room.cy.ts`; no diff in `safeRoom` or ward rendering |
| Shop purchase and draught use | Pass | `reward-loop.cy.ts`; full-loop buys Vigor and the draught |
| Warden summon, fight, defeat, stairs | Pass | `reward-loop.cy.ts`; full-loop spec |
| Death and restart | Pass | Full-loop spec kills the player and restarts into a rebuilt floor |
| Dodge and swing input | Pass | `slice-regressions.cy.ts` 10/10; `playable-slice.cy.ts` 6/6 |
| Visual/copy/audio/hotkeys | Pass | No matching diff; only the `fragments-restored` → `rite-reset` rename in `effects.ts` |
| Version hygiene | Pass | `package.json` and lockfile root report `0.9.1` |
| Stale identifiers | Pass | No `fragments-restored` or `damageInvulnerability` reference remains in `src/` or `cypress/` |

## Residual risks and not verified

- **Hosted CI:** not run; the branch has not been pushed, so no GitHub result
  exists. Local results only.
- **Human feel:** separation and reset readability were judged from the rule
  model, probes, and automated play, not a fresh hands-on playtest.
- **Sub-pixel separation residual:** the three-stack probe settles at 11.929 px
  against a nominal 12 px (≈0.6 % short) after the pass budget. Bodies are
  distinct and the engine test tolerance is 0.5 px; no gameplay effect was
  observed.
- **Bomb path:** behavior verified only by the external probe until QA-001 is
  fixed; no repo regression test protects it.
- **Live Warden lure:** not scripted; the Warden cases use engine-level
  placement, consistent with `0.9.0` F2.

## Verdict

**Failed — changes requested.** No behavioral defect was found: the rite reset
(including HP), every-hit damage attribution, dodge safety, Warden exception,
and separation all work in independent probes, and every gate passes from a
clean install. The failure is contractual: the approved design marks bomb-hit
reset coverage and wall/blocker separation coverage as **required automated
coverage**, and neither exists. `docs/tasks/0.9.1/001-qa.md` §5 permits only
evidence-size limitations, timing variance, or deferred polish as non-blocking,
so QA-001 and QA-002 block acceptance. Return to `programmer` for test-only
corrections (QA-003 and QA-004 are low-severity and may be fixed in the same
pass), then rerun the full gate set and this checklist.
