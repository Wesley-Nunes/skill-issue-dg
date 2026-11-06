# Design decisions — 0.3.0 e2e pipeline and agent tooling

Owner: `design` · Task `0.3.0/001` · Approved by the operator on 2026-11-05.

## 1. Visual and interaction decisions

**None.** This version changes repository tooling only. It does not change the
canvas rendering, HUD, controls, combat, room, audio, or any player-visible
behaviour. There is no design gate for the game itself.

## 2. Agent tooling

- Vendor the official Cypress AI skills at a pinned upstream commit instead of
  installing them with an interactive CLI. The repository must be reviewable
  and reproducible without network access at commit time.
- Location: `.opencode/skills/`, the project-scoped source OpenCode discovers.
- Include `cypress-author`, `cypress-explain`, `cypress-docs`, and
  `cypress-tap`. Keep the upstream MIT licence beside them and record the
  source commit and versions.
- Do not vendor `cypress-cloud-cli`: it requires a Cypress Cloud organisation,
  an authenticated CLI, and a Cloud integration this project does not have.
- Add one project skill, `cypress-canvas-e2e`, that narrows the upstream rules
  to this game: snapshot state, shared commands, input-duration waits, and
  artifact policy.

## 3. Test stability

- Remove the duplicated helper layer from the two specs. Shared commands live
  in `cypress/support/` and are typed in `cypress/support/index.d.ts`.
- Synchronisation uses `cy.gameSnapshot()` and `cy.waitForGame(predicate,
  label, timeout)` with Cypress retry-ability. Raw waits remain only where the
  wait is the behaviour under test.
- The engine samples input before its hitstop gate, so a press during hitstop
  is consumed without a swing. `cy.attackWorld` may retry a press while
  `comboStep` and `comboResolved` show that no swing started.
- Tests must wait for the `__gameDebug` hook before interacting; it is exposed
  after assets load and input listeners are attached.
- Default command timeout: 10 s. Explicit predicates carry their own longer
  timeouts (death, projectile damage).

## 4. Pipeline and artifacts

- `npm run e2e` remains the only entry point: production build with
  `VITE_E2E=1`, `vite preview` on `127.0.0.1:4173`, then `cypress run`.
- CI runs on pull requests to `dev`, pushes to `dev`, and manual dispatch.
  Node 22, `npm ci`, typecheck, unit tests, then the same `npm run e2e`.
- Use Chrome in CI (`CYPRESS_BROWSER=chrome`). Electron can be
  occlusion-throttled on Linux desktops, which starves `requestAnimationFrame`
  and makes timing-sensitive specs flaky. Chrome is preinstalled on
  `ubuntu-latest`.
- Record failure screenshots always and video in CI only. Upload
  `cypress/screenshots` and `cypress/videos` as a workflow artifact on failure.
- No test retries. Flake must be visible before any retry policy is added.

## 5. Out of scope

Cypress Cloud, Test Replay, `cy.prompt()`, Studio AI, component testing, spec
sharding, Playwright migration, and game-code changes.
