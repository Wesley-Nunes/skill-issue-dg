# 0.9.0 / 001 — Design task

## 1. Task metadata

| Field | Value |
|---|---|
| Version | `0.9.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Ready` |
| Depends on | `docs/about-the-project.md` §4.2/§10, operator decisions of 2026-11-13 and 2026-11-14 |
| Produces | `design/0.9.0/design-decisions.md` |
| Hands off to | `docs/tasks/0.9.0/001-programmer.md` |

## 2. Context

- `0.8.0` merged the single light attack and the depth curve. The current build
  keeps the shop safe zone absolute: enemies cannot cross `floor.shop.safe`,
  damage inside it is ignored, and the player may enter it at any time.
- The operator recorded a post-merge exploit in `docs/about-the-project.md`
  §4.2: a player can enter the shop — or lure a mob or the Warden to its
  threshold — while hunted, become untouchable, and still attack outward.
- Aggro already exists per living enemy (`Enemy.aggro`) and clears when the
  player leaves the archetype's `aggroRadius`. `floor.shop.threshold` already
  exists and is already drawn as a threshold band.
- The shop panel is modal and freezes the world while open.
- The MVP acceptance direction was agreed on 2026-11-14: close the exploit
  before the end-to-end MVP acceptance pass. The fixed seeded six-room branch
  and shop-only rewards are accepted as MVP limitations and are **not** design
  questions for this version.

## 3. Objective

Define the player-facing rule and feedback that make the safe room safe
**between** encounters only, so it can never be used as a damage-free firing
position, without adding new systems, art, audio, or content.

## 4. In scope

1. The combat predicate that seals the ward: which enemies count as hunting,
   and when the ward reopens.
2. Entry behavior: what happens when the player walks or dodges at the shop
   threshold while the ward is sealed; whether leaving is ever blocked.
3. Protection behavior: whether the inside of the safe zone keeps its absolute
   damage immunity while the ward is sealed.
4. The interaction behavior: opening the shop, purchasing, and using a draught
   while an enemy is hunting.
5. The threshold's visual states (sealed/open, reduced motion) and the
   player-facing feedback when entry is refused or the shop cannot be opened.
6. Exact copy, colours, timing, and cooldown for that feedback, reusing the
   existing world-label and floating-text treatment.
7. Edge cases to decide explicitly: already inside when combat starts, aggro
   clearing at the threshold, the Warden (`aggroRadius` 240), ranged enemies
   firing into the room, bombs landing inside, a dodge aimed at the door, and a
   shop panel already open.
8. What QA can observe without judgment calls (debug snapshot fields, events,
   or screen states).

## 5. Out of scope

- Randomized safe rooms, rest rooms, quest rooms, or a second safe room.
- Making enemies able to enter the safe zone, pathfinding, or new AI.
- A combat-music switch, screen shake, new HUD element, new asset, or new audio.
- Economy, shop inventory, prices, depth scaling, or difficulty changes.
- A general floor generator, loot drops, post-death purchases, persistence, or
  meta-progression.
- Tutorial prompts, hints, or a settings screen.
- README and package-version hygiene (programmer-owned release task).

## 6. Approved behavior

- A safe room is a safe place **between** encounters, not during one.
- While any living enemy is hunting the player, the shop ward is sealed: the
  player cannot enter the safe zone.
- The ward reopens when no living enemy is hunting, without a manual reset.
- The exploit must be closed for both mobs and the Floor Warden.
- Leaving the safe zone is never blocked; the player must not be trapped by the
  ward.
- The rule must not introduce a new system, resource, meter, or HUD element.
- The product overview records the existing absolute immunity and enemy
  exclusion as pre-`0.9.0` behavior; this version may narrow the protection as
  described in the design contract.

## 7. Constraints

- KISS: one derived combat predicate, one entry rule, one presentation change.
- YAGNI: no combat-memory timer unless the design proves it is required to
  close the exploit; no state that is not needed for the rule.
- SoC: the predicate and threshold rule must be pure and testable without a
  browser; rendering only reads the derived state.
- Reuse the existing threshold band, world label, floating text, HUD palette,
  and reduced-motion handling.
- No new dependency and no new image or audio asset.
- Deterministic behavior: the same enemy states and player movement must always
  produce the same entry result.

## 8. Acceptance criteria

1. `design/0.9.0/design-decisions.md` states the combat predicate unambiguously,
   including dead, dying, rested, emerging, and aggro-cleared enemies.
2. The document states the exact entry rule, the exact protection rule inside
   the safe zone while sealed, and the exact shop-interaction rule.
3. Every edge case in §4.7 has an explicit outcome; none is left "TBD".
4. The sealed and open threshold states are defined with colour, copy, and
   timing, and work with reduced motion and without audio.
5. The document names the observable debug state or event QA can assert.
6. No decision changes product scope, adds content, or contradicts
   `docs/about-the-project.md` or the MVP acceptance decisions.
7. The document contains no vague direction that a programmer could implement
   in two materially different ways.

## 9. Dependencies and handoff

- **Inputs:** this task, `docs/about-the-project.md` §4.1–§4.3, §9–§11,
  `design/0.7.0/design-decisions.md` (shop layout and palette), the current
  renderer/effects, and `src/game/engine/game.ts`.
- **Output:** `design/0.9.0/design-decisions.md`.
- **Next owner:** `programmer` (`001-programmer.md`), after orchestrator review.

## 10. Open assumptions / unresolved items

- Assumption: the existing `floor.shop.threshold` band is the entry boundary;
  no new geometry is needed.
- Assumption: "hunting" can be derived from the existing per-enemy `aggro`
  flag; no new AI state is needed.
- Unresolved: none.
