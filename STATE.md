# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | MVP — scope and success criteria to be agreed with the operator |
| Current SemVer ID | `TBD` |
| Current task ID | `TBD` |
| Active phase | `Not started` |
| Active agent | `Orchestrator` |
| Git branch | `TBD` |
| Last accepted commit | `TBD` |
| Pull request | `Not created` |
| Blocking questions remaining | `TBD — establish during docs discovery` |
| Overall status | `Needs repository setup / discovery` |

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
- Discovery/task directory: `docs/tasks/<sem-ver-id>/`
- Design decisions: `design/<sem-ver-id>/design-decisions.md`
- Implementation decision log: `programmer/<sem-ver-id>/CoT.md`
- QA report: `qa/<sem-ver-id>/`

## Handoff record

Append one entry for each meaningful phase transition:

| Date | Version / task | From → To | Result / evidence | Commit |
|---|---|---|---|---|
| TBD | TBD | Setup → Docs discovery | Awaiting repository and project-document availability | TBD |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
