# QA report — 0.6.0 boot loading screen, asset preload, and typography

## Metadata

| Field | Value |
|---|---|
| Version | `0.6.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested implementation | `a627259` (`feat(ui): add boot loading screen and complete asset preload`) |
| Implementation log | `0094c17` (`programmer/0.6.0/CoT.md`) |
| Branch | `feature/0.6.0-001-loading-screen` |
| Date | 2026-11-09 |
| Hosted CI | Pending on GitHub; not run or emulated locally |
| Vercel | Pending operator connection; deployment not verified |

## Scope

Independently verified the boot loading screen, complete image/audio/font
preload, suspended-context audio unlock, fail-soft audio, fatal image error
state, self-hosted Grenze Gotisch display typography, accessibility
semantics, boot-only behaviour, and regressions in the existing title,
combat, purification, boss, and descent flows against
`docs/tasks/0.6.0/001-qa.md`, `docs/tasks/0.6.0/001-programmer.md`, and
`design/0.6.0/design-decisions.md`.

QA also promoted two temporary degradation probes into the permanent
`loading-screen.cy.ts` spec (audio 404 and missing `AudioContext`) and added
a boot-not-replayed assertion to the existing restart scenario. The temporary
probe spec and screenshots were removed before handoff.

## Commands and evidence

Run from a clean dependency state (`npm ci`, exit 0) on the tested
implementation:

| Check | Command | Result |
|---|---|---|
| Clean install | `npm ci` | Pass |
| Types | `npm run typecheck` | Pass |
| Unit | `npm test` | 16 files, 157 tests, all pass |
| Production build | `npm run build` | Pass; 61.15 kB JS / 18.78 kB gzip, 4.28 kB CSS / 1.49 kB gzip |
| Debug hooks absent | `grep -R "__gameDebug\|__audioDebug\|__bootDebug" dist` | No matches |
| External font/CDN requests | `grep -R` for Google Fonts, jsDelivr, unpkg in `dist` | None in runtime files; only the licence attribution note names `fonts.gstatic.com` |
| Browser suite | `CYPRESS_BROWSER=chrome npm run e2e` | 4 specs, 27/27 pass in 2 m 05 s |
| Temporary QA probes | `CYPRESS_BROWSER=chrome npm run e2e` (with probe spec) | 5 specs, 31/31 pass in 2 m 47 s before promotion |
| Workspace before QA commit | `git status --short --branch` | Only the intended QA spec edits |

The browser suite runs through the approved single entry point
(`scripts/e2e.mjs`), which builds with `VITE_E2E=1`, serves the bundle with
`vite preview`, and runs Chrome. Hosted CI is not claimed; GitHub owns that
result after the branch is pushed.

Audio manifest coverage was also checked mechanically against
`public/assets/audio/`: 41 manifest entries, every entry exists on disk, the
manifest contains no duplicates, every cue referenced by `AudioManager` is
present, and `caverns.ogg` remains last. Fifteen unused audio files and three
licence/attribution files also exist in the directory; they are pre-existing
assets and are not required by the manifest.

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Typecheck, unit, build, and Chrome e2e pass from a clean state | Pass | `npm ci` then the commands above; 157 unit and 27/27 e2e |
| 2 | Cold load shows the loading screen before the title; title not interactive while visible | Pass | `loading-screen.cy.ts` asserts the overlay, title, tagline, status, progressbar, and percentage before the title snapshot; `src/index.ts` constructs `Input` only after `fadeOut()`, and the overlay covers the canvas at `z-index: 10` |
| 3 | Progressbar value never decreases and reaches 100 only after all units settle | Pass | `progress.test.ts` monotonic/clamping tests; `BootProgress.percent` caps at 99 until settled; `markReady()` sets 100 only after images, audio, and font promises resolve; e2e asserts 100 with all counts settled |
| 4 | Minimum display and fade into the title | Pass | E2e asserts `doneAt - startedAt >= 700`; 300 ms opacity transition and `transitionend`/450 ms fallback in `screen.ts` |
| 5 | Every used audio cue is in the boot manifest and loaded | Pass | Manifest check above; e2e asserts `preloaded === preloadTotal`; unit test covers `cloth1–4.ogg`, `creak2.ogg`, `falling.mp3`, and both `impactBell` files |
| 6 | First gesture resumes audio, starts ambient, plays from a loaded buffer | Pass | `loading-screen.cy.ts` asserts `unlocked` and `ambient` after start; `AudioManager.unlock()` resumes the live context and `play()`/`startAmbient()` resolve through the cached buffer map before any fetch |
| 7 | Audio failure or missing `AudioContext` still boots and stays playable | Pass | New permanent e2e tests: 404 on `knifeSlice.ogg` finishes boot with 40/41 buffers and playable HP 6; undefined `AudioContext` finishes boot, reports unsupported/unlocked/no ambient, and remains playable |
| 8 | Failed image after retries shows the readable boot error | Pass | `loading-screen.cy.ts` 404s a knight frame, waits for `phase === "error"`, asserts `.boot--error`, the error panel, the message, hidden progress, and the failing filename; `assets.ts` retries 3 times before throwing |
| 9 | Grenze Gotisch self-hosted, licensed, attributed, applied, no external request | Pass | WOFF2 (42,328 B), `OFL.txt`, and `ATTRIBUTION.md` present; `index.html` preloads `/assets/fonts/`; `boot.css` and `renderer.ts` apply the family to boot, title, pause, death, floor banner, and boss name; e2e confirms `document.fonts.check`; no runtime external URL |
| 10 | Reduced motion, no skip, no input forwarding | Pass | `@media (prefers-reduced-motion: reduce)` disables motes and fill transition; no skip control or focusable element exists; input attaches after the fade |
| 11 | Restart and descent do not replay the loader | Pass | Permanent restart assertion in `playable-slice.cy.ts`, pause/resume coverage in `loading-screen.cy.ts`; boot runs only once during module startup in `src/index.ts`, and restart/descent are engine-internal with no boot path |
| 12 | Existing suite passes without removed assertions | Pass | 27/27 Chrome e2e across all four specs; only added assertions and two new degradation tests |
| 13 | Production bundle has no boot/game/audio debug hooks | Pass | Bundle grep returned no matches; hooks remain gated by `DEV \|\| VITE_E2E` |
| 14 | No gameplay-rule or balance change beyond approved scope | Pass | Diff contains boot, preload, font, rendering, test-helper, and documentation changes only; unit suite covers unchanged combat/purification/boss/descent rules |
| 15 | Every finding has severity, reproduction, expected/actual, evidence, owner, rerun | Pass | No blocking or major findings; residual risks recorded below |

## Visual verification

Temporary Cypress captures at 1440 × 810 and 1024 × 640 were inspected and
then removed with the probe spec. They showed:

- **Loading:** full-screen `#0b0a0f` overlay with the Grenze Gotisch title,
  cyan rule, spaced tagline, cyan progress track/fill near completion
  (97–98%), `Preparing the descent…`, and the percentage; readable at both
  viewport sizes with clear contrast.
- **Title after fade:** dimmed generated floor behind `skill issue dg`, the
  display face on the title only, system-ui subtitle/controls, and
  `Click to begin`; no loader residue.
- **Pause:** `Paused` heading in Grenze Gotisch, readable controls, frozen
  world and HUD.
- **Boss:** `Floor Warden` bar label in the display face at 16 px, readable
  against the ember bar; `Boss awakened` HUD remains system-ui.
- **Death:** `You died` heading in the display face, with depth, purified
  count, and restart prompt in system-ui.

The loading screenshot was captured while progress was still advancing,
confirming the overlay is painted before 100% rather than after boot. The
display face renders within the existing heading anchors; no layout shift or
clipping was observed.

## Findings

No blocking or major findings.

### Minor observations (non-blocking)

1. **Decoded audio memory.** Complete preload retains roughly 55 MB of decoded
   buffers, dominated by the 136 s ambient bed (implementation log §2). This
   matches memory the run would allocate on first play and was accepted in the
   approved approach; no leak or duplicate decoding was observed.
2. **Audible output not asserted.** Headless Cypress verifies unlock, ambient
   start, manifest counts, and the cached-buffer play path through debug state
   and source inspection; actual loudness/mix quality was not measured.
3. **Font fallback path not forced in e2e.** The fallback branch after the 3 s
   timeout is covered by inspection of `loadDisplayFont`, not by a failing
   font request.
4. **Image retry timing.** The fatal-image e2e asserts the final error state;
   individual retry attempts are covered by inspection of `assets.ts` rather
   than by counting requests.

## Regressions checked

- Existing playable-slice spec: 6/6 pass, including combat, HUD, death, and
  restart with the new boot-not-replayed assertion.
- Existing portfolio-release spec: 4/4 pass, including title start,
  pause/resume, Warden summon, and bomb damage.
- Existing slice-regressions spec: 10/10 pass, including combo, purification,
  projectile, camera, dodge, fragment reset, and repeated restarts.
- New loading-screen spec: 7/7 pass, including the two degradation cases.
- Unit suite: 157/157 pass across 16 files.
- Production build contains no debug hooks and no external runtime font/CDN
  request.

## Residual risk

- Hosted CI is pending on GitHub until the branch is pushed and the workflow
  runs.
- Vercel staging/production deployment remains pending the operator.
- Global `prefers-reduced-motion` behaviour was verified by source inspection,
  not by an emulated-media e2e run.
- The audio degradation tests replace the temporary probes; they run against
  the E2E build with real audio files, so a future manifest rename must update
  the intercepted filename (`knifeSlice.ogg`).
- Safari/OGG support remains a pre-existing platform limitation, not a
  regression.

## Verdict

**Passed.** The implementation meets the approved `0.6.0/001` scope and all 15
acceptance criteria, with every local check green from a clean dependency
state. Hosted CI and Vercel deployment must be confirmed by the operator after
the branch is pushed.
