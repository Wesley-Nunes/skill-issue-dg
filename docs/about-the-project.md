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
avoiding damage, and executing combos.

The current `0.5.0` slice completes the dark-fantasy liberation frame: a
mob is not simply killed. Its spirit fragments must be broken without
taking a hit, and only then can it be put to rest. Conventional kills
return the mob, while a completed rite grants spirit toward the floor's
boss. Purifying every mob fills the spirit meter and summons the Floor
Warden; defeating it opens the stairs.

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
    executing combos.
2.  **Build strategy:** Combining acquired skills and boss artifacts to
    create useful synergies.

Combat should reward deliberate execution. Automatic targeting is not
the intended default; attacks should use the mouse aim direction or
position as appropriate to the attack.

The player has basic attacks and a three-hit light combo
(operator-approved for `0.2.0` on 2026-11-02, revised 2026-11-03):

-   Pressing attack inside the chain window advances to the next step.
    Input is not buffered: a press before or after the window breaks
    the chain, so a steady mash cannot complete it.
-   The chain window opens shortly after the current swing lands and
    stays open only briefly; a press that misses it costs the chain.
-   Damage escalates across the chain, and the third hit (the finisher)
    has a wider arc and briefly staggers its target.
-   A whiff, an expired window, a mistimed press, or taking damage
    returns the chain to its first step.
-   Three pips above the player show the chain progress and briefly
    pulse when the next input window is open.
-   Final timings, window lengths, and damage values live in the
    version's design decisions; ability cooldowns remain open.

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

The `0.5.0` slice gives the spirit meter its payoff (operator-approved
2026-11-07). When every mob on the floor is at rest and the meter is full,
the **Floor Warden** appears in the final room. The Warden does not carry
spirit fragments and does not rest or respawn; it fights with a telegraphed
melee attack and fused bombs. Defeating it opens the stairs, and the run
continues downward. The boss bar, telegraphs, and bomb landing marker are
defined in the version's design decisions.

Skill points and the combo challenge from the first `0.2.0` pass are
removed. Skill-point spending, drops, and shops remain future work.

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

#### Current slice: `0.5.0`

The first dungeon slice uses a simple seeded generator. A floor has four
rooms joined by walkable corridors, with the player starting in the first
room and the stairs in the last. The three non-start rooms contain the
existing melee and ranged enemies. Every mob must be put to rest to fill the
spirit meter; that summons the Floor Warden in the final room. Defeating the
Warden opens the stairs, and walking onto them descends to a newly generated
floor.

The spirit meter and boss state are per floor and reset on descent. The
player's HP persists and is restored by 2 HP on descent, capped at the
maximum. There is no difficulty scaling, safe room, shop, consumable, loot,
artifact, or final floor in this slice. These are deferred to later versions,
not removed from the product direction.

The release also adds a title/start screen, Escape pause, a death summary,
restrained CC0/synthesized audio with a mute toggle, and a Vercel deployment
(`dev` staging, `main` production).

The `0.6.0` presentation pass adds a boot loading screen that reports progress
while sprite images, audio, and the display font are prepared, then fades into
the existing title screen. It does not add a second loading screen on restart
or descent.

### 4.2 Safe rooms

Each floor generates:

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
within a single floor**; 

Safe rooms are intended to be safe places between dangerous parts of the
dungeon. The exact transition and encounter sequence is not yet fixed.

### 4.3 Proposed core loop

The current high-level loop is:

1.  Enter and explore a generated dungeon floor.
2.  Fight and purify enemies, liberating their spirits.
3.  Collect loot and currency.
4.  Visit a safe room when available.
5.  Spend skill points, shop, accept quests, or rest.
6.  Continue exploring and fighting.
7.  Summon or face the floor boss once enough spirit is gathered.
8.  Find the way down to the next floor.
9.  Repeat until the player dies.

The player's stated example was:

**Dungeon fight → liberation → loot → dungeon fight → liberation → shop/quest → boss → continue downward.**

This is a guiding loop, not a strict requirement that every floor
contain exactly this sequence.

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

The `0.5.0` slice implements the first floor boss, the **Floor Warden**
(operator-approved 2026-11-07). One Warden appears on every floor when the
spirit meter fills. It uses the `big_demon` frames, chases the player, and
alternates a telegraphed melee attack with a thrown, fused bomb. It carries no
spirit fragments and is not a source of artifacts. Its defeat opens the
stairs rather than ending the run. Boss variety, phases, and artifact drops
remain future work.

------------------------------------------------------------------------

## 6. Loot, items, and progression

The initial loot design has three categories:

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

### Run-based progression

The long-term design has the player gain skill points by completing
challenges and spend them on items and/or skills during a run. Shops
are located in safe rooms rather than being freely accessible at any
time. Skill points, spending, shops, and challenge rewards are **not**
part of `0.2.0`; the current reward is spirit from purified enemies.

The intended experience is to improve the current run through skillful
play, discovery, and purchasing decisions.

### Death and starting over

There is an important distinction between dying and manually abandoning
a run:

-   **On death:** The player can use accumulated skill points to buy
    things. The exact post-death purchase flow and what can be bought
    still need to be specified.
-   **Manual "Start Over" action:** The player starts a completely fresh
    run with nothing carried over.
-   The game must clearly warn the player before a manual reset that
    current run progress and resources will be lost.

The exact relationship between death, post-death purchases, and the next
run must be clarified during detailed progression design. Do not
silently assume that all death rewards persist permanently.

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
-   Basic attacks, combos, and dodge.
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

**Status after `0.5.0` (2026-11-07):** items 1–4, 6, and 7 are implemented
and validated in the current slice. Item 5 remains open: there are no
consumables, currency, loot, skill points, or safe room/shop. The post-death
purchase flow and meta-progression also remain undefined. The MVP is therefore
not complete, even though the vertical slice is portfolio-ready.

The `0.6.0` presentation pass adds a boot loading screen, complete
asset/audio preload, and display typography. It improves the first
impression but does not close item 5; the MVP remains incomplete.

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

-   Further combo variants beyond the first three-hit chain specified in
    §3.2.
-   Basic and secondary attack behavior.
-   Skill definitions, cooldowns, and resource costs (if any).
-   Dodge distance, duration, and invulnerability behavior.
-   Damage, HP, healing, and difficulty values.
-   Whether attacks are directional, aimed at a point, or use other
    targeting rules.

### Dungeon generation and progression

-   ~~How rooms and corridors are generated and connected.~~ Resolved for
    the current slice: a seeded four-room left-to-right chain (`0.4.0`).
-   ~~How the player finds the exit to the next floor.~~ Resolved for the
    current slice: stairs in the final room, opened by defeating the boss
    (`0.4.0`/`0.5.0`).
-   ~~Whether every floor has a boss or bosses appear at intervals.~~
    Resolved for the current slice: one Floor Warden per floor (`0.5.0`).
    Whether that remains the long-term pacing is still open.
-   Floor difficulty scaling and enemy selection.
-   Safe-room placement and how players reach them.
-   Whether safe-room types are unique per floor (the current
    assumption) or across a whole run.

### Rewards and economy

-   Currency types and sources.
-   Additional skill challenges, difficulty tiers, and reward scaling
    beyond the liberation loop specified in §3.3.
-   Shop inventory, prices, and refresh behavior.
-   What can be purchased after death and how that purchase flow works.
-   Consumable inventory limits and usage rules.
-   Artifact effects, rarity, and build interactions.

### Presentation and user experience

-   Resolution and scaling strategy.
-   HUD layout and required information.
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
    (`0.2.0`).
5.  **Dungeon slice:** Generate one traversable floor with an exit and a
    small encounter sequence. — **Done** (`0.4.0`).
6.  **Rewards and safe room:** Add consumables, currency, skill points,
    and one shop room. — **Not started.**
7.  **Boss encounter:** Add one boss with a readable attack pattern. —
    **Done** (`0.5.0`, Floor Warden).
8.  **Run lifecycle:** Add death, game-over, post-death purchase
    behavior when specified, and a clearly confirmed manual reset. —
    **Partial:** death, summary, and `R` restart exist; the post-death
    purchase flow is undefined.
9.  **Playtesting and refinement:** Tune responsiveness, difficulty,
    feedback, and the overall fight--loot--prepare loop. — **Ongoing.**

The `0.6.0` presentation pass adds the boot loading screen, complete
asset/audio preload, and approved display typography without changing this
priority order or the gameplay loop.

The order can change when implementation discoveries justify it. Keep
the first playable slice small and testable.

------------------------------------------------------------------------

## 12. Product direction in one paragraph

**skill issue dg** is a single-player, offline-friendly, browser-based
2D action roguelike in a dark-fantasy 3/4 perspective. Players freely
move and aim with keyboard and mouse, master real-time combo-based
combat, dodge enemy attacks, and descend through procedurally generated
dungeon floors. Enemies are bound by spirit fragments and must be
liberated rather than merely killed, filling a spirit meter that brings
the floor's boss closer. Players collect consumables and currency,
prepare in randomized safe rooms, and defeat bosses to obtain exclusive
artifacts. The dungeon is endless, difficulty increases with descent,
and the central measure of success is how far the player can go through
skill, discovery, and smart build decisions.
