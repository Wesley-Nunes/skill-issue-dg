# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | MVP — spirit purification (`0.2.0`): dark-fantasy liberation loop, spirit fragments, spirit meter |
| Current SemVer ID | `0.2.0` |
| Current task ID | `002` |
| Active phase | `Integration — push + PR` |
| Active agent | `orchestrator` |
| Git branch | `feature/0.2.0-001-combat-depth` |
| Last accepted commit | `2875910` (QA pass; report committed in the same commit) |
| Pushed HEAD | `b218114` on `origin/feature/0.2.0-001-combat-depth` (operator push). The local branch is 4 commits ahead with the `002` docs, design, implementation, and QA change sets |
| Pull request | PR #1 merged (`0.1.0`); the `0.2.0` PR was declined and must be reopened after the re-baseline. No `gh`/`hub` and no GitHub token in this environment, so the operator must push and open it |
| Blocking questions remaining | `0` |
| Overall status | `Blocked` — the `002` purification change set is committed and QA-passed; PR creation needs the operator to push the branch and open the PR, and the merge to `dev` needs operator review and authorization |

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
- Task package: `docs/tasks/0.2.0/002-design.md`, `002-programmer.md`, `002-qa.md` (created; `001-*` marked superseded)
- Design decisions: `design/0.2.0/design-decisions.md` (rewritten for purification)
- Implementation decision log: `programmer/0.2.0/CoT.md` (rewritten for purification)
- QA report: `qa/0.2.0/002-report.md` (created; Passed on `2df7615` plus the QA regression, report `2875910`)

### Version 0.2.0 scope (operator re-baseline 2026-11-04)

- **Deliverable:** combat depth and the dark-fantasy liberation loop — development priority 4 in `docs/about-the-project.md` §11.
- **Included:** three-hit hard-timed light combo with in-world chain pips; two melee enemies plus one ranged enemy in the existing hand-authored room; spirit fragments broken by the light attack; any HP loss restores broken fragments; failed-rite respawn at spawn after 2 s; permanent rest and spirit gain; spirit meter; frozen “Floor purified — the boss awaits” overlay with `R` restart.
- **Removed from the earlier `0.2.0` pass:** skill points, the combo challenge award, the earn notice, the room-clear flag/event, and drops.
- **Excluded:** secondary attack, skill-point spending/shop, consumables, currency, loot, procedural floors, safe rooms, boss, persistence, audio, menus, any enemy type beyond melee + ranged, ordered/moving fragments.
- **Known structural consequence:** `Enemy` gains home position, fragments, rested, and respawn; `RunState` becomes spirit/floorPurified; `GameStatus` gains `purified`.

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
| 2026-11-02 | 0.2.0/001 | Docs discovery → Design decisions | Five operator decisions (combo shape, kiting ranged enemy, room composition, earn-only challenge, imp art); `imp` frames verified; product overview updated; three task handoffs created | `c2eff05` |
| 2026-11-03 | 0.2.0/001 | Design decisions → Implementation | Design spec approved with full timing/value tables; combo, ranged enemy, projectile, HUD, challenge and spawn decisions recorded | `58da410` |
| 2026-11-03 | 0.2.0/001 | Implementation → QA verification | Combo chain, ranged enemy, projectiles, challenge HUD, room clear and restart delivered; 105 unit + 14 Cypress tests; `typecheck`, `test`, `build`, `e2e` pass; QA scenarios reconciled with the convex-room LOS no-op | `7743e81` (QA task notes `8f67d5a`) |
| 2026-11-03 | 0.2.0/001 | QA verification → Complete | Clean install; 105 unit + 14 Cypress tests pass twice; typecheck/build/e2e pass; visual checks of finisher, award notice, telegraph, projectile and death; verdict Passed with 0 blocking findings | `4156994`, `b8de512` |
| 2026-11-03 | 0.2.0/001 | Complete → Pushed, PR pending | Operator pushed the branch; `origin/feature/0.2.0-001-combat-depth` matches local HEAD at `fea3002`; PR creation blocked by missing `gh`/`hub` and GitHub token; merge to `dev` awaits operator review | `fea3002` |
| 2026-11-04 | 0.2.0/001 | PR review → Combo rework | Operator declined the buffered-input combo because mashing completed it. Hard-timed reply window (0.06 s delay, 0.10 s window), damage break, finisher hold, and in-world pips implemented; design, product overview, and task criteria updated; 111 unit + 15 Cypress tests pass | `3eef641`, `04253cf`, `7f6f055` |
| 2026-11-04 | 0.2.0/001 | Combo rework → QA pass | Clean install; typecheck/build/e2e pass; 111 unit + 15 Cypress tests with three consecutive full e2e passes; one pip-pulse mismatch fixed before acceptance; verdict Passed with 0 blocking findings | `7f6f055` (QA report `c618dad`) |
| 2026-11-04 | 0.2.0/002 | PR review → Re-baseline | Operator declined the skill-point/challenge loop and approved spirit purification: light-attack fragment breaks, any-HP-loss restoration, failed-rite respawn, permanent rest, spirit meter, frozen purified overlay, no boss or drops. Product overview, tasks, and design decisions rewritten; `001-*` marked superseded | `db6968a`, `3686440` |
| 2026-11-04 | 0.2.0/002 | Re-baseline → Implementation | Fragment/home/rested/respawn state, pure purification rules, engine wiring, renderer HUD/aura/overlay, effects, and removed skill-point/challenge code delivered; 122 unit + 15 Cypress tests; typecheck/build/e2e pass | `2df7615` |
| 2026-11-04 | 0.2.0/002 | Implementation → QA pass | Clean install; 123 unit + 15 Cypress tests pass; production bundle has no `__gameDebug`; visual captures verify fragments, spirit HUD, and ready-to-rest cue; verdict Passed with 0 blocking findings | `2875910` |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
