# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | MVP — first playable slice (`0.1.0`) defined and in progress |
| Current SemVer ID | `0.1.0` |
| Current task ID | `001` |
| Active phase | `Design decisions` |
| Active agent | `design` |
| Git branch | `feature/0.1.0-001-playable-slice` |
| Last accepted commit | `879c1af` (docs handoff) |
| Pull request | `Not created` |
| Blocking questions remaining | `0` (3 answered during docs discovery) |
| Overall status | `In progress` — docs handoff accepted, design stage next |

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
- Task package: `docs/tasks/0.1.0/001-design.md`, `001-programmer.md`, `001-qa.md`
- Design decisions: `design/0.1.0/design-decisions.md` (not created yet)
- Implementation decision log: `programmer/0.1.0/CoT.md` (not created yet)
- QA report: `qa/0.1.0/001-report.md` (not created yet)

### Version 0.1.0 scope (operator-approved 2026-11-01)

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

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
