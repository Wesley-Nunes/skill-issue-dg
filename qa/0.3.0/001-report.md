# QA report — 0.3.0/001 e2e pipeline and agent tooling

## Metadata

| Field | Value |
|---|---|
| Version | `0.3.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested commit | `e6b5091` (branch head at verification; four implementation commits `1a5b75f`, `136dd65`, `543285c`, `e6b5091`) |
| Branch | `feature/0.3.0-001-e2e-pipeline` |
| Depends on | `docs/tasks/0.3.0/001-qa.md`, `design/0.3.0/design-decisions.md`, `programmer/0.3.0/CoT.md` |

## Scope

Tooling-only change: vendored Cypress AI skills, a typed shared Cypress
support layer, suite stabilisation, and a GitHub Actions workflow. No game
source, asset, rendering, or gameplay change.

## Environment

| Item | Value |
|---|---|
| OS | Linux Mint 22.1 |
| Node | 22.23.4 |
| npm | 10.9.9 |
| Cypress | 16.2.1 (package and binary) |
| Browser | Google Chrome 153.0.8010.36 (`CYPRESS_BROWSER=chrome`) |
| Display | X11 session with Electron window-occlusion throttling on the local desktop |

## Commands and results

| Command | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 123 tests in 12 files, all pass (~0.6 s) |
| `npm run build` | Pass; `dist/assets/index-B5hVq-lc.js` 30.42 kB |
| `grep -rl "__gameDebug" dist` | No matches |
| `CYPRESS_BROWSER=chrome npm run e2e` (1) | Pass, 15/15, spec time 00:53 |
| `CYPRESS_BROWSER=chrome npm run e2e` (2) | Pass, 15/15, spec time 00:51 |
| `CYPRESS_BROWSER=chrome npm run e2e` (3) | Pass, 15/15, spec time 00:52 |

The three e2e runs were consecutive against the committed tree (build,
`vite preview`, then `cypress run`). During development one intermediate run
failed with a double-damage result; the cause was traced frame-by-frame and
fixed before this verification (finding F1). The final three runs are clean.

## Acceptance criteria

1. **Typecheck, unit, build pass on a clean install.** Pass. `npm ci` was used
   for the dependency state; commands above were run from the branch.
2. **Three consecutive Chrome e2e runs pass.** Pass: 15/15 three times.
3. **15 tests and the same covered behaviours as `0.2.0`.** Pass. Both spec
   files keep every `it` title; every behavioural `expect` from `0.2.0` is
   preserved. The removed assertions were polling guards
   (`expect(attempt).to.be.lessThan(60)`) and an `expect(restarted,
   "snapshot").to.exist` that `waitForGame` now guarantees.
4. **No assertion removed or weakened.** Pass. Synchronisation-only changes:
   `pollUntil` and fixed waits were replaced by `cy.waitForGame`, and the
   pointer-aim check retries until the next frame converts screen space to
   world space. The exact checks (`hp === 8`, `hp === 10`, fragment counts,
   restart state, `comboStep < 3`, projectile damage) are unchanged.
5. **Both specs wait for the debug hook before interacting.** Pass:
   `beforeEach` calls `cy.gameSnapshot()` after `cy.visit("/")` in both specs.
6. **Shared commands are typed, reusable, and used by both specs.** Pass:
   `cypress/support/{commands.ts,game.ts,index.d.ts,e2e.ts}`; 51 command/helper
   references across the two specs; no local snapshot, movement, click, or
   death helpers remain.
7. **No manual snapshot/poll loop remains.** Pass: `pollUntil` and the recursive
   poll helpers are gone; predicates run through `cy.window().should()`.
8. **Every remaining raw wait is justified.** Pass:
   `cy.wait(200)`/`cy.wait(150)` (input duration), `cy.wait(40)` (mash input
   cadence), `cy.wait(300)` (frozen-run proof), `MOVE_STEP_MS` (movement input
   duration), `cy.wait(100)` in `attackWorld` (input sampling frames). Each has
   a comment.
9. **CI workflow matches the design.** Pass: `.github/workflows/e2e.yml`
   triggers on `pull_request`/`push` to `dev` and `workflow_dispatch`; Node 22;
   `npm ci`; typecheck, unit, e2e; `CYPRESS_BROWSER=chrome`; failure artifacts
   for screenshots and videos.
10. **Skills pinned, licensed, documented; `cypress-cloud-cli` absent.** Pass:
    `cypress-author`, `cypress-explain`, `cypress-docs`, `cypress-tap`;
    `cypress-ai-toolkit/LICENSE` (MIT) and `SOURCE.md` record commit
    `5258ece52a0010d268946e08606c98784c98f255` and an update procedure;
    `cypress-cloud-cli` is explicitly not vendored. The project skill
    `cypress-canvas-e2e` documents the canvas, snapshot, wait, and browser
    rules.
11. **No product change or debug leakage.** Pass:
    `git diff 64f0429..HEAD --stat -- src public` is empty; the production
    bundle contains no `__gameDebug`.
12. **Every finding has severity, reproduction, expected vs actual, evidence,
    owner, and required rerun.** Pass: finding F1 below; F2–F5 are recorded
    risks with owners.

## Findings

### F1 — `attackWorld` could land two hits when damage cancelled the chain (Resolved)

| Field | Value |
|---|---|
| Severity | High before fix; resolved and re-verified |
| Reproduction | Approach a melee enemy, click once, and let the enemy hit the player after the swing resolves. The damage reset clears `comboStep`/`comboResolved`, so the old retry saw "no swing" and clicked again. |
| Expected | One successful press deals exactly one step of damage (`hp === 8` in the one-press test). |
| Actual before fix | A second retry click dealt another 2 damage (`hp === 6`), failing the exact-once assertion. |
| Evidence | Frame-level trace showed two separate step-1 swings (`hp 10 → 8 → 6`) caused by the retry. The final `attackWorld` stops retrying when `comboStep > 0`, `comboResolved` is true, **or any enemy's health changed**, which covers the damage-reset case. Three consecutive 15/15 runs after the fix. |
| Owner | `programmer` (fixed before the QA gate) |
| Required rerun | Full e2e suite after the fix; done three times. |

### F2 — Hosted GitHub Actions run not executed locally (Accepted by policy)

| Field | Value |
|---|---|
| Severity | Info |
| Reproduction | The workflow only runs on GitHub (PR/push to `dev` or manual dispatch); no `gh` CLI or token is available locally. |
| Expected | The first hosted run is verified on GitHub after the operator opens the PR. |
| Actual | Workflow definition reviewed and the identical commands pass locally. No hosted result was claimed. |
| Evidence | `.github/workflows/e2e.yml`; local command results above; branch pushed to `origin/feature/0.3.0-001-e2e-pipeline`. |
| Owner | Operator / orchestrator on GitHub |
| Required rerun | GitHub Actions E2E workflow once a PR to `dev` is opened. |

### F3 — Vendored upstream files contain trailing whitespace (Accepted)

| Field | Value |
|---|---|
| Severity | Info |
| Reproduction | `git diff --staged --check` reports trailing whitespace inside `.opencode/skills/cypress-*` files. |
| Expected | Vendored files stay byte-identical to upstream, per `SOURCE.md`. |
| Actual | Trailing whitespace is upstream content; hand-editing is explicitly disallowed. |
| Evidence | `SOURCE.md` update procedure: "do not hand-edit upstream files". |
| Owner | `programmer` on the next vendor refresh |
| Required rerun | Not required; re-check on the next upstream update. |

### F4 — Electron local runs can be frame-throttled (Residual, documented)

| Field | Value |
|---|---|
| Severity | Low |
| Reproduction | Running `npm run e2e` with the default Electron browser on this desktop can starve `requestAnimationFrame` (measured ~1 frame/500 ms versus ~62 fps in Chrome). |
| Expected | Timing-sensitive gameplay specs run with a steady frame loop. |
| Actual | Chrome is used for CI and documented for local verification; Electron remains the default for ordinary runs. |
| Evidence | `scripts/e2e.mjs` supports `CYPRESS_BROWSER`; CI sets `chrome`; the project skill documents the workaround. |
| Owner | `programmer` / operator |
| Required rerun | Use `CYPRESS_BROWSER=chrome npm run e2e` when a local Electron run stalls. |

### F5 — `attackWorld` may retry before any swing is observable (Residual, bounded)

| Field | Value |
|---|---|
| Severity | Low |
| Reproduction | A press is dropped (hitstop) or cancelled by damage before the 100 ms observation window. |
| Expected | One landing attack per assertion; no second hit after a resolved swing. |
| Actual | The command may click more than once only while no swing persists **and** no enemy lost health; it stops on the first observed swing or damage, so a landing hit is never duplicated. The test still proves "one successful press deals exactly one step". |
| Evidence | `cypress/support/commands.ts` health-signature check; 15/15 three times. |
| Owner | `programmer` |
| Required rerun | Full suite on any future change to `attackWorld`. |

No blocking findings.

## Residual risks and follow-ups

- The hosted workflow has not run; GitHub owns that verification. The
  repository rule now states that CI is not run locally and is confirmed on
  GitHub after push/PR.
- Cypress AI skills do not auto-update. `SOURCE.md` records the pin and the
  manual refresh procedure.
- Cypress Cloud, `cy.prompt()`, component testing, and spec sharding remain out
  of scope; the app is one canvas with no DOM controls.

## Verdict

**Passed.** All acceptance criteria are met, the three consecutive Chrome e2e
runs are green, the suite retains its 15 tests and assertions, and no product
source changed. Hosted CI remains an operator/GitHub follow-up, not a local
blocker.

## Execution note

The QA gate was executed in this environment by the orchestrator because the
available independent subagent could not be started (provider usage limit).
The evidence above is from commands run against the branch, not from earlier
drafts.
