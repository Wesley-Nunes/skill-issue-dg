# Project Goal

## Initial goal: deliver the MVP

The initial product goal is to define, build, and validate a playable **Minimum
Viable Product (MVP)** for **skill issue dg**, a 2D roguelike game.

The MVP scope was locked with the operator on 2026-11-14. The contract below is
the acceptance standard; it does not approve any feature outside it. Product
rules still live in `docs/about-the-project.md`, and version work still lives in
`docs/tasks/<sem-ver-id>/`.

## Product and engineering principles

All work must apply:

- **KISS** — favor the simplest solution that meets the need.
- **YAGNI** — build only what the approved MVP needs now.
- **SoC** — separate domain rules, game orchestration, runtime state, input,
  rendering, and UI.
- **Pragmatism** — optimize for a playable, understandable, testable result;
  avoid speculative architecture.

## MVP goal contract (agreed 2026-11-14)

### 1. Player experience

A new player can start from the title screen, learn movement, aiming, the
single light attack, and dodge, understand the liberation rite, earn and spend
skill points, summon and defeat the Floor Warden, descend, and die and restart —
without reading external documentation. Every required state is understandable
with audio muted. The intended feeling is deliberate, skill-based combat:
mistakes cost HP, and a safe room is a place to prepare **between** encounters.

### 2. Core loop

1. Start on the title screen and enter a run at depth 1.
2. Fight the floor's mobs. Break their spirit fragments with light attacks
   without losing HP, then land the killing blow to put each mob to rest; a
   conventional kill returns the mob.
3. Each rested mob grants 1 skill point. Break pursuit and enter the shop ward
   to buy a healing draught (1 point, one carried slot) or the one-time Vigor
   upgrade (3 points), or save the points.
4. Resting all three mobs fills the spirit meter and opens the arena gate. Enter
   the arena and explicitly summon the Warden when ready.
5. Defeat the Warden (3 points); the stairs open. Descending generates the next
   seeded floor, heals 2 HP, raises depth, and resets per-floor state while
   skill points, the carried draught, Vigor, and maximum HP persist.
6. Repeat until death. The death summary appears; `R` starts a fresh depth-1 run
   and discards run rewards.

The player may take the branches in either order, may skip the shop, and may
choose when to summon. There is no final floor, no post-death purchase, and no
meta-progression in the MVP.

### 3. MVP boundaries

**Included:**

- one playable character with WASD movement, mouse aim, one committed light
  attack, dodge with i-frames, HP, damage, and healing;
- one seeded dungeon floor with a fixed six-room branch, tile collision, line of
  sight, and endless descent;
- three mobs per floor (two melee, plus the ranged imp from depth 2), spirit
  fragments, the liberation rite, failed-rite respawn, and the spirit meter;
- skill points, the safe-room shop with the draught and one-time Vigor, the
  explicit Warden summon, and one Floor Warden;
- a numeric depth curve from depth 1 to the depth-10 cap, with a melee-only
  depth-1 teaching floor;
- the safe-room ward rule: sealed while a living enemy hunts, open otherwise;
- a title screen, pause, death summary, restart, mute, boot loading screen, and
  the existing display typography and audio;
- automated unit and Cypress coverage, plus the existing Vite/Vercel build.

**Explicitly excluded from the MVP (deferred, not deleted):**

- a general room-graph or pathfinding floor generator;
- randomized safe-room count/placement, quest rooms, rest rooms, or a second
  safe room;
- random drops, chests, loot tables, inventory grids, artifacts, or a broader
  shop catalog;
- post-death purchases, meta-progression, persistence, saving, or run
  restoration;
- additional enemy archetypes, enemy-count scaling, boss phases, boss variety,
  or multiple bosses;
- a skill tree, secondary attack, heavy attack, buffs, status effects, or the
  deferred per-floor challenge/combo system;
- income or price scaling with depth;
- tutorial prompts/overlays, key remapping, a settings menu, mobile/touch
  layout, localisation, new art, or new audio.

**Accepted MVP limitations (recorded, not defects):**

- "Procedurally generated floor" means seed-driven room sizes, gaps, and
  decoration over the fixed six-room topology; the layout itself does not vary
  (operator decision, 2026-11-14).
- "Loot and the safe room provide useful decisions" is satisfied by earned
  skill points and the draught-versus-Vigor choice; there are no drops
  (operator decision, 2026-11-14).
- The economy is flat, so the shop's relative value declines with depth.
- Hosted CI and the Vercel deployment are release checks owned by the operator;
  they are not gameplay criteria.

### 4. Success criteria (observable)

| ID | Criterion | Evidence required |
|---|---|---|
| SC1 | From the title, the player can move with WASD, aim with the mouse, swing once per press, and dodge with i-frames. | Automated input/state assertions and a recorded playthrough |
| SC2 | A swing breaks every intact fragment in its arc; taking HP damage restores all broken fragments; a mob killed with intact fragments respawns; a mob killed with none rests permanently and grants spirit and 1 point. | Unit tests plus an end-to-end rite |
| SC3 | The player can earn points, buy the draught and Vigor, carry and use the draught, and sees the resulting HP/point/HUD state. | Unit and Cypress coverage of purchase, carry, use, and refusal states |
| SC4 | Resting every mob opens the arena; the Warden is summoned explicitly; it uses telegraphed melee and bombs and cannot be staggered; defeating it opens the stairs and grants 3 points. | Cypress boss flow plus unit assertions |
| SC5 | The stairs descend to a new seeded floor, heal 2 HP, raise depth, scale enemy and boss numbers to the depth table, and reset spirit/gate/boss/shop state while run rewards persist. | Unit and Cypress descent coverage |
| SC6 | Death shows the summary; `R` restarts at depth 1 and clears skill points, draught, and Vigor. Manual reset/refresh rules are unchanged. | Cypress death/restart coverage |
| SC7 | The shop ward is sealed while any living enemy hunts and open otherwise; entry by walking or dodging is refused while sealed; leaving is always allowed; the exploit is closed for mobs and the Warden. | Unit tests, Cypress lured-enemy scenario, and a recorded reproduction attempt |
| SC8 | Required states are readable with audio muted; the mute toggle and reduced-motion behavior work; no new HUD element or hotkey is required. | Canvas captures and the existing audio/reduced-motion tests |
| SC9 | `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` pass from a clean install; the production bundle has no debug hook. | CI-equivalent command log and bundle check |
| SC10 | The full loop in §2 can be completed end to end in one recorded run, including at least one real rest, one real purchase, one real summon, and one descent. | Recorded acceptance run by QA/operator |

### 5. Technical constraints

- Target: a single-player, offline-friendly **web browser** game; keyboard and
  mouse; no accounts, backend, or connectivity requirement.
- Rendering: native HTML5 Canvas 2D with TypeScript; Vite is the build tool, not
  an engine.
- No runtime dependencies, no new asset pack, and no new audio.
- Seeded generation and deterministic pure rules; game rules must not depend on
  rendering.
- Audio is optional and must never be required to understand a state.
- Persistence is out of scope: a refresh loses the run.

### 6. Quality bar

- Every changed behavior has meaningful automated coverage at the lowest useful
  level; browser-level flows use Cypress and `cypress/support/`.
- QA verifies independently against the task and design contract, records
  evidence, and reports blocking findings instead of silently fixing them.
- The orchestrator reviews every diff for approved scope, architecture, dead
  code, and regressions.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run e2e` must pass
  before acceptance; hosted CI is recorded as pending until it is visible on
  GitHub.
- Known limitations and deferred work are documented in
  `docs/about-the-project.md` and `STATE.md`.

## Current progress (2026-11-14)

Versions `0.1.0`–`0.8.0` are delivered and merged into `dev`. Together they
provide:

- one playable character with WASD movement, mouse aim, a single light attack,
  dodge with i-frames, HP, and damage;
- a seeded six-room dungeon branch with corridors, tile collision, line of
  sight, three melee/ranged mobs, spirit fragments, and endless descent;
- a Floor Warden the player explicitly summons once every mob is at rest, with
  a telegraphed melee attack and fused bombs;
- skill points earned by resting mobs, a safe-room shop selling a healing
  draught and a one-time Vigor upgrade, and a reward loop that persists across
  floors within a run;
- death, run summary, restart, heal-on-descent, a title/start screen, pause,
  restrained CC0/synthesized audio, a boot loading screen, and a mute toggle;
- a Vite build configured for Vercel (`dev` staging, `main` production);
- the `0.8.0` single light attack and depth curve.

`0.9.0` is the MVP acceptance slice: it closes the post-`0.8.0` safe-room combat
exploit and completes the end-to-end acceptance evidence for the criteria
above. It adds no content.

## Definition of MVP completion

The MVP is complete only when all of the following are true:

- every success criterion in §4 has passing evidence;
- the core loop in §2 has been completed end to end in a recorded run;
- QA has verified the implementation independently against this contract and
  the version's design decisions;
- typecheck, unit, build, and Cypress checks pass from a clean install, and the
  production bundle has no debug hook;
- known limitations and intentionally deferred work are documented;
- the orchestrator has reviewed the changes and updated `STATE.md`;
- the operator has confirmed the result.

Hosted CI and the Vercel deployment must be recorded truthfully as pending
until they are confirmed on the host; they are not evidence of gameplay
completion.
