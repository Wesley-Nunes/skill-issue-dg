# 001 — Design: e2e pipeline and agent tooling

## Metadata

| Field | Value |
|---|---|
| Version | `0.3.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Passed` |
| Depends on | Operator approval of the e2e pipeline plan (2026-11-05) |
| Produces | `design/0.3.0/design-decisions.md` |

## Context

The operator approved a tooling pass after reviewing the Cypress AI Skills
documentation. `0.2.0` is merged to `dev`. The e2e suite has no CI, no failure
artifacts, duplicated helpers across two specs, and 19 raw `cy.wait` calls.
The pass adds agent skills, a shared Cypress support layer, and a CI pipeline.
It does not change game behaviour or presentation.

## Objective

Record whether any visual or interaction decision is required, and capture the
technical constraints the programmer and QA must follow.

## In scope

- Whether the game's visuals, HUD, controls, or interaction model change.
- The agent-facing conventions that affect future test authoring.
- The browser and artifact policy for local and CI runs.

## Out of scope

- Gameplay, balance, rendering, audio, menus, persistence.
- Cypress Cloud, `cy.prompt()`, component testing, spec sharding.

## Approved behaviour

Operator-approved on 2026-11-05:

1. Implement the full plan: pinned Cypress AI skills, suite stabilisation, and
   a GitHub Actions e2e pipeline.
2. Do not change game behaviour or visuals.
3. Keep the existing `npm run e2e` command as the single entry point.
4. Skip Cypress Cloud and AI element resolution; the app is one canvas with no
   DOM controls.

## Constraints

- No new runtime dependency and no new asset.
- Vendor skills at a pinned commit, with their MIT licence.
- Do not weaken or delete existing assertions.
- Any new helper must be reusable by both specs.
- CI must run the same command a developer runs locally.

## Acceptance criteria

1. The design file states explicitly that no visual or interaction decisions
   are required.
2. The browser, artifact, and skill-location decisions are concrete.
3. No game source file is in scope.

## Open assumptions / unresolved items

None.
