# 0.8.0 — Design decisions

**Version:** `0.8.0`
**Task:** `001`
**Owning agent:** design (executed by the orchestrator; no design subagent
available)
**Status:** Awaiting operator approval, then implementation
**Sources:** `docs/tasks/0.8.0/001-design.md`,
`docs/about-the-project.md` §3.2/§3.3/§4.1/§5/§6, operator decisions of
2026-11-13 recorded in `STATE.md`

------------------------------------------------------------------------

## 1. Purpose and boundaries

This document is the implementable contract for the `0.8.0` combat baseline:

1. one light attack replacing the three-hit chain;
2. removal of every chain-specific visual and state;
3. a numeric depth difficulty curve with a melee-only teaching floor at
   depth 1.

It deliberately contains **no** challenge card, buff, status effect, secondary
attack, new enemy archetype, economy change, new art, or new audio. Values here
are a first playtest baseline, not a permanent balance commitment.

------------------------------------------------------------------------

## 2. Single light attack

### 2.1 Contract

| Property | Value |
|---|---|
| Input | Left mouse button; one press = one swing; holding does not repeat or buffer |
| Windup | 0.10 s |
| Active | 0.09 s |
| Recovery | 0.22 s |
| Total commitment | 0.41 s per swing |
| Damage | 2 |
| Reach | 36 px from the player's centre |
| Arc | 60° half-angle (120° total) |
| Knockback | 6 px on a landed hit |
| Hitstop | 0.05 s on a landed hit |
| Stagger | None |

The swing is deliberately committed: a whiff costs roughly 0.4 s of tempo, and
dodging between swings is the intended rhythm. This is the whole of the combat
skill expression in this version.

### 2.2 Fragment interaction

- A swing breaks **every** intact spirit fragment whose position falls inside
  the arc, so one swing may break both fragments of a mob.
- Fragments are not consumed by ordinary damage; only an in-arc swing breaks
  them.
- Taking damage still restores every broken fragment on every living mob.
- A mob killed with an intact fragment still respawns after the configured
  delay with full HP and fragments.
- A mob killed with no intact fragments is still put to rest and grants its
  spirit and skill point.

### 2.3 What the attack does not do

- It does not stagger, stun, or interrupt enemies or the Warden.
- It does not chain, escalate, or open an input window.
- It has no cooldown beyond its own recovery.
- It is not affected by depth; only enemies and the Warden scale.

------------------------------------------------------------------------

## 3. Removal of chain feedback

Delete, with no replacement:

| Element | Current role | Decision |
|---|---|---|
| Three pips above the player | Chain progress and reply-window pulse | Removed entirely; nothing takes their place |
| Per-step sweep geometry | Different reach/arc per chain step | Replaced by one 120°/36 px arc |
| Finisher hold | Extra 0.12 s display after the finisher | Removed |
| Chain-break effect | Feedback when a chain ended for damage/whiff/mistime | Removed; the whiff's recovery is the feedback |
| `BOSS.staggerScale` | Reduced finisher stagger on the boss | Removed; the boss is never interrupted |

The player must not be able to perceive any reply window, chain counter, or
"next hit" affordance after this change.

------------------------------------------------------------------------

## 4. Presentation of the single swing

All of this is drawn with the existing renderer and effects code. No image or
audio asset is added.

1. **Swing arc.** One filled sweep from the player, 36 px radius, 120° wide,
   drawn during the active window and fading out over the swing's active time.
   It uses the existing swing colour and draw order.
2. **Whiff.** The arc still draws. No spark, no sound change, no extra effect —
   the recovery is the punishment and the arc is the commitment.
3. **Landed hit.** The existing enemy hit flash (`IMPACT.flash`, 0.08 s), the
   0.05 s hitstop, and the 6 px knockback. No new particles.
4. **Fragment break.** The existing per-fragment shatter burst, drawn once per
   broken fragment so that a double break produces two distinct bursts. No
   additional screen effect, slowdown, or flash.
5. **Player hurt.** Unchanged: existing hurt flash and 0.6 s invulnerability
   window.
6. **Boss telegraphs.** Unchanged geometry and timing shape; only the numbers in
   §5 change. Because the Warden can no longer be interrupted, its windup must
   remain fully visible for its whole duration — no overlap with the hitstop
   effect.

------------------------------------------------------------------------

## 5. Depth difficulty curve

### 5.1 Rules

- Scaling uses **numbers only**. Enemy count, archetype roster, room sizes, and
  branch topology never change with depth.
- Movement speed, aggro radius, attack range, windup, projectile speed, and
  projectile size never scale.
- All multipliers are computed from the base constants and then rounded; the
  rounded result is what the game uses.
- HP rounds to the nearest integer with a minimum of 1. Cooldowns are kept to
  two decimals.
- Damage is integer and changes only at the thresholds in §5.4.
- The curve is capped at **depth 10**; depth 11 and beyond reuse depth 10's
  row.

### 5.2 HP

`hpMultiplier(depth) = 0.80 + 0.08 × (depth − 1)`, clamped to 1.52.

| Depth | Multiplier | Melee HP (base 10) | Ranged HP (base 6) | Warden HP (base 30) |
|---|---|---|---|---|
| 1 | 0.80 | 8 | 5 | 24 |
| 2 | 0.88 | 9 | 5 | 26 |
| 3 | 0.96 | 10 | 6 | 29 |
| 4 | 1.04 | 10 | 6 | 31 |
| 5 | 1.12 | 11 | 7 | 34 |
| 6 | 1.20 | 12 | 7 | 36 |
| 7 | 1.28 | 13 | 8 | 38 |
| 8 | 1.36 | 14 | 8 | 41 |
| 9 | 1.44 | 14 | 9 | 43 |
| 10 (cap) | 1.52 | 15 | 9 | 46 |

### 5.3 Attack cadence

`cadenceMultiplier(depth) = 1.15 − 0.03 × (depth − 1)`, clamped to 0.88. A
multiplier is applied to each enemy's attack cooldown, so a value above 1 means
slower attacks.

| Depth | Multiplier | Melee cooldown (1.1) | Ranged / Warden melee (1.6) | Warden bomb (2.6) |
|---|---|---|---|---|
| 1 | 1.15 | 1.27 | 1.84 | 2.99 |
| 2 | 1.12 | 1.23 | 1.79 | 2.91 |
| 3 | 1.09 | 1.20 | 1.74 | 2.83 |
| 4 | 1.06 | 1.17 | 1.70 | 2.76 |
| 5 | 1.03 | 1.13 | 1.65 | 2.68 |
| 6 | 1.00 | 1.10 | 1.60 | 2.60 |
| 7 | 0.97 | 1.07 | 1.55 | 2.52 |
| 8 | 0.94 | 1.03 | 1.50 | 2.44 |
| 9 | 0.91 | 1.00 | 1.46 | 2.37 |
| 10 (cap) | 0.88 | 0.97 | 1.41 | 2.29 |

### 5.4 Damage thresholds

Damage is integer and steps only at these depths. No percentage scaling.

| Source | Texture | 1–4 | 5 | 6 | 7 | 8–10 |
|---|---|---|---|---|---|---|
| Melee mob | Melee hit | 1 | 2 | 2 | 2 | 2 |
| Ranged mob | Projectile | 1 | 1 | 2 | 2 | 2 |
| Warden | Melee hit | 2 | 2 | 3 | 3 | 3 |
| Warden | Bomb blast | 2 | 2 | 2 | 3 | 3 |

### 5.5 Application points

- Values are applied when mobs and the Warden are created for a floor,
  including the floor generated after a descent.
- The Warden's `staggerScale` is deleted rather than scaled.
- The depth used is the floor's depth, which is the run's current depth.

------------------------------------------------------------------------

## 6. Depth-1 teaching floor

### 6.1 Composition

Depth 1 generates three **melee** mobs. Depth 2 and later generate two melee
mobs and one ranged mob. Spawn ids and positions are unchanged from `0.7.0`;
only the second and third mobs' kinds differ at depth 1.

### 6.2 Intended experience

Computed from §5 and §2:

| Outcome | Depth-1 value |
|---|---|
| Melee mob hits to rest (after fragments) | 4 |
| Ranged mob hits to rest — first appears at depth 2 | 3 |
| Swings to rest a melee mob including fragments | 5–6 (≈2.1–2.5 s of swinging) |
| Warden hits to defeat | 12 |
| Player HP | 6 |
| Melee hits the player can survive | 6 |
| Warden melee hits the player can survive | 3 |
| Bomb hits the player can survive | 3 |

The floor must feel forgiving but not inert: the player has enough HP to
survive repeated mistakes, yet the fragment-restoration rule still forces them
to learn to avoid damage. There are no tutorial prompts, overlays, hints,
tooltips, or tutorial state anywhere in this version.

------------------------------------------------------------------------

## 7. Difficulty communication

No new HUD element, banner, icon, or copy announces the curve. The existing
depth number in the HUD and the existing floor-entry banner are the only
signals. The player is expected to *feel* the difference, not read it.

------------------------------------------------------------------------

## 8. Accessibility and readability

- No screen shake, full-screen flash, or colour inversion is introduced.
- Knockback stays at 6 px, matching the previous proven value, so hit feedback
  does not disorient.
- The boss windup must remain visible for its full duration; hitstop may not
  visually consume a telegraph frame.
- All new behaviour is readable without audio; no cue becomes load-bearing.
- Existing reduced-motion handling and the mute toggle are unaffected.

------------------------------------------------------------------------

## 9. Verification hooks for QA

QA can assert, without judgment calls:

1. One press produces exactly one swing; holding produces exactly one.
2. The windup/active/recovery/damage/reach/arc/knockback/hitstop constants match
   §2.1 exactly.
3. A swing covering both fragments breaks both.
4. No chain pips, reply window, finisher hold, chain-break effect, or stagger
   configuration exist.
5. Depth 1 generates three melee spawns; depth 2 generates two melee and one
   ranged, with unchanged ids and positions.
6. HP and cooldown values match every row of §5.2 and §5.3 at depths 1, 2, 5,
   6, and 10.
7. Damage matches §5.4 at depths 4, 5, 6, and 7.
8. Movement speed, aggro radius, attack range, and projectile properties are
   identical at depth 1 and depth 10.
9. The Warden is never interrupted by repeated hits.
10. No new asset, audio file, dependency, HUD element, or hotkey exists.

------------------------------------------------------------------------

## 10. Deferred ideas (recorded, not approved)

- **Heavy weapon / heavy attack (operator, 2026-11-13).** A high-commitment,
  high-damage, high-knockback variant — a future weapon or upgrade direction,
  not part of `0.8.0`.
- **Per-floor combo challenge (operator, 2026-11-13).** A challenge card in the
  safe room, one active challenge per floor, difficulty rising with completions,
  and combo rewards (skill points or temporary effects). Deferred to a future
  version; no part of it may be built in `0.8.0`.

------------------------------------------------------------------------

## 11. Open items

None. Every value in this version's scope is stated above. Any change to the
attack contract, the curve, or the composition rule is a scope change and must
go through the orchestrator.
