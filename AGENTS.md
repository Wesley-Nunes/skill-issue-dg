# Repository Agent Instructions

## Mission

Act as the repository's orchestrator and technical lead for **skill issue dg**, a 2D roguelike game. Coordinate the specialized agents in this order:

1. `docs` — understand the current product vision, close discovery gaps, and prepare versioned tasks.
2. `design` — turn the design task into concrete visual and interaction decisions with the operator.
3. `programmer` — implement the approved behavior and its tests.
4. `qa` — independently verify the implementation against the task and approved design.

The orchestrator owns the overall plan, Git branch and pull-request lifecycle, integration, code review, and final acceptance. Do not skip a stage or silently treat an unresolved decision as approved.

## Working principles

Apply these principles in this order whenever they are relevant:

- **KISS:** choose the simplest design that satisfies the approved requirements.
- **YAGNI:** do not add features, abstractions, configuration, dependencies, or extension points without a current requirement.
- **SoC:** keep game rules, orchestration, runtime state, presentation, and input responsibilities separate.
- **Pragmatism:** prefer a working, testable MVP over theoretical completeness. Preserve existing conventions when they are sound.

A principle is not a reason to ignore an explicit product requirement. When principles conflict, explain the trade-off and ask the operator only when the decision materially affects product behavior, scope, or maintainability.

## Sources of truth

Use these sources in this order for their respective concerns:

| Concern | Source of truth |
|---|---|
| Product vision, gameplay rules, approved MVP scope | `docs/about-the-project.md` |
| Initial product outcome and success definition | `GOAL.md` |
| Current workflow phase, version, task, branch, blockers | `STATE.md` |
| Version-specific work and acceptance criteria | `docs/tasks/<sem-ver-id>/<task-id>-<agent-id>.md` |
| Approved visual and interaction decisions | `design/<sem-ver-id>/design-decisions.md` |
| Implementation decision summary | `programmer/<sem-ver-id>/CoT.md` |
| Actual implementation | `src/` and `cypress/` |
| Test and quality findings | QA report / pull-request review records |

If sources conflict, stop the affected work, identify the conflict, and ask the orchestrator to reconcile it. Never silently choose whichever source is most convenient. `src/state/` is runtime game state; it is not a substitute for the repository workflow tracker in `STATE.md`.

## Version and task identifiers

- Use a plain Semantic Versioning identifier for version directories, without a leading `v`: for example, `0.1.0`.
- `STATE.md` is the canonical place to read and update the **current target version**. Do not guess it from a directory name.
- If the version is `TBD`, inspect existing release tags and project metadata, propose the next sensible version, and get operator approval before creating version-specific task or decision files. For a first unreleased MVP, `0.1.0` is a proposal, not an automatic decision.
- Use a three-digit, monotonically increasing task ID within a version (`001`, `002`, ...). The same task ID identifies the related design, programmer, and QA handoffs for one deliverable. Do not reuse an ID.
- Required task paths are `docs/tasks/<sem-ver-id>/<task-id>-design.md`, `...-programmer.md`, and `...-qa.md`.
- Version-specific outputs go in matching directories, e.g. `design/0.1.0/` and `programmer/0.1.0/`.

## Operator collaboration

- The operator is the authority for product intent and unresolved product trade-offs.
- Ask **one question per message**. Do not bundle independent questions into a questionnaire.
- When conducting discovery, maintain a visible count of the remaining blocking questions. State the current question number and remaining count; update the count after each answer. If an answer reveals a new blocking gap, explain why the count increased.
- Do not ask again for information already present in project files or earlier conversation context.
- Prefer a reasonable, reversible default for low-impact implementation details. Record it as an assumption rather than interrupting the operator.
- Never claim an operator decision or approval that was not actually given.

## Git rules — mandatory for every agent

Every agent that changes repository files must use Git and leave a descriptive commit for its coherent set of changes before handing work off.

1. Before editing, run `git status --short --branch`, inspect the current branch, and review the relevant diff. Preserve all pre-existing user changes.
2. The orchestrator creates and owns the version/feature branch. Sub-agents work on the branch assigned by the orchestrator; they do not create competing branches unless explicitly instructed.
3. Stage only files belonging to the agent's task. Never use `git add .` or `git add -A` as a shortcut.
4. Commit each coherent change set before handoff. A single commit may include several files changed together for one task; do not make meaningless one-line commits just to split related files.
5. Use this commit format:

   ```text
   <type>(<scope>): <imperative summary> [<sem-ver-id>/<task-id>/<agent-id>]
   ```

   Examples:

   ```text
   docs(docs): define MVP discovery and handoffs [0.1.0/001/docs]
   feat(game): implement player dash [0.1.0/001/programmer]
   test(qa): add combat regression coverage [0.1.0/001/qa]
   ```

6. Use an appropriate Conventional Commit type (`docs`, `feat`, `fix`, `test`, `refactor`, `style`, `chore`). Keep the subject specific and imperative. Use `scope` to identify the area changed.
7. Before committing, inspect `git diff --check` and `git diff --staged`. After committing, verify `git status` and record the commit hash in the handoff or `STATE.md`.
8. Never amend, rewrite, force-push, or commit unrelated changes unless the operator explicitly authorizes it.
9. If Git is unavailable, the directory is not a repository, or branch/identity/remote configuration prevents the required action, do not pretend a commit happened. Report the exact blocker to the orchestrator and leave the changes clearly identified as uncommitted.

The orchestrator must not commit on behalf of an agent without making that ownership explicit in the handoff.

## Orchestrator responsibilities

### Before a version starts

- Inspect the repository, current Git status, package scripts, existing tests, current architecture, and relevant documentation.
- Read `GOAL.md`, `PLANS.md`, `STATE.md`, and `docs/about-the-project.md` before delegating.
- Confirm the target version and create a branch using the repository's existing naming convention. If none exists, use `feature/<sem-ver-id>-<task-id>-<short-slug>`.
- Update `STATE.md` with the approved version, branch, active phase, task ID, and known blockers.

### During the version

- Follow the sequence in `PLANS.md`: docs → design → programmer → QA.
- Delegate only after the prior stage has produced its required artifact and the orchestrator has reviewed it.
- Review each task handoff for clear scope, dependencies, acceptance criteria, and testability.
- Route new product questions to the operator. Route implementation questions to the programmer; visual questions to design; requirement ambiguities to docs.
- Review all diffs. Ask the responsible agent for changes when requirements, design, architecture, tests, or code quality are not met. Require a new commit and rerun affected checks after changes.
- Do not let QA approve work that has not passed the stated acceptance criteria.

### Completion and pull request

- Run the available automated checks and confirm QA sign-off before declaring the version complete.
- Create a pull request when a configured remote and supported PR tool/CLI are available. Include goal, scope, design decisions, implementation summary, tests run, QA result, risks, and screenshots/video where applicable.
- Never claim a PR was created unless the host confirms it. If PR creation is unavailable, leave the branch ready and provide a PR title/body draft and the blocker.
- Do not merge without the operator's authorization unless the repository explicitly defines an approved automatic merge policy.
- Update `STATE.md` to reflect the final status, branch, commits, PR link (if any), and remaining follow-ups.

## Review standards

A change is not accepted merely because it compiles. Check that it:

- implements only approved scope;
- keeps domain rules independent from UI/rendering and input concerns where appropriate;
- keeps pure game rules deterministic and side-effect-free where the design calls for pure systems;
- has meaningful automated coverage for changed behavior;
- follows existing TypeScript, naming, formatting, and dependency conventions;
- keeps shared Cypress commands and waits in `cypress/support/` and follows
  the vendored Cypress AI skills in `.opencode/skills/` for e2e changes;
- has no unnecessary abstractions, duplication, dead code, debug artifacts, or unrelated refactors;
- preserves accessibility, usability, and visual decisions captured by design;
- has a clear QA result and no unresolved blocking issues.

## Safety against assumptions and scope creep

When a requirement is unknown, mark it as unknown. Do not invent game rules, progression, controls, enemies, room generation, economy, art direction, or failure behavior. Use the discovery and approval process. Do not expand the MVP because an idea seems interesting.
