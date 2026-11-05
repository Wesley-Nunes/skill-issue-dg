# 001 — Programmer: e2e pipeline and agent tooling

## Metadata

| Field | Value |
|---|---|
| Version | `0.3.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | Ready for implementation |
| Depends on | `docs/tasks/0.3.0/001-design.md`, `design/0.3.0/design-decisions.md` |
| Produces | Skills, support layer, CI workflow, `programmer/0.3.0/CoT.md` |

## Context

The e2e suite runs only when a human types `npm run e2e`. It has no CI, no
failure artifacts, duplicated helpers across both specs, 19 raw `cy.wait`
calls, and a 20 s default command timeout. Timing-sensitive specs are also
exposed to Electron window-occlusion throttling and to presses being consumed
during hitstop.

## Objective

Make the suite stable, reviewable, and continuously enforced without changing
game behaviour or presentation.

## In scope

- Vendor the pinned Cypress AI skills and a project canvas skill.
- Add a typed Cypress support layer and move shared helpers and custom
  commands into it.
- Replace manual polling and synchronisation waits with retrying predicates;
  keep only behaviour-defining waits.
- Wait for the debug hook before interacting in every spec.
- Enable failure screenshots and CI-only video; reduce the default command
  timeout.
- Add a GitHub Actions workflow that runs typecheck, unit tests, and e2e.
- Allow `CYPRESS_BROWSER` to select the browser through the existing script.
- Update `AGENTS.md` review standards and `STATE.md`.
- Record the implementation decisions in `programmer/0.3.0/CoT.md`.

## Out of scope

- Game source, gameplay, balance, rendering, audio, menus, assets.
- Cypress Cloud, `cy.prompt()`, component testing, sharding, new dependencies.
- Weakening, deleting, or renaming assertions.

## Approved behaviour

1. `npm run e2e` builds the production bundle and runs all specs exactly as
   before.
2. Both specs use shared commands from `cypress/support/`; no duplicated
   snapshot, movement, click, or death helpers remain in the specs.
3. Synchronisation is predicate-based. A raw wait remains only for input
   duration or to prove a frozen run does not advance, with a comment.
4. `cy.attackWorld` retries a press only while no swing has started.
5. Each spec waits for the debug hook after `cy.visit("/")`.
6. CI runs on PRs to `dev`, pushes to `dev`, and manual dispatch; failures
   upload screenshots and videos.
7. Typecheck, unit tests, and e2e pass locally with
   `CYPRESS_BROWSER=chrome`.

## Constraints

- No new dependency or asset. The vendored skills are instruction files plus
  their licence.
- Keep the Cypress version at 16.2.1.
- Keep spec titles and assertion intent.
- Do not use `git add .`.

## Acceptance criteria

1. `.opencode/skills/cypress-{author,explain,docs,tap}` exist at the recorded
   upstream commit, with the MIT licence and a source note.
2. `.opencode/skills/cypress-canvas-e2e/SKILL.md` documents the project rules.
3. `cypress/support/{e2e.ts,commands.ts,game.ts,index.d.ts}` provide typed
   `gameSnapshot`, `waitForGame`, `waitForDeath`, `walkTo`, `approachMelee`,
   `clickWorld`, and `attackWorld`.
4. Both specs import pure helpers and contain no local snapshot/movement
   helpers or `pollUntil` loops.
5. Raw waits are limited to documented input durations and the frozen-run
   check.
6. `cypress.config.ts` enables `supportFile`, screenshots, CI-only video, and a
   10 s default command timeout.
7. `scripts/e2e.mjs` honours `CYPRESS_BROWSER`.
8. `.github/workflows/e2e.yml` runs typecheck, unit tests, and e2e on
   `ubuntu-latest` with Node 22 and uploads artifacts on failure.
9. `npm run typecheck`, `npm test`, `npm run build`, and
   `CYPRESS_BROWSER=chrome npm run e2e` pass.
10. Three consecutive e2e runs pass.

## Dependencies and handoff

Inputs: approved design decisions, existing e2e suite.
Outputs: skills, support layer, config, script, workflow, implementation log.
Hand off to QA with the tested commit and commands run.

## Open assumptions / unresolved items

- CI cannot be executed from this environment. The workflow is validated by
  running the same commands locally; the first hosted run is an operator
  follow-up.
- Electron remains the local default; Chrome is selected explicitly for
  stability.
