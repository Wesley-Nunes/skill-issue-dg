---
name: cypress-canvas-e2e
description: Project conventions for this repository's Cypress end-to-end suite. Use when writing, reviewing, or debugging Cypress specs that drive the canvas game, when adding game state needed by a test, or when changing the e2e build/preview flow.
---

# Cypress canvas e2e

The game renders one `<canvas id="game">`. There are no DOM controls to
select, so the suite asserts on game state through the test-only
`window.__gameDebug` snapshot and on a small number of deliberate canvas
pixel checks.

## Read first

- `cypress.config.ts` — `baseUrl`, `supportFile`, timeouts, screenshot/video flags.
- `scripts/e2e.mjs` — builds the production bundle with `VITE_E2E=1`, starts
  `vite preview` on `127.0.0.1:4173`, then runs Cypress.
- `cypress/support/commands.ts` and `cypress/support/game.ts` — the shared
  commands and pure helpers. Reuse them before adding anything new.
- `src/ui/debug.ts` and `DebugSnapshot` in `src/game/types/index.ts` — the
  snapshot shape.

## Rules

- Use `cy.gameSnapshot()` to read state, and `cy.waitForGame(predicate,
  label, timeout)` to wait for a state transition. Never write a manual
  polling loop or an arbitrary `cy.wait` to synchronize with the game.
- Use `cy.attackWorld(x, y)` to start an attack. The engine samples input
  before its hitstop gate, so a press that lands during hitstop is consumed
  without a swing; `attackWorld` retries only while no swing started and no
  enemy lost health. Use `cy.clickWorld(x, y)` directly when a click must not
  be retried.
- A `cy.wait` is acceptable only when the wait *is* the behaviour under test:
  holding a key for a movement step, a click-down/click-up duration, or
  proving that a frozen game does not advance. Comment why.
- Prefer one predicate assertion with a descriptive label over a chain of
  fixed sleeps. The label appears in the timeout error.
- Drive the game through real input (`cy.document().trigger("keydown"...)`,
  `cy.get("canvas#game").trigger(...)`) so input handling is covered.
- Use `cy.clickWorld(x, y)` for world-space aiming; it converts through the
  current camera and zoom.
- Assert canvas pixels only for rendering intent that state cannot express
  (for example, that the room and HUD are painted). Keep those checks coarse
  and explain what they prove.
- Tests must stay independent. `cy.visit("/")` in `beforeEach` resets the run;
  never rely on state left by another test.
- Do not expose new debug data unconditionally. Anything added for tests must
  stay behind the `VITE_E2E` build flag and must not ship in the production
  bundle.

## Adding a command

1. Implement it in `cypress/support/commands.ts` using the existing helpers.
2. Declare it in `cypress/support/index.d.ts` under `Cypress.Chainable`.
3. Keep the name behaviour-oriented (`waitForGame`, `approachMelee`), not
   implementation-oriented (`getSnapshotTwice`).
4. Re-run `npm run typecheck` and `npm run e2e`.

## Changing the pipeline

`npm run e2e` is the single source of truth for the command sequence. CI
(`.github/workflows/e2e.yml`) calls the same script with
`CYPRESS_BROWSER=chrome`, so local and CI runs cannot drift. Failure
screenshots are uploaded by CI; videos are recorded in CI only.

Electron can be occlusion-throttled on Linux desktops, which starves
`requestAnimationFrame` and makes timing-sensitive specs flaky. If a local
run stalls, use `CYPRESS_BROWSER=chrome npm run e2e`.
