# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | `0.4.0` seeded dungeon slice — generated rooms and corridors, encounters, stairs, and descent |
| Current SemVer ID | `0.4.0` |
| Current task ID | `001` |
| Active phase | `Design decisions → Implementation` |
| Active agent | `programmer` |
| Git branch | `feature/0.4.0-001-dungeon-slice` |
| Last accepted commit | `8984fc3` (`0.3.0` merged to `dev`; branch base) |
| Pushed HEAD | Local branch only; nothing pushed yet |
| Pull request | None for `0.4.0`; open after implementation and QA |
| Blocking questions remaining | `0` |
| Overall status | `In progress` — task package and design decisions are written; implementation is next |

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
- Task package: `docs/tasks/0.4.0/001-design.md`, `001-programmer.md`, `001-qa.md`
- Design decisions: `design/0.4.0/design-decisions.md`
- Implementation decision log: `programmer/0.4.0/CoT.md` (pending)
- QA report: `qa/0.4.0/001-report.md` (pending)

### Version 0.4.0 scope (operator-approved 2026-11-06)

- **Deliverable:** the first dungeon slice — development priority 5 in
  `docs/about-the-project.md` §11.
- **Included:** seeded four-room floor with corridors; tile-grid collision and
  line of sight; three enemies distributed across the non-start rooms; a
  locked/unlocked stairs exit; automatic descent to a newly generated floor
  with depth increment; depth/exit HUD; removal of the purified freeze.
- **Defaults recorded as assumptions:** HP persists between floors, spirit is
  per floor, restart starts a fresh depth-1 run with a new seed, and descent is
  automatic on unlocked stairs.
- **Excluded:** safe rooms, shops, currency, consumables, loot, artifacts,
  boss, difficulty scaling, floor themes, audio, menus, persistence, and a
  final floor.
- **Known structural consequence:** the single `ROOM`/`ENEMY_SPAWNS` model is
  replaced by a generated `Floor`; `GameStatus` loses `"purified"`; `RunState`
  gains `depth` and `exitOpen`.

### Version 0.3.0 scope (operator-approved 2026-11-05)

- **Deliverable:** e2e pipeline and agent tooling — pinned Cypress AI skills, a
  typed shared support layer, suite stabilisation, and a GitHub Actions
  workflow.
- **Included:** vendored `cypress-author`, `cypress-explain`, `cypress-docs`,
  and `cypress-tap` at upstream commit
  `5258ece52a0010d268946e08606c98784c98f255`; project skill
  `cypress-canvas-e2e`; predicate-based waits through `cy.waitForGame`;
  `cy.attackWorld`; failure screenshots, CI-only video, 10 s command timeout;
  Node 22 CI on PR/push to `dev` with typecheck, unit, and e2e.
- **Excluded:** game source, gameplay, balance, rendering, assets, Cypress
  Cloud, `cy.prompt()`, component testing, and spec sharding.
- **Known consequence:** `npm run e2e` remains the single entry point; CI calls
  it with `CYPRESS_BROWSER=chrome`.

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
| 2026-11-04 | 0.2.0/002 | QA pass → Pushed, PR pending | Orchestrator pushed the branch after SSH access recovered; `origin/feature/0.2.0-001-combat-depth` is at the state commit; PR creation still needs the operator's GitHub UI access and merge awaits review | `689529c` |
| 2026-11-05 | 0.3.0/001 | Docs discovery → Design decisions | Operator approved the full e2e pipeline plan after reviewing the Cypress AI Skills documentation; task package and design decisions created; no visual or interaction decisions required | `1a5b75f` |
| 2026-11-06 | 0.3.0/001 | Implementation → QA verification | Pinned skills, project skill, typed support layer, stabilised specs, Chrome CI workflow; 123 unit + 15 e2e tests; three consecutive Chrome passes; no `__gameDebug` in the production bundle | `e6b5091` |
| 2026-11-06 | 0.3.0/001 | QA verification → QA pass | All 12 criteria met; three consecutive 15/15 Chrome runs; no product-source diff; verdict Passed; hosted CI recorded as pending on GitHub per the new CI policy | `5929130` |
| 2026-11-06 | 0.4.0/001 | Docs discovery → Design decisions | Operator approved the seeded dungeon-slice direction; four-room generator, stairs/descent, no purified freeze; task package and design decisions written | pending |
| 2026-11-06 | 0.4.0/001 | Design decisions → Implementation | Design contract approved with existing tiles only, stairs states, depth HUD, camera and floor-entry feedback; implementation next | pending |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
