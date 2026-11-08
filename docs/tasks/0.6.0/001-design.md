# 001 — Design: boot loading screen and typography

## Metadata

| Field | Value |
|---|---|
| Version | `0.6.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Passed` (2026-11-08) |
| Depends on | Operator approval of the boot loading-screen scope and the Grenze Gotisch typeface (2026-11-08) |
| Produces | `design/0.6.0/design-decisions.md` |

## Context

`0.5.0` is merged into `dev`. The application currently calls
`loadAssets()` before constructing the renderer, input, audio manager, and
game. That call loads 56 sprite frames (~220 KB) one at a time, while the
page shows only the empty dark canvas. Audio is fetched lazily after the
first click or key press, so the first cues can race the player. All screens
use `system-ui`, so the title does not yet have a distinctive game
typeface.

The operator asked for a loading screen that shows progress while the game
downloads its images and audio before play, and for a font that matches the
dark-fantasy pixel-art ambience. The operator approved **Grenze Gotisch** on
2026-11-08. The visual defaults below are approved for implementation.

## Objective

Define the boot loading screen, its progress and readiness behaviour, its
transition into the existing title screen, and the typography rules for the
display text used by the loading, title, pause, death, floor-entry, and boss
surfaces.

## In scope

- Boot loading-screen layout, hierarchy, palette, and copy.
- Progress bar, percentage, and readiness states.
- Motion and reduced-motion behaviour.
- Typography: Grenze Gotisch, self-hosted asset requirements, weights,
  sizing, and where it applies.
- Transition from loading to title.
- Error state for a fatal image-loading failure.
- Accessibility requirements for the boot overlay.

## Out of scope

- Gameplay, balance, combat, dungeon generation, and run rules.
- New audio content, volume controls, settings, remapping, or localisation.
- A skip button or a second loading screen on restart/descent.
- Download-size optimisation, service-worker caching, or CDN delivery.
- Redesigning the title, pause, death, HUD, or boss-bar layout beyond
  applying the approved typeface.
- Mobile-specific layout or touch controls.

## Approved behaviour

1. A full-screen loading screen appears before the title screen. It shows
   the game title, the tagline, a status line, a progress bar, and a
   percentage.
2. The loading screen stays visible until sprite images, audio files, and
   the display font have finished their boot work, with a short minimum
   display time to avoid a one-frame flash.
3. After completion it fades out and reveals the existing title screen.
   Restart and descent do not replay it.
4. Progress is honest: it advances as boot work completes, does not go
   backwards, and does not show 100% while assets are still unavailable.
5. Audio failure is non-blocking and silent; image failure is fatal and
   produces a readable error. Font failure falls back to `system-ui`.
6. The loading screen and all display headings use Grenze Gotisch. Small
   HUD, controls, tagline, and status text remain `system-ui` for
   legibility.
7. The font is self-hosted under `public/assets/fonts/` with its OFL 1.1
   license and attribution. No third-party font CDN is used.

## Constraints

- Preserve the existing dark palette: void `#0b0a0f`, title text `#f2e9da`,
  spirit cyan `#bfe9ff`, ember `#ff6a4d`.
- Keep the boot screen readable at 1024 × 640 and 1440 × 810.
- No new runtime dependency, build plugin, or external network request.
- No flashing, rapid strobe, or motion that could affect readability.
- Design decisions must be concrete enough for implementation and QA.
- The existing title-screen interaction (click or Enter/Space) remains
  unchanged.

## Acceptance criteria

1. The design file specifies the loading-screen layout, palette, copy,
   progress treatment, and transition.
2. The design file specifies the font family, weights, file format,
   fallback stack, license handling, and every surface it applies to.
3. The design file specifies loading, complete, and fatal-error states.
4. Reduced-motion and accessibility behaviour are specified.
5. The design file states that the screen is boot-only and cannot be
   skipped.
6. Deferred work is listed without implying approval.

## Dependencies and handoff

Inputs: operator scope approval, existing title/HUD palette and layouts,
operator approval of Grenze Gotisch, and the existing asset inventory.

Outputs: `design/0.6.0/design-decisions.md`, which the programmer implements
and QA verifies.

## Open assumptions / unresolved items

None blocking. Reversible defaults are recorded in the design decision
document: the status copy, the 700 ms minimum display time, the 300 ms fade,
and the scope of the display-font application.
