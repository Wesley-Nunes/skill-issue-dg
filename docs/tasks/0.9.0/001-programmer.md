# 0.9.0 / 001 — Programmer task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.9.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Blocked — waiting for design decisions` |
| Depends on | `design/0.9.0/design-decisions.md` |
| Produces | `programmer/0.9.0/CoT.md`, source and test changes, README and version hygiene |
| Hands off to | `docs/tasks/0.9.0/001-qa.md` |

## 2. Context

- The safe zone is currently absolute in two places in
  `src/game/engine/game.ts`:
  - `enemyBlockers()` returns `floor.shop.safe`, so enemies cannot cross it;
  - `applyDamageToPlayer()` returns early while the player is inside
    `floor.shop.safe`, so no damage source can hurt them there.
- The player is never blocked from entering the safe zone, so the recorded
  exploit works against mobs and the Warden.
- `Enemy.aggro` already tracks pursuit for melee, ranged, and boss enemies and
  clears when the player leaves that archetype's `aggroRadius`.
- `floor.shop.threshold` exists, is drawn as a cyan threshold band in
  `src/ui/rendering/renderer.ts`, and is exposed in the debug snapshot.
- `src/ui/rendering/effects.ts` already renders floating world text for blocked
  actions (`summon-blocked`, `shop-unavailable`, `draught-blocked`).
- `cypress/support/commands.ts` exposes test-only hooks through
  `src/ui/debug.ts` and `cypress/support/index.d.ts`.
- `README.md` still documents the removed three-hit combo and calls the shop a
  "safe dead end"; `package.json`/`package-lock.json` still say `0.7.0`.

## 3. Objective

Implement the approved safe-room combat rule so the shop can never be used as a
damage-free firing position, with readable feedback, regression coverage, and an
accurate README/version for the `0.9.0` MVP acceptance pass.

## 4. In scope

1. **Pure rule module.** Add one small pure module in `src/game/systems/` that
   derives "an enemy is hunting" from the enemy list, using the design's exact
   predicate. It must be unit-testable without a browser.
2. **Entry gate.** Apply the design's entry rule to player movement, including
   dodge movement. The ward must never block leaving the safe zone or trap a
   player who is already inside.
3. **Protection rule.** Apply the design's decision for damage inside the safe
   zone while the ward is sealed, in `applyDamageToPlayer`, covering melee,
   projectiles, and bombs.
4. **Interaction rule.** Apply the design's decision for opening/purchasing in
   the shop while the ward is sealed.
5. **Feedback.** Add the sealed/open threshold presentation and the
   player-facing refusal feedback defined by design, reusing the existing world
   label, floating text, palette, and reduced-motion handling. Add a throttled
   event so held movement does not spam the screen.
6. **Debug observability.** Expose the derived combat state in `DebugSnapshot`
   and add the minimum test-only hook the Cypress suite needs to create the
   hunted state deterministically. Keep the existing `DEV`/`VITE_E2E` gate and
   keep the production bundle free of debug hooks.
7. **Tests.** Unit coverage for the predicate, entry gate, exit, that the ward
   reopens, dodge entry, damage inside while sealed/open, and the interaction
   refusal. Cypress coverage for a lured enemy being refused entry and the ward
   reopening after it stops hunting.
8. **Release hygiene.** Fix `README.md` so its controls, loop, and shop
   description match the shipped game; bump `package.json` and
   `package-lock.json` to `0.9.0`.
9. **Decision log.** Record code-to-decision mapping, assumptions, and commit
   hashes in `programmer/0.9.0/CoT.md`.

## 5. Out of scope

- Enemies entering the safe zone, new AI, pathfinding, or a combat-memory
  timer not required by design.
- New safe rooms, shop items, currency, drops, economy, or depth changes.
- New art, audio, fonts, dependencies, HUD elements, or hotkeys.
- Tutorial overlays, prompts, settings, remapping, persistence, or
  meta-progression.
- Unrelated refactors or formatting changes.

## 6. Approved behavior

- The ward seals when a living enemy is hunting and reopens when none is.
- While sealed, the player cannot enter the safe zone; leaving is always
  allowed.
- The exploit must be closed for both mobs and the Floor Warden, including the
  case where the player reached the safe zone before combat began.
- The shop cannot be used to gain an advantage during combat.
- The rule and feedback are readable without audio and introduce no new HUD
  element.
- Skill points, draught, Vigor, spirit, gate, summon, descent, attack, depth
  scaling, and death/restart behave exactly as in `0.8.0`.

## 7. Constraints

- KISS and YAGNI: one predicate function, one entry guard, one damage condition,
  one feedback event. Do not add configuration or extension points.
- SoC: the predicate stays pure in `game/systems/`; the engine owns the rule
  application; rendering only reads state.
- Keep deterministic seeded behavior and existing TypeScript/test conventions.
- No new runtime dependency and no new asset.
- Keep `floor.shop.safe` and `floor.shop.threshold` as the only safe-room
  geometry; do not add a second collision representation.
- Preserve the modal shop's existing frozen-world behavior.

## 8. Acceptance criteria

1. The pure predicate matches the design's definition exactly and is covered for
   alive/aggro, alive/not-aggro, dying, dead, rested, and emerging states.
2. Walking into the safe zone while an enemy hunts leaves the player outside;
   the attempt emits the feedback event, and held movement does not emit it more
   often than the design's cooldown.
3. A dodge aimed through the threshold while sealed also fails to enter, and
   the player is not moved inside.
4. A player standing inside when the predicate becomes true is not trapped and
   can leave; the ward reopens on the next frame after the predicate clears.
5. Damage inside the safe zone follows the design rule for melee, projectile,
   and bomb sources.
6. The shop interaction follows the design rule while sealed; a shop already
   open is not corrupted, and the existing summon-closes-shop behavior is
   unchanged.
7. The threshold changes state visibly when sealed and returns when open; the
   refusal message matches the design copy and is readable without audio.
8. `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` pass,
   and the production bundle contains no `__gameDebug`.
9. Cypress proves a lured enemy blocks entry, the ward reopens after it stops
   hunting, and the existing reward-loop suite still passes.
10. `README.md` documents the single attack, the sealed ward, and the current
    economy accurately; `package.json` and the lockfile report `0.9.0`.
11. `programmer/0.9.0/CoT.md` records the mapping and the commit hash.

## 9. Dependencies and handoff

- **Inputs:** `design/0.9.0/design-decisions.md`, this task, the product
  overview, and the `0.8.0` implementation.
- **Output:** source and tests, `programmer/0.9.0/CoT.md`, release hygiene, and
  one or more commits in the repository commit format.
- **Next owner:** `qa` (`001-qa.md`), after orchestrator diff review.

## 10. Open assumptions / unresolved items

- The exact predicate, entry/protection/interaction rules, copy, colours,
  timing, and cooldown are design-owned; if a value is missing, stop and ask
  instead of inventing one.
- Assumption: the existing `aggro` flag is authoritative and needs no new enemy
  state.
- Assumption: the existing test-only teleport may bypass the ward because it is
  not a gameplay movement path; tests must state this and prefer real movement
  for the entry assertion.
- Unresolved: none.
