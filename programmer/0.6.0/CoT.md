# Implementation decisions — 0.6.0 boot loading screen and typography

Owner: `programmer` · Task `0.6.0/001` · Implemented on 2026-11-08.

Source contract: `docs/tasks/0.6.0/001-programmer.md` and
`design/0.6.0/design-decisions.md`.

## 1. Scope delivered

- A boot-only loading overlay that paints from static HTML/CSS before the JS
  bundle runs, reports monotonic progress across sprite images, audio, and the
  display font, then fades into a pre-rendered title screen.
- Complete audio preload: every one of the 41 cues the game can play is
  fetched and decoded during boot.
- Self-hosted Grenze Gotisch applied to the loading title, main title, pause
  and death headings, the floor-entry banner, and the boss name.
- Unit and Cypress coverage plus the version bump to `0.6.0`.

No gameplay, balance, progression, control, or layout rule changed.

## 2. Decisions and rationale

### Static overlay first

The overlay markup lives in `index.html` and its styles in
`src/ui/styles/boot.css`, linked before the module entry. The screen therefore
paints before the JavaScript bundle executes instead of appearing after the
first module evaluation. The font is preloaded from `<head>`.

### Boot progress

`src/ui/boot/progress.ts` tracks settled units and never reports 100% before
every unit settles. Boot counts one unit per sprite image (54), one per audio
file (41), and one for the display font. Failed audio and font units still
count as settled; a failed image throws and becomes a fatal boot error.

`src/ui/boot/screen.ts` owns only the DOM: percentage, ARIA progressbar value,
fill transform, live-region completion announcement, minimum display time, the
fade, and the error panel. It exposes a snapshot for the e2e debug hook.

### Audio preload uses `OfflineAudioContext`

The approved design allowed decoding "through a suspended Web Audio
context where the browser allows it". Implementation uses a one-sample
`OfflineAudioContext` instead:

- decoding works before any user gesture without Chrome's autoplay warning;
- `AudioBuffer` objects are context-independent, so the live `AudioContext`
  created on the first gesture plays them directly;
- if offline decoding is unavailable, boot still counts the file as settled
  and the existing load-on-unlock path remains as a fallback.

Each file is fetched and decoded sequentially with a 10 s fetch timeout and a
10 s decode timeout. `AUDIO_MANIFEST` lists short cues first and the 136 s
ambient bed (`caverns.ogg`) last so the progress bar advances before the
longest decode. `AudioManager.snapshot()` now reports `preloaded` and
`preloadTotal`; `unlock()` still starts the ambient loop and re-lists the
manifest, but every buffer is already cached, so play never waits on the
network.

Memory note: about 2.1 MB of compressed audio becomes roughly 55 MB of
decoded buffers, mostly the ambient track. That is the memory the run would
otherwise allocate on first play; preloading moves it to boot.

### Reveal and input gating

`src/index.ts` loads images, audio, and the font in parallel, constructs the
renderer and game, paints one title frame behind the opaque overlay, waits out
the 700 ms minimum display, fades for 300 ms, removes the overlay, and only
then constructs `Input` and starts the frame loop. This prevents clicks or
keys intended for the title from reaching a half-booted game.

`__bootDebug` is exposed only in DEV/`VITE_E2E` builds and reports `phase`,
`percent`, per-category counts, `font`, timings, and `error`.

### Fatal image errors

`BootScreen.fail()` switches the overlay to its ember error panel and shows
`Failed to start the game: …` plus `Reload to try again.` The module-level
`activeBoot` reference lets the top-level `start().catch()` use the same
screen. If the boot markup is missing, the existing standalone error element
is still the fallback.

### Typography

`src/ui/rendering/fonts.ts` exports `DISPLAY_FONT_FAMILY`, `displayFont()`, and
`loadDisplayFont()`. The loader requests the 500 and 600 weights and falls
back to the system stack after 3 s, so a slow font never blocks the title.
Small HUD values, controls, taglines, and status copy remain in `system-ui`.

The WOFF2 is the Google Fonts v20 Latin variable subset (42,328 bytes,
SHA-256 `6820b1812cd41eab5eef70f7433f95127d99c72afe76d097f00486f840a9930a`),
with `OFL.txt` and `ATTRIBUTION.md`. No runtime request leaves the origin.

### Test-helper adjustment

The added boot work increased Cypress command latency. Two shared e2e
adjustments keep the existing movement coverage deterministic without changing
game behaviour:

- `walkToTarget` now holds the tracked movement keys across snapshot polls and
  releases them only when the direction changes, so a slow command round-trip
  cannot starve input between one-shot taps.
- `movementKeys` uses a 2 px dead zone instead of 6 px, which keeps the player
  aligned with the two-tile corridor while walking to ranged enemies or the
  Warden; the old 6 px dead zone could leave the body clipping the lower wall
  row at the corridor mouth.

`cy.visitGame()` waits for `__bootDebug.phase === "done"` before any gameplay
command, and the existing specs use it instead of `cy.visit("/")`.

## 3. Files

Added:

- `src/ui/boot/progress.ts`, `progress.test.ts`
- `src/ui/boot/screen.ts`
- `src/ui/rendering/fonts.ts`
- `src/ui/styles/boot.css`
- `src/ui/audio/audio.test.ts`
- `cypress/e2e/loading-screen.cy.ts`
- `public/assets/fonts/GrenzeGotisch-Variable.woff2`, `OFL.txt`,
  `ATTRIBUTION.md`

Changed:

- `index.html`, `src/index.ts`, `src/ui/audio/audio.ts`,
  `src/ui/rendering/assets.ts`, `src/ui/rendering/renderer.ts`,
  `src/ui/debug.ts`
- `cypress/support/commands.ts`, `cypress/support/game.ts`,
  `cypress/support/index.d.ts`, the three existing e2e specs
- `package.json`, `package-lock.json`, `README.md`

## 4. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 157 tests in 16 files, pass |
| `npm run build` | Pass |
| `CYPRESS_BROWSER=chrome npm run e2e` | 25/25 pass in 3 m 43 s |
| Production bundle | No `__bootDebug`, `__gameDebug`, or `__audioDebug` |
| Production bundle | No Google Fonts/CDN URL; font served from `/assets/fonts/` |

New Cypress coverage: overlay visibility and progressbar semantics, complete
image/audio/font settle state, usable display font, minimum display time,
gesture unlock and ambient start, no loader replay after pause/resume, and the
fatal image error panel.

## 5. Assumptions and residual risks

- **Offline decode context:** documented above; it satisfies the approved
  intent and keeps lazy load-on-unlock as the fallback. QA should verify the
  audible result after the first gesture.
- **Decoded-audio memory:** accepted because it matches eventual runtime
  memory; no extra abstraction or cache eviction was added.
- **Audio is fail-soft:** a missing or undecodable cue does not block the
  title. A missing image remains fatal.
- **OGG support** on Safari is a pre-existing limitation, not introduced here.
- **Canvas metrics:** heading positions were left unchanged; Grenze Gotisch
  renders within the same anchors. Visual inspection is part of QA.
- **Hosted CI** has not been run; only local checks are recorded here.
