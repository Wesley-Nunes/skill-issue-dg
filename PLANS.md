# Version Plans

## Planning ownership

The **main agent / orchestrator** owns this plan and is responsible for coordinating the specialist agents and the operator. The required execution order for every version is:

**docs → design → programmer → QA**

Do not run these stages in parallel. Each stage depends on approved outputs from the preceding stage.

## Standard version workflow

### 0. Prepare the version — orchestrator

- Read `AGENTS.md`, `GOAL.md`, `STATE.md`, `docs/about-the-project.md`, and the current repository structure.
- Inspect Git status, branches/tags, package scripts, dependencies, and existing test conventions.
- Confirm the target SemVer ID with the operator if it is not already established. Store it in `STATE.md`.
- Choose the next unused three-digit task ID for the version.
- Create the version branch and update `STATE.md`.

**Gate:** the repository is clean enough to work safely, the version is explicit, and the initial task is identified.

### 1. Product discovery and task definition — docs agent

- Read the entire `docs/about-the-project.md` before asking questions or changing it.
- Build the big-picture description of what this version should deliver.
- Identify missing decisions and ask the operator one question at a time. Keep the remaining blocking-question count visible and current.
- Update `docs/about-the-project.md` only when a decision materially changes the agreed product vision, gameplay rules, technical direction, or MVP scope.
- Create the versioned handoff files for design, programmer, and QA under `docs/tasks/<sem-ver-id>/`.

**Required outputs:**

- `docs/tasks/<sem-ver-id>/<task-id>-design.md`
- `docs/tasks/<sem-ver-id>/<task-id>-programmer.md`
- `docs/tasks/<sem-ver-id>/<task-id>-qa.md`
- any necessary, operator-approved update to `docs/about-the-project.md`

**Gate:** task scope, dependencies, assumptions, and acceptance criteria are clear enough for design. The orchestrator reviews and accepts the handoff.

### 2. Design decisions — design agent

- Read the design task, project overview, and relevant existing UI/assets.
- Work with the operator through one-at-a-time exploratory questions to define the look, feel, presentation, and interaction behavior required by this version.
- Write `design/<sem-ver-id>/design-decisions.md` with concrete, implementable decisions.
- Identify any design decision that would change product scope and return it to docs/orchestrator rather than silently expanding the task.

**Gate:** the design decisions cover all visual and interaction requirements in the task, and the orchestrator accepts them.

### 3. Implementation — programmer agent

- Read the programmer task and approved design decisions, plus the relevant product and repository context.
- Resolve only implementation-blocking questions with the operator, one at a time.
- Write `programmer/<sem-ver-id>/CoT.md` as a concise implementation decision log (not private hidden reasoning).
- Implement the approved scope in `src/` and add/update appropriate tests, including Cypress coverage for agreed end-to-end flows.
- Run the available relevant checks and commit the implementation.

**Gate:** implementation meets the acceptance criteria, tests/checks pass, the decision log and commit are recorded, and the orchestrator's code review is complete.

### 4. Quality verification — QA agent

- Read the QA task, project overview, approved design decisions, and implementation decision log.
- Independently verify behavior, design compliance, regressions, and test results.
- If quality is insufficient, record actionable findings and return the work to the responsible agent (docs, design, or programmer). Do not silently fix the responsible agent's work.
- Re-run affected checks after the responsible agent supplies a correction.

**Gate:** QA records a pass with evidence, or all blocking findings have been routed back and resolved. A failed QA result cannot be treated as approval.

### 5. Integration and release readiness — orchestrator

- Review the final diff and commit history; verify task-to-implementation traceability.
- Run the full available test/build/lint/type-check suite.
- Confirm QA sign-off and document residual risks or deferred work.
- Create a pull request when repository hosting is configured and available; otherwise provide a PR-ready summary and state the blocker.
- Update `STATE.md` and `GOAL.md` with the completed MVP outcome and next goal as appropriate.

**Gate:** the operator can review a complete, tested, documented result and the repository state is accurate.

## Change routing

| Finding | Responsible stage |
|---|---|
| Product intent or MVP scope is unclear/contradictory | docs agent, with operator and orchestrator |
| Visual, layout, animation, feedback, or interaction behavior is unspecified | design agent, with operator |
| Approved behavior is implemented incorrectly or code/tests are deficient | programmer agent |
| Acceptance criteria or test strategy is incomplete | docs agent (task definition), then QA verifies |
| A change request crosses stages or changes scope | orchestrator coordinates a return to the earliest affected stage |

## Plan maintenance

The orchestrator updates this file when the workflow itself changes, and updates `STATE.md` whenever the active phase, task, version, branch, blocker, or completion status changes. Keep this document procedural; put version-specific scope in task files, not here.
