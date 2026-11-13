# Project State and State-Agent Contract

This file is the canonical workflow state for the repository. It is maintained by the main agent / orchestrator and may be updated by a delegated state-management role when explicitly authorized. It is not the runtime game state in `src/state/`.

## Current snapshot

| Field | Value |
|---|---|
| Project | skill issue dg |
| Goal | `0.8.0` delivered — single light attack, depth-scaled difficulty, melee-only teaching floor; next version `TBD` |
| Current SemVer ID | `0.8.0` (delivered, merged) |
| Next target version | `TBD` — no version approved after `0.8.0` |
| Current task ID | `—` |
| Active phase | `Done — 0.8.0 merged; no next version approved` |
| Active agent | `orchestrator` |
| Git branch | `dev` |
| Last accepted commit | `d04c66b` (PR #13 merge of `feature/0.8.0-001-combat-feel`) |
| Pushed HEAD | `origin/dev` at `d04c66b`; the feature branch was deleted after merge |
| Pull request | #13 merged into `dev` (operator-confirmed; verified in Git) |
| Known issue | Safe rooms can be entered while enemies are hunting, allowing an invulnerable attack exploit — recorded in `docs/about-the-project.md` §4.2; fix deferred, no version assigned |
| Blocking questions remaining | `0` — no active version or open blocking question |
| Overall status | `0.8.0 delivered and merged via PR #13` — local checks were green before merge; hosted CI result was not verified locally. A post-merge safe-room combat exploit was recorded for a future fix. |

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
- Task package: `docs/tasks/0.8.0/001-design.md`,
  `001-programmer.md`, `001-qa.md` (written and accepted by the orchestrator;
  the docs stage was executed by the orchestrator because no docs subagent is
  available)
- Design decisions: [design/0.8.0/design-decisions.md](design/0.8.0/design-decisions.md)
  (complete; attack contract, chain-feedback removal, depth curve, depth-1
  teaching targets, verification hooks)
- Implementation decision log: [programmer/0.8.0/CoT.md](programmer/0.8.0/CoT.md)
  (complete; attack rule, depth module, composition, verification, assumptions)
- QA report: [qa/0.8.0/001-report.md](qa/0.8.0/001-report.md) (complete;
  verdict `Passed`, two closed low findings, one evidence limitation and four
  non-blocking observations; orchestrator-verified independence caveat)
- Docs handoff: the three task files define chain removal, the single light
  attack, chain-feedback removal, the depth-scaling table, the melee-only
  depth-1 teaching floor, the flat economy, boss uninterruptibility, and the
  independent QA plan. `docs/about-the-project.md` §1, §3.2, §4.1, §5, §6, §9,
  §10, §11 and §12 now describe the post-chain slice and record the deferred
  challenge direction; `GOAL.md` progress was refreshed.
- Deployment: Vercel — `dev` is staging, `main` is production; the operator
  connects the repository in Vercel.
- Prior release: `0.7.0` is merged into `dev` via PR #11 (`da17b57`);
  implementation `17510eb`, QA `Passed after fixes` (`020c178`).
- Also merged into `dev`: `0.6.0` via PR #9 (`60318be`), `0.5.0` via PR #5
  (`3c2f62d`).

### Version 0.8.0 scope (delivered, merged via PR #13)

- **Deliverable:** replace the three-hit light chain with a single, clearly
  defined light attack, and add a depth-scaled difficulty curve whose first
  step makes floor 1 the teaching floor. No new systems, assets, or currencies.
- **Why:** two design passes over the chain's timing windows did not make it
  feel good, and it is the only verb that breaks spirit fragments. The
  recorded known issue (2026-11-11) is resolved by removal rather than another
  tuning pass. The fixed six-room branch currently plays identically at every
  depth, so the endless descent has no stakes.
- **Operator decisions (2026-11-13):**
  - remove the three-hit light chain entirely;
  - difficulty scales enemy and boss **numbers only**, plus one composition
    rule: depth 1 spawns melee enemies only;
  - the enemy archetype roster, enemy count, and the fixed six-room branch do
    not change;
  - the combo-challenge system discussed on 2026-11-13 (per-floor challenge
    card, challenge progression, combo rewards) is **deferred to a future
    version**, not deleted from the product direction.
- **Included:** removal of chain state, systems, rendering, feedback, and
  tests; a single-attack definition owning windup/active/recovery/reach/arc/
  damage; a pure depth-scaling function applied to mobs and the Warden;
  depth-1 teaching values; a balance baseline for the first few depths; unit
  and Cypress coverage for the revised rules.
- **Resolved discovery items (2026-11-13):**
  - the single attack keeps **knockback only**: no stagger, no enemy interruption,
    and the Warden is never interruptible;
  - the economy stays flat (1 point per rested mob, 3 for the Warden, draught 1,
    Vigor 3); shop relevance at depth is recorded as a future balance question;
  - the curve is tested to a cap of depth 10; depth 11 and beyond reuse the
    depth-10 row.
- **Excluded:** the challenge system, buff/status effects, new enemy
  archetypes, artifacts or drops, randomized safe rooms, a general floor
  generator, post-death purchases, meta-progression, persistence, tutorial
  prompts or overlays, new art, and new audio.
- **Known consequence:** a net deletion across `src/`, and
  `cypress/support/commands.ts` retry heuristics keyed on `comboStep`/
  `comboResolved` must be reworked rather than deleted; the product overview
  §3.2 and §10 must record the chain's removal and the deferred challenge.
- **Delivered:** implementation `ae1b1fe`, QA report `3a76446`, merged via
  PR #13 as `d04c66b`. See `programmer/0.8.0/CoT.md` and
  `qa/0.8.0/001-report.md`. A post-merge safe-room combat exploit is recorded
  in `docs/about-the-project.md` §4.2 and is not part of this version's scope.

### Version 0.7.0 scope (operator-approved 2026-11-09) — delivered, merged via PR #11

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
| 2026-11-11 | 0.7.0/001 | QA verification → QA pass | Clean `npm ci`; typecheck, 190 unit tests, build, and 32/32 Chrome e2e (5 specs, 3 m 05 s) pass; 30 exact-size canvas captures plus a title capture inspected; F1 (old-floor effects reappearing after descent) reproduced and fixed in `6e377d3` with a regression test; verdict `Passed after fix`; QA was run by the orchestrator because the QA subagent was unavailable; hosted CI and Vercel pending | `3a91f26` (fix `6e377d3`) |
| 2026-11-11 | 0.7.0/001 | QA pass → Ready for push and PR | Orchestrator reviewed the 37-file diff (approved scope, no asset/dependency/meta-progression changes), re-ran typecheck/unit/build/e2e, and accepted the version; branch is local at `496e007` plus this state commit; `gh`/`hub` are unavailable, so the operator pushes and opens the PR against `dev`; hosted CI and Vercel remain pending | this state commit |
| 2026-11-11 | 0.7.0/001 | Post-QA operator fixes → Ready for push and PR | Operator playtest found the junction `SHOP`/`WARDEN` labels overlapping and the chevrons pointing the wrong way; the waystone was removed entirely (`99787aa`) and the combo rework was recorded as a known issue in the product overview (`b74da29`); QA amended and re-verified with fresh 1024 × 640 and 1440 × 810 captures (`020c178`); typecheck, 190 unit tests, build, and 32/32 Chrome e2e pass; verdict `Passed after fixes`; branch ahead of `origin` at `f8b0a51`; hosted CI and Vercel remain pending | `99787aa`, `b74da29`, `020c178`, plus this state commit |
| 2026-11-13 | 0.7.0/001 | Ready for PR → Merged | PR #11 merged `feature/0.7.0-001-reward-loop` into `dev`; `dev` and `origin/dev` are at `da17b57` | `da17b57` |
| 2026-11-13 | 0.8.0/001 | Complete → Docs discovery | Operator approved the `0.8.0` combat-feel direction (combo rework and its liberation role, plus a first balance baseline) after reviewing next-feature options; branch `feature/0.8.0-001-combat-feel` created from `dev`; detailed scope, blocking questions, and the task package belong to the docs stage | `ef205ab` |
| 2026-11-13 | 0.8.0/001 | Scope re-baseline | Operator revised the direction: remove the three-hit light chain instead of retuning it, scale enemy/boss numbers by depth with a melee-only depth 1, keep the fixed branch and archetype roster, and defer the combo-challenge system to a future version; two blocking questions remain | `e0271a4` |
| 2026-11-13 | 0.8.0/001 | Docs discovery → Design decisions | Operator answered the remaining questions: the single attack keeps knockback only (no stagger, boss uninterruptible) and the economy stays flat. Task package written by the orchestrator (no docs subagent available); product overview and `GOAL.md` updated; handoff accepted | `2a763d2` |
| 2026-11-13 | 0.8.0/001 | Design decisions → Implementation | Operator approved the committed-swing contract, the integer rounding rule, and the depth 1–10 curve (HP +8% of base per depth, cadence −3% per depth, damage thresholds at depths 5–7, cap at 10); design contract written by the orchestrator and accepted; deferred heavy-attack and challenge directions recorded | `6bf19de` |
| 2026-11-13 | 0.8.0/001 | Implementation → QA verification | Three-hit chain removed (systems, state, config, events, rendering, effects, audio cue, `BOSS.staggerScale`, tests); one committed 0.41 s swing with 36 px/120° reach, 2 damage, 6 px knockback, 0.05 s hitstop; pure depth curve applied on creation and descent; depth 1 melee-only; Cypress helpers rekeyed to `attacking`; `depth.test.ts` added; 187 unit tests; typecheck/build pass; three Chrome e2e passes at 32/32 | `ae1b1fe` |
| 2026-11-13 | 0.8.0/001 | QA verification → QA pass | Clean `npm ci`; typecheck, 187 unit tests in 17 files, build, and 32/32 Chrome e2e in three consecutive runs (2 m 53 s–2 m 55 s); curve independently recomputed at depths 1, 2, 5, 6, 10 and matched, cap verified; five canvas captures inspected; two low findings closed during implementation; one evidence-size limitation and four non-blocking observations recorded; verdict `Passed`; orchestrator-performed QA caveat recorded | this QA commit |
| 2026-11-13 | 0.8.0/001 | QA pass → Ready for push and PR | Orchestrator reviewed the 31-file implementation diff (approved scope, no asset or dependency changes, no challenge/tutorial leftovers, production bundle free of debug hooks), accepted the version, and prepared the PR draft against `dev`; `gh`/`hub` are unavailable, so the operator pushes the branch and opens the PR; hosted CI and Vercel remain pending | this QA commit |
| 2026-11-13 | 0.8.0/001 | Ready for PR → Merged | Operator pushed and merged PR #13 (`feature/0.8.0-001-combat-feel`) into `dev`; `dev` and `origin/dev` are at `d04c66b`; the feature branch is gone from the remote | `d04c66b` |
| 2026-11-13 | — | Post-merge bug report | Operator found that safe rooms can be entered while enemies are hunting: luring a mob or the Warden to the shop threshold leaves the player untouchable inside while still able to attack out. Recorded in `docs/about-the-project.md` §4.2 with an `in_combat` entry gate as the suggested fix; alternatives are acceptable; deferred, not fixed in this commit | this state commit |

## Status vocabulary

- **Not started:** no work has begun for the stage.
- **In progress:** an agent is actively working on the stage.
- **Blocked:** a required input, tool, approval, or repository capability is unavailable.
- **Changes requested:** review found issues and the task has been returned to its owner.
- **Passed:** the stage met its acceptance gate.
- **Done:** the version workflow has completed all gates and integration duties.
