# skill issue dg

**▶ Play in your browser: [skill-issue-dg.vercel.app](https://skill-issue-dg.vercel.app)**

A dark-fantasy action roguelike vertical slice. Descend through a seeded
dungeon branch, break a mob's spirit fragments without taking a hit, put it to
rest, and summon the **Floor Warden**. Defeat it to open the stairs and go
deeper. Death is the only end.

![The player facing a first-floor mob with two spirit fragments](docs/screenshots/gameplay.png)

Built with TypeScript, the Canvas 2D API, and Vite. No runtime dependencies.

## Status

`0.9.0` — **MVP**. The loop runs from the title screen to the Floor Warden,
the shop, and descent, and it is deployed to production. See
[`GOAL.md`](GOAL.md) for the acceptance contract and
[`qa/0.9.0/001-report.md`](qa/0.9.0/001-report.md) for the verification
report.

## Requirements

- A desktop browser with a keyboard and mouse (Chrome or Edge recommended).
- [Node.js](https://nodejs.org/) 22 or newer and npm, for development only.
- No install or account. Progress is held in memory, so closing the tab ends
  the run.

## Controls

| Input | Action |
|---|---|
| `WASD` | Move |
| Mouse | Aim |
| Left mouse button | Light attack (one committed swing per press) |
| `Space` | Dodge (brief invulnerability) |
| `E` | Interact: browse the shop, summon the Warden |
| `Q` | Use the carried healing draught |
| `W` / `S` or `↑` / `↓` | Move the shop selection |
| `Enter` | Confirm a shop purchase |
| `Enter` / `Space` / click | Start from the title screen |
| `Esc` | Pause / resume; close the shop |
| `M` | Mute / unmute |
| `R` | Restart after death |

## Gameplay loop

1. A floor is a seeded six-room branch: start, first mob, a junction, a shop
   dead end and second mob on the left, and a third mob plus the gated Warden
   arena on the right. Room sizes and decoration vary by seed; the layout does
   not.
2. Each mob carries spirit fragments. Break every fragment with a light
   attack without taking damage, then land the killing blow to put the mob to
   rest. A conventional kill returns the mob.
3. Resting a mob earns 1 skill point. Resting all three fills the spirit meter
   and opens the arena gate. Summoning is a deliberate act: press `E` at the
   altar inside the arena.
4. The shop is a safe room off the junction. Its protection applies between
   encounters only: while a living enemy hunts you, the threshold turns ember
   and refuses entry, and the shop cannot be opened. Leaving the safe room is
   always allowed. Browse with `E` to buy a healing draught for 1 point (one
   slot, heals 2 HP, use with `Q`) or Vigor for 3 points (+1 maximum and
   current HP, once per run). The shop closes permanently for the floor when
   the Warden is summoned.
5. Inside the open arena, press `E` at the altar to summon the Floor Warden.
   It chases, swipes at close range, and throws fused bombs at range. Defeating
   it awards 3 skill points and opens the stairs.
6. Descending generates a new floor, restores 2 HP, and resets spirit, gate,
   boss, and shop state. Skill points, a carried draught, Vigor, and the raised
   maximum HP persist for the run and reset on death.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Scripts

```bash
npm run dev        # Vite dev server
npm run typecheck  # TypeScript, no emit
npm test           # Vitest unit suite
npm run build      # Typecheck + production bundle
npm run preview    # Serve the production bundle
npm run e2e        # Build with the e2e flag, preview, and run Cypress
```

`npm run e2e` runs Cypress against the production bundle. Set
`CYPRESS_BROWSER=chrome` to avoid Electron's requestAnimationFrame throttling
on some desktops.

## Project structure

```text
src/
  game/
    data/       static data: config, floor generation, sprite file names
    systems/    deterministic rules: combat, enemy AI, bombs, collision
    engine/     orchestration and the run state machine
    types/      domain types shared across layers
  state/        runtime state factories
  ui/
    audio/      Web Audio manager and synthesized boss layers
    boot/       boot loading-screen progress and DOM controller
    input/      keyboard and pointer translation
    rendering/  canvas renderer and visual effects
    styles/     page styling
cypress/        end-to-end specs and shared commands
```

Game rules stay independent from rendering and input. Systems are pure where
practical; the engine coordinates them and owns the mutable run state.

## Boot and font

The game opens on a loading screen that reports real progress while it fetches
all 54 sprite images, downloads and decodes every audio cue, and prepares the
display font. The screen paints from static markup before the JavaScript
bundle runs, then fades into the title once those assets are settled. It is
boot-only; restart and descent do not repeat it. A missing image is a fatal
boot error, while unavailable audio or a failed font falls back silently.

Display headings use the self-hosted **Grenze Gotisch** variable font
(SIL Open Font License 1.1). See
[`public/assets/fonts/ATTRIBUTION.md`](public/assets/fonts/ATTRIBUTION.md).
Small HUD values, controls, and status text stay in the system UI stack.

## Audio

Concrete events use supplied CC0 sound files under `public/assets/audio/`.
The Warden's presence, breathing, fire, voice, and magic are synthesized with
the Web Audio API. Every cue is downloaded and decoded before play, then
unlocked on the first user gesture, toggled with `M`, and never blocks play.
The game is fully playable muted.

See [`public/assets/audio/ATTRIBUTION.md`](public/assets/audio/ATTRIBUTION.md)
and the DungeonTileset II attribution note under
`public/assets/dungeon-tileset-ii/`.

## Deployment

The production build is live at
**[skill-issue-dg.vercel.app](https://skill-issue-dg.vercel.app)**. The
project is a static Vite build hosted on Vercel.

- **Production branch:** `main`
- **Staging branch:** `dev`
- **Build command:** `npm run build`
- **Output directory:** `dist`

`vercel.json` pins the build command and output directory. No hosting
credentials live in this repository.

## Debug hooks

Development and e2e builds expose `window.__bootDebug`, `window.__gameDebug`,
and `window.__audioDebug` for Cypress. Production builds expose none of them.
The e2e bundle is built with `VITE_E2E=1`.

## Scope

`0.9.0` is the released MVP: one seeded dungeon branch, the run-scoped reward
loop (skill points, the shop, the healing draught, one-time Vigor, the arena
gate, and the explicit Warden summon), the single light attack and depth
curve, and the sealed safe room. Random drops, loot tables, gold, score,
artifacts, meta-progression, a general floor generator, multiple bosses, and
saved runs remain deferred.

See [`docs/about-the-project.md`](docs/about-the-project.md) for the product
direction, [`GOAL.md`](GOAL.md) for the MVP contract, and
[`STATE.md`](STATE.md) for the current workflow state.
