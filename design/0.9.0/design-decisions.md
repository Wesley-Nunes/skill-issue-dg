# 0.9.0 — Design decisions

**Version:** `0.9.0`
**Task:** `001`
**Owning agent:** design (executed by the orchestrator; no design subagent
available)
**Status:** Approved for implementation
**Sources:** `docs/tasks/0.9.0/001-design.md`,
`docs/about-the-project.md` §4.1–§4.3/§9–§11, `GOAL.md` (MVP contract,
2026-11-14), `design/0.7.0/design-decisions.md` (shop layout and palette),
operator decisions of 2026-11-14 recorded in `STATE.md`

------------------------------------------------------------------------

## 1. Purpose and boundaries

This document is the implementable contract for the `0.9.0` safe-room combat
rule. It closes the exploit recorded in `docs/about-the-project.md` §4.2: the
shop's safe zone must never be a damage-free firing position, for mobs or for
the Floor Warden.

It contains no new system, resource, enemy, room, item, asset, audio cue, HUD
element, or hotkey. The MVP acceptance criteria live in `GOAL.md`; this document
covers only the ward behavior and its presentation.

**Intended feeling:** the shop is a place to catch your breath *after* a fight.
Walking into it while hunted should feel like a door closing in your face —
clear, immediate, and not punishing beyond the wasted movement.

------------------------------------------------------------------------

## 2. The combat predicate

**Rule:** the ward is sealed when at least one enemy is *hunting*, defined as:

```text
enemy.status === "alive" && enemy.aggro === true
```

Consequences, stated explicitly:

| Enemy state | Seals the ward? | Reason |
|---|---|---|
| Alive, `aggro` true | Yes | It is pursuing or attacking the player |
| Alive, `aggro` false | No | It has lost the player or never noticed them |
| Alive, boss with `emerging > 0` | No | The emergence window is harmless and never sets `aggro` |
| Dying | No | Already defeated; its fade is presentation |
| Dead, `rested` false (pending respawn) | No | It is not on the floor as a threat |
| Dead, `rested` true | No | It is permanently at rest |

- The predicate is reused for every safe-room check in this version. There is
  **no sticky combat timer and no combat memory**: if the last hunter drops
  aggro, the ward reopens on the same simulation frame.
- The predicate is derived from runtime enemy state; nothing new is stored in
  `RunState`.
- Aggro is authoritative and already clears past each archetype's
  `aggroRadius` (melee 160 px, ranged 260 px, Warden 240 px). This version does
  not change those radii.

------------------------------------------------------------------------

## 3. Entry and exit

### 3.1 Entry

While the ward is sealed, the player cannot move from outside
`floor.shop.safe` to inside it.

- The rule applies to normal walking and to the dodge's movement. A dodge that
  would cross the boundary is refused: the player stays at the last position
  outside, and the dodge's timer and i-frames are still spent. The refusal is
  the same mistake as any other wasted dodge.
- The player is refused at the safe-zone boundary, not at a new invisible wall:
  `floor.shop.safe` stays the authoritative volume and
  `floor.shop.threshold` stays its visible entrance band. No new collision
  geometry is added.
- The rule is evaluated per simulation step after movement resolution, so a
  long frame cannot tunnel the player through the threshold.

### 3.2 Exit

- Leaving the safe zone is **never** blocked, sealed or open.
- A player who is already inside when the predicate becomes true is not
  trapped, not pushed out, and does not lose control. They may walk out
  normally.
- Once outside, they cannot re-enter until the predicate is false.

### 3.3 Re-entry

- The ward reopens in the same frame the predicate becomes false. There is no
  cooldown, timer, or manual reset.
- The player must cross the threshold normally; there is no teleport or
  automatic entry.

------------------------------------------------------------------------

## 4. Protection while sealed

The safe zone's damage immunity becomes conditional:

| Player position | Predicate | Damage from melee, projectiles, bombs |
|---|---|---|
| Outside the safe zone | Any | Applies normally |
| Inside the safe zone | No hunter | Ignored (pre-`0.9.0` behavior) |
| Inside the safe zone | At least one hunter | **Applies normally** |

- The immunity check in `applyDamageToPlayer` is skipped while the ward is
  sealed, so every damage source is treated normally.
- Enemies still cannot cross `floor.shop.safe`. This version does not let them
  enter; the player must leave or break pursuit. Keeping the enemy exclusion
  avoids stuck-inside-enemy states and keeps the room's geometry readable.
- Losing HP inside while sealed still restores every broken fragment, exactly
  as any other HP loss does.
- Bombs and projectiles already ignore the safe rect as a movement blocker; no
  new projectile behavior is added.
- The player's own attack is unchanged: it can start and resolve inside the
  safe zone. The ward denies safety, not agency.

------------------------------------------------------------------------

## 5. Shop interaction

- While sealed, `E` in the shop interaction zone does **not** open the panel.
  It emits the existing `shop-unavailable` event with the ward copy below, in
  the muted tone, at the player's position.
- Purchasing, selection, and closing rules are unchanged. The shop panel remains
  modal and freezes the world, so the predicate cannot change while it is open.
- A panel opened before combat remains usable; closing it returns the world to
  the normal rule. Because the world was frozen, no enemy can have started
  hunting in the meantime.
- The draught (`Q`) is unchanged and may be used during combat. It is not a
  safe-room interaction.
- The existing rule that the shop closes when the Warden is summoned is
  unchanged.

------------------------------------------------------------------------

## 6. Presentation

### 6.1 Threshold states

The existing threshold band at `floor.shop.threshold` (a 1 px line with two rune
ticks) gains two states. No new geometry, texture, or font is used.

| State | Line and ticks | Pulse | Label above the threshold |
|---|---|---|---|
| Open (no hunter) | `SPIRIT_COLOR` / cyan, existing alpha 0.45–0.60 | Existing 3 rad/s pulse | None |
| Sealed (hunter) | `EMBER` / `#ff6a4d`, alpha 0.65–0.85 | Same 3 rad/s pulse, slightly stronger | `WARD SEALED`, 9 px, ember |

- Reduced motion: both states use a static mid-alpha (0.7) with no pulse, matching
  the existing reduced-motion treatment.
- The label is drawn with the existing `drawWorldLabel` helper at the threshold's
  centre, 8 px above the band, so it does not overlap the stall's
  `SHOP · SAFE` label.
- The sealed state is communicated by **colour and text**, never by colour
  alone.
- The threshold does not turn red for `shopClosed`; a closed shop stays safe.

### 6.2 Refused entry feedback

- On the first refused entry in a push, and at most once every **2.0 s** while
  the player keeps pushing, emit one event with:
  - position: threshold centre;
  - text: `The ward holds — enemies are hunting.`;
  - tone: `ember`.
- The existing floating-text treatment is reused (1.2 s life, 9 px, dark plate).
  No banner, screen flash, shake, or audio cue is added.
- The same copy is used for the `shop-unavailable` interaction refusal.
- The message is readable with audio muted and does not depend on motion.

### 6.3 State changes

- The threshold switches to sealed the frame the predicate becomes true and
  back to open the frame it becomes false.
- No fade or transition is required; the pulse and label change are enough. This
  keeps the state legible at a glance and avoids a new animation system.

------------------------------------------------------------------------

## 7. Edge cases

| Case | Decision |
|---|---|
| Player is inside when the predicate becomes true | Not trapped; can leave; damage applies while sealed; cannot re-enter; shop cannot be opened |
| Player stands exactly on the boundary | Treated as inside for the entry guard; moving outward is always allowed |
| Last hunter drops aggro at the threshold | Ward opens immediately; no delay or cooldown |
| Ranged enemy has aggro without line of sight | Seals the ward; it is still hunting |
| Projectile is in flight when the player enters | If no enemy hunts, the safe zone protects as before; if one hunts, damage applies |
| Bomb lands inside the safe zone while sealed | Damage applies; the blast is not blocked by the safe rect |
| Bomb lands inside while no enemy hunts | Immunity applies as before |
| Warden is summoned and chasing | Counts as a hunter; the shop is already closed by the summon; the safe zone is not a refuge |
| Shop panel is open when an enemy would aggro | Impossible: the world is frozen while the panel is open |
| Player dies inside while sealed | Normal death, summary, and `R` restart |
| Descent or restart | Nothing to reset; the predicate is derived from the new floor's enemies |
| Test-only teleport | Bypasses the entry guard because it is not a gameplay movement path; tests must use real movement for entry assertions |
| Player dodges into the threshold while sealed | Movement refused; dodge timer and i-frames are spent; no partial entry |
| Player attacks from inside while sealed | Allowed; damage can be taken, so there is no free firing position |
| All enemies rested but the Warden has not been summoned | No hunters; ward open |
| Warden defeated, stairs open, no hunters | Ward open |

------------------------------------------------------------------------

## 8. Accessibility and readability

- Sealed/open is conveyed by text plus colour; the 9 px label matches existing
  world labels and uses the existing display stack.
- No flashing, shake, or full-screen effect is added.
- Reduced motion removes the pulse only; the label and colour remain.
- The feedback is not audio-dependent, and audio remains optional.
- Existing contrast on the dark floor is preserved by drawing the label with
  the existing dark plate helper.

------------------------------------------------------------------------

## 9. Assets and technical constraints

- No image, audio, font, dependency, or hotkey is added.
- Reuse `floor.shop.safe`, `floor.shop.threshold`, `SPIRIT_COLOR`, `EMBER`,
  `drawWorldLabel`, the floating-text effect, and the reduced-motion flag.
- The predicate and boundary check are pure and live in `game/systems/`; the
  engine applies them; rendering only reads the predicate.
- The rule must not change movement speed, dodge distance, attack values, enemy
  AI, or aggro radii.

------------------------------------------------------------------------

## 10. Observable hooks for QA

1. `DebugSnapshot.inCombat` reflects the predicate exactly.
2. `safe-room-blocked` is emitted at most once per 2.0 s per push and carries the
   exact copy in §6.2.
3. A test-only `setEnemyAggro(id, aggro)` hook creates the hunted state
   deterministically; it is behind the existing `DEV`/`VITE_E2E` gate.
4. QA can assert player position relative to `floor.shop.safe` after real
   movement, without relying on pixels.
5. The threshold label `WARD SEALED` is a canvas draw; QA verifies it with an
   exact-size capture, not a pixel diff.

------------------------------------------------------------------------

## 11. Deferred ideas (recorded, not approved)

- Enemies entering safe rooms, safe-room combat with cover, or a pursuit-break
  mechanic beyond the existing aggro radius.
- A combat-memory timer or a "recently hunted" grace period.
- Additional safe-room types, randomized count/placement, and rest/quest rooms.
- A dedicated ward sound cue.
- Any HUD element that reports combat state.

------------------------------------------------------------------------

## 12. Open items

None. Every value and edge case in this version's scope is stated above. Any
change to the predicate, the one-way entry rule, the protection rule, the copy,
or the timing is a scope change and must go through the orchestrator.
