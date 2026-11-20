# QA report — 0.9.1 combat integrity

## Metadata

| Field | Value |
|---|---|
| Version | `0.9.1` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | **Passed after fixes** |
| Tested implementation | `6538005` (`feat(game): reset the rite on a hit, count every enemy hit, and separate mobs`) — unchanged by the fix |
| Fix commit | `18a24d2` (`test(game): cover bomb resets and blocked separation`) |
| Tested repository head | `30e68ec` (`docs(programmer): record the QA follow-up coverage`) |
| QA report history | `dd3731b` (first pass, Failed); this report supersedes it |
| Contract commits | `870c31b` (docs), `186bf71` (design), `065d64f` (agent tooling) |
| Branch | `feature/0.9.1-001-combat-integrity` |
| Date | 2026-11-15 |
| Hosted CI | **Pending** — branch not pushed; no GitHub run exists yet |

## Independence and limitation (read first)

This pass was executed by the `qa` subagent, independently of the `programmer`
subagent. The programmer's decision log was read for intent only. Every rule
was checked against `src/`, and behavior was re-exercised with a separate QA
probe suite and a separate full-loop browser spec, both outside the repository
(`/tmp/opencode/qa-probe`, `/tmp/opencode/qa-loop`) and not committed. No QA
scaffolding was left in `src/` or `cypress/`.

The first pass returned **Changes requested** for test-coverage gaps only. The
follow-up (`18a24d2`) is test-only: no application source file changed between
`6538005` and `30e68ec` (the diff is the two test files, the e2e isolation
line, the CoT, and this report). The new tests were therefore audited for
*sensitivity*, not only for execution: each was run against a deliberately
broken throwaway copy (mutation) and, where meaningful, against the
pre-implementation commit `065d64f`.

No application or programmer test file was modified by QA. The only repository
change from this pass is this report.

## Environment

| Item | Value |
|---|---|
| OS | Linux (X11), `DISPLAY=:0` |
| Node / npm | `v22.23.4` / `10.9.9` |
| Vitest | 5.0.5 |
| Vite | 8.3.5 |
| Cypress | 16.2.1, Chrome 153 headless |
| Dependencies | Clean `npm ci` from the first pass (212 packages, 0 vulnerabilities); no dependency changed since, so the same install was reused |

`DISPLAY` must be set explicitly to `:0`; the inherited `:1` has no X server
and makes Cypress fail with `Missing X server or $DISPLAY`. Environment issue,
not a repository defect.

## Commands and evidence

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck` | Pass | `tsc --noEmit`, exit 0 |
| `npm test` | Pass | 18 files, **210/210** tests, 1.02 s |
| `npm run build` | Pass | `dist/assets/index--MKoW431.js` **82.33 kB** (24.76 kB gzip), CSS 4.28 kB, 176 ms |
| Production bundle scan | Pass | 0 `__gameDebug`, `__audioDebug`, `__bootDebug`, `setPlayerInvulnerable` matches in `dist/assets/*.js` |
| `DISPLAY=:0 CYPRESS_BROWSER=chrome npm run e2e` | Pass | **7 specs, 34/34**, 2 m 58 s (log `/tmp/qa2-e2e.log`) |
| Old code (`065d64f`) + new bomb test | Expected fail | `expected 6 to be 8` — the old reset restores fragments but not HP (`/tmp/qa2-old-bomb.log`) |
| Mutation A — bomb never hits the player | Expected fail | `expected 6 to be 4`; the test depends on real bomb damage, and no melee hit substitutes (`/tmp/qa2-mut-a.log`) |
| Mutation B — `pushEnemy` bypasses `moveCircle` and blockers | Expected fail | Both new separation tests fail: `expected false to be true` for walkability (`/tmp/qa2-mut-b.log`) |
| Mutation C — dying bodies participate in separation | Expected fail | Dead/dying test fails: living body moved from `[300, 300]` (`/tmp/qa2-mut-c.log`) |
| Continuous full-loop browser spec | Pass | 1/1, 34 s, Chrome 153 (`/tmp/qa2-loop-e2e3.log`) |
| Independent QA probes (14 cases) | Pass (carried forward) | 14/14; application code is unchanged since the probe run |
| `git diff --check` | Pass | No whitespace errors |
| Hosted CI | **Pending** | Not visible on GitHub; not claimed |

## Acceptance-criteria checklist

Required evidence from `docs/tasks/0.9.1/001-qa.md` §4, plus the design
contract `design/0.9.1/design-decisions.md` §6.

| # | Requirement | Result | Evidence |
|---|---|---|---|
| 1a | Melee hit resets fragments and HP and emits `rite-reset` | **Pass** | `game.test.ts` "resets the rite on a melee hit instead of discarding the reset"; `combat-integrity.cy.ts` real hit; QA probe |
| 1b | Projectile hit does the same | **Pass** | `game.test.ts` "resets fragments and HP when a projectile costs the player HP" (old code: expected 6, got 8) |
| 1c | Bomb hit does the same | **Pass** | New `game.test.ts` "resets fragments and HP when a bomb costs the player HP": damaged mob + pre-damaged Warden, all enemies staggered, exactly one `rite-reset`, Warden HP unchanged. Fails if the bomb never hits (mutation A) or on old code (HP not reset) |
| 2 | Dodging the hit resets nothing and deals no damage | **Pass** | Dodge engine test asserts no `rite-reset`; probe drives a real dodge through an active melee window |
| 3 | Damaged Warden's HP is unchanged by the reset | **Pass** | `purification.test.ts` "never resets the Warden"; new bomb test also asserts the Warden's pre-damaged HP; probe |
| 4 | Conventional kill still respawns with full HP and a fresh rite | **Pass** | `game.test.ts` respawn test (`revived.hp === maxHp`); full-loop descent rebuilds the floor with three fresh mobs |
| 5 | Rest still awards spirit and skill points; arena unlocks | **Pass** | Existing rest test; continuous full-loop spec rests a mob, receives the point, and opens the gate at six points |
| 6 | Two or three simultaneous melee attacks sum their damage | **Pass** | `game.test.ts` three-attacker test asserts `3 × MELEE.damage` (old code: 5 instead of 3); probe sums two |
| 7 | One active window over several frames damages once | **Pass** | Probe "an active window spanning several frames damages only once"; `attackHit` guard unchanged |
| 8 | Dodge through an attack: no damage, no reset | **Pass** | Same evidence as item 2; probe asserts HP full and fragments stay `[false, false]` |
| 9 | Two or three lured mobs stay visually distinct | **Pass** | Probe tracks three chasing mobs for 2.4 s; worst pair distance 11.929 px (nominal 12, sub-pixel residual); engine stack tests |
| 10 | Warden immovable; dead/dying bodies do not block living mobs | **Pass** | Warden engine test; probe "dying bodies do not push living bodies"; extended `ignores dead and dying bodies` places a living body on top of a dying and a dead body and asserts all three positions; mutation C makes it fail |
| 11 | Separation respects walls, arena gate, shop safe zone | **Pass** | Two new tests on `openFloor()`: a wall-edge push stays walkable and a blocked-rect push never overlaps the blocker; both assert movement and determinism and fail when `pushEnemy` bypasses `moveCircle` (mutation B). Probe also checks the real gate and shop zone |
| 12 | Full loop: title → fight/rest → shop → Warden → descend → death/restart | **Pass** | Continuous single-run spec, 34 s, re-run against the unchanged implementation; `reward-loop.cy.ts` 5/5; `slice-regressions.cy.ts` 10/10 |
| 13 | `0.9.0` safe-room ward and shop still work | **Pass** | `safe-room.cy.ts` 1/1; full-loop buys and uses the draught and buys Vigor |
| 14 | No new HUD, copy, hotkey, audio, or production debug hook | **Pass** | Diff touches only `systems/`, engine ordering, the event rename, tests, and version files; production scan clean; dev-only hook accepted under QA-004 |
| 15 | Clean-install gates with counts/runtimes; no `__gameDebug` in `dist` | **Pass** | Table above |
| 16 | Hosted CI recorded as pending, not claimed | **Pass** | Pending as stated in Metadata |

## Rule traceability

| Design section | Verdict | Evidence |
|---|---|---|
| §2 Rite reset contents and exclusions | Pass | `resetEnemyRite` resets `hp`/`fragments` for `alive && kind !== "boss"`; identity returned when already full; one event per changed enemy |
| §2 Reset ordering | Pass | `step` publishes `state.enemies` before `applyDamageToPlayer`; melee damage is accumulated and applied once |
| §2 Edge cases | Pass | Melee, projectile, bomb, dodge, death, already-full, Warden, dying/dead/rested exercised by tests or probes |
| §3 Every distinct hit counts | Pass | Post-hit timer removed; `PLAYER.damageInvulnerability` gone; `attackHit` and dodge i-frames remain |
| §4 Minimum distance and deterministic settle | Pass | Two/three superimposed bodies resolve deterministically; four passes; exact-overlap angle from pair indices |
| §4 Warden immovable; dead/dying ignored | Pass | Engine Warden test, extended dead/dying test, and mutation C |
| §4 Geometry and blockers | Pass | `pushEnemy` uses `moveCircle`; new wall-edge and blocked-rect tests fail when geometry is bypassed; probe checks the real gate/shop zone |
| §5 Feedback | Pass | `rite-reset` reuses the existing restoration sparks; no new copy, HUD, hotkey, or audio |
| §6 Verification hooks | Pass | Bomb reset and wall/blocker separation now have required automated coverage |
| §7 Deferred scope | Pass | No pathfinding, new archetype, tuning, asset, or economy change in the diff |

## Fix verification (`6538005..30e68ec`)

The application is untouched; the three new tests are the entire behavioral
change. Each was audited against a broken copy rather than trusted because it
passes.

| Check | Old/broken code | Current code |
|---|---|---|
| Bomb test on `065d64f` (fragments restored, HP not) | Fails: `expected 6 to be 8` | Pass |
| Bomb test with `bombHitsPlayer` forced false | Fails: `expected 6 to be 4` | Pass |
| Wall-edge test with `pushEnemy` bypassing `moveCircle` | Fails: walkability `expected false to be true` | Pass |
| Blocked-rect test with `pushEnemy` bypassing `moveCircle` | Fails: walkability `expected false to be true` | Pass |
| Dead/dying test with dying bodies participating | Fails: living body moved from `[300, 300]` | Pass |
| New enemy tests on `065d64f` | Fail to execute (`separateEnemies` does not exist) | Pass |

The old-commit failure of the enemy tests is only an API-existence check; the
mutation runs are the meaningful evidence that the new assertions protect the
geometry and status rules. The bomb test additionally distinguishes bomb damage
(2) from melee damage (1), so a substitute melee hit cannot satisfy it.

The earlier old-behavior proof remains valid for the first-pass tests: 13 of
them fail on `065d64f` (projectile HP reset, melee reset, summed damage, stacked
separation, post-hit invulnerability, second-hit block, and the separation and
purification suites). The browser regression also remains non-vacuous: on the
old build it passes the player-HP-drop wait and then fails on fragments.

## Independent probe coverage (carried forward)

`/tmp/opencode/qa-probe/src/game/qa-probe.test.ts` (outside the repository,
14/14 pass) covers: bomb reset on every living mob; a real dodge; Warden HP
untouched; dead/dying/rested untouched while living reset; no event when every
mob is full; one multi-frame active window; two-enemy damage sum; no push into
the shop zone or gate; three-stack settle; three chasing mobs distinct over
2.4 s; determinism; boss/mob push with the boss fixed; dying bodies not pushing
living bodies; fragment-count sanity. The application commit is unchanged since
this run, so the evidence carries forward.

## Findings

### QA-001 — Medium — Bomb-hit reset coverage — **Closed (resolved in `18a24d2`)**

- **Original gap:** design §6 / task §4.1 required an automated bomb-hit reset;
  only projectile and melee were covered.
- **Resolution:** `game.test.ts` now has "resets fragments and HP when a bomb
  costs the player HP". It damages a mob, breaks both fragments, pre-damages the
  Warden, staggers every enemy, detonates a bomb on the player, and asserts
  player HP `6 − BOMB.damage`, mob HP `maxHp`, intact fragments, exactly one
  `rite-reset`, and the Warden's HP unchanged.
- **Sensitivity:** fails on `065d64f` (`expected 6 to be 8`) and when the bomb is
  forced to miss (`expected 6 to be 4`). The latter also proves no melee hit
  substitutes for the bomb.

### QA-002 — Medium — Wall/blocker separation coverage — **Closed (resolved in `18a24d2`)**

- **Original gap:** design §6 required separation coverage for wall/blocker
  respect; the suite only tested `ROOM` with no blockers.
- **Resolution:** `enemy.test.ts` adds "keeps a wall-edge push inside the floor
  geometry" and "keeps a blocked-rect push out of the gate and shop safe zone".
  Both use `openFloor()`, assert every body is walkable under the same
  `moveCircle` geometry, assert the pair actually moved, and assert two runs
  over identical inputs are identical. The blocked-rect case additionally
  asserts no circle/rect overlap.
- **Sensitivity:** both fail when `pushEnemy` bypasses `moveCircle` and blockers
  (`expected false to be true`).

### QA-003 — Low — Dead/dying separation test could not fail for a living body — **Closed (resolved in `18a24d2`)**

- **Original gap:** the test used only a dead and a dying body.
- **Resolution:** a living body now overlaps both non-living bodies at the same
  point, and the test asserts all three positions are unchanged.
- **Sensitivity:** with dying bodies made separable in a throwaway copy, the
  living body is moved and the test fails (`expected [Array(2)] to deeply equal
  [300, 300]`).

### QA-004 — Low — Dev-only debug hook where the design said none was needed — **Closed (accepted, documented)**

- **Requirement:** design §6 says "No new debug hook is needed."
- **Status:** `debugSetPlayerInvulnerable` is retained and documented. It is
  inside the existing `DEV`/`VITE_E2E` gate (`src/index.ts:29`), and the
  production bundle has 0 `__gameDebug` and 0 `setPlayerInvulnerable` matches;
  the method name survives only as an inert class member, like the other debug
  methods.
- **Isolation check:** the newly isolated `slice-regressions.cy.ts` "damages a
  melee enemy exactly once per press" still asserts the target's HP goes from 8
  to 6 after one press and remains 6 after the swing settles. The hook blocks
  incoming damage only, so a second outgoing hit would still fail the test. It
  does not hide the rule under test.
- **Disposition:** no production risk and no coverage loss; accepted rather than
  returned. A design amendment is not required because the design statement is
  descriptive, but the hook remains test-only surface worth remembering.

## Regressions verified

| Area | Result | Evidence |
|---|---|---|
| Respawn after a conventional kill | Pass | Engine respawn test; full-loop descent yields three fresh mobs |
| Rest, spirit, skill points, arena unlock | Pass | Rest test; `reward-loop.cy.ts`; continuous full-loop spec |
| Safe-room ward | Pass | `safe-room.cy.ts`; no diff in `safeRoom` or ward rendering |
| Shop purchase and draught use | Pass | `reward-loop.cy.ts`; full-loop buys Vigor and the draught |
| Warden summon, fight, defeat, stairs | Pass | `reward-loop.cy.ts`; full-loop spec |
| Death and restart | Pass | Full-loop spec kills the player and restarts into a rebuilt floor |
| Dodge, swing, held-swing input | Pass | `slice-regressions.cy.ts` 10/10; `playable-slice.cy.ts` 6/6 |
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
  distinct and the engine test tolerance is 0.5 px; no gameplay effect observed.
- **Test maintenance:** the bomb test depends on the floor's initial spawn
  placement and the 9 s stagger to keep other enemies out of the hit; it is
  deterministic today but would need adjustment if spawn distance or tuning
  changes.
- **Live Warden lure:** not scripted; Warden cases use engine-level placement,
  consistent with `0.9.0` F2.

## Verdict

**Passed after fixes.** The first pass returned test-coverage gaps, not
behavioral defects. `18a24d2` adds the required bomb-reset, wall/blocker, and
living-body dead/dying coverage without touching application code. Each new
test was shown to fail against a deliberately broken copy, so the coverage is
sensitive rather than decorative. All 16 required evidence items now have
evidence, the full gate set passes from the repo root (typecheck, 210/210 unit
tests in 18 files, production build with no debug hooks, 34/34 Cypress tests in
2 m 58 s), and the continuous full loop passes in 34 s. QA-001 through QA-003
are closed; QA-004 is closed as an accepted, dev-gated test hook. Hosted CI
remains pending on GitHub and is not claimed.
