# 001 — Programmer: skill-point economy, branch shop, and explicit Warden summon

## Metadata

| Field | Value |
|---|---|
| Version | `0.7.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Not started` |
| Depends on | `docs/tasks/0.7.0/001-design.md`; `design/0.7.0/design-decisions.md`; `docs/about-the-project.md` §4, §5, §6 |
| Produces | Implementation in `src/` and `cypress/`, unit/e2e coverage, `programmer/0.7.0/CoT.md`, version bump |

## Context

`0.6.0` is merged into `dev`. The relevant current implementation is:

- `src/game/data/floor.ts` generates a seeded four-room left-to-right chain
  from `FLOOR.roomCount = 4`, random room sizes and gaps, and horizontal
  corridors. `Floor` contains `rooms`, `spawn`, `stairs`, `bossSpawn`, and
  `enemySpawns`.
- `src/game/data/config.ts` holds `FLOOR`, `PLAYER.maxHp = 6`,
  `PURIFICATION.spiritPerMob = 34`, `PURIFICATION.spiritThreshold = 100`,
  `HEAL_ON_DESCENT = 2`, boss/bomb values, and the other tuning constants.
- `src/game/types/index.ts` defines `Floor`, `RunState`, `GameState`,
  `InputFrame`, `GameEvent`, and `DebugSnapshot`. `RunState` currently has
  `depth`, `spirit`, `floorPurified`, `bossAwake`, and `exitOpen`.
- `src/state/initialState.ts` creates the floor, player, three mobs, and a
  fresh run. `createBoss` places the Warden at `floor.bossSpawn`.
- `src/game/engine/game.ts` sets `floorPurified` when every non-boss enemy is
  rested and immediately calls `summonBoss`. The Warden never rests; its
  defeat sets `bossAwake = false` and `exitOpen = true`. `descend()` creates a
  new state, preserves HP/max HP, and heals 2. `reset()` starts a fresh run.
- `src/ui/input/input.ts` maps movement, attack, dodge, restart, start,
  pause, and mute. It has no interact or consumable key.
- `src/ui/rendering/renderer.ts` draws three fixed heart slots, depth, stairs
  state, the spirit meter, the boss bar, and a one-line control legend. It has
  no skill-point, draught, shop, gate, or summon presentation.
- `Game.debugSummonBoss()` and `window.__gameDebug.summonBoss()` are
  test-only shortcuts that rest the floor and summon the Warden.

There is no shop, safe room, currency, consumable, Vigor, arena gate, or
explicit summon today.

## Objective

Implement the approved `0.7.0` reward loop end to end: a fixed six-room
branch floor, run-scoped skill points, a safe-room shop with a healing
draught and one-time Vigor, a player-controlled Warden summon, the required
HUD/feedback, and unit plus Cypress coverage.

## In scope

- Fixed six-room branch generation and the supporting `Floor` data:
  start, first mob, junction, second mob, shop dead end, third mob, boss
  arena with a gate, summon point, and stairs.
- Seeded variation of room sizes, gaps, and decoration while keeping the
  topology fixed; no graph generation or pathfinding.
- Arena gate collision and unlock state; stairs remain locked until the
  Warden is defeated.
- Skill-point state, awards, persistence across descent, and reset on
  death/restart.
- Shop availability, inventory, purchase rules, draught use, Vigor, and
  shop closure after summon.
- Explicit Warden summon interaction and removal of the automatic summon.
- Shop safety: enemies cannot enter the shop or damage the player inside it.
- HUD additions for skill points and the carried draught, plus the heart row
  adapting to a Vigor-raised maximum HP.
- Input additions for the draught, shop interaction/navigation, and summon,
  following the approved design decisions.
- Feedback events and presentation for earning, buying, using, blocked
  actions, unlocking, summoning, and shop closure.
- Accessibility behaviour required by the design decisions.
- Unit tests for the economy, purchase, heal, floor-topology, summon, and
  persistence/reset rules.
- Cypress coverage for the full flow: earn points → traverse the branch →
  buy/use → summon → boss → descend.
- Updates to existing unit/e2e tests required by the new topology and
  explicit summon. Do not weaken or delete coverage without replacing the
  covered behaviour.
- `package.json` version `0.7.0`; README controls update.
- `programmer/0.7.0/CoT.md` with implementation decisions and exact commands
  run.

## Out of scope

- Separate gold, combo points, score, skill trees, artifacts, random drops,
  chests, loot tables, inventory grids, shop refresh, post-death purchases,
  meta-progression, persistence, difficulty scaling, new enemies, or a
  general dungeon graph/pathfinding generator.
- Changing the approved prices, reward amounts, topology, or run-scoped
  reset rules. The approved defaults are 1 point per rested mob, 3 for the
  Warden, 1 point for the draught, and 3 points for Vigor. A change to those
  values is a product decision and must return to the orchestrator.
- New art or audio unless the approved design proves it necessary and the
  orchestrator obtains operator approval.
- New dependencies, a UI framework, a general safe-room framework, or a
  general inventory/dialogue system.
- Mobile/touch controls, remapping, settings, localisation, or a save
  system.

## Approved behaviour

### Floor and traversal

1. Each floor is one fixed six-room branch: start room → first mob room →
   junction. The left branch is second mob room → shop dead end. The right
   branch is third mob room → boss arena. The shop has no second exit.
2. The topology is fixed for every seed. Seeded room sizes, gaps, and
   decoration may vary, but every seed must produce a connected, walkable
   floor with the same room roles and branch structure.
3. The boss arena is blocked by a gate until all three non-boss mobs are put
   to rest. The gate is enforced by movement/collision, not only by
   rendering. Resting all three mobs sets `floorPurified`, fills the spirit
   meter, and opens the gate permanently for the floor.
4. The stairs are inside the boss arena and remain locked until the Warden
   is defeated. Walking onto the open stairs descends as before.
5. The shop room is a safe dead end. No enemy may enter it or damage the
   player inside it. A simple threshold/aggro rule is sufficient; do not
   build a general safe-room system.
6. The player can freely backtrack through the junction to the shop before
   summoning the Warden.

### Skill points

7. Skill points are the only currency. A newly started run begins with 0.
8. Putting a mob to rest grants 1 skill point. A failed rite, a conventional
   kill, or a respawn grants none. Defeating the Warden grants 3 skill
   points.
9. Skill points persist across floors within the same run. They are not
   reset by descent.
10. Death and restart discard the run's skill points. `reset()` and a fresh
    `createInitialState` start at 0. There are no post-death purchases in
    this slice.
11. Skill points never become negative. No other currency, score, or combo
    resource is introduced.

### Shop

12. The shop is available while the player is in the shop room and the
    Warden has not been summoned. The approved design decides whether the
    interaction is in-world or modal and which key opens it.
13. The shop offers the healing draught and, until purchased in this run,
    Vigor. There is no random inventory, stock counter, refresh, or other
    item.
14. **Healing draught purchase:** costs 1 skill point. It succeeds only when
    the player is not already carrying a draught and has at least 1 point.
    Success deducts 1 point and sets the carried-draught state. Buying while
    carrying is blocked with no deduction. Buying with insufficient points
    is blocked with no deduction. Buying at full HP is allowed; the draught
    is carried for later.
15. **Healing draught use:** a dedicated key uses the carried draught.
    Using it heals `min(2, maxHp - hp)`, caps at maximum HP, consumes the
    carried draught, and emits a heal event. Using with no draught is a
    no-op with feedback. Using at full HP is blocked and does not consume
    the draught unless the approved design explicitly changes this default.
    Using at 5/6 HP heals 1 and consumes the draught.
16. **Vigor purchase:** costs 3 skill points. It succeeds only when Vigor has
    not already been purchased in this run and the player has at least 3
    points. Success deducts 3 points, sets the one-time purchase flag,
    raises `maxHp` by 1, and raises current HP by 1 capped at the new
    maximum. The approved design may explicitly change the current-HP
    default; if it does not, use this default.
17. Vigor is offered only while unpurchased. After purchase it is absent
    from the current shop (if still open) and from every later shop in the
    run. A direct attempt to buy it again is blocked.
18. The shop closes permanently for the floor when the Warden is summoned.
    After that, backtracking to the shop shows a closed state and no
    purchase is possible. The next floor's shop opens again; Vigor remains
    absent if already purchased.
19. If the shop is modal, only shop navigation/confirmation/close input is
    processed while it is open; movement, combat, and draught use are
    blocked. `Escape` closes the shop instead of pausing while the shop is
    open. The approved design decides the exact model.
20. The shop cannot be opened or used while the Warden is awake, after the
    Warden is defeated, or while the run is dead. Purchases are impossible
    outside the shop.

### Summon and boss

21. Filling the spirit meter no longer summons the Warden. It unlocks the
    arena and leaves the Warden unsummoned until the player interacts with
    the summon point inside the unlocked arena.
22. The summon interaction is blocked before the arena is unlocked and is a
    no-op once the Warden is already awake or defeated. A successful summon
    creates the Warden at `floor.bossSpawn`, sets `bossAwake = true`, keeps
    the stairs locked, closes the shop for the floor, and emits the summon
    feedback.
23. The player may summon immediately after unlocking the arena or
    backtrack to the shop first. The summon must not immediately damage the
    player; the approved design defines the summon point, boss spawn
    distance, and confirmation timing.
24. Defeating the Warden grants 3 skill points exactly once, sets
    `bossAwake = false`, sets `exitOpen = true`, and emits the existing
    boss-defeated feedback. The stairs then open.
25. The spirit meter remains the boss-readiness indicator. Its values and
    per-floor reset stay as they are unless the approved design records a
    change; the approved design may change only the label/cue, not the
    underlying rule.

### HUD, input, feedback, and accessibility

26. The HUD shows the current skill-point count and whether a draught is
    carried. It updates immediately after earning, buying, using, and
    resetting. It must remain readable alongside hearts, depth, stairs
    state, spirit, boss bar, and the control legend.
27. The heart row must adapt to a Vigor-raised maximum HP (7 HP = three full
    hearts and one half heart) without overflowing the HUD or losing the
    half-heart state.
28. Input additions follow the approved design decisions. The draught key is
    `Q` unless the design chooses a different final key. Shop navigation,
    confirmation, close, and summon interactions must be one-press actions,
    not continuous repeats.
29. The control legend and README document the new controls. The legend
    must not become unreadable at 1024 × 640.
30. Feedback covers at least: earning 1 point, earning 3 points from the
    Warden, resting a mob, buying successfully, buying with insufficient
    points, buying while carrying, using a draught, using at full HP,
    purchasing Vigor, the arena unlocking, the locked arena, summoning, and
    a closed shop. Feedback must not depend on audio or colour alone.
31. The approved accessibility decisions are implemented: keyboard-only
    shop operation, readable contrast, non-colour-only state, reduced-motion
    handling, and audio-optional feedback.

### State, data, and debug

32. Run-scoped state includes at least `skillPoints`, `draughtCarried`, and
    `vigorPurchased`. Per-floor state includes the shop-closed state. Arena
    unlock can derive from `floorPurified`; do not duplicate it
    unnecessarily.
33. `descend()` preserves skill points, carried draught, Vigor purchase, and
    the raised maximum HP; it resets spirit, `floorPurified`, `bossAwake`,
    `exitOpen`, and the shop-closed state for the new floor. `reset()` clears
    all run-scoped state.
34. `DebugSnapshot` exposes enough deterministic state for Cypress: skill
    points, carried draught, Vigor purchase, max HP, shop open/closed,
    shop inventory with prices and affordability, arena unlock/gate, summon
    availability, and the shop/arena positions needed for navigation.
35. Test-only debug hooks may set up a scenario, but they must not create
    state that normal play cannot reach. The production bundle must remain
    free of debug hooks. At least one Cypress test must exercise the real
    earn → buy/use → summon → boss → descend path rather than only the debug
    shortcut.

### Edge cases

- A mob killed by conventional damage and respawned grants no points.
- A failed rite grants no points; the mob can be rested later.
- Resting the last mob awards 1 point, fills spirit, and unlocks the arena
  in the same step; it must not also summon the Warden.
- A second summon attempt, or a summon after the Warden is defeated, is a
  no-op.
- A purchase at exactly the required point total succeeds and leaves 0.
- A purchase with one point short fails and leaves the total unchanged.
- Using a draught at full HP does not consume it (default).
- Using a draught at 1 HP below maximum heals 1 and consumes it.
- Buying a draught while carrying one is blocked; using the carried draught
  first allows another purchase if points remain.
- Vigor purchased at full HP raises max and current HP by 1 (default).
- Vigor purchased on floor 1 is absent from floor 2's shop and remains
  absent after descent.
- A carried draught survives descent; the next shop shows it as carried.
- Dying with points, a draught, or Vigor resets all of them on restart.
- The player cannot buy after summoning, even if the shop is still visible
  during a transition.
- The arena gate and stairs cannot be bypassed by walking around them.
- The fixed branch remains traversable for every tested seed; no room
  overlaps, no corridor dead-ends unintentionally, and the shop has exactly
  one entrance.

## Constraints

- Keep pure rules in focused `src/game/systems/` functions with no DOM,
  Canvas, or input dependencies. The engine orchestrates; the renderer draws;
  the input layer only reports pressed keys.
- Keep floor data in `src/game/data/`, domain types in
  `src/game/types/`, initial state in `src/state/`, and presentation in
  `src/ui/`.
- Prefer one small shop/economy module over a general inventory framework.
  Do not add a shop framework, dialogue system, or safe-room abstraction for
  a single shop.
- Preserve the existing deterministic seed/depth generation, collision,
  camera, wall-tile, line-of-sight, and depth-sorting behaviour.
- Preserve existing combat, purification, boss, death, pause, restart,
  descent, audio, and boot behaviour except where the approved explicit
  summon and branch topology necessarily change them.
- No new runtime dependency or external asset request.
- Keep the production bundle free of `__gameDebug`, `__audioDebug`, and
  `__bootDebug`.
- Apply KISS/YAGNI/SoC. Do not add abstractions without a current
  requirement.
- If the design leaves an interaction decision unresolved, ask the design
  agent or orchestrator rather than inventing a product rule.

### Integration boundaries

- `src/game/data/floor.ts` owns the fixed six-room branch, room roles, shop
  and arena rectangles, gate, stairs, spawns, and walkability. Keep the
  seeded variation deterministic.
- `src/game/data/config.ts` owns the approved tuning values (points, prices,
  healing, spawn/room dimensions) unless the design records a change.
- `src/game/types/index.ts` owns the `Floor`, `RunState`, `GameState`,
  `InputFrame`, `GameEvent`, and `DebugSnapshot` contracts.
- `src/state/initialState.ts` owns fresh-run defaults and the Warden factory.
- `src/game/engine/game.ts` orchestrates rest awards, shop open/close,
  purchases, draught use, summon, gate/stairs, descent, and reset. It must
  not contain rendering or DOM logic.
- Pure economy/shop/heal rules belong in `src/game/systems/`; they must be
  callable in unit tests without a browser.
- `src/ui/input/input.ts` maps the approved keys to one-press input fields;
  it must not decide game outcomes.
- `src/ui/rendering/renderer.ts` draws the HUD, gate, shop, summon prompt,
  and feedback. If the design chooses a DOM shop, keep its presentation in
  `src/ui/` and its state in the engine/debug snapshot.
- `src/ui/debug.ts` and `src/index.ts` expose the test-only snapshot/hooks
  under the existing DEV/`VITE_E2E` gate only.
- `cypress/support/` owns shared navigation, wait, and setup commands; specs
  must use them rather than duplicating movement or state-polling logic.

### Required tests

- **Floor unit tests:** six-room topology, shop dead end, arena gate, stairs,
  enemy spawns, connectivity, and traversability across multiple seeds.
- **Economy unit tests:** 1 point per rest, 3 for the Warden, no award on a
  failed rite/respawn, persistence across descent, reset on death/restart.
- **Shop unit tests:** draught purchase/use/heal/cap/blocked cases, Vigor
  purchase/one-time/absent-later cases, insufficient points, exact-point and
  one-point-short boundaries, and post-summon closure.
- **Engine unit tests:** explicit summon only after unlock, no automatic
  summon, repeat-summon no-op, gate/stairs enforcement, shop closure on
  summon, and state preservation/reset.
- **Cypress:** the full earn → traverse → buy/use → summon → boss → descend
  flow with real actions, plus locked arena, blocked purchase, duplicate
  draught, Vigor one-time, shop closure, persistence, and reset scenarios.
- **Regressions:** existing title, loading, combat, purification, boss,
  death, pause, restart, and descent specs must pass with coverage updated,
  not weakened.

## Acceptance criteria

1. Every seed produces the fixed six-room branch with the approved
   connectivity, a shop dead end, a gated boss arena, a summon point, and
   stairs; the floor is fully traversable and the shop has one entrance.
2. Resting all three mobs unlocks the arena and fills the spirit meter. No
   automatic Warden summon occurs. The player can enter the arena and summon
   explicitly, or backtrack to the shop first.
3. The Warden summons only through the approved interaction in the unlocked
   arena. A summon before unlock or a repeat summon is blocked/no-op. The
   shop closes for the floor on summon.
4. Skill points start at 0, award 1 per rested mob and 3 for the Warden,
   persist across descent, and reset on death/restart. The HUD shows the
   current total and updates immediately.
5. The shop offers the healing draught for 1 point and Vigor for 3 points.
   The draught occupies one slot, heals 2 capped at maximum HP, and blocks a
   second purchase while carried. Vigor raises maximum HP by 1, is one-time
   per run, and is absent from later shops after purchase.
6. Purchase and use edge cases behave as specified: insufficient points,
   duplicate draught, full-HP use, exact-point purchase, one-point-short
   purchase, and post-summon purchase are handled without unintended state
   changes.
7. The shop is safe: no enemy can enter it or damage the player inside it.
8. The HUD shows skill points and carried-draught state, adapts the heart row
   to Vigor-raised maximum HP, and remains readable at 1024 × 640 and
   1440 × 810. The control legend and README document the new controls.
9. The arena gate, stairs, boss fight, boss defeat, and descent work
   end to end. The Warden defeat awards 3 points exactly once and opens the
   stairs.
10. Run-scoped state persists across descent and resets on death/restart:
    points, carried draught, Vigor, and raised maximum HP behave as
    specified; spirit, floor purification, boss state, and shop closure reset
    per floor.
11. Feedback and accessibility requirements from the approved design are
    implemented; no required state depends on audio or colour alone.
12. Unit tests cover floor topology, economy awards, purchase/heal rules,
    explicit summon, gate/stairs, persistence, and reset. Cypress covers the
    full earn → traverse → buy/use → summon → boss → descend flow plus the
    specified edge cases.
13. Existing unit and Cypress coverage is updated rather than weakened.
    `npm run typecheck`, `npm test`, `npm run build`, and
    `CYPRESS_BROWSER=chrome npm run e2e` pass on the implementation commit.
14. `package.json` is version `0.7.0`; README documents the new controls.
    The production bundle contains no debug hooks, no new runtime
    dependency, and no external request.
15. The diff contains only approved `0.7.0` scope, and
    `programmer/0.7.0/CoT.md` records the implementation decisions and exact
    commands run.

## Dependencies and handoff

Inputs: approved design decisions, the current floor/engine/HUD/input
implementation, the current test conventions, and the operator-approved
scope.

Outputs: implementation in `src/` and `cypress/`, unit and Cypress coverage,
version bump, README controls update, `programmer/0.7.0/CoT.md`, and a tested
commit.

Hand off to QA with the tested commit, the commands run, and any residual
risks. Do not claim QA approval; QA verifies independently.

## Open assumptions / unresolved items

- **Final keys and shop model.** The approved design owns the draught key,
  shop interaction/navigation/confirm/close keys, summon key, and whether
  the shop is in-world or modal. Use `Q` for the draught unless the design
  chooses otherwise.
- **Use at full HP.** Default: blocked and not consumed. Design owns the
  feedback copy and may explicitly change the default.
- **Vigor and current HP.** Default: maximum and current HP both increase by
  1, capped at the new maximum. Design owns the feedback and may explicitly
  change the default.
- **Draught stock.** Default: unlimited while not carried; no stock counter.
  Design owns the presentation.
- **Shop safety mechanism.** Programming owns enforcement; the requirement
  is that no enemy can damage the player inside the shop.
- **Cypress setup.** Debug helpers may position the player or set up a
  scenario, but at least one test must use the real earn/buy/use/summon
  path. The production bundle must remain clean.
- **Hosted CI and Vercel.** GitHub and Vercel own those checks; they are not
  claimed locally.
