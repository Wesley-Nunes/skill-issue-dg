# 0.9.1 — Design decisions

**Version:** `0.9.1`
**Task:** `001`
**Owning agent:** design (executed by the orchestrator; no design subagent
available)
**Status:** Approved for implementation
**Sources:** `docs/tasks/0.9.1/001-design.md`, `docs/about-the-project.md`
§3.3/§5.1, `GOAL.md` SC2 as amended 2026-11-15, operator decision of
2026-11-15 recorded in `STATE.md`

------------------------------------------------------------------------

## 1. Purpose and boundaries

This is a combat-integrity hotfix, not a content pass. It repairs four defects
found in manual play after the `0.9.0` MVP confirmation:

1. a melee hit discarded the rite restoration;
2. a hit restored fragments but not mob HP;
3. lured mobs stacked into one body;
4. a shared post-hit i-frame swallowed the second and third attackers.

The change adds no enemy, room, item, resource, asset, audio cue, HUD element,
hotkey, or control. The intended feeling is unchanged: the liberation rite is a
clean, readable "do not get hit" challenge, and being surrounded by several
mobs is a real positioning mistake rather than a way to become invulnerable.

------------------------------------------------------------------------

## 2. Rite reset

**Trigger:** the player loses HP from any source. The existing
`damagePlayer(...).applied === true` result is authoritative. A dodge or any
other invulnerability that prevents the HP loss does **not** trigger a reset.

**Contents:** for every living mob (`status === "alive"`, `kind !== "boss"`):

- every broken fragment returns;
- HP returns to `maxHp`.

No other field changes: position, aggro, windup, active window, attack cooldown,
stagger, hurt flash, home position, rested state, and respawn timer are
untouched. The Warden has no fragments and its HP is never reset. Dying, dead,
and rested enemies are untouched.

**Event:** emit one `rite-reset` event at the enemy's position for each enemy
whose fragments or HP actually changed. This replaces the old
`fragments-restored` event. Existing restoration sparks are reused; no new
sound, text, or HUD element is added.

**Why HP resets too:** without it, a player can damage a mob to 1 HP, take a
hit, then break the restored fragments and land the killing blow in the same
swing. The swing would both start and finish the rite, which contradicts the
approved "break the fragments without taking a hit" rule.

**Edge cases:**

| Case | Result |
|---|---|
| Melee hit | Reset applies after the enemy array is published, so it persists |
| Projectile or bomb hit | Same reset |
| Hit during dodge i-frames | No HP loss, no reset; fragments stay broken |
| Player dies from the hit | Reset applies, then the run enters `dead`; restart rebuilds the floor |
| A mob is already at full HP with intact fragments | No change, no event |
| The Warden is damaged | HP unchanged by this rule |
| A mob is `dying` or `dead` | No reset; respawn/rest behavior is unchanged |

------------------------------------------------------------------------

## 3. Damage attribution

**Rule:** every distinct enemy attack that connects damages the player. The
shared post-hit invulnerability window is removed. Dodge i-frames remain the
only shared damage-avoidance window.

Consequences:

- One enemy's attack still hits at most once, using the existing `attackHit`
  flag across its active window.
- Two or three melee attacks resolving in the same simulation step are summed
  into one HP loss and one `player-hit` event. This is presentation
  consolidation, not damage reduction.
- Projectiles and bombs are consumed by their hit and already resolve once.
- The player's `invulnerable` timer is now dodge-only. `PLAYER.damageInvulnerability`
  is removed.

**Balance consequence, accepted by the operator:** at depth 5 and later, one
melee hit deals 2 damage, so three simultaneous melee hits equal the unupgraded
6 HP bar. This is intentional: being surrounded is lethal, and the separation
rule below makes it avoidable. The Warden's melee and bomb overlap can also
stack at high depth; both are telegraphed and avoidable by movement or dodge.

------------------------------------------------------------------------

## 4. Enemy separation

**Rule:** living enemy bodies keep a minimum centre distance of
`radiusA + radiusB`. The implemented mob radius is 6, so two living mobs keep at
least 12 px between centres. The Warden (radius 12) is immovable by this rule;
overlaps between the Warden and a mob push only the mob.

Details:

- Separation is a deterministic pass run after enemy movement and before player
  damage is applied.
- Up to four passes settle ordinary three-mob piles. A pair that is exactly
  superimposed is separated along a deterministic angle derived from the pair's
  indices, so the same inputs always produce the same result.
- Pushes use the existing floor-collision helper, so walls, the arena gate, and
  the shop safe zone are respected.
- Dead and dying enemies do not participate; their fades may overlap freely.
- Enemies are **not** added to each other's movement blockers. A kiting ranged
  enemy must not be trapped behind an ally; the post-movement pass resolves the
  overlap instead.
- No pathfinding, flanking, group tactics, or new AI state is added. Enemies
  still chase or kite exactly as they do today; only their final positions are
  kept distinct.

**Edge cases:**

| Case | Result |
|---|---|
| Two mobs at the same point | Pushed apart along a deterministic axis |
| Three mobs at the same point | Settled by the pass; no pair remains superimposed |
| Mob overlaps the Warden | Mob moves; Warden stays put |
| Push is blocked by a wall | Overlap may persist for that frame; the next frame retries |
| One mob is dying | Dying body does not block or push |
| Ranged enemy kiting near an ally | Post-pass separates them without changing its fire logic |

------------------------------------------------------------------------

## 5. Feedback and accessibility

- No new copy, HUD element, hotkey, audio cue, or art.
- The existing hurt flash confirms the player was hit.
- The existing restoration sparks now fire on `rite-reset`, including an
  HP-only reset, so the player sees the rite return.
- No screen shake, slow motion, or additional effect is added.
- The rule is readable without audio, consistent with `GOAL.md` SC8.

------------------------------------------------------------------------

## 6. Verification hooks

No new debug hook is needed. The debug snapshot already exposes, per enemy:
`id`, `kind`, `x`, `y`, `hp`, `maxHp`, `status`, `fragments`, and `rested`.
The required evidence can therefore be asserted from unit and engine tests.

Required automated coverage:

- pure reset: fragments and HP restored, Warden untouched, dying/dead untouched,
  identity when already full;
- engine reset: melee, projectile, and bomb hits; dodge safety;
- damage attribution: two and three enemies in one step; one enemy across
  multiple frames; dodge;
- separation: two superimposed, three superimposed, Warden immovable,
  dead/dying ignored, wall/blocker respect;
- regression: conventional respawn, rest and spirit, arena unlock, safe-room
  ward, boss flow, and restart.

------------------------------------------------------------------------

## 7. Deferred and out of scope

- Group pathfinding, flanking, surround tactics, or ranged repositioning around
  allies.
- Per-attacker cooldown systems or directional damage.
- New archetypes, enemy counts, room layouts, HP/damage/cooldown tuning, depth
  changes, economy changes, or boss patterns.
- New feedback, audio, art, tutorial, settings, or persistence.

------------------------------------------------------------------------

## 8. Assumptions

- The operator confirmed on 2026-11-15 that every distinct enemy hit counts, so
  removing the post-hit i-frame is approved rather than an implementation
  choice.
- The existing `attackHit` guard is sufficient to prevent one attack from
  dealing damage more than once.
- A post-movement separation pass is sufficient; no steering or pathfinding is
  required for the MVP.
