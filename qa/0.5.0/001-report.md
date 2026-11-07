# QA report — 0.5.0 portfolio release

## Metadata

| Field | Value |
|---|---|
| Version | `0.5.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested implementation | `d52f507` (`test(game): keep the bomb e2e outside melee range`) |
| Branch | `feature/0.5.0-001-portfolio-release` |
| Date | 2026-11-07 |
| Hosted CI | Pending on GitHub; not run or emulated locally |
| Vercel | Pending operator connection; `vercel.json` validated locally |

## Scope

Verified the Floor Warden summon, boss melee and bomb attacks, bomb flight/
landing/fuse/blast, stairs unlock on boss defeat, title/pause/death flow,
heal-on-descent, Web Audio manager and mute behavior, production debug-hook
gating, README/Vercel configuration, and regressions in the existing combat,
purification, generation, and descent behavior against
`docs/tasks/0.5.0/001-programmer.md` and
`design/0.5.0/design-decisions.md`.

## Commands and evidence

Run from a clean dependency state (`npm ci`, exit 0) on the tested commit:

| Check | Command | Result |
|---|---|---|
| Clean install | `npm ci` | Pass; 212 packages, 0 vulnerabilities |
| Types | `npm run typecheck` | Pass |
| Unit | `npm test` | 14 files, 150 tests, all pass |
| Production build | `npm run build` | Pass; 56.44 kB JS / 17.13 kB gzip |
| Debug hooks absent | `grep -R "__gameDebug\|__audioDebug" dist` | No matches |
| Vercel config | `node -e "JSON.parse(...vercel.json)"` | Valid JSON |
| Browser suite | `CYPRESS_BROWSER=chrome npm run e2e` | 3 specs, 20/20 pass |
| Workspace | `git status --short --branch` | Clean |

The browser suite runs through the approved single entry point
(`scripts/e2e.mjs`), which builds with `VITE_E2E=1`, serves the bundle with
`vite preview`, and runs Chrome. Hosted CI is not claimed; GitHub owns that
result after the branch is pushed.

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Typecheck, unit, build pass from a clean state | Pass | `npm ci` then the three commands above |
| 2 | `npm run e2e` passes; no assertion removed without replacement | Pass | 20/20 after clean install; existing specs now start through the title helper |
| 3 | Resting every non-boss mob spawns one boss, sets `bossAwake`, keeps stairs sealed, emits `boss-summoned` | Pass | `game.test.ts` summon test; `portfolio-release.cy.ts` summon test; `exitOpen === false` asserted in both |
| 4 | Boss takes combo damage, does not rest/respawn, ignores knockback | Pass | `game.test.ts` defeat test; `damage.test.ts`/`enemy.test.ts` boss knockback and stagger coverage |
| 5 | Boss performs melee and bomb attacks; bomb lands, fuses, explodes, damages inside blast | Pass | `enemy.test.ts` boss attacks; `bomb.test.ts` flight/fuse/blast; `game.test.ts` bomb damage; `portfolio-release.cy.ts` browser bomb scenario |
| 6 | Dodge/i-frames prevent bomb damage | Pass | `game.test.ts` "lets invulnerability avoid bomb damage" |
| 7 | Boss defeat opens stairs, clears `bossAwake`, emits `boss-defeated`; stairs descend | Pass | `game.test.ts` defeat and descent tests |
| 8 | Descent heals 2, caps at max, preserves HP, resets spirit/boss, increments depth | Pass | `game.test.ts` descent and heal-cap tests; `floor.test.ts` boss spawn |
| 9 | Title starts on click/Enter/Space; Escape pauses/resumes; no simulation while title/paused | Pass | `game.test.ts` title/pause tests; `portfolio-release.cy.ts` title/pause tests |
| 10 | Death shows depth and purified count; `R` restarts at depth 1 | Pass | Death summary visually verified (screenshot, temporary); `playable-slice.cy.ts` death/restart test asserts depth 1, HP 6, three enemies, reset spirit/fragments |
| 11 | Audio unlocks on gesture, plays mapped cues, toggles with `M`, degrades safely | Pass | `audio.ts` guard/fallback paths inspected; e2e runs with no uncaught errors; mute path covered by code inspection and HUD state; headless output not asserted |
| 12 | Production bundle contains no debug hooks | Pass | Bundle grep returned no matches; hooks remain gated by `DEV \|\| VITE_E2E` |
| 13 | README documents controls, commands, stack, attribution, Vercel mapping; `vercel.json` valid | Pass | README sections inspected; JSON parse passed |
| 14 | Every finding includes severity, reproduction, expected vs actual, evidence, owner, rerun | Pass | Finding F1 below |

## Visual verification

Temporary Cypress captures at 1440 × 810 were inspected and then removed.
They showed:

- **Title:** dimmed generated floor behind `skill issue dg`, spirit-cyan
  underline, subtitle, controls, and pulsing `Click to begin`; HUD hidden.
- **Pause:** frozen world and HUD behind a dark overlay with `Paused`,
  `Esc to resume`, and `M to mute`.
- **Boss summon:** top-centre `Floor Warden` bar with ember fill and border;
  top-right `Boss awakened`; spirit label in ember; stairs state replaced by
  the awakened state.
- **Bomb:** Warden sprite with slow ember aura; landed bomb with pulsing blast
  ring and fuse spark; player and sword readable.
- **Death:** `You died`, `Depth reached: 1`, `Mobs purified: 0`, and
  `Press R to restart` centered over the dark overlay.

The title overlay is blank until the first animation frame; a 400 ms settle
wait was needed for the capture. This is the normal one-frame startup
behaviour, not a product defect.

## Findings

### F1 — Bomb e2e scenario was timing-sensitive (low, resolved)

- **Requirement:** criterion 2 (stable browser suite) and criterion 5 (bomb
  attack).
- **Reproduction:** the first full-suite run after implementation failed one
  `portfolio-release.cy.ts` test. The test approached the Warden with
  `stop: 120`; depending on step timing, the Warden could already be inside
  its 40 px melee range, so it kept meleeing and never chose a bomb.
- **Expected:** the Warden throws a bomb and the blast damages the player.
- **Actual:** the bomb wait timed out on that run; the same spec passed on
  rerun.
- **Evidence:** first full run reported `portfolio-release.cy.ts` 3/4 passing;
  five consecutive isolated runs and two subsequent full runs passed.
- **Owner:** programmer.
- **Correction:** `d52f507` stops the approach at 180 px, outside melee range,
  and asserts `landed` is a boolean instead of requiring the first poll to
  catch the 0.65 s flight window.
- **Rerun:** five consecutive isolated portfolio-spec passes, one full-suite
  pass before `npm ci`, and one full-suite pass after `npm ci` (20/20). Status:
  resolved.

No blocking or major findings remain.

### Minor observations (non-blocking)

1. **Boss is off-screen at summon if the player is still in the first room.**
   The boss bar and `Boss awakened` HUD announce it; the Warden is visible
   when the player reaches the final room. This is intended by the design
   (spawn at the final room) and does not hide the summon.
2. **Audio is not audibly asserted in headless Cypress.** Unlock, mute, cue
   mapping, ducking, and fallback paths were inspected in `audio.ts`; the
   browser suite proves audio failure does not break play. Residual risk: a
   missing file or a mixer regression that is silent but non-fatal would not
   fail the suite.
3. **Death summary text is not pixel-asserted.** It was verified visually and
   the restart state is asserted by `playable-slice.cy.ts`. The values are
   derived directly from `run.depth` and the rested-enemy count.

## Regressions checked

- Existing 0.1.0 combat/boot/HUD/movement/death specs: 6/6 pass.
- Existing 0.2.0 combo, purification, projectile, camera, dodge, and restart
  specs: 10/10 pass.
- Unit coverage for attack, combo, damage, dodge, enemy AI, movement,
  projectile, purification, vision, floor generation, effects, and engine:
  150/150 pass.
- Restart still resets depth, seed, HP, spirit, fragments, projectiles, bombs,
  and enemy state.
- Production build contains no debug hooks.
- No new runtime dependency, shop, loot, currency, multiple-boss, or
  difficulty-scaling work entered the diff.

## Residual risk

- Hosted CI is pending on GitHub.
- Vercel staging/production deployment is pending the operator connecting the
  project; only `vercel.json` and the documented branch mapping were verified.
- Audio quality and loudness were judged by code inspection and the approved
  design map, not by a formal listening test in CI.
- The bomb browser scenario remains timing-dependent by nature; the hardened
  distance and relaxed in-flight assertion reduce, but cannot eliminate, that
  class of flake.

## Verdict

**Passed.** The implementation meets the approved `0.5.0/001` scope and
acceptance criteria, with all local checks green from a clean dependency state.
Hosted CI and Vercel deployment must be confirmed by the operator after the
branch is pushed.
