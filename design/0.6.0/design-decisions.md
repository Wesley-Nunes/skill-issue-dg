# Design decisions — 0.6.0 boot loading screen and typography

Owner: `design` · Task `0.6.0/001` · Approved for implementation on
2026-11-08 under the operator's request for a game-styled loading screen,
audio preload, and a matching display typeface.

## 1. Source and status

- Product context: `docs/about-the-project.md` §2, §4.1, §7, §10, §11.
- Task: `docs/tasks/0.6.0/001-design.md`.
- Status: approved; no blocking operator design question remains.
- Operator decisions: the loading screen must show real progress while the
  game downloads its images and audio; the display font is **Grenze
  Gotisch**.
- The screen reuses the existing dark-dungeon palette and the title screen's
  text-first hierarchy.

## 2. Design goals

- Remove the silent boot gap without making the player wait through an
  artificial sequence.
- Make the first impression feel like part of the game, not a generic
  browser loading spinner.
- Show honest progress across images, audio, and the display font.
- Keep the loading screen readable, calm, and accessible.
- Introduce one distinctive display face without hurting small-text
  legibility.

## 3. Boot sequence

1. The page paints a full-screen loading overlay immediately, above the game
   canvas.
2. Sprite images load sequentially with the existing retry behaviour.
3. Audio files download and decode through the preload path.
4. The display font loads through the local `@font-face`.
5. The overlay advances as each unit settles.
6. At 100%, the overlay remains visible for at least 700 ms, fades out over
   300 ms, and reveals the already-rendered title screen.
7. The title screen keeps its existing click/Enter/Space start behaviour.
8. Restart and floor descent do not replay the overlay.

There is no skip action: the overlay represents required boot work. Input is
not forwarded to the game until the title is visible.

## 4. Loading-screen layout

Full-screen overlay on `#0b0a0f`:

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                     skill issue dg                           │
│                        ────────                              │
│              A DARK-FANTASY ACTION ROGUELIKE                 │
│                                                              │
│         Preparing the descent…                     42%       │
│         ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Content is horizontally centred, with a maximum width of 560 px and 86 vw
  on narrow viewports. It sits slightly above the vertical centre (about
  2 vh up) so the title block has visual weight.
- **Title:** `skill issue dg`, Grenze Gotisch 600, responsive 56–80 px
  (72 px preferred), colour `#f2e9da`, tight line-height, no letter-spacing.
- **Rule:** 140 × 3 px spirit-cyan bar under the title, 22 px below it,
  with a soft cyan glow.
- **Tagline:** `A DARK-FANTASY ACTION ROGUELIKE`, `system-ui`, 14 px,
  uppercase, 0.22em letter-spacing, `rgba(255, 255, 255, 0.48)`, 18 px below
  the rule and 54 px above the progress block.
- **Progress track:** full content width, 5 px high, 1 px spirit-cyan border
  at 28% alpha, dark cyan-tinted track.
- **Progress fill:** spirit cyan with a subtle glow; width follows the
  percentage with a 200 ms ease-out transition. It must not animate
  backwards.
- **Meta row:** 14 px below the track, 12 px `system-ui`. Left: status
  copy. Right: percentage with tabular figures. Status is
  `rgba(255, 255, 255, 0.50)`; percentage is `#bfe9ff`.
- **Status copy:** `Preparing the descent…` for the whole load. Do not add
  rotating tips or fake stages.
- **Background:** `#0b0a0f` with a faint spirit-cyan radial glow behind the
  title block and a low ember-red glow at the bottom edge, plus a soft
  vignette. It must not compete with the text.
- **Motes:** five 2 px motes (four cyan, one ember) drifting upward for
  11–19 s with low opacity and a soft glow. They are decorative only.

The existing canvas title composition, title copy, subtitle position, and
controls block are otherwise unchanged. The loading screen uses the same
title/tagline hierarchy so the transition feels continuous.

## 5. Typography

### Family and assets

- Display family: **Grenze Gotisch**, variable weight 100–900, SIL Open Font
  License 1.1, by Omnibus-Type.
- Self-host the WOFF2 file under `public/assets/fonts/`; include the OFL
  license text and an attribution note beside it. Do not request the font
  from Google Fonts or any other CDN.
- CSS stack:
  `"Grenze Gotisch", system-ui, sans-serif`.
- `font-display: swap`; boot waits for the display weights through
  `document.fonts.load`, but a font failure must fall back rather than block
  the title.

### Application

| Surface | Font | Size / weight |
|---|---|---|
| Loading title | Grenze Gotisch | responsive 56–80 px, 600 |
| Main title | Grenze Gotisch | 56 px, 600 |
| Pause heading | Grenze Gotisch | 36 px, 600 |
| Death heading | Grenze Gotisch | 48 px, 600 |
| Floor-entry banner | Grenze Gotisch | 30 px, 500 |
| Boss name | Grenze Gotisch | 16 px, 600 |
| Tagline, status, controls, HUD values, small labels | `system-ui` | current sizes |
| Error panel | `system-ui` | current readable size |

The display face is for headings and identity. Small HUD and control text
stay in the system stack so numbers, key names, and instructions remain
unambiguous.

## 6. Loading states

| State | Presentation |
|---|---|
| **Loading** | Title, tagline, status, track, fill, percentage. Progress is monotonic. |
| **Audio unavailable** | Same screen; audio units count as settled, the title still appears, and the game starts silently. No blocking dialog. |
| **Font unavailable** | Same screen with the `system-ui` fallback; boot continues. |
| **Complete** | Fill reaches 100%, percentage shows `100%`, 700 ms minimum hold, then 300 ms fade. |
| **Fatal image failure** | Replace the progress content with the game title and a readable error panel: a short failure line, the failing asset detail if available, and `Reload to try again.` Keep the dark background and title identity. Do not reveal the title screen. |

The overlay must never sit at a stalled percentage with no explanation. An
optional audio failure is not user-facing beyond the silent result; a fatal
image failure is.

## 7. Motion and reduced motion

- Mote drift and the progress-fill transition are the only animation.
- No pulsing percentage, no flashing border, no rapid strobe, and no
  full-screen flash during load.
- With `prefers-reduced-motion: reduce`, disable mote drift and use an
  instant progress-fill update; keep the final fade if it does not cause
  discomfort, otherwise remove it.
- The title screen's existing pulse and the game's existing effects are
  unchanged.

## 8. Accessibility and readability

- The track exposes `role="progressbar"`, `aria-valuemin="0"`,
  `aria-valuemax="100"`, `aria-valuenow`, and an accessible label such as
  `Loading game assets`.
- The status line is polite live text so completion is announced once, not
  on every percentage tick.
- Title and body contrast must remain readable at 1024 × 640 and
  1440 × 810.
- The screen is not keyboard-trapping and has no focusable skip control.
- Input is ignored until the title appears.
- Decorative motes are hidden from assistive technology.

## 9. Transition and existing screens

- The game loop and title screen initialise behind the overlay, so the
  reveal is a fade to an already-drawn title, not a blank-frame handoff.
- The title screen keeps its copy, layout, controls, and pulse. Only the
  display font changes.
- Pause, death, floor-entry, and boss-name layouts keep their positions and
  colours; only the approved typeface changes.
- The HUD, combo pips, spirit meter, bomb telegraphs, and combat effects are
  unchanged.

## 10. Asset and licence requirements

- Grenze Gotisch WOFF2 file, OFL 1.1 text, and attribution note under
  `public/assets/fonts/`.
- No new image or audio assets are required for the loading screen; its
  background, rule, bar, and motes are procedural CSS.
- The complete audio manifest must include every cue used by the game,
  including `cloth1–4.ogg` and `creak2.ogg`.
- The page makes no external network request for fonts, images, or audio.

## 11. Deferred work

Skipping the loader, rotating tips, lore text, staged status messages,
download-size optimisation, service-worker caching, a second loader on
descent/restart, settings/volume UI, localisation, mobile/touch layout,
additional display fonts, and any gameplay or balance change are deferred.

## 12. Assumptions

- The 700 ms minimum and 300 ms fade are appropriate for a portfolio build
  and avoid a one-frame flash on fast connections.
- One static status line is enough; staged copy would add noise without
  helping the player.
- Grenze Gotisch at 16 px is still readable for the boss name; if visual
  review shows otherwise, the boss name may keep `system-ui` without
  changing the rest of the contract.
- Audio is optional by product rule, so an audio failure must never prevent
  the title or gameplay.
