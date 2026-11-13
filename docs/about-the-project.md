# About the Project --- skill issue dg

> **Status:** Initial project definition\
> **Working title:** `skill issue dg`\
> **Genre:** Skill-based, real-time 2D roguelike\
> **Target platform:** Web browser\
> **Initial visual direction:** Dark fantasy pixel art\
> **Perspective:** 2D 3/4 perspective\
> **Initial rendering technology:** Native HTML5 Canvas API with
> TypeScript

This document captures the current vision, gameplay rules, technical
direction, and MVP scope for **skill issue dg**. It is the starting
point for development, not a promise that every idea is already fully
specified. Decisions that still need design or implementation research
are marked as open.

------------------------------------------------------------------------

## 1. Game vision

`skill issue dg` is a skill-based, real-time action roguelike set in
procedurally generated dungeons.

The player descends through increasingly difficult dungeon floors,
fights different enemy types, collects consumables and currency,
completes skill-based challenges, and prepares for tougher encounters.
Bosses are important milestones and the exclusive source of artifacts.

The intended fun comes primarily from:

-   Intense, responsive real-time combat.
-   Improving through player skill, execution, and knowledge of enemy
    behavior.
-   Discovering useful consumables, skills, and boss-exclusive
    artifacts.
-   Experimenting with combinations of skills and artifacts to create
    effective builds.
-   Seeing how far a run can progress through an endless dungeon.

The game's identity should emphasize mastery rather than relying only on
character statistics. Players should be rewarded for playing well,
avoiding damage, and reading enemy attacks.

The current `0.8.0` slice keeps the dark-fantasy liberation frame: a
mob is not simply killed. Its spirit fragments must be broken without
taking a hit, and only then can it be put to rest. Conventional kills
return the mob, while a completed rite grants spirit toward the floor's
boss. Purifying every mob fills the spirit meter and unlocks the boss
arena, where the player explicitly summons the Floor Warden; defeating it
opens the stairs. The player now fights with a single light attack, and
each floor below the first raises the enemies' numbers.

### Design principles

Development should follow these principles:

-   **KISS:** Prefer the simplest design that satisfies the current
    gameplay need.
-   **YAGNI:** Do not build features, abstractions, or infrastructure
    before there is a demonstrated need.
-   **Separation of Concerns (SoC):** Keep domain rules, runtime state,
    input, rendering, and application orchestration separated.
-   **Pragmatism:** Choose solutions that are appropriate for this
    game's scope and the current development stage.

These principles should guide decisions without becoming reasons to
over-engineer the project.

------------------------------------------------------------------------

## 2. Visual direction and assets

### Perspective

The game will use a **2D 3/4 perspective with an elevated, top-down
feel**.

It should not use a strict diamond-grid isometric world. Movement and
positioning should remain free in two dimensions.

Important presentation requirements include:

-   Free 2D movement.
-   Depth sorting so characters and objects appear in the correct
    foreground/background order.
-   Collision boundaries that fit the walkable parts of the environment.
-   A camera that can follow the player through the dungeon.

### Art direction

The intended atmosphere is **dark fantasy**:

-   Dark dungeon environments.
-   Monstrous enemies.
-   Atmospheric lighting and shadows.
-   Magical effects and readable combat feedback.
-   Pixel-art presentation.

### Initial asset source

The initial visual foundation is [DungeonTileset II by
0x72](https://0x72.itch.io/dungeontileset-ii).

The pack should be treated as the starting art source, not as a
guarantee that every required asset or animation is available. Identify
missing sprites, effects, and animations as they become necessary. In
particular, custom attack animations or effects may be needed.

Before shipping, verify the asset pack's current license and attribution
requirements from its official distribution page and retain any required
license information with the project.

**Verified 2026-11-01:** DungeonTileset II v1.7 is released by 0x72 as
**CC0 1.0 Universal**; credit is appreciated but not required. The pack
and its attribution note are stored under
`public/assets/dungeon-tileset-ii/`. The pack has no attack or death
animations, so combat feedback for those states is drawn in code.

The `0.5.0` boss and bomb frames (`big_demon`, `bomb`) come from the same
CC0 pack. Explosions, smoke, and the boss aura are drawn procedurally.

### Audio direction

The initial audio direction is atmospheric and restrained. Concrete events
use the supplied CC0 sounds under `public/assets/audio/`; the boss's
presence, breathing, fire, voice, and magic are synthesized with the Web
Audio API. Audio is optional: the game must remain fully playable and
readable when muted, and no gameplay state may depend on hearing a cue.
Licenses and authors are recorded with the assets.

### Typography

The `0.6.0` presentation direction gives the game one self-hosted display
typeface: **Grenze Gotisch** (SIL Open Font License 1.1, variable
100–900). It is used for the loading title, main title, pause and death
headings, the floor-entry banner, and the boss name. Small HUD values,
controls, taglines, and status text remain in the system UI stack for
legibility. The font ships under `public/assets/fonts/` with its licence
and attribution; no third-party font CDN is used.

------------------------------------------------------------------------

## 3. Core gameplay

### 3.1 Perspective, movement, and aiming

The game is a real-time action game. The player moves freely and aims
manually with the mouse.

Initial control proposal:

  Input                Action
  -------------------- -----------------------------
  `W`, `A`, `S`, `D`   Move
  Mouse position       Aim direction
  Left mouse button    Basic attack
  Right mouse button   Secondary attack or ability
  `Space`              Dodge
  `1`, `2`, `3`, `4`   Skills

These are initial defaults and can be changed after playtesting. The
control scheme should be configurable if that becomes important, but
remapping is not required for the first MVP.

### 3.2 Combat identity

Combat combines two sources of depth:

1.  **Mechanical skill:** Timing, positioning, aiming, dodging, and
    executing attacks.
2.  **Build strategy:** Combining acquired skills and boss artifacts to
    create useful synergies (future work; not in the current slice).

Combat should reward deliberate execution. Automatic targeting is not
the intended default; attacks should use the mouse aim direction or
position as appropriate to the attack.

The player has one light attack (operator-approved 2026-11-13 for
`0.8.0`):

-   One mouse click performs a single swing with a fixed windup, active
    arc, and recovery. Nothing is buffered and no reply window exists;
    repeated clicks are limited only by the swing's recovery.
-   The swing breaks any intact spirit fragment that falls inside its
    arc. A single swing can break more than one fragment.
-   A landed hit applies a short knockback for hit-weight feedback.
-   The attack does **not** stagger enemies or the Floor Warden.
-   Final timings, reach, arc, damage, and knockback values live in the
    version's design decisions.

**Approved history:** a three-hit hard-timed light chain with in-world
chain pips shipped in `0.2.0` (approved 2026-11-02, revised 2026-11-03).
A known issue recorded on 2026-11-11 held that its timing windows, input
feedback, and fragment-breaking interaction did not feel good in play.
After a further design pass, `0.8.0` removes the chain entirely rather
than retuning it. This supersedes the `0.2.0` combo decision. The
finisher's stagger went with it, so the Warden can no longer be
interrupted. A skill-based combo or per-floor challenge system remains
future direction (§10) — deferred, not deleted.

### 3.3 Spirit purification and liberation

Enemies are bound to the floor by spirit fragments. A mob is not
permanently defeated by ordinary damage; it must be liberated.

The `0.2.0` purification rules are operator-approved (2026-11-04):

-   A living mob carries spirit fragments in a small orbit around it.
    The current implementation uses two fragments.
-   The light attack breaks a fragment when it lands inside the swing's
    arc. A swing can break more than one fragment.
-   Any HP loss restores every broken fragment on every living enemy.
    Dodges and i-frames that prevent the HP loss are safe.
-   A mob killed while at least one fragment is intact is a failed rite:
    it respawns at its spawn after about two seconds with full HP and all
    fragments restored.
-   A mob killed after all of its fragments are broken is put to rest
    permanently and grants spirit.
-   Spirit fills a meter. When the meter is full, the run freezes on a
    “Floor purified — the boss awaits” overlay and `R` restarts.

Fragment count, placement, spirit values, and respawn timing are tuning
values recorded in the version's design decisions. Ordered breaks,
moving fragments, and per-mob fragment variation are future difficulty
levers, not part of `0.2.0`.

The `0.5.0` slice gave the spirit meter its payoff (operator-approved
2026-11-07): when every mob on the floor was at rest and the meter was full,
the **Floor Warden** appeared in the final room. The Warden does not carry
spirit fragments and does not rest or respawn; it fights with a telegraphed
melee attack and fused bombs. Defeating it opens the stairs, and the run
continues downward. The boss bar, telegraphs, and bomb landing marker are
defined in the version's design decisions.

The `0.7.0` slice keeps the spirit meter as the boss-readiness indicator but
replaces the automatic appearance with an explicit summon (operator-approved
2026-11-09). Resting every mob fills the meter and unlocks the boss arena;
the player chooses when to enter the arena and summon the Warden. Skill
points return as the run currency, earned by resting mobs and spent in the
safe-room shop. Random drops remain future work.

### 3.4 Health and survivability

The player has health (HP). Avoiding damage through movement,
positioning, and dodging is the primary defensive approach.

Consumables provide recovery and other utility. Healing should help
players recover from mistakes, not replace skillful play.

The exact HP values, damage rules, invulnerability windows, healing
amounts, and rest-room effects are not yet defined.

------------------------------------------------------------------------

## 4. Dungeon and run structure

### 4.1 Procedural floors

The dungeon is procedurally generated. Each run should produce a
different map.

A run consists of floors (a collection of rooms), and the player's destination is always the
floor below. The player continues descending through an **endless
dungeon**; there is no predefined final floor in the current concept.

Difficulty should increase as the player descends. Floors may introduce
different enemy pools and combinations. The exact generation algorithm,
room and corridor rules, floor themes, and difficulty scaling are open.

#### Current slice: `0.7.0`–`0.9.0`

The current dungeon slice uses a fixed six-room branch, generated from a seed;
room sizes, gaps, and decoration may vary. The player starts in the first
room and follows a single corridor to the first mob room, then reaches a
junction. The left branch leads to the second mob room and a shop dead end.
The right branch leads to the third mob room and a boss arena whose gate stays
locked until all three mobs are at rest. This is a fixed branch, not a general
graph or pathfinding generator.

Resting every mob fills the spirit meter and unlocks the arena. The player may
enter the arena and summon the Floor Warden immediately, or backtrack through
the junction to the shop first. The shop sells a healing draught and a
one-time Vigor upgrade; it closes for the floor once the Warden is summoned.
Defeating the Warden opens the stairs inside the arena, and walking onto them
descends to a newly generated floor with the same branch topology.

Skill points are the run currency. A rested mob grants 1 point and the Warden
grants 3; the shop is the only place to spend them. Skill points, the carried
draught, Vigor, and raised maximum HP persist across floors within a run and
reset on death/restart. The spirit meter, floor purification, boss state, and
shop closure are per floor and reset on descent. The player's HP persists and
is restored by 2 HP on descent, capped at the maximum.

#### Depth difficulty (`0.8.0`, operator-approved 2026-11-13)

Difficulty now rises with depth, using numbers only. The first floor is the
teaching floor: it is deliberately the most forgiving point on the curve and
spawns melee enemies only, so a new player does not meet the ranged imp's
projectile before learning movement, attack, dodge, and the liberation rule.

-   The curve scales enemy and boss **statistics**: enemy HP, enemy attack
    damage, enemy attack cadence, Warden HP, and the Warden's bomb cadence.
-   Movement speed does not scale, so a floor never becomes an unfair chase.
-   The floor remains the fixed six-room branch with exactly three mobs and one
    Warden. Enemy count, the archetype roster, and the branch topology do not
    change with depth.
-   "Teaching floor" means forgiving values and composition only. There are no
    tutorial prompts, overlays, hints, or tutorial state.
-   The exact first-pass values and the depth cap live in the version's design
    decisions; they are a starting baseline subject to playtest tuning.

The depth curve does not change the economy: skill-point income and shop prices
stay flat (see §6), so the shop's relative value declines as floors get harder.
That decay is accepted for this slice and recorded as a known balance question.

There is no random drop, chest, loot table, inventory grid, shop refresh,
post-death purchase, meta-progression, persistence, or final floor in this
slice. These are deferred to later versions, not removed from the product
direction.

The `0.5.0` release added the title/start screen, Escape pause, death summary,
restrained CC0/synthesized audio with a mute toggle, and a Vercel deployment
(`dev` staging, `main` production). The `0.6.0` presentation pass added a boot
loading screen that reports progress while sprite images, audio, and the
display font are prepared, then fades into the existing title screen; it does
not replay on restart or descent.

### 4.2 Safe rooms

The long-term design generates:

-   At least **one** safe room.
-   At most **three** safe rooms.
-   A randomized number and placement of safe rooms within those limits.

Safe rooms can serve different purposes:

  Safe-room type   Intended purpose
  ---------------- ---------------------------------------------------
  Shop             Spend skill points and purchase items or skills
  Quest room       Accept challenges for additional rewards
  Rest room        Recover health and prepare for further encounters

Safe-room types should not repeat on the same floor. The current
interpretation of "never repeat" is **no duplicate safe-room types
within a single floor**.

Safe rooms are intended to be safe places between dangerous parts of the
dungeon. The exact transition and encounter sequence is not yet fixed.

#### Current `0.7.0` implementation

The current slice has exactly one safe room per floor: the shop, placed at
the end of the left branch. It is not randomized in count or placement, and
there is no quest or rest room. The shop sells the healing draught and a
one-time Vigor upgrade, and it closes for the floor when the Warden is
summoned. The broader randomized safe-room vision above remains future work,
not a change to this slice.

#### Safe-room combat rule (operator-approved 2026-11-14, `0.9.0`)

The `0.8.0` build left the shop's safe zone absolute. The player could enter it —
or lure a mob or the Floor Warden to its threshold — while hunted, become
untouchable inside, and still attack outward. That was recorded as a known issue
on 2026-11-13 and is fixed in `0.9.0`.

The approved rule:

- The shop ward is **sealed while any living enemy is hunting the player**
  (its per-enemy aggro is active). Dead, dying, rested, and harmless emerging
  enemies do not seal it.
- While sealed, the player cannot cross the threshold into the safe zone, by
  walking or dodging. Leaving the zone is always allowed, so a player already
  inside is never trapped.
- While sealed, the safe zone is **not a sanctuary**: the player no longer
  ignores damage there. Enemies still cannot enter the zone, so the player must
  leave, fight, or break pursuit.
- The shop cannot be opened while sealed. The existing rule that the shop closes
  once the Warden is summoned is unchanged.
- The existing threshold band changes from cyan to ember and reads
  `WARD SEALED`. A refused entry shows `The ward holds — enemies are hunting.`
  at the threshold. The feedback requires no audio and respects reduced motion.
- The exact predicate and edge-case behavior live in
  `design/0.9.0/design-decisions.md`.

The broader randomized safe-room vision above remains future work.

### 4.3 Proposed core loop

The current `0.7.0` loop is:

1.  Enter a floor and follow the fixed branch from the start room.
2.  Fight and purify mobs, liberating their spirits. Each rested mob grants
    1 skill point.
3.  Choose the left branch for the second mob and the shop dead end, or the
    right branch for the third mob and the locked boss arena.
4.  Break pursuit, then spend skill points in the safe-room shop on a healing
    draught or the one-time Vigor upgrade; use the draught when needed. The
    ward is sealed while an enemy hunts.
5.  Rest all three mobs to fill the spirit meter and unlock the arena.
6.  Enter the arena and explicitly summon the Warden, or backtrack to the
    shop first. The shop closes once the Warden is summoned.
7.  Defeat the Warden, gaining 3 skill points, and take the opened stairs to
    the next floor.
8.  Repeat until the player dies; death/restart discards the run's skill
    points, draught, and Vigor.

Rewards in this slice are shop-only: there are no random drops, chests, or
loot tables. The broader vision still includes loot, quests, and rest rooms.
The player's stated example remains a guiding direction:

**Dungeon fight → liberation → skill points → dungeon fight → liberation → shop → boss → continue downward.**

It is not a strict requirement that every floor contain every future
safe-room type.

------------------------------------------------------------------------

## 5. Enemies and bosses

### 5.1 General enemies

General enemies should use simple, recognizable archetypes. Their
purpose is to create combat pressure without requiring every encounter
to teach a complex mechanic.

Initial archetype examples:

-   **Melee:** Pursues the player and attacks at close range.
-   **Ranged:** Attacks from a distance.
-   **Tank:** Absorbs damage and can obstruct the player's path.
-   **Fast:** Moves quickly and pressures the player.

These are examples for the initial enemy roster, not a final list.

Two archetypes are implemented so far (`0.2.0`, operator-approved
2026-11-02): the **melee** chaser and a **ranged** enemy that keeps a
mid-range distance band, fires only with line of sight after a
telegraph, and uses a slow projectile that is destroyed by walls. Tank
and fast remain future archetypes.

Both implemented archetypes carry spirit fragments and follow the
same purification rules (`0.2.0`, operator-approved 2026-11-04).

Floor composition is fixed (`0.7.0`, `0.8.0`): every floor holds two
melee mobs and one ranged mob, except the depth-1 teaching floor, which
spawns melee mobs only (operator-approved 2026-11-13). Depth raises the
mobs' numbers rather than their number, and no new archetype is added in
this slice.

### 5.2 Bosses

Bosses can be substantially more complex than ordinary enemies. They may
combine:

-   Distinctive attack patterns.
-   Special mechanics that require a player response.
-   Multiple mechanics working together.
-   More demanding tests of positioning, timing, and combat mastery.

Bosses are also the **exclusive source of artifacts** in the current
design.

The number of bosses, boss frequency, encounter structure, and whether
bosses appear at fixed floor intervals remain open.

The `0.5.0` slice introduced the first floor boss, the **Floor Warden**
(operator-approved 2026-11-07): one Warden per floor, using the `big_demon`
frames, chasing the player, and alternating a telegraphed melee attack with a
thrown, fused bomb. It carries no spirit fragments and is not a source of
artifacts. Its defeat opens the stairs rather than ending the run.

The `0.7.0` slice replaces the automatic appearance with an explicit summon
(operator-approved 2026-11-09). Resting every mob fills the spirit meter and
unlocks the boss arena; the player enters the arena and summons the Warden
when ready. The player may visit the shop before summoning, and the shop
closes once the Warden is summoned. Boss variety, phases, and artifact drops
remain future work.

`0.8.0` removes the combo finisher, and with it the only source of stagger
(operator-approved 2026-11-13). The Warden cannot be interrupted or stunlocked;
its telegraphed melee and fused bombs must be avoided by movement and dodging.
The Warden's numbers scale with depth; its attack pattern does not change.

------------------------------------------------------------------------

## 6. Loot, items, and progression

The long-term loot design has three categories:

  -----------------------------------------------------------------------
  Category                Source                  Purpose
  ----------------------- ----------------------- -----------------------
  Consumables             Dungeon and/or enemies  Healing, temporary
                                                  effects, and utility

  Currencies              Dungeon and/or enemies  Purchases and
                                                  progression within a
                                                  run

  Artifacts               Bosses only             Special effects that
                                                  can shape a build
  -----------------------------------------------------------------------

Equipment and a complex equipment system are not part of the current
initial scope.

### Current `0.7.0` economy

Skill points are the only currency in the current slice. They are earned by
putting mobs to rest (1 point per mob) and by defeating the Warden (3
points). They are run-scoped: they persist across floors within a run and
reset on death/restart. There is no separate gold, combo point, or score
resource.

The safe-room shop is the only place to spend skill points. It offers a
healing draught (2 HP for 1 point, one carried slot) and Vigor (+1 maximum
HP for the run for 3 points, one-time purchase per run; it disappears from
later shops after purchase). The player carries at most one draught, uses it
with a dedicated key, and healing is capped at maximum HP. The shop closes
once the Warden is summoned.

Income and prices stay flat as depth rises (`0.8.0`, operator-approved
2026-11-13): 1 point per rested mob, 3 for the Warden, 1 for the draught, 3
for Vigor. Deeper floors therefore make the shop progressively less valuable.
That decay is accepted for this slice and recorded as the first economy
question for a later balance pass; no income, price, or inventory scaling
exists yet.

Rewards are shop-only in this slice: there are no random drops, chests, loot
tables, inventory grids, shop refreshes, post-death purchases, artifacts, or
meta-progression. The broader loot categories above remain future direction,
not current scope.

The intended experience is to improve the current run through skillful play
and purchasing decisions, not through permanent progression.

### Death and starting over

There is an important distinction between dying and manually abandoning
a run:

-   **On death:** In the current `0.7.0` slice, the run ends and there are
    no post-death purchases. Skill points, the carried draught, and Vigor
    are discarded on restart. A post-death purchase flow remains future
    work and is not part of this slice.
-   **Manual "Start Over" action:** The player starts a completely fresh
    run with nothing carried over.
-   The game must clearly warn the player before a manual reset that
    current run progress and resources will be lost.

The exact relationship between death, any future post-death purchases, and
the next run must be clarified before that feature is added. Do not silently
assume that death rewards persist permanently.

### Persistence

For the initial design, there is **no saving**:

-   Refreshing or closing the browser loses the active run.
-   No automatic run restoration.
-   Persistent unlocks and meta-progression are not currently part of
    the design.

A future save system can be reconsidered if the game needs it.

------------------------------------------------------------------------

## 7. Platform and technical direction

### Target platform

The target is the **web browser**, with keyboard and mouse as the
primary input devices.

The game is intended to be single-player and offline-friendly:

-   No multiplayer.
-   No accounts or authentication.
-   No backend or server dependency.
-   No online connectivity requirement.

### Technology

The intended rendering technology is the **native HTML5 Canvas API**,
implemented with TypeScript.

The project currently includes Vite as a possible development/build tool
and TypeScript configuration. Vite is suitable as the development server
and build tool; it is not the game engine.

Using Canvas means the project will implement the required game
functionality itself, including:

-   Main game loop and frame updates.
-   Sprite rendering and animation.
-   Camera behavior.
-   Collision detection and resolution.
-   Depth sorting.
-   Keyboard and mouse input.
-   Rendering and performance management.

Do not build a general-purpose game engine. Implement only the systems
needed by the game, and expand them when concrete gameplay requirements
demand it.

Audio uses the native **Web Audio API**. Short CC0 sound files cover concrete
events, and the boss's presence layers are synthesized. Audio must unlock on
a user gesture, must be mutable, and must never be required to understand or
complete a gameplay state.

### Boot and asset loading

The game opens on a loading screen before the title. Boot waits for every
sprite image, every audio cue used by the game, and the display font; it
reports one monotonic progress value and only reveals the title when those
items have settled. Images keep the existing retry-and-fail-loudly rule.

Audio is downloaded during boot and decoded through a suspended Web Audio
context where the browser allows it, then resumed on the first gesture.
Unsupported audio, a blocked decode, or a missing audio file degrades to a
silent but fully playable game; a missing image remains a fatal boot error.
The loading screen is boot-only; restart and descent do not repeat it.

------------------------------------------------------------------------

## 8. Architectural direction

The current proposed source layout is:

``` text
src/
├── game/
│   ├── data/
│   ├── systems/
│   ├── types/
│   └── engine/
├── state/
├── ui/
│   ├── components/
│   ├── screens/
│   ├── input/
│   ├── rendering/
│   └── styles/
└── index.ts
```

Intended responsibilities:

  -----------------------------------------------------------------------
  Area                                Responsibility
  ----------------------------------- -----------------------------------
  `game/data/`                        Static and immutable game content:
                                      definitions, configuration, and
                                      other authored data

  `game/systems/`                     Game rules and mechanics,
                                      Implemented as focused **pure**
                                      functions with no side effects

  `game/types/`                       Domain types and contracts shared
                                      between game layers

  `game/engine/`                      Coordinates game execution and the
                                      order in which systems run

  `state/`                            Runtime state management for the
                                      active game

  `ui/components/`                    Reusable interface elements

  `ui/screens/`                       Menus, HUD, shop, game-over, and
                                      other screen-level views

  `ui/input/`                         Keyboard, mouse, and player input
                                      handling

  `ui/rendering/`                     Canvas drawing, sprites, camera,
                                      animation presentation, and visual
                                      ordering

  `ui/styles/`                        CSS and interface styling

  `index.ts`                          Application entry point and initial
                                      setup
  -----------------------------------------------------------------------

Keep boundaries useful and lightweight. For example, game rules should
not depend on Canvas drawing, and rendering should not decide game
outcomes. Avoid creating extra layers or abstractions until the project
demonstrates a need for them.

The existing repository also includes Cypress for end-to-end testing.
Use it where browser-level flows provide value, such as starting a run,
navigating menus, and confirming reset behavior. Pure game rules should
be testable without requiring a browser where practical.

------------------------------------------------------------------------

## 9. MVP --- first playable milestone

The first milestone should be the smallest version that demonstrates the
complete gameplay loop and is already enjoyable to play.

### MVP scope

-   One playable character.
-   One procedurally generated dungeon floor.
-   A few basic enemy archetypes.
-   WASD movement and mouse aiming.
-   Basic attacks and dodge.
-   HP, damage, and healing.
-   Basic consumables.
-   At least one skill-based challenge or liberation objective.
-   One safe room with a shop.
-   One basic boss.
-   Death, game-over, and restart/reset flow.

The MVP should validate:

1.  Movement and aiming feel responsive.
2.  Combat is engaging and rewards player skill.
3.  Enemies create understandable pressure.
4.  The player can purify enemies and gather enough spirit to face a
    boss.
5.  Loot and the safe room provide useful decisions.
6.  A boss provides a meaningful combat test.
7.  The player can complete the floor's progression and understand the
    run-ending flow.

**Status after `0.5.0` (2026-11-07):** items 1–4, 6, and 7 were implemented
and validated in that slice. Item 5 remained open: there were no
consumables, currency, loot, skill points, or safe room/shop.

The `0.6.0` presentation pass added a boot loading screen, complete
asset/audio preload, and display typography. It improved the first
impression but did not close item 5.

**Status after `0.7.0` (delivered, merged via PR #11):** item 5 is addressed
by the skill-point economy, the safe-room shop, the healing draught, and
Vigor. Items 1–4, 6, and 7 remain implemented from earlier slices, so every
item in the MVP scope list above now has an implementation. MVP completion
still requires the documented end-to-end loop to pass acceptance, QA sign-off,
orchestrator review, and operator confirmation.

**Status for `0.8.0` (delivered, merged via PR #13):** removes the three-hit
chain, which resolves the known combo issue and targets validation item 2
("combat is engaging and rewards player skill"), and adds the first depth
difficulty curve, which gives validation item 7's descent real stakes and
partially addresses the previously deferred difficulty scaling. The post-death
purchase flow, meta-progression, persistence, income scaling, and a general
procedural generator remain deferred and are not part of `0.8.0`. A safe-room
combat exploit found after the merge is recorded in §4.2 and deferred.

**Status for `0.9.0` (MVP acceptance slice):** closes that safe-room exploit
with the ward rule in §4.2, then runs the end-to-end MVP acceptance pass. The
operator confirmed on 2026-11-14 that the seeded, fixed six-room topology
counts as the MVP's procedural floor and that shop-only rewards satisfy
validation item 5. The MVP acceptance criteria are recorded in `GOAL.md`.
Feature scope is otherwise frozen: no new enemy, room, economy, loot, boss,
progression, persistence, art, or audio work is part of this slice.

### Not required for the first MVP

The following are part of the broader vision or possible future
development, but are not necessary to validate the first playable
version:

-   Endless multi-floor generation.
-   Many dungeon themes or regions.
-   A large enemy roster.
-   Multiple bosses.
-   A large catalog of consumables and skills.
-   Complex quest content.
-   A broad artifact collection and many build combinations.
-   Meta-progression and permanent unlocks.
-   Saving and run restoration.
-   Multiplayer, accounts, servers, or leaderboards.

Build the smallest coherent version first. Expand only after playtesting
shows which additions improve the experience.

------------------------------------------------------------------------

## 10. Open design questions

The core concept and first technical direction are established, but
several details should be decided during implementation planning and
playtesting.

### Gameplay and combat

-   ~~Further combo variants beyond the first three-hit chain specified in
    §3.2.~~ Resolved for the current slice: the chain was removed in
    `0.8.0`. Combo variants belong to the deferred challenge direction below.
-   ~~Rework the three-hit light combo and its role in the liberation loop.~~
    Resolved for the current slice: the chain was removed rather than
    retuned (`0.8.0`). A skill-based combo or per-floor challenge system
    remains a future direction — a challenge card found in the safe room,
    one active challenge per floor, progression that persists until the
    challenge is completed, and combo rewards that feed skill points or
    temporary effects. It was discussed on 2026-11-13 and deliberately
    deferred; it is not scoped or approved.
-   Basic and secondary attack behavior. No secondary attack exists.
-   Skill definitions, cooldowns, and resource costs (if any).
-   Dodge distance, duration, and invulnerability behavior.
-   Damage, HP, healing, and difficulty values.
-   Whether attacks are directional, aimed at a point, or use other
    targeting rules.

### Dungeon generation and progression

-   ~~How rooms and corridors are generated and connected.~~ Resolved for
    the current slice: a fixed six-room branch; seeded room sizes, gaps, and
    decoration may vary (`0.7.0`). A general graph/pathfinding generator
    remains future work.
-   ~~How the player finds the exit to the next floor.~~ Resolved for the
    current slice: stairs in the boss arena, opened by defeating the Warden
    (`0.4.0`/`0.5.0`/`0.7.0`).
-   ~~Whether every floor has a boss or bosses appear at intervals.~~
    Resolved for the current slice: one Floor Warden per floor (`0.5.0`).
    Whether that remains the long-term pacing is still open.
-   ~~Floor difficulty scaling and enemy selection.~~ Partially resolved for
    the current slice: numeric depth scaling over a fixed composition with no
    speed scaling (`0.8.0`). Enemy selection, composition changes, and
    difficulty tiers beyond a numeric curve remain open.
-   ~~Safe-room placement and how players reach them.~~ Resolved for the
    current slice: one shop at the end of the left branch (`0.7.0`).
    Randomized safe-room count and placement remain future work.
-   How safe rooms behave during combat. Resolved for the current slice:
    the shop ward is sealed while a living enemy hunts, the player cannot enter
    by walking or dodging, leaving is always allowed, the safe zone stops
    granting damage immunity while sealed, and the shop cannot be opened
    (`0.9.0`, operator-approved 2026-11-14). This replaces the `0.8.0`
    exploit recorded in §4.2. Whether protection is removed or enemies may
    enter remains a future question only if a later safe-room type needs a
    different rule; randomized safe rooms remain future work.
-   Whether safe-room types are unique per floor (the current
    assumption) or across a whole run. The current slice has only the shop.

### Rewards and economy

-   ~~Currency types and sources.~~ Resolved for the current slice: skill
    points only, earned from rested mobs and the Warden (`0.7.0`). Other
    currency types remain future work.
-   Additional skill challenges, difficulty tiers, and reward scaling
    beyond the liberation loop specified in §3.3.
-   Whether skill-point income or shop prices scale with depth. `0.8.0`
    deliberately leaves both flat and accepts the resulting decay in the
    shop's relative value; this is the first economy question for a later
    balance pass.
-   ~~Shop inventory, prices, and refresh behavior.~~ Resolved for the
    current slice: a healing draught for 1 point and a one-time Vigor for 3
    points, with no refresh (`0.7.0`). A broader catalog remains future
    work.
-   What can be purchased after death and how that purchase flow works.
    Deferred; `0.7.0` has no post-death purchases.
-   ~~Consumable inventory limits and usage rules.~~ Resolved for the
    current slice: one carried healing draught, a dedicated use key, 2 HP
    healing capped at maximum HP (`0.7.0`). A broader inventory remains
    future work.
-   Artifact effects, rarity, and build interactions.

### Presentation and user experience

-   Resolution and scaling strategy.
-   HUD layout and required information. Current slice: hearts, depth,
    stairs state, spirit, boss bar, skill points, and carried draught
    (`0.7.0`); the broader layout remains open.
-   Sprite animation requirements.
-   Lighting, shadows, particles, and combat feedback.
-   Audio direction and accessibility options beyond the approved mute,
    optional-audio, and readable-cue rules.
-   ~~Typography for display text.~~ Resolved for the current slice:
    Grenze Gotisch for display headings and the system UI stack for small
    text (`0.6.0`).

### Technical implementation

-   Canvas resolution and scaling approach.
-   Collision representation for walls and entities.
-   Spatial organization and depth-sorting rules.
-   Game-loop timing and pause behavior.
-   ~~Asset loading and error handling.~~ Resolved for the current slice: a
    boot loading screen, complete image/audio/font preload, and a fatal image
    error state (`0.6.0`).
-   Browser compatibility and performance targets.

These are intentionally open. They should be decided when the relevant
system is about to be built, rather than specified prematurely.

------------------------------------------------------------------------

## 11. Development priorities

A pragmatic implementation order is:

1.  **Application foundation:** Start the browser app, create the
    Canvas, load assets, and establish the game loop. — **Done** (`0.1.0`).
2.  **Player foundation:** Implement movement, mouse aiming, camera
    follow, and collision with the environment. — **Done** (`0.1.0`).
3.  **Combat foundation:** Add attacks, damage, health, dodge, and one
    enemy. — **Done** (`0.1.0`).
4.  **Combat depth and liberation loop:** Add combos, additional basic
    enemy archetypes, spirit fragments, and a spirit meter. — **Done**
    (`0.2.0`); the three-hit chain was removed in `0.8.0`, while spirit
    fragments and the spirit meter remain.
5.  **Dungeon slice:** Generate one traversable floor with an exit and a
    small encounter sequence. — **Done** (`0.4.0`); the `0.7.0` branch is
    a fixed six-room slice of the same priority.
6.  **Rewards and safe room:** Add consumables, currency, skill points,
    and one shop room. — **In progress** (`0.7.0`): skill points, the
    healing draught, one-time Vigor, and the safe-room shop are scoped;
    delivered pending implementation and QA.
7.  **Boss encounter:** Add one boss with a readable attack pattern. —
    **Done** (`0.5.0`, Floor Warden).
8.  **Run lifecycle:** Add death, game-over, post-death purchase
    behavior when specified, and a clearly confirmed manual reset. —
    **Partial:** death, summary, and `R` restart exist; the post-death
    purchase flow is undefined.
9.  **Playtesting and refinement:** Tune responsiveness, difficulty,
    feedback, and the overall fight--loot--prepare loop. — **Ongoing.**

The `0.6.0` presentation pass added the boot loading screen, complete
asset/audio preload, and approved display typography without changing this
priority order or the gameplay loop.

The `0.7.0` reward-loop slice advances priority 6 and keeps priority 8
unchanged: it adds the shop and consumables but deliberately leaves
post-death purchases, meta-progression, and persistence for later work.

The `0.8.0` slice advances priority 9 and partially addresses the
difficulty-scaling gap: it replaces the three-hit chain with a single light
attack and adds a numeric depth curve over the fixed branch, without changing
the archetype roster, enemy count, or economy.

The `0.9.0` slice finishes priority 9's first acceptance pass: it closes the
safe-room combat exploit recorded in §4.2 and validates the MVP loop end to
end against the criteria in `GOAL.md`. It adds no content and does not reopen
the economy, generator, archetype, or progression questions.

The order can change when implementation discoveries justify it. Keep
the first playable slice small and testable.

------------------------------------------------------------------------

## 12. Product direction in one paragraph

**skill issue dg** is a single-player, offline-friendly, browser-based
2D action roguelike in a dark-fantasy 3/4 perspective. Players freely
move and aim with keyboard and mouse, master real-time, skill-based
combat, dodge enemy attacks, and descend through procedurally generated
dungeon floors that grow harder with every depth. Enemies are bound by spirit fragments and must be
liberated rather than merely killed, filling a spirit meter that brings
the floor's boss closer. Players collect consumables and currency,
prepare in randomized safe rooms, and defeat bosses to obtain exclusive
artifacts. The dungeon is endless, difficulty increases with descent,
and the central measure of success is how far the player can go through
skill, discovery, and smart build decisions.
