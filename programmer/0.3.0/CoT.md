# Implementation decision log — 0.3.0 e2e pipeline

Owner: `programmer` · Task `0.3.0/001` · Inputs: `design/0.3.0/design-decisions.md` (approved 2026-11-05), `docs/tasks/0.3.0/001-programmer.md`.

## Summary

The e2e suite now runs through one shared, typed support layer; synchronisation
is predicate-based; CI runs typecheck, unit tests, and the same `npm run e2e`
entry point on every PR to `dev`. The official Cypress AI skills are vendored at
a pinned commit, with a project skill that narrows their rules to this canvas
game. No game source, asset, or player-visible behaviour changed.

## Baseline (before changes)

- Branch: `dev` at `64f0429` (`0.2.0` merged via PR #2).
- Suite: 15 tests in 2 specs; the first run passed in 77 s.
- `cy.wait` count: 19; duplicated helper functions: 10.
- No CI, no failure screenshots, no video, `defaultCommandTimeout: 20000`.
- Back-to-back local runs were unstable: run 2 exited 1 and run 3 exited 139
  (Electron) in the same loop.

## Source changes

```text
cypress/support/e2e.ts        loads the support commands
cypress/support/commands.ts   gameSnapshot, waitForGame, waitForDeath, walkTo,
                              approachMelee, clickWorld, attackWorld
cypress/support/game.ts       pure helpers: cameraSettled, meleeTarget,
                              fragmentPoint, movementKeys, clamp
cypress/support/index.d.ts    typed Cypress.Chainable declarations
cypress/e2e/*.cy.ts           use the shared commands and pure helpers
cypress.config.ts             supportFile, screenshots, CI-only video, 10 s timeout
scripts/e2e.mjs               honours CYPRESS_BROWSER
.github/workflows/e2e.yml     Node 22, typecheck, unit, e2e, artifacts
.opencode/skills/*            pinned vendor skills + canvas project skill
package.json / lock           0.3.0
```

## Key decisions and interpretations

- **Vendored, not CLI-installed.** The toolkit is copied from
  `cypress-io/ai-toolkit` at `5258ece52a0010d268946e08606c98784c98f255` into
  `.opencode/skills/`. The licence and a source note live in
  `.opencode/skills/cypress-ai-toolkit/`. This keeps review and rollback
  deterministic and avoids an interactive installer.
- **No `cypress-cloud-cli`.** It requires a Cloud organisation, authenticated
  CLI, and integration that this project does not have. `cypress-tap` is
  included for local open-mode debugging; it works on Cypress 16.2.1.
- **Project skill.** `.opencode/skills/cypress-canvas-e2e/SKILL.md` records the
  game-specific rules that the upstream skills cannot know: snapshot state,
  no DOM selectors, input-duration waits, and the canvas/`__gameDebug` flow.
- **Predicate synchronisation.** `cy.waitForGame` uses
  `cy.window({timeout}).should(...)`, so Cypress retries the predicate and the
  failure message names the state being awaited. This replaced both
  `pollUntil` loops and fixed waits used for synchronisation.
- **Raw waits kept only where the wait is the behaviour.** The console-error
  test holds the mouse for 200 ms and a key for 150 ms; the mash test uses a
  40 ms click cadence; the frozen-run test waits 300 ms to prove no movement.
  Each has a comment.
- **Startup race.** `cy.visit("/")` resolves before `start()` finishes loading
  assets. `beforeEach` now reads the debug hook, which is exposed after input
  listeners are attached, before any test interacts.
- **Hitstop input loss.** `input.sample` clears the attack queue before
  `game.step` checks hitstop, so a single click during hitstop is consumed
  without a swing. `cy.attackWorld` retries only while `comboStep`,
  `comboResolved` and the enemies' health prove that no swing resolved. The
  health check matters because taking damage resets the combo: without it a
  cancelled-then-retried press could land two hits and break the one-press
  damage assertions.
- **Chrome in CI.** Electron's window can be occlusion-throttled, which starves
  `requestAnimationFrame`: measured 1 frame per 500 ms in this desktop session
  versus ~62 fps in Chrome. `scripts/e2e.mjs` accepts `CYPRESS_BROWSER`; CI
  sets it to `chrome`, which is preinstalled on `ubuntu-latest`. Local default
  stays Electron.
- **Artifacts.** `screenshotOnRunFailure: true`; `video` is on only when
  `CI` is set. CI uploads `cypress/screenshots` and `cypress/videos` on
  failure. No retries: flake must be visible first.
- **Workflow placement.** GitHub Actions is the repository host's native
  pipeline. The workflow calls `npm run e2e`, so local and CI cannot drift.

## Verification

Run from a clean install on `feature/0.3.0-001-e2e-pipeline`:

- `npm run typecheck` — pass.
- `npm test` — 123 tests in 12 files.
- `npm run build` — pass; `grep __gameDebug dist` finds nothing.
- `CYPRESS_BROWSER=chrome npm run e2e` — 15/15, three consecutive runs:
  55 s, 59 s, 56 s.
- First `npm run e2e` baseline before the changes: 77 s, 15/15.

## Residual risks and follow-ups

- The hosted workflow has not run yet: this environment has no `gh`/token and
  no push. The first push to `dev`/PR is the real CI verification.
- Electron local runs remain throttling-sensitive on some Linux desktops; the
  project skill and state record `CYPRESS_BROWSER=chrome` as the workaround.
- Cypress skills do not update automatically. `SOURCE.md` records the pin and
  the manual refresh procedure.
- Cypress Cloud and `cy.prompt()` remain out of scope; the game is canvas-only
  and no Cloud account exists.
