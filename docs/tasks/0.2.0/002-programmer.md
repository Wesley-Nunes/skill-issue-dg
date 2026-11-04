# 002 — Programmer: spirit purification loop

## Metadata

| Field | Value |
|---|---|
| Version | `0.2.0` |
| Task ID | `002` |
| Owning agent | `programmer` |
| Status | Ready for implementation |
| Depends on | `docs/tasks/0.2.0/002-design.md`, `design/0.2.0/design-decisions.md` |
| Produces | Source, unit tests, Cypress coverage, `programmer/0.2.0/CoT.md` |
| Supersedes | `001-programmer.md` skill-point/challenge scope |

## Context

`0.1.0` delivered movement, dodge, a single melee enemy, HP, and restart. The first `0.2.0` pass added two melee enemies, a ranged imp, projectiles, a hard-timed three-hit combo, and an earn-only skill point. The operator declined that reward loop and re-based `0.2.0` on a dark-fantasy liberation loop: mobs are put to rest by breaking their spirit fragments, conventional kills respawn, and rested mobs fill a spirit meter.

The branch already contains the reusable combat plumbing: multi-enemy state, projectiles, the hard-timed combo, in-world pips, effects, camera, restart, and test infrastructure. Keep it.

## Objective

Replace the skill-point challenge and room-clear reward with spirit fragments, failed-rite respawn, permanent rest, a spirit meter, and a floor-purified end state, reusing the existing combat systems.

## In scope

- Enemy fragment state, spawn/home position, rested flag, and respawn timer.
- Pure purification rules: fragment positions, fragment break, restore, revive, respawn countdown, spirit gain.
- Light-attack fragment breaking inside the existing combo arc.
- Any-HP-loss restoration on every living enemy.
- Conventional-death respawn at spawn after 2 s with full HP and all fragments.
- Permanent rest when all fragments are broken at the killing blow; spirit gain.
- Spirit meter, floor-purified state, and restart from the purified overlay.
- Removal of skill points, challenge, earn notice, room-clear flag/event, and their HUD/presentation.
- Fragments, ready aura, spirit HUD, purified overlay, and fragment/rest/respawn effects.
- Unit tests for the new pure rules and engine wiring.
- Cypress coverage for fragments, the spirit HUD, and restart.

## Out of scope

- Boss fight, floor transitions, floor scaling, procedural floors.
- Drops, currency, inventory, shops, consumables, skill spending.
- Ordered fragments, moving fragments, sequence rules, per-mob fragment-count variation.
- New art, dependencies, audio, menus, persistence, or additional enemy types.

## Approved behavior

1. Each mob carries two fragments at the design's orbit positions.
2. The existing light attack breaks any intact fragment inside its arc; a swing can break both.
3. A swing that breaks a fragment counts as a connected combo step.
4. Any HP loss restores all broken fragments on every living enemy. Invulnerability that blocks HP loss does not restore them.
5. Restoration does not change the mob's current HP.
6. A mob killed with at least one intact fragment fades, then respawns at its spawn after 2 s with full HP and both fragments.
7. A mob killed with all fragments broken rests permanently, grants 34 spirit, and never respawns.
8. Fragments resolve before the killing damage, so one swing can complete the rite and kill.
9. Spirit is clamped at 100; reaching 100 sets `floorPurified` and freezes the run in the `purified` state.
10. `R` resets every run value, including spirit, fragments, respawn timers, and the purified state.
11. The hard-timed combo, chain pips, enemies, projectiles, dodge, camera, and death behavior remain.

## Constraints

- Keep rules pure in `src/game/systems`; rendering must not decide hits, breaks, rest, or spirit.
- Reuse the existing room, enemy AI, projectiles, combo, camera, and restart.
- No new dependency or asset.
- Use the approved values in `design/0.2.0/design-decisions.md` §3, §5, §9.
- Keep the existing TypeScript, naming, and test conventions.

## Acceptance criteria

1. Every mob starts with intact fragments and a recorded spawn/home position.
2. A light-attack step breaks each intact fragment inside its reach and half-angle; fragments outside the arc stay intact.
3. A fragment break on a step marks that step connected for the combo.
4. Any applied HP loss restores all broken fragments on every living enemy and emits a restore event; blocked damage restores nothing.
5. Restoration leaves HP, position, and AI timers unchanged.
6. A conventional death sets a 2 s respawn, and the mob returns at its spawn with full HP and intact fragments.
7. A death with all fragments broken sets `rested`, grants spirit once, and never respawns.
8. Fragments resolve before damage, so a killing swing can also complete the rite.
9. Spirit reaches 100 exactly, sets the purified state, freezes simulation, and emits the purified event.
10. The purified and death states both accept `R`, and restart clears spirit, fragments, respawn, and rest flags.
11. The HUD shows `Spirit: N%` and the 120 × 6 bar instead of the skill counter.
12. Fragments, the ready aura, the purified overlay, and the break/restore/rest/respawn effects render as designed.
13. Skill points, challenge, notice, and room-clear code and tests are removed.
14. `typecheck`, unit tests, `build`, and Cypress pass; the production bundle has no debug hook.
15. All retained `0.1.0` and combo behavior still passes.

## Dependencies and handoff

Inputs: approved design decisions, existing combat branch.
Outputs: source, unit tests, Cypress tests, implementation log. Hand off to QA with the tested commit and commands run.

## Open assumptions / unresolved items

None. The operator decisions and design values cover fragment breaking, restoration, respawn, rest, spirit, and the end state.
