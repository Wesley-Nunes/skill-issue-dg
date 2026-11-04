# 002 — Design: spirit purification

## Metadata

| Field | Value |
|---|---|
| Version | `0.2.0` |
| Task ID | `002` |
| Owning agent | `design` |
| Status | `Passed` |
| Depends on | Operator re-baseline decisions (2026-11-04), `docs/about-the-project.md` §3.2–§3.5 |
| Produces | Revised `design/0.2.0/design-decisions.md` |
| Supersedes | `001-design.md` skill-point/challenge scope |

## Context

The operator declined the first `0.2.0` PR because the combo reward was a skill point without a story, and mashing could complete the chain. The re-baseline keeps the combat plumbing but changes the core loop to a dark-fantasy liberation mission: enemies are put to rest by breaking their spirit fragments, and conventional kills only cause them to respawn.

The version remains one hand-authored room with two melee enemies and one ranged imp. It removes skill points, the combo challenge, drops, and room-clear rewards. A spirit meter and a floor-purified end state replace them.

## Objective

Define the visual and interaction treatment of spirit fragments, purification, failed rites, the spirit meter, and the purified floor state, with concrete values the programmer can implement and QA can verify.

## In scope

- Fragment count, orbit positions, size, colour, idle motion, break feedback, and restore feedback.
- What counts as a fragment hit and what counts as a failed rite.
- Conventional-death respawn timing and state.
- The “ready to rest” state after all fragments are broken.
- Spirit meter placement, wording, colour, fill behaviour, and threshold.
- The floor-purified overlay and restart behaviour.
- Removal of skill-point, challenge, notice, and room-clear presentation.

## Out of scope

- Boss fight, floors, floor scaling, drops, inventory, currency, skill spending, shops, audio, menus, persistence.
- Fragment sequences, ordered breaks, moving fragments, and per-mob fragment counts beyond the approved starting value.
- New art or dependencies.

## Approved behavior

Operator-approved on 2026-11-04:

1. Enemies carry spirit fragments. Breaking all of them without taking HP damage makes the enemy permanently restable.
2. The existing light attack breaks one fragment per hit; a swing can break multiple fragments in its arc.
3. Any HP loss restores every broken fragment on every living enemy. Dodges and i-frames that prevent HP loss are safe.
4. A conventional kill before all fragments are broken respawns the enemy after ~2 s at its spawn with full HP and all fragments restored.
5. A permanently rested enemy grants spirit and never respawns.
6. The spirit meter fills to a threshold; when full, the run freezes on a floor-purified overlay and `R` restarts.
7. Skill points, the combo challenge, the earn notice, drops, and the boss fight are removed from this version.
8. The hard-timed combo and in-world combo pips remain as the damage/attack feedback.

## Constraints

- Reuse the existing room, enemy AI, projectiles, combo, camera, death, and restart.
- Keep rules pure in `src/game/systems`; rendering only reads state and events.
- No new dependency or asset.
- Concrete values only; no vague “feel” requirements.

## Acceptance criteria

1. The design gives exact fragment count, angles, orbit radius, size, colour, and motion.
2. Break, restore, ready-to-rest, permanent-rest, and respawn states each have a visible cue.
3. The spirit meter has exact placement, text, colour, and fill rules.
4. The floor-purified overlay has exact text and restart behaviour.
5. The design removes all skill-point/challenge/drop/boss presentation from this version.
6. Every value is implementable in one config module and assertable in tests.

## Dependencies and handoff

Inputs: operator decisions, `docs/about-the-project.md`, existing combat implementation.
Outputs: revised design decisions, then `002-programmer.md`.
