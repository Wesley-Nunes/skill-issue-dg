# 001 — Programmer: boot loading screen, asset preload, and typography

## Metadata

| Field | Value |
|---|---|
| Version | `0.6.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Not started` |
| Depends on | `docs/tasks/0.6.0/001-design.md`, `design/0.6.0/design-decisions.md` |
| Produces | Boot loading UI, full image/audio/font preload, font integration, tests, `programmer/0.6.0/CoT.md` |

## Context

`0.5.0` is merged. Boot currently awaits `loadAssets()` with no visible
feedback. The function loads 56 sprite images sequentially from
`public/assets/dungeon-tileset-ii/frames/`. Audio is not requested until
`AudioManager.unlock()` runs after the first gesture, and its `PRELOAD` list
omits at least `cloth1–4.ogg` and `creak2.ogg`, which the game uses. The
display text is `system-ui`.

The operator wants a loading screen that shows progress and downloads the
audio together with the images before play begins. Grenze Gotisch is
approved as the self-hosted display typeface.

## Objective

Add a boot loading screen that reports real image, audio, and font progress,
preloads all boot assets before revealing the title screen, keeps audio
failure non-blocking, and applies the approved display font without changing
gameplay.

## In scope

- Boot loading overlay with title, tagline, status text, progress bar, and
  percentage.
- Progress aggregation for sprite images, audio buffers, and the font.
- `loadAssets` progress reporting while preserving sequential image loading
  and the existing retry behaviour.
- Audio manifest and `AudioManager.preload`, including every cue used by the
  game.
- Suspended-context preload, gesture unlock/resume, ambient start after
  unlock, and an audio-ready snapshot.
- Self-hosted Grenze Gotisch asset, `@font-face`, license/attribution files,
  and font loading as part of boot progress.
- Display-font application to the loading screen, title, pause, death,
  floor-entry banner, and boss name.
- Fatal image-error presentation and graceful font/audio fallbacks.
- Reduced-motion and progressbar accessibility.
- Dev/E2E boot debug hook, unit tests, and Cypress coverage.
- Version bump to `0.6.0`; README update for the font attribution and boot
  behaviour.
- Record implementation decisions in `programmer/0.6.0/CoT.md`.

## Out of scope

- Gameplay, balance, combat, dungeon generation, run rules, or new content.
- New audio files or changes to the audio mix beyond making preload complete.
- Settings, volume sliders, remapping, localisation, or a skip button.
- Service-worker caching, download-size optimisation, or CDN delivery.
- A second loading screen on restart or floor descent.
- Changes to the title, pause, death, HUD, or boss-bar layout beyond the
  approved font.

## Approved behaviour

1. **Boot sequence.** The page shows the loading overlay immediately. The
   overlay stays above the canvas while images, audio, and the display font
   are prepared. When everything is ready, it shows 100%, remains visible
   for at least the approved minimum, fades out, and reveals the existing
   title screen.
2. **Progress.** One completed unit per image, audio buffer, and font.
   Progress is monotonic. Failed optional audio files still count as settled
   so the boot cannot hang. A failed image remains fatal after the existing
   retries.
3. **Audio preload.** A single manifest lists every audio file the game can
   play. Boot fetches and decodes them through a suspended `AudioContext`
   where the browser permits it. The first gesture resumes the context and
   starts the ambient loop. If the context cannot be created before a
   gesture, download the files during boot and decode them on unlock; the
   loading screen must not wait forever for a blocked decode.
4. **Audio fallback.** An unsupported context, blocked decode, or missing
   file is recorded as unavailable. The game still starts and remains fully
   playable and silent for the affected cue.
5. **Font.** Grenze Gotisch is self-hosted under `public/assets/fonts/` in a
   web format with the OFL 1.1 license and attribution. Boot waits for
   `document.fonts.load` for the display weights used. A font failure falls
   back to `system-ui` and does not block the title.
6. **Typography.** The display font applies to the loading title, main
   title, pause/death headings, floor-entry banner, and boss name. Tagline,
   controls, HUD numerals, and small status text keep the current
   `system-ui` stack.
7. **Interaction.** The loading screen has no skip action. Input is not
   forwarded to the game until the title is visible. The existing
   click/Enter/Space start path is unchanged.
8. **Boot-only.** Restart and descent do not show the loading screen.
9. **Failure.** A fatal image failure replaces the loading content with the
   existing readable `.boot-error` treatment and a reload instruction.
10. **Debug.** A `__bootDebug` hook exposes loading state and readiness only
    under the existing DEV/`VITE_E2E` condition and is absent from the
    production bundle.

## Constraints

- Keep boot orchestration in `src/index.ts` or a small adjacent module;
  loading presentation in `src/ui/`; audio preload in
  `src/ui/audio/audio.ts`; image loading in `src/ui/rendering/assets.ts`.
- Keep loading presentation independent of game rules and rendering state.
- Prefer a DOM overlay for the boot screen so it can paint before the
  renderer exists and can expose native progressbar semantics. Do not add a
  UI framework or dependency.
- No external font, image, or audio request. Everything ships from `public/`.
- Preserve the existing image-loading retry and fatal-error semantics.
- Keep the production bundle free of debug hooks.
- Apply KISS/YAGNI: one boot screen, one progress model, one font family.
- Do not weaken existing unit or e2e coverage without replacing the covered
  behaviour.

## Acceptance criteria

1. On a cold load the loading screen is visible before the title and exposes
   a progressbar with a value between 0 and 100.
2. The title screen does not appear until all images, all audio manifest
   entries, and the display font have settled (loaded or explicitly
   unavailable).
3. The progress value never decreases, reaches 100 on success, and is shown
   for at least the approved minimum before the fade.
4. After the fade, the existing title screen is interactive and starts the
   run on click, Enter, or Space exactly as before.
5. Every audio file in the manifest is fetched during boot; a subsequent
   gameplay cue does not need a new network request when preload succeeded.
6. The first gesture resumes the audio context, the ambient loop starts, and
   `__audioDebug` reports readiness and loaded buffer count.
7. Unsupported or failed audio does not block the title or break gameplay.
8. A failed image after retries shows a readable boot error instead of a
   half-initialised game.
9. Grenze Gotisch is served locally, its OFL license and attribution are
   present, and the display surfaces use it with a `system-ui` fallback.
10. The loading screen uses no skip action, is boot-only, and respects
    `prefers-reduced-motion`.
11. Typecheck, unit tests, build, and Cypress e2e pass; new coverage verifies
    loading → title, audio readiness, and debug-hook absence in production.
12. Restart and descent show no loading screen, and no gameplay rule or
    balance value changes.
13. `package.json` is version `0.6.0`; README documents the boot behaviour
    and font attribution.
14. `programmer/0.6.0/CoT.md` records the implementation decisions and the
    exact commands run.

## Dependencies and handoff

Inputs: approved design decisions, current asset/audio inventory, current
title and overlay palette, and the operator-approved font.

Outputs: boot loading screen, preload pipeline, font integration, tests,
implementation log, and a tested commit.

Hand off to QA with the tested commit and the commands run.

## Open assumptions / unresolved items

- **Browser audio policy:** creating a suspended context before a gesture is
  allowed in current Chrome/Firefox/Safari, but the implementation must keep
  the download/decode-on-unlock fallback so a stricter browser cannot hang
  boot.
- **Minimum display time:** 700 ms, with a 300 ms fade, unless the approved
  design changes it.
- **Font format:** WOFF2 is preferred; the exact filename is an
  implementation detail as long as the license and attribution accompany it.
- **Audio failure:** a missing optional cue is reported through debug state
  and the console, not through a blocking error dialog.
