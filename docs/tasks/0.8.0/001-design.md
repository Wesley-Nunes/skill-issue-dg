# 0.8.0 / 001 — Design task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.8.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Ready for design` |
| Depends on | Operator-approved `0.8.0` scope in `STATE.md`; `docs/about-the-project.md` §3.2, §3.3, §4.1, §5 |
| Produces | `design/0.8.0/design-decisions.md` |
| Blocks | `docs/tasks/0.8.0/001-programmer.md` |

## 2. Context

- `0.7.0` shipped the fixed six-room branch, the safe-room shop, the
  skill-point economy, and the explicit Warden summon. All floors currently
  play identically.
- The only combat verb is a three-hit hard-timed light chain with three pips
  above the player. The operator recorded a known issue on 2026-11-11: its
  timing windows, input feedback, and fragment-breaking interaction do not feel
  good in play.
- `0.8.0` removes the chain and replaces it with one light attack, and adds a
  numeric depth difficulty curve whose first floor is the teaching floor.
- The project uses the DungeonTileset II frames plus procedurally drawn
  effects. No new art, audio, or dependencies are approved for this version.

## 3. Objective

Produce a concrete, implementable presentation and tuning contract for a single
light attack, for the removal of the chain's visual language, and for the
depth-difficulty curve — including the depth-1 teaching experience — without
expanding product scope.

## 4. In scope

1. **Single attack definition.** A complete table: windup, active, recovery,
   reach, half-angle, damage, knockback, hitstop, and any hurt-flash or
   hit-spark timing. The player must be able to land, whiff, and re-swing
   predictably.
2. **Attack feedback.** What the swing looks like at each phase (sweep arc
   shape, colour/motion), what a landed hit shows, what a whiff shows, and what
   a fragment break shows. One swing may break more than one fragment, so the
   break feedback must not imply a single target.
3. **Removal of chain feedback.** Confirm exactly what is deleted: the three
   pips above the player, the reply-window pulse, the finisher hold, and any
   chain-break effect. State whether anything replaces the pips (recommended:
   nothing) and why.
4. **Depth difficulty curve.** The numeric table the programmer applies: per
   depth, enemy HP, enemy attack damage, enemy attack cadence, Warden HP, and
   Warden bomb cadence. Include depth 1, at least the first four depths, and a
   stated cap. Movement speed does not scale.
5. **Teaching floor.** Define the observable depth-1 target: how long a mob
   takes to rest, how many hits, how much damage it deals, and how the Warden
   fight reads. "Forgiving, not inert": the player must still feel pressure
   enough to learn the no-damage rite.
6. **Difficulty communication.** Decide whether rising difficulty is signalled
   at all beyond the existing depth number. Do not add new HUD elements without
   a stated need.
7. **Accessibility and readability.** Telegraph visibility against a boss that
   can no longer be interrupted, flash intensity limits, and knockback
   magnitude that does not disorient.

## 5. Out of scope

- Any challenge-card, combo, or reward system, including the deferred
  safe-room challenge direction.
- Buffs, status effects, damage-type or resistance systems.
- Secondary attacks, new enemy archetypes, enemy count changes, new rooms.
- Tutorial prompts, overlays, hints, tooltips, or a tutorial state.
- Economy changes: skill-point income and shop prices stay flat.
- New art, new audio, new dependencies, settings UI, or key remapping.

## 6. Approved behavior to respect

- One light attack per press; no buffering, no reply window, no chain.
- A swing breaks any intact spirit fragment inside its arc; one swing may break
  several.
- A landed hit applies knockback only. Nothing staggers or interrupts the
  Warden.
- Difficulty scales enemy and boss numbers only, over a fixed composition and
  branch.
- Depth 1 spawns melee enemies only; every other depth keeps two melee and one
  ranged mob.
- Skill-point income and shop prices remain flat by explicit decision.

## 7. Constraints

- KISS: prefer the smallest set of values and effects that reads clearly.
- YAGNI: no configurable difficulty, no tunable-in-game values, no new
  abstractions beyond a single definition table.
- SoC: visual decisions must not require game rules to depend on rendering.
- The result must be implementable with the existing renderer and effects
  modules.
- Every numeric decision must be stated as a concrete value, not a range or a
  feeling.

## 8. Acceptance criteria

1. `design/0.8.0/design-decisions.md` exists and covers every item in §4.
2. The attack has a single, complete value table that the programmer can apply
   without inventing numbers.
3. The depth curve is a concrete table with a stated cap and a stated depth-1
   row, and it names every scaled statistic.
4. The document states explicitly which visuals and HUD elements are removed,
   and confirms no new HUD element is added.
5. The depth-1 experience is described in observable terms (hits to rest a mob,
   hits survived, Warden duration), and the document explains how it teaches
   the liberation rule without being inert.
6. Boss uninterruptibility is stated, with a note on how telegraphs stay
   readable without stagger as a safety valve.
7. No decision adds scope from §5; any decision that would has been returned to
   docs/orchestrator instead of being written here.
8. The orchestrator has reviewed and accepted the document.

## 9. Dependencies and handoff

- **Inputs:** this task, `docs/about-the-project.md`, the current renderer,
  effects, and config modules, and operator answers to design questions.
- **Output:** `design/0.8.0/design-decisions.md`, committed with the repository
  commit format, with the hash recorded in the handoff.
- **Next owner:** `programmer` (`001-programmer.md`), who must not need to
  invent timings, values, or feedback behavior.

## 10. Open assumptions / unresolved items

- Assumption: movement speed never scales with depth (operator-approved rule,
  recorded in the product overview).
- Assumption: design owns the final numeric tables; the product overview
  explicitly delegates timings and values to this document.
- Unresolved: none. Any discovered product-scope question must go to
  docs/orchestrator before this task is accepted.
