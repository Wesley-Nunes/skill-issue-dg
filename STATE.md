# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | MVP — combat depth (`0.2.0`): combo chain, ranged enemy, earn-only combo challenge |
| Current SemVer ID | `0.2.0` |
| Current task ID | `001` |
| Active phase | `Docs discovery` |
| Active agent | `docs` |
| Git branch | `feature/0.2.0-001-combat-depth` |
| Last accepted commit | `169d2f3` (merge of `0.1.0` into `dev`) |
| Pull request | PR #1 merged (`0.1.0`); `0.2.0` not created |
| Blocking questions remaining | `TBD` during docs discovery |
| Overall status | `In progress` — version opened, discovery starting |

Update this snapshot whenever a value changes. Do not leave stale status after a handoff.

## State agent responsibilities

The state manager keeps the project workflow legible and consistent. It must:

- keep the current target SemVer ID, task ID, phase, active agent, branch, and overall status accurate;
- link the active task files and version-specific outputs;
- record the current gate, blockers, operator decisions still pending, and next owner/action;
- record commit hashes and pull-request links only after they are verified;
- preserve a short history of important transitions;
- distinguish `TBD`, `Not started`, `Blocked`, `In progress`, `Changes requested`, `Passed`, and `Done` rather than implying completion;
- avoid duplicating product requirements or design specifications already maintained in their source-of-truth files.

The state manager must not invent decisions, change product scope, edit game code, approve QA, or change Git history. Ask the orchestrator to resolve conflicting status information.

## Active version links

Populate these links when the version and task have been approved:

- Product overview: `docs/about-the-project.md`
- Task package: `docs/tasks/0.2.0/001-design.md`, `001-programmer.md`, `001-qa.md` (not created yet — discovery in progress)
- Design decisions: `design/0.2.0/design-decisions.md` (not created yet)
- Implementation decision log: `programmer/0.2.0/CoT.md` (not created yet)
- QA report: `qa/0.2.0/001-report.md` (not created yet)

### Version 0.2.0 scope (operator-approved 2026-11-02)

- **Deliverable:** combat depth — development priority 4 in `docs/about-the-project.md` §11.
- **Included:** three-hit light attack combo chain; one new ranged enemy archetype coexisting with the melee enemy in the existing hand-authored room; one earn-only combo skill challenge that awards a skill point displayed in the HUD.
- **Excluded:** secondary attack, skill-point spending/shop, consumables, currency, loot, procedural floors, safe rooms, boss, persistence, audio, menus, any enemy type beyond melee + ranged.
- **Known structural consequence:** `GameState.enemy` becomes `enemies: Enemy[]`; spawns, hit resolution, draw order, camera, and death/restart need list handling.

### Version 0.1.0 scope (operator-approved 2026-11-01, delivered)

- **Deliverable:** first playable combat slice — development priorities 1–3 in `docs/about-the-project.md` §11.
- **Included:** Vite/TypeScript browser app, canvas and game loop, asset loading, one hand-authored room, WASD movement, mouse aim, camera follow, wall collision, basic melee attack, dodge, HP/heart HUD, one melee enemy, minimal death/restart.
- **Excluded:** combos, secondary attack, skills/skill points, consumables, currency, loot, shop/safe rooms, boss, procedural generation, persistence, audio, menus.
- **Art:** DungeonTileset II v1.7 (CC0) frames supplied by the operator under `public/assets/dungeon-tileset-ii/`.

## Handoff record

Append one entry for each meaningful phase transition:

| Date | Version / task | From → To | Result / evidence | Commit |
|---|---|---|---|---|
| 2026-11-01 | — | Setup → Docs discovery | Operator approved version `0.1.0`, playable-slice scope, and real asset pack; branch created | `52f7ddf` (base) |
| 2026-11-01 | 0.1.0/001 | Docs discovery → Design decisions | Three task handoffs created; docs handoff accepted by orchestrator; asset license verified as CC0; 35 asset frames delivered and integrity-checked | `879c1af` |
| 2026-11-01 | 0.1.0/001 | Design decisions → Implementation | Operator approved framing, combat baseline, feedback, HUD, and room composition; design spec written | `860a060` |
| 2026-11-02 | 0.1.0/001 | Implementation → QA verification | App, systems, 55 unit tests, 5 Cypress tests and the implementation log delivered; `typecheck`, `test`, `build`, `e2e` pass | `ab61870` |
| 2026-11-02 | 0.1.0/001 | QA verification → Complete | Clean install and all scripts pass; 56 unit + 11 Cypress tests; two findings fixed (dodge overshoot, debug type layering); verdict pass | `88e6865` |
| 2026-11-02 | 0.2.0/001 | Complete → Docs discovery | `0.1.0` merged to `dev` via PR #1; operator approved `0.2.0` combat-depth scope (option A); branch created | `169d2f3` |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
