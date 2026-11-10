# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | `0.7.0` reward loop: skill points, safe-room shop, branching floor, and a player-summoned Warden |
| Current SemVer ID | `0.7.0` |
| Current task ID | `001` |
| Active phase | `QA verification` — implementation delivered; independent verification next |
| Active agent | `qa` |
| Git branch | `feature/0.7.0-001-reward-loop` |
| Last accepted commit | `60318be` (merged `0.6.0` on `dev` via PR #9) |
| Pushed HEAD | `dev` at `60318be`; feature branch local at `17510eb` |
| Pull request | Not created; PR target is `dev` |
| Blocking questions remaining | `0` |
| Overall status | `0.7.0 implementation complete` — skill points, fixed six-room branch, safe-room shop, draught, Vigor, arena gate, explicit Warden summon, HUD/feedback, unit and e2e coverage delivered at `17510eb`; typecheck, 189 unit tests, build, and 32 Chrome e2e tests pass; QA verification next |

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
- Task package: `docs/tasks/0.7.0/001-design.md`,
  `001-programmer.md`, `001-qa.md` (ready)
- Design decisions: [design/0.7.0/design-decisions.md](design/0.7.0/design-decisions.md) (complete)
- Implementation decision log:
  [programmer/0.7.0/CoT.md](programmer/0.7.0/CoT.md) (complete)
- QA report: `qa/0.7.0/001-report.md` (pending)
- Docs handoff: the three task files define the fixed six-room branch,
  safe-room shop, skill-point economy, explicit Warden summon, HUD, feedback,
  accessibility, and the independent QA plan; the product overview was
  updated for the current slice and future direction.
- Deployment: Vercel — `dev` is staging, `main` is production; the operator
  connects the repository in Vercel.
- Prior release: `0.6.0` is merged into `dev` via PR #9 (`60318be`);
  `0.5.0` is merged into `dev` via PR #5 (`3c2f62d`).

### Version 0.7.0 scope (operator-approved 2026-11-09)

- **Deliverable:** close the MVP reward loop with a skill-point economy, a
  branching floor that contains one safe-room shop, and a player-controlled
  Warden summon. No meta-progression or persistence.
- **Included:** skill points as the only run currency, earned by putting mobs
  to rest; a fixed branch layout (start → first mob → left: second mob →
  shop dead end / right: third mob → locked boss arena); a safe-room shop;
  healing draught (2 HP for 1 point, one carried slot); Vigor (+1 max HP for
  the run for 3 points, one-time purchase per run); explicit Warden summon
  after all mobs are at rest; spirit remains the readiness meter; HUD skill
  points and carried-draught state; unit and Cypress coverage; version bump
  to `0.7.0`.
- **Operator decisions:** skill points are the only currency; no separate
  combo resource; the shop is a dead end off the left branch; the player may
  shop before summoning; the shop closes once the Warden is summoned; the
  healing draught occupies one carried slot; rewards are shop-only.
- **Defaults recorded as assumptions:** 1 skill point per rested mob and 3
  for the Warden; `Q` uses the draught; skill points, Vigor, and the carried
  draught persist across floors and reset on death/restart; the Warden is
  summoned through an explicit interaction in the unlocked boss arena.
- **Excluded:** separate gold currency, skill tree, artifacts, random drops,
  chests, inventory grid, shop refresh, post-death purchases,
  meta-progression, difficulty scaling, persistence, new enemies, and new art
  unless design proves it necessary.
- **Known consequence:** the floor generator changes from a linear four-room
  chain to a fixed six-room branch, and the automatic full-spirit Warden
  summon is replaced by an explicit player action.

### Version 0.6.0 scope (operator-approved 2026-11-08) — delivered, merged via PR #9

- **Deliverable:** a game-styled boot loading screen that reports real
  progress while all boot images, audio, and the display font are prepared,
  then fades into the existing title screen. No gameplay changes.
- **Included:** loading overlay with title, tagline, status, progress bar,
  percentage, ember/spirit motion, reduced-motion handling, and accessible
  progressbar semantics; complete image/audio/font preload; audio manifest
  covering every used cue; suspended-context preload and gesture unlock;
  non-blocking audio failure; fatal image error state; self-hosted Grenze
  Gotisch with OFL license and attribution; display typography on loading,
  title, pause/death headings, floor banner, and boss name; boot debug hook
  behind DEV/`VITE_E2E`; unit and Cypress coverage; version bump to
  `0.6.0`.
- **Operator decisions:** the loading screen appears before the title; audio
  is downloaded together with the images before play; **Grenze Gotisch** is
  the display typeface. Defaults recorded as assumptions: 700 ms minimum
  display, 300 ms fade, static status copy `Preparing the descent…`, and
  small HUD/control text stays in `system-ui`.
- **Excluded:** skip control, rotating tips/lore, staged loading copy,
  settings/volume UI, download-size optimisation, service-worker caching, a
  loader on restart/descent, localisation, mobile/touch layout, new audio,
  new art, gameplay, balance, and progression changes.
- **Known consequence:** boot now waits for every used audio file and the
  font, so the first title reveal is gated on those downloads; failures are
  fail-soft for audio/font and fail-loud for images.

### Version 0.5.0 scope (operator-approved 2026-11-07)

- **Deliverable:** a portfolio release that makes the vertical slice feel
  finished without adding the reward loop.
- **Included:** one Floor Warden per floor summoned by a full spirit meter;
  telegraphed melee and fused bomb attacks; stairs open on boss defeat; boss
  bar and HUD states; title/start screen; Escape pause; death summary; heal
  2 HP on descent (capped); Web Audio ambient/CC0 SFX/synthesized boss layers
  with `M` mute; README; `vercel.json`; version `0.5.0`.
- **Assets supplied by the operator:** `big_demon` and `bomb` frames from the
  same CC0 DungeonTileset II pack; CC0 audio under `public/assets/audio/`
  (congusbongus, themightyglider, colorsCrimsonTears, EZduzziteh,
  trazzz123, Kenney).
- **Defaults recorded as assumptions:** the boss does not carry spirit
  fragments; bombs target the player's position at throw time; `R` restarts
  directly into a new run; `Escape` pauses; the boss values live in
  `src/game/data/config.ts`.
- **Excluded:** safe rooms, shops, currency, consumables, loot, artifacts,
  multiple bosses, difficulty scaling, floor themes, persistence,
  meta-progression, a final floor, settings menus, remapping.

### Version 0.4.0 scope (operator-approved 2026-11-06) — delivered

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
| 2026-11-06 | 0.4.0/001 | Docs discovery → Design decisions | Operator approved the seeded dungeon-slice direction; four-room generator, stairs/descent, no purified freeze; task package and design decisions written | `df20519` |
| 2026-11-06 | 0.4.0/001 | Design decisions → Implementation | Design contract approved with existing tiles only, stairs states, depth HUD, camera and floor-entry feedback; implementation next | `5d83e4e` |
| 2026-11-07 | 0.4.0/001 | Implementation → QA verification | Seeded four-room floor, tile collision, stairs/descent, depth HUD, purified-freeze removal; 132 unit + 16 Chrome e2e tests pass; bundle has no `__gameDebug` | `11a37f8` |
| 2026-11-07 | 0.4.0/001 | QA verification → QA pass | All 13 criteria met; typecheck/unit/build/e2e pass; QA added an explicit exit-lock assertion to the respawn test; verdict Passed; hosted CI pending on GitHub | `e4499d7` |
| 2026-11-07 | 0.4.0/001 | QA pass → Pushed, PR pending | Branch pushed; PR creation blocked because `gh`/`hub` and a GitHub token are unavailable; first hosted CI run will be checked on GitHub after the operator opens the PR | `20b99fb`, plus this state commit |
| 2026-11-07 | 0.4.0/001 | PR pending → Merged | PR #4 merged into `dev`; `dev` is at `90c1066` | `90c1066` |
| 2026-11-07 | 0.5.0/001 | Discovery → Docs/design approved | Operator approved the portfolio-release scope: Floor Warden + bombs, hybrid audio, Vercel (`dev` staging / `main` production), heal 2 HP on descent; assets supplied | `3d1f97a` (assets) |
| 2026-11-07 | 0.5.0/001 | Docs/design approved → Implementation | Task package and design decisions written; implementation started | `3d1f97a` |
| 2026-11-07 | 0.5.0/001 | Implementation → QA verification | Floor Warden, bombs, audio, title/pause/death, heal-on-descent, README/Vercel delivered; 150 unit + 20 Chrome e2e; production bundle has no debug hooks | `b5de2b1`, `e522ac0`, `5a5b86b`, `a6636be`, `fa38422`, `d52f507` |
| 2026-11-07 | 0.5.0/001 | QA verification → QA pass | Clean `npm ci`; typecheck/unit/build/e2e pass; bomb e2e flake found and fixed in `d52f507`; title/pause/boss/bomb/death visuals inspected; verdict Passed; hosted CI and Vercel pending | `d6491e1` |
| 2026-11-07 | 0.5.0/001 | QA pass → Pushed, PR pending | Branch pushed; `origin/feature/0.5.0-001-portfolio-release` matched `5d96c0e`; PR creation blocked because `gh`/`hub` are unavailable, so the operator opens the PR against `dev`; hosted CI and Vercel remain pending | `5d96c0e`, plus this state commit |
| 2026-11-07 | 0.5.0/001 | PR pending → Merged | PR #5 merged into `dev`; `dev` and `origin/dev` are at `3c2f62d` | `3c2f62d` |
| 2026-11-08 | 0.6.0/001 | Discovery → Docs/design approved | Operator requested a game-styled boot loading screen, full audio preload with the images, and a matching font; approved Grenze Gotisch; task package, design contract, product overview, and state written | `4dbf903` |
| 2026-11-08 | 0.6.0/001 | Docs/design approved → Implementation | Static boot overlay, monotonic image/audio/font progress, offline audio decode of all 41 cues, delayed input attach, self-hosted Grenze Gotisch, boot error state, and Cypress coverage delivered; 157 unit + 25 Chrome e2e tests, typecheck/build pass; QA pending | `a627259`, `0094c17` |
| 2026-11-09 | 0.6.0/001 | QA verification → QA pass | Clean `npm ci`; typecheck/unit/build pass; 27/27 Chrome e2e in two consecutive runs; audio-404 and missing-`AudioContext` degradation tests promoted into the permanent spec; restart boot assertion added; bundle has no debug hooks or external runtime font requests; boot/title/pause/boss/death visuals inspected; verdict Passed with 0 blocking findings | `e57c7eb` |
| 2026-11-09 | 0.6.0/001 | QA pass → Pushed, PR pending | Branch pushed; `origin/feature/0.6.0-001-loading-screen` matches `e57c7eb`; PR creation blocked because `gh`/`hub` are unavailable, so the operator opens the PR against `dev`; hosted CI and Vercel remain pending | `e57c7eb`, plus this state commit |
| 2026-11-09 | 0.6.0/001 | PR pending → Merged | PR #9 merged into `dev`; `dev` and `origin/dev` are at `60318be` | `60318be` |
| 2026-11-09 | 0.7.0/001 | Complete → Docs discovery | Operator approved the reward-loop scope after six discovery decisions; branch created; task package next | this state commit |
| 2026-11-09 | 0.7.0/001 | Docs discovery → Design decisions | Reward-loop task package written; product overview updated for the fixed six-room branch, safe-room shop, explicit Warden summon, skill-point economy, MVP status, open questions, and priority 6; design owns layout, shop, summon, HUD, feedback, and accessibility decisions | this docs commit |
| 2026-11-10 | 0.7.0/001 | Design decisions → Implementation | Design contract covers the fixed six-room branch and junction hub, canvas shop modal with every purchase state, explicit altar summon, HUD skill-point/draught/heart-row treatment, feedback, controls, accessibility, and no new art/audio; programmer next | this design commit |
| 2026-11-10 | 0.7.0/001 | Implementation → QA verification | Skill points, fixed six-room branch, safe-room shop, draught, one-time Vigor, arena gate, explicit Warden summon, HUD/feedback, and the safe-room rule delivered; 189 unit + 32 Chrome e2e tests pass, typecheck/build pass, production bundle has no debug hooks; QA verification next | `17510eb` |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
