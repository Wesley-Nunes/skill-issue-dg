# skill issue dg

A dark-fantasy action roguelike vertical slice. Descend through generated
dungeon floors, break a mob's spirit fragments without taking a hit, put it
to rest, and summon the **Floor Warden**. Defeat it to open the stairs and
continue deeper. Death is the only end.

Built with TypeScript, the Canvas 2D API, and Vite. No runtime dependencies.

## Controls

| Input | Action |
|---|---|
| `WASD` | Move |
| Mouse | Aim |
| Left mouse button | Light attack combo (three timed steps) |
| `Space` | Dodge (brief invulnerability) |
| `Enter` / `Space` / click | Start from the title screen |
| `Esc` | Pause / resume |
| `M` | Mute / unmute |
| `R` | Restart after death |

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite.

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

## Gameplay loop

1. A floor has four connected rooms. Three mobs guard the rooms between the
   spawn and the stairs.
2. Each mob carries spirit fragments. Break every fragment with a light
   attack without taking damage, then land the killing blow to put the mob to
   rest. A conventional kill returns the mob.
3. Resting every mob fills the spirit meter and summons the Floor Warden in
   the final room. The stairs stay sealed.
4. The Warden chases, swipes at close range, and throws fused bombs at range.
   Bombs mark their landing point, then explode after a short fuse.
5. Defeating the Warden opens the stairs. Descending generates a new floor,
   restores 2 HP (capped at 6), and resets spirit and boss state.

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

## Deployment (Vercel)

The project is a static Vite build.

- **Staging branch:** `dev`
- **Production branch:** `main`
- **Build command:** `npm run build`
- **Output directory:** `dist`

`vercel.json` pins the build command and output directory. The operator
connects the repository in Vercel and maps `dev` to the staging environment
and `main` to production; no hosting credentials live in this repository.

## Debug hooks

Development and e2e builds expose `window.__bootDebug`, `window.__gameDebug`,
and `window.__audioDebug` for Cypress. Production builds expose none of them.
The e2e bundle is built with `VITE_E2E=1`.

## Scope

`0.6.0` adds a polished boot experience and display typography to the
portfolio-ready `0.5.0` vertical slice; it is not the complete MVP. The reward
loop (consumables, currency, loot, safe room/shop, meta-progression,
difficulty scaling, multiple bosses) is deferred. See
[`docs/about-the-project.md`](docs/about-the-project.md) for the product
direction and [`STATE.md`](STATE.md) for the current workflow state.
