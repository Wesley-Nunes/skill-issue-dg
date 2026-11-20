# 0.9.1 / 001 — Design task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.9.1` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Approved` (orchestrator-authored; operator decision recorded 2026-11-15) |
| Depends on | `docs/tasks/0.9.1/001-programmer.md` context; `docs/about-the-project.md` §3.3 and §5.1 |
| Produces | `design/0.9.1/design-decisions.md` |
| Hands off to | `docs/tasks/0.9.1/001-programmer.md` |

## 2. Context

Manual play after the `0.9.0` MVP confirmation found four defects:

1. A melee hit from a mob does not restore broken spirit fragments. Projectile
   and bomb hits do. The engine applies melee damage inside the enemy-update
   `map`, then publishes the pre-reset enemy array over the restoration.
2. Taking a hit restores fragments but not enemy HP. A mob can be reduced to low
   HP, allowed to hit the player, then rested with a single swing because the
   swing breaks the restored fragments and delivers the killing damage at once.
3. Lured mobs occupy the exact same point because enemies never consider each
   other. Three mobs then behave like one body and one attacker.
4. The shared 0.6 s post-hit invulnerability window swallows the second and
   third hits when several mobs attack together. The operator approved removing
   the post-hit window; dodge i-frames remain.

The product summary already says fragments must be broken **without taking a
hit**. The detailed `0.2.0` rule and the `SC2` test wording only mentioned
fragment restoration, which is why the HP-reset gap was not caught.

## 3. Objective

Define the smallest rule and feedback change that makes the rite reset
unambiguous, makes every distinct enemy attack count, and prevents mobs from
stacking, without adding content or AI systems.

## 4. In scope

- The exact rite-reset trigger and what it resets, including the Warden
  exception.
- The damage rule for multiple enemies and its interaction with dodge i-frames.
- The enemy separation rule, including the Warden and dead/dying enemies.
- Feedback: reuse the existing hurt flash and restoration spark; no new HUD,
  audio, or control.
- Edge cases QA must verify: simultaneous hits, same-tick hits, dodge,
  projectile/bomb hits, death, boss presence, walls/shop blockers, stacked
  spawns, and three mobs at one point.

## 5. Out of scope

- New UI, HUD elements, audio, art, fonts, controls, or settings.
- Enemy pathfinding, group tactics, flanking, or archetype changes.
- Changing fragment count, spirit values, economy, enemy HP, damage, cooldowns,
  depth scaling, room layout, or boss behavior beyond the Warden HP exception.
- New debug hooks unless the existing snapshot cannot verify the rule.
- Unrelated refactors or formatting.

## 6. Approved behavior (operator, 2026-11-15)

- Any HP loss resets the rite on every living mob: all broken fragments return
  and HP returns to full.
- The Warden has no fragments and its HP is never reset.
- A dodge or i-frame that prevents the HP loss does not reset anything.
- Every distinct enemy attack that connects damages the player. The shared
  post-hit invulnerability window is removed; dodge i-frames remain.
- One enemy's attack can hit at most once, regardless of the number of frames
  its active window spans.
- Living enemies keep a minimum body distance from each other. The Warden is
  immovable by this rule. Dead and dying enemies do not block.
- No new player-facing copy, HUD element, hotkey, or audio cue.

## 7. Constraints

- KISS: reuse the existing `attackHit` per-attack guard instead of adding a new
  per-attacker cooldown system.
- SoC: the reset predicate belongs in the pure purification module; the engine
  owns ordering and state publication; separation is a pure enemy-system helper.
- Determinism: separation must resolve exact overlaps deterministically.
- Backwards compatibility: the existing rest, respawn, spirit, shop, and boss
  flows must not change.
- The existing debug snapshot already exposes enemy HP, fragments, and positions;
  no new hook is planned.

## 8. Acceptance criteria

1. `design/0.9.1/design-decisions.md` states the reset trigger, reset contents,
   Warden exception, dodge exception, damage attribution, and separation rule
   with testable values.
2. The document maps each rule to the existing modules and names the required
   unit/engine evidence.
3. The document records the balance consequence of removing the post-hit
   i-frame (three depth-5+ melee hits can equal the full HP bar) and why it is
   accepted.
4. No new visual or audio asset is required.

## 9. Dependencies and handoff

The programmer task depends on this document. QA must not accept the change
without the exact reset/separation behavior and the regression scenarios in
`001-qa.md`.

## 10. Open assumptions / unresolved items

None. The operator answered the only material design question on 2026-11-15:
every distinct enemy hit counts.
