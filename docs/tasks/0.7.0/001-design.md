# 001 — Design: reward loop, branch shop, and explicit Warden summon

## Metadata

| Field | Value |
|---|---|
| Version | `0.7.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Not started` |
| Depends on | Operator-approved `0.7.0` scope (2026-11-09); `docs/about-the-project.md` §4, §5, §6; `docs/tasks/0.7.0/001-programmer.md`; `docs/tasks/0.7.0/001-qa.md` |
| Produces | `design/0.7.0/design-decisions.md` |

## Context

`0.6.0` is merged into `dev`. The current floor is a seeded four-room
left-to-right chain. Three mobs carry spirit fragments; when every mob is put
to rest the spirit meter fills and the Floor Warden is summoned
automatically. Defeating the Warden opens the stairs. There is no currency,
consumable, safe room, shop, or player-controlled summon.

The `0.7.0` operator-approved scope closes the MVP reward loop:

- skill points are the only run currency, earned by putting mobs to rest;
- the floor becomes one fixed six-room branch with one safe-room shop;
- the player explicitly summons the Warden in an unlocked boss arena;
- the HUD shows skill points and whether a healing draught is carried.

The structural consequence is deliberate: the linear four-room generator
becomes a fixed six-room branch, and the automatic full-spirit summon becomes
an explicit interaction. The spirit meter remains the boss-readiness
indicator.

## Objective

Define the player-facing layout, interaction, feedback, HUD, and
accessibility decisions required to implement the approved `0.7.0` reward
loop without changing its product scope.

## Design problem

The design must answer these questions concretely enough for implementation
and independent QA:

1. How should six rooms be arranged so the junction reads as a real choice,
   the shop reads as a safe dead end, the boss arena reads as locked then
   unlocked, and the summon point reads as an intentional action?
2. How does the player open, navigate, confirm, and close the shop? Is it an
   in-world interaction or a modal panel? How are prices, affordability,
   carried state, and one-time purchases communicated?
3. How does the player learn that the arena is unlocked and choose to summon
   the Warden? What confirms the summon, and how is the shop closing
   communicated?
4. Where do skill points and the carried-draught indicator live in the
   existing HUD, and how do they coexist with hearts, depth, stairs state,
   spirit, and the boss bar?
5. What feedback is required for earning points, resting a mob, defeating
   the Warden, buying, using, failing to buy or use, unlocking the arena,
   summoning, and finding the shop closed?
6. Which controls are used, and how are they made discoverable and
   keyboard-operable?
7. What accessibility guarantees apply: contrast, non-colour-only state,
   reduced motion, optional audio, and keyboard-only shop operation?

## In scope

- Spatial layout and visual hierarchy of the fixed six-room branch:
  start, first mob, junction, second mob, shop dead end, third mob, and boss
  arena with its gate, summon point, and stairs.
- Presentation of the locked/unlocked arena gate and the shop threshold.
- Shop interaction model, open/close behaviour, inventory rows for the
  healing draught and Vigor, prices, affordability, carried state, and
  one-time-purchase state.
- Explicit Warden summon interaction, unlock cue, confirmation, boss
  appearance, and shop-closing cue.
- HUD treatment for skill points and the carried draught, including empty,
  carried, and spendable states, and adaptation of the heart row for a
  Vigor-raised maximum HP.
- Feedback for earning, spending, healing, blocked actions, unlocking,
  summoning, and shop closure.
- Controls for using a draught, interacting with the shop, navigating and
  confirming purchases, closing the shop, and summoning the Warden.
- Accessibility and reduced-motion requirements.
- Concrete design-decision outputs for programmer and QA.

## Out of scope

- Changing the approved product rules, prices, reward amounts, topology, or
  run-scoped reset behaviour.
- Separate gold, combo points, score, skill trees, artifacts, random drops,
  chests, loot tables, inventory grids, shop refresh, post-death purchases,
  meta-progression, difficulty scaling, persistence, new enemies, or a
  general dungeon graph/pathfinding generator.
- New art or audio unless the design proves it necessary. If it does, stop
  and return the need to the orchestrator for operator approval before
  implementation.
- Final implementation structure, class design, or code-level naming.
- Mobile/touch layout, remapping, settings menus, or localisation.

## Approved behaviour

1. **Fixed branch.** Each floor is one fixed six-room branch: start room →
   first mob room → junction. The left branch leads to the second mob room
   and then the shop dead end. The right branch leads to the third mob room
   and then the locked boss arena. The topology is fixed; seed variation may
   change room sizes, gaps, and decoration but must not add graph
   generation, pathfinding, or alternate routes.
2. **Arena lock.** The boss arena is closed until all three non-boss mobs
   have been put to rest. Putting every mob to rest fills the spirit meter
   and unlocks the arena permanently for that floor. A failed rite or a
   respawned mob does not unlock it.
3. **Explicit summon.** The spirit meter remains the readiness indicator.
   There is no automatic summon. After the arena unlocks, the player may
   enter it and summon the Warden, or backtrack through the junction to the
   shop first. The summon is a deliberate player interaction inside the
   arena.
4. **Shop window.** The safe-room shop is available before the Warden is
   summoned. It closes permanently for the floor once the Warden is
   summoned, including if the player backtracks to it afterwards.
5. **Shop inventory.** The shop offers:
   - **Healing draught** — restores 2 HP, costs 1 skill point, occupies the
     single carried-draught slot.
   - **Vigor** — raises maximum HP by 1 for the current run, costs 3 skill
     points, and is a one-time purchase per run. It disappears from later
     shops after purchase.
   There is no random inventory, stock counter, refresh, or other item.
6. **Consumable rules.** The player carries at most one healing draught.
   A dedicated key uses it. Healing is capped at maximum HP. Buying another
   draught while one is carried is blocked.
7. **Skill points.** Skill points are the only currency. A rested mob grants
   1 point and the Warden grants 3. Skill points persist across floors
   within a run and reset on death/restart. No other currency, score, or
   combo resource exists.
8. **Rewards.** All rewards in this slice are shop-only. There are no random
   drops, chests, or loot tables.
9. **Safe room.** The shop room is a non-combat space: enemies must not
   enter it or damage the player inside it. The exact presentation and
   safety mechanism are design decisions, but shopping must not require
   fighting or taking damage.
10. **Stairs.** The stairs remain inside the boss arena and open only after
    the Warden is defeated. Walking onto the open stairs descends to the
    next floor as before.
11. **HUD.** The HUD must show the current skill-point count and whether a
    draught is carried. It must remain readable alongside the existing
    hearts, depth, stairs state, spirit meter, boss bar, and controls.
12. **Feedback and accessibility.** Every earn, purchase, use, blocked
    action, unlock, summon, and shop closure needs readable feedback that
    does not depend on audio or colour alone. The shop must be operable with
    the keyboard, and motion must respect reduced-motion preferences.

## Constraints

- Reuse the existing dark palette: void `#0b0a0f`, title text `#f2e9da`,
  spirit cyan `#bfe9ff`, and ember `#ff6a4d`.
- Reuse the existing DungeonTileset II frames and procedural drawing.
  Prefer existing tiles, silhouettes, light, and text over new assets.
- Keep the existing display typeface (Grenze Gotisch) for headings and the
  system UI stack for small HUD and control text.
- Keep the game readable at 1024 × 640 and 1440 × 810 with keyboard and
  mouse.
- No new runtime dependency, UI framework, or external network request.
- No audio-dependent state and no colour-only state.
- Respect `prefers-reduced-motion`; do not add flashing or rapid strobe.
- Design decisions must be concrete enough for implementation and QA.
- Apply KISS and YAGNI: one shop interaction, one HUD treatment, one summon
  interaction. Do not build a general safe-room, inventory, or dialogue
  system for this slice.
- If a design decision would change product scope, stop and return it to the
  orchestrator rather than silently expanding the task.

## Acceptance criteria

1. The design file specifies the six-room spatial layout, the junction, the
   shop dead end, the arena gate, the summon point, and the stairs, and
   confirms the approved topology.
2. The design file specifies the shop interaction model, trigger, open/close
   states, navigation, confirmation, and close control.
3. The design file specifies every shop state: draught affordable,
   unaffordable, carried, used; Vigor affordable, unaffordable, purchased,
   absent from later shops; shop closed after summon.
4. The design file specifies the explicit summon interaction, the arena
   unlock cue, the summon confirmation, the Warden appearance, and the
   shop-closing cue.
5. The design file specifies the HUD placement and treatment of skill points
   and the carried-draught indicator, including empty and carried states,
   the use-key hint, and the heart row at a Vigor-raised maximum HP.
6. The design file specifies feedback for earning points, resting a mob,
   defeating the Warden, buying, using, healing at full HP, blocked
   purchases, blocked uses, the locked arena, summoning, and a closed shop.
7. The design file specifies the final controls and the updated control
   legend, including the draught key (proposed `Q`), shop navigation and
   confirmation, shop close, and summon interaction.
8. The design file specifies keyboard-only shop operation, readable
   contrast, non-colour-only cues, reduced-motion behaviour, and
   audio-optional feedback.
9. The design file confirms that no new art or audio is required, or stops
   for operator approval before implementation.
10. The design file lists deferred work without implying approval and stays
    consistent with `docs/tasks/0.7.0/001-programmer.md` and
    `docs/tasks/0.7.0/001-qa.md`.

## Dependencies and handoff

Inputs: operator-approved `0.7.0` scope, the current floor/engine/HUD/input
implementation, the existing palette and assets, and the product overview.

Outputs: `design/0.7.0/design-decisions.md`, which the programmer implements
and QA verifies. The design file must not introduce product rules that are
absent from this task or `docs/about-the-project.md`.

## Open assumptions / unresolved items

- **Final keys.** `Q` is the proposed draught key. The shop interaction,
  navigation, confirmation, close, and summon keys are design decisions.
  Design may use one context-sensitive interact key.
- **Shop model.** The design may choose an in-world shop or a modal panel.
  If modal, the design must specify that it blocks movement/combat while
  open and how `Escape` closes it instead of pausing.
- **Use at full HP.** Default: using a draught at full HP is blocked and does
  not consume it; buying a draught at full HP is allowed. Design owns the
  feedback copy and may confirm or explicitly change this default.
- **Vigor and current HP.** Default: maximum HP increases by 1 and current
  HP increases by 1, capped at the new maximum. Design owns the feedback and
  may confirm or explicitly change this default.
- **Draught stock.** Default: the shop always offers a draught when the
  player is not carrying one; there is no stock counter. Design owns the
  presentation.
- **Shop safety mechanism.** Design owns the visual threshold and feedback;
  programming owns enforcement. The requirement is that no enemy can damage
  the player inside the shop.
- **Room variation.** Topology is fixed. Design decides whether room sizes
  and gaps visibly vary by seed or look uniform.
- **Art/audio.** No new asset is assumed. If design concludes one is
  necessary, it must stop and ask the orchestrator for operator approval.
