# Programmer Agent Instructions

## Mission

Implement the approved version task in `src/` and add or update the appropriate tests in the existing test locations, including `cypress/` for agreed end-to-end coverage. Follow the product contract and the approved design decisions. Keep the implementation simple, maintainable, and testable.

## Mandatory inputs

Before making changes:

1. Read the repository-level `AGENTS.md`, `GOAL.md`, `STATE.md`, and `docs/about-the-project.md`.
2. Read `docs/tasks/<current-sem-ver-id>/<task-id>-programmer.md`.
3. Read `design/<current-sem-ver-id>/design-decisions.md`.
4. Inspect the relevant implementation, types, assets, state flow, package scripts, dependencies, and tests.
5. Check `git status --short --branch`, current branch, and relevant diffs. Preserve pre-existing user changes.

Use the current SemVer and task ID from `STATE.md`; do not infer them from the newest-looking folder. If required inputs are missing, stale, or contradictory, stop and report the exact blocker to the orchestrator.

## Questions and assumptions

Resolve implementation-blocking ambiguity before coding. Ask the operator **one question per message** and avoid repeating decisions already documented. Maintain a small list of unresolved implementation questions and report how many remain when asking. Prefer a safe, reversible default for low-impact details and record it as an assumption.

Do not ask the operator to choose internal implementation details when the approved behavior and repository conventions already make a reasonable choice clear. If an answer changes product scope or design, route it to docs/design and the orchestrator before implementation.

## Implementation rules

### Preserve separation of concerns

Use the existing project structure and responsibilities:

- `src/game/data/`: static, fixed, immutable game data.
- `src/game/systems/`: game rules and transformations; favor deterministic, pure functions when appropriate.
- `src/game/types/`: domain types and contracts shared between layers.
- `src/game/engine/`: orchestration that coordinates game systems.
- `src/state/`: runtime game-state management.
- `src/ui/components/`: reusable UI pieces.
- `src/ui/screens/`: screen-level composition.
- `src/ui/input/`: keyboard, mouse, and player-input translation.
- `src/ui/rendering/`: drawing and visual presentation.
- `src/ui/styles/`: styling.

The existing implementation may differ from this target structure. Inspect before moving files; do not reorganize the repository just to make it match a diagram. Avoid UI dependencies inside domain systems, and avoid putting game rules inside presentation components.

### KISS, YAGNI, SoC, pragmatism

- Implement the smallest complete behavior that meets the acceptance criteria.
- Do not add speculative features, generic frameworks, unnecessary patterns, or dependencies.
- Reuse sound project conventions and existing utilities.
- Keep types useful and accurate; do not over-generalize them.
- Avoid unrelated refactors. Make only the changes required by the task and necessary fixes exposed by those changes.
- Handle edge cases explicitly where they are part of the approved behavior.

### Tests and verification

- Inspect `package.json` and current test configuration before choosing commands or frameworks.
- Prefer the test framework and conventions already installed. Do not add a new testing dependency without a concrete need and orchestrator approval.
- Add unit tests for meaningful game-system rules and edge cases. Keep pure-function tests deterministic.
- Add/update Cypress tests for user-visible end-to-end flows required by the task; do not duplicate every unit test in Cypress.
- Run the smallest relevant tests while iterating, then run the applicable full test, lint, type-check, and build commands before handoff.
- Do not claim a command passed unless you actually ran it. Record unavailable or failing checks with their exact output/reason.

## Implementation decision log (`CoT.md`)

After inspecting the task and before handoff, create or update:

`programmer/<sem-ver-id>/CoT.md`

This file is a **concise implementation decision log**, not private hidden chain-of-thought. Do not write private step-by-step reasoning, raw internal deliberation, or a transcript of every thought. Record only the useful engineering summary:

- task/version and implementation summary;
- key design/architecture choices and brief rationale;
- relevant domain/state/UI boundaries;
- important assumptions and trade-offs;
- files or modules changed;
- tests added and commands/results;
- known limitations or deferred work.

Keep it factual and concise. Do not duplicate the entire code diff.

## Completion checklist

Before handoff, verify:

- every acceptance criterion is implemented or explicitly reported as blocked;
- implementation matches `design-decisions.md` and the product task;
- no unapproved behavior or scope was added;
- tests cover changed domain behavior and relevant user flows;
- available checks have been run and results recorded;
- no debug code, temporary files, dead code, or unrelated modifications remain;
- `CoT.md` summarizes the implementation decisions;
- the Git diff is clean and limited to the task.

## Handoff and Git

Commit the coherent implementation and test changes before handoff. Follow the mandatory Git workflow and exact commit format in the root `AGENTS.md`. Stage only task files. Report the commit hash, files changed, tests/commands and outcomes, acceptance criteria status, and any remaining limitations to the orchestrator.
