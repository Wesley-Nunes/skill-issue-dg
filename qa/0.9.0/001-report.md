# QA report — 0.9.0 safe-room ward and MVP acceptance

## Metadata

| Field | Value |
|---|---|
| Version | `0.9.0` |
| Task ID | `001` |
| Owning agent | `qa` |
| Status | `Passed` |
| Tested implementation | `09f6e45` (`feat(game): seal safe-room ward during combat`) |
| Tested repository head | `9263f81` (`dev` after PR #14) |
| Contract commits | `44ae905` (MVP contract and tasks), `172b2fa` (design decisions) |
| Implementation log | `programmer/0.9.0/CoT.md` |
| QA branch | `feature/0.9.0-001-mvp-acceptance-closure` |
| Base | `dev` / `origin/dev` at `9263f81` |
| Date | 2026-11-14 |
| Hosted CI | **Passed on GitHub** for `9263f81`: run #18 `E2E` push and run #17 `E2E` pull request; check runs `Typecheck, unit and e2e` and `Vercel Preview Comments` both succeeded |
| Vercel | No deployment record is exposed by the GitHub deployments API; staging/production hosting remains operator-owned and unverified |

## Independence and limitation (read first)

The orchestrator executed the docs, design, implementation, and QA stages because
no specialist subagent was available. Verification therefore shares one author
with the implementation, which is a real reduction in independence:

- the implementation diff and the verification were produced by the same agent;
- no second agent reviewed the code against the design contract;
- the "feels like a door closing in your face" judgment was assessed from the
  rendered captures, automated playthroughs, and the rule model, not from a
  fresh human playtest.

To reduce the risk, every result below was re-executed against `9263f81` after a
clean `npm ci`. The programmer's decision log was used for intent only; the
predicate, engine guards, rendering, copy, cooldown, and bundle were inspected
directly. One process finding (F1) records that PR #14 merged before this QA pass
existed; the report is retrospective evidence, not a gate that ran before merge.

## Commands and evidence

| Command | Result | Notes |
|---|---|---|
| `npm ci` | Pass | 212 packages in ~3 s, 0 vulnerabilities |
| `npm run typecheck` | Pass | `tsc --noEmit`, no output |
| `npm test` | Pass | 18 files, 198/198 tests, 1.31 s |
| `npm run build` | Pass | `dist/assets/index-BxraWZQO.js` 81.49 kB (24.45 kB gzip), CSS 4.28 kB |
| Production bundle scan | Pass | No `__gameDebug`, `__bootDebug`, or `__audioDebug` match in `dist/assets/*.js` |
| `CYPRESS_BROWSER=chrome npm run e2e` (run 1) | Pass | 33/33 across 6 specs, 3 m 02 s |
| `CYPRESS_BROWSER=chrome npm run e2e` (run 2) | Pass | 33/33 across 6 specs, 3 m 02 s |
| Temporary capture spec (`qa-captures.cy.ts`) | Pass | 3/3, 4 viewport captures, 13 s; spec deleted before handoff |
| Temporary Warden predicate check | Pass | 1/1; boss with `aggro: true` seals, passive boss does not; test deleted |
| Recorded full-loop run (`CI=1 … reward-loop.cy.ts`) | Pass | 5/5, 1 m 05 s, `cypress/videos/reward-loop.cy.ts.mp4` (39.6 MB, gitignored) |
| Version hygiene | Pass | `package.json` and both lockfile version fields report `0.9.0` |
| Diff scope | Pass | `d04c66b..9263f81` changes only the ward, its tests, README/version, and version docs; no asset, dependency, or unrelated source change |
| Hosted CI (GitHub) | Pass | Run #18 on `9263f81` and run #17 on `f193cdb` both succeeded |

Cypress breakdown of the 33 tests:

| Spec | Tests | Result |
|---|---|---|
| `loading-screen.cy.ts` | 7 | Pass |
| `playable-slice.cy.ts` | 6 | Pass |
| `portfolio-release.cy.ts` | 4 | Pass |
| `reward-loop.cy.ts` | 5 | Pass |
| `safe-room.cy.ts` | 1 | Pass |
| `slice-regressions.cy.ts` | 10 | Pass |

## Scope verification

### 4.1 Exploit reproduction

| Scenario | Verdict | Evidence |
|---|---|---|
| Lure a melee mob to the shop threshold and try to enter | **Closed** | `safe-room.cy.ts` teleports into the second melee mob's aggro range, lets it close in, runs west, and asserts the player stays outside `floor.shop.safe` by walking and by dodge. Re-executed in both full runs and the capture pass. |
| Reproduce the same with the Floor Warden | **Closed by shared rule; live lure not run** | The predicate is enemy-kind agnostic (`status === "alive" && aggro`), the engine guard and damage condition call it once, and a temporary check confirmed a `floor-warden` with `aggro: true` seals while a passive one does not. No debug hook moves enemies, so a real cross-floor Warden lure was not scripted; recorded as F2. |
| Attack outward from inside while an enemy hunts | **No longer free** | Entry is refused, and damage inside the safe zone applies while a hunter exists. The engine test `applies damage inside the safe zone only while an enemy hunts` lands a bomb for full damage while sealed and zero while open, so the room is not a damage-free firing position. |

### 4.2 Rule correctness

| Assertion | Verdict | Evidence |
|---|---|---|
| Entry refused only while a living enemy hunts | Pass | `safeRoom.test.ts` covers alive/aggro, alive/idle, dying, dead, rested, one-of-many; engine entry and dodge tests; Cypress real pursuit |
| Ward reopens when no living enemy hunts, without reset | Pass | Engine test clears aggro and re-enters on the next step; Cypress rests the mobs and crosses the threshold |
| Dying, dead, rested, emerging enemies do not seal | Pass | `safeRoom.test.ts`, including the harmless emerging boss |
| Player inside when the ward seals is not trapped and can leave | Pass | Engine test `never traps a player who is already inside the safe zone` |
| Damage follows the design while sealed | Pass | Bomb test inside/outside combat; all sources share `applyDamageToPlayer` |
| Shop cannot open while sealed | Pass | Engine test `refuses to open the shop while an enemy hunts`; refusal carries `WARD_MESSAGE` |
| Refusal throttled to 2 s while pushing | Pass | Engine test expects three refusals across five seconds |
| Ward copy matches design exactly | Pass | `WARD_MESSAGE` is `The ward holds — enemies are hunting.`; used by both entry and shop refusal |

### 4.3 Reward-loop regression

| Area | Verdict | Evidence |
|---|---|---|
| Resting mobs and skill points | Pass | Engine rest/point tests; `reward-loop.cy.ts` performs a real rest |
| Draught purchase, carry, use, refusal states | Pass | `shop.test.ts` 19 cases; engine buy/use tests; reward-loop buys and uses the draught |
| Vigor, one-time rule, max-HP gain | Pass | `shop.test.ts`; engine purchase test; reward-loop asserts 7 max HP |
| Shop open/close and summon-closes-shop | Pass | Engine tests; reward-loop closes with Escape, then summons |
| Explicit summon and Warden fight | Pass | Engine summon/defeat/no-stagger tests; `portfolio-release.cy.ts`; reward-loop summons, weakens, defeats |
| Stairs, descent, per-floor reset, rewards persist | Pass | Engine descent tests; reward-loop descends to depth 2 and asserts spirit/gate/exit reset with points, Vigor, and max HP kept |
| Death and restart | Pass | Engine restart tests; `playable-slice.cy.ts`; `slice-regressions.cy.ts` repeated restarts |
| Depth 1–10 curve | Pass | `depth.test.ts` matches the design table and cap; unchanged by this version |

### 4.4 Presentation

| Check | Verdict | Evidence |
|---|---|---|
| Open threshold | Pass | Cyan band and rune ticks, no label (`qa-ward-open.png`) |
| Sealed threshold | Pass | Ember band, `WARD SEALED` label above the threshold (`qa-ward-sealed.png`, `qa-ward-refusal.png`) |
| Refusal copy | Pass | `The ward holds — enemies are hunting.` in the existing floating-text plate (`qa-ward-sealed.png`) |
| Reduced motion | Pass | Pulse removed via stubbed `prefers-reduced-motion`; colour and label remain (`qa-ward-sealed-reduced.png`) |
| Audio muted readability | Pass with observation | The ward is communicated by colour and text; no audio cue was added. The mute key mapping is unchanged and structural only (O1) |
| No new HUD, asset, audio, or hotkey | Pass | Diff adds only config values, predicate, guards, rendering colour/label, snapshot field, and test hook |

Capture limitation: this X11 session clamps the browser window, so
`cy.viewport(1440, 810)` screenshots save at **1280 × 633**. The e2e suite still
asserts the canvas and internal viewport at the configured sizes; the saved
pixels are one size only. Recorded as F3, matching the `0.8.0` environment
limitation. Screenshots and the full-loop video are gitignored and were not
committed; retained local copies for this pass are in
`/tmp/opencode/qa-0.9.0-evidence/`.

### 4.5 Automated checks and release hygiene

- Clean-install `typecheck`, 198 unit tests, build, and two consecutive 33/33
  Chrome e2e runs pass.
- The production bundle contains no debug hook; the test hook stays behind the
  existing `DEV`/`VITE_E2E` gate.
- `README.md` matches the shipped controls, sealed ward, shop, summon, and
  descent loop.
- `package.json` and `package-lock.json` report `0.9.0`.
- Hosted CI passed on GitHub for the tested head; Vercel is not verified (O3).

## MVP acceptance evidence (`GOAL.md` §4)

| ID | Verdict | Evidence |
|---|---|---|
| SC1 — title, WASD, mouse aim, single swing, dodge i-frames | Pass | `playable-slice.cy.ts` boots, starts, moves with WASD, and lands one swing; `slice-regressions.cy.ts` dodge distance, one-swing-per-press, no repeat while held; unit attack/dodge tests; recorded full-loop video |
| SC2 — fragment break, damage restoration, intact-kill respawn, rest reward | Pass | Engine fragment/rest/HP-loss tests; `purification.test.ts`; `slice-regressions.cy.ts`; reward-loop real rest awards 1 point |
| SC3 — earn, buy draught and Vigor, carry/use draught, HUD/refusal state | Pass | `shop.test.ts` + engine purchase/use tests; reward-loop buys both, uses the draught, then asserts points and HP |
| SC4 — gate opens, explicit summon, telegraphed melee/bombs, no stagger, 3 points, stairs | Pass | Engine summon/defeat/telegraph/no-stagger tests; `portfolio-release.cy.ts`; reward-loop real summon and defeat; points check after descent |
| SC5 — descent, heal 2, depth curve, per-floor reset, run rewards persist | Pass | Engine descent/persistence tests; `depth.test.ts`; reward-loop depth 2 assertions; `playable-slice.cy.ts` depth HUD |
| SC6 — death summary, `R` restart at depth 1, run rewards cleared | Pass | Engine reset tests; `playable-slice.cy.ts` death/restart; `slice-regressions.cy.ts` repeated restarts |
| SC7 — sealed while hunted, entry refused, exit allowed, exploit closed | Pass | Six engine ward tests, `safeRoom.test.ts`, real-pursuit Cypress, sealed damage test, temp Warden predicate check; F2 limitation recorded |
| SC8 — readable muted, mute toggle, reduced motion, no new HUD/hotkey | Pass with observation | Four captures including stubbed reduced motion; source inspection; no audio dependency; O1 records the structural-only mute coverage |
| SC9 — clean typecheck/unit/build/e2e, no debug hook in production | Pass | Command table above; two consecutive full Chrome runs; bundle scan |
| SC10 — full loop end to end in one recorded run | Pass | `CI=1 … reward-loop.cy.ts` video, 1 m 05 s, containing a real rest, real draught/Vigor purchases, real draught use, real summon, Warden defeat, and descent to depth 2 |

## Design decision traceability

| Design section | Verdict | Evidence |
|---|---|---|
| §2 Combat predicate | Pass | `isInCombat` is pure, derived, and exactly `alive && aggro`; no timer or stored state |
| §3 Entry and exit | Pass | Outside-to-inside guard restores the prior position for walk and dodge; inside is never checked out; reopens on the same frame |
| §4 Conditional protection | Pass | Immunity skipped while sealed; all damage sources share the condition; enemy exclusion unchanged |
| §5 Shop interaction | Pass | Combat is checked before availability; panel cannot open while sealed; modal freeze and summon-close unchanged |
| §6 Presentation | Pass | Ember/cyan threshold, `WARD SEALED` label, exact copy, 2 s throttle, same 3 rad/s pulse, static reduced-motion variant |
| §7 Edge cases | Pass | Boundary, already-inside, lost-aggro, ranged aggro, projectile/bomb, Warden, death, descent, teleport, dodge, attack-inside cases covered by rule tests or shared code inspection |
| §8 Accessibility | Pass | Text plus colour, no flash/shake, audio-independent, reduced-motion label retained |
| §9 Assets and constraints | Pass | No new asset, dependency, audio, font, or hotkey; pure rule in `systems/`; rendering reads state |
| §10 Observable hooks | Pass | `inCombat` snapshot, `safe-room-blocked` event with exact copy, `setEnemyAggro`, position assertions, canvas captures |

## Findings

### F1 — Medium (process) — QA gate was skipped before merge — **Recorded; owner orchestrator**

- Requirement: `PLANS.md` stage 4 and `GOAL.md` require independent QA before
  acceptance; `docs/tasks/0.9.0/001-qa.md` lists QA as the gate.
- Observed: PR #14 merged `feature/0.9.0-001-mvp-acceptance` into `dev` at
  `9263f81` while this report did not exist and no QA commit had been made.
- Impact: the merge was accepted without the required independent verdict. The
  implementation itself passes this retrospective verification, so this is a
  process defect, not a product defect.
- Correction: this report and the orchestrator's state update close the
  documentation gap. Future versions must keep the merge behind the QA gate.
- Regression checks after correction: none needed for code; the report and state
  commits must land before the MVP is called complete.

### F2 — Low (evidence) — Warden entry refusal was not exercised as a live lure — **Open, non-blocking**

- Requirement: §4.1 asks to reproduce the exploit with the Floor Warden.
- Observed: no debug hook can move an enemy, and luring the slow Warden across
  the fixed branch without pathfinding is not reliably scriptable. The shared
  predicate and engine guard are enemy-kind agnostic, and a temporary check
  confirmed a hunting `floor-warden` seals the ward.
- Impact: the Warden case is proven by the rule and engine path plus a targeted
  predicate assertion, not by a recorded chase. No code change is warranted.
- Owner: QA tooling / orchestrator for a future enemy-movement hook.

### F3 — Low (evidence) — Captures are clipped by the X11 window — **Open, non-blocking**

- Requirement: exact-size sealed/open captures.
- Observed: images save at 1280 × 633 for a 1440 × 810 request. The canvas and
  internal viewport are separately asserted by the e2e suite.
- Impact: the saved evidence is slightly smaller than requested; layout at the
  target size is still covered by the resize test.
- Owner: environment / future QA tooling.

### O1 — Observation — mute is verified structurally, not acoustically

`M` still maps to `toggleMute()`, every cue checks the muted flag, and no ward
audio cue was added, but this version has no dedicated mute e2e test. Non-blocking
because the ward feedback is text and colour only.

### O2 — Observation — test-only teleport bypasses the ward

`debugTeleport` can place the player inside the safe zone regardless of combat.
It stays behind the `DEV`/`VITE_E2E` gate, and all entry assertions use real
movement. This is the documented test-only exception, not a gameplay path.

### O3 — Observation — Vercel deployments are not visible

The GitHub deployments API returns no records for this repository. Hosted CI
passes, but staging (`dev`) and production (`main`) deployment state cannot be
confirmed from the repository. Operator-owned release check.

## Residual risks and not verified

- **Independent QA:** performed by the implementing orchestrator; see the
  independence caveat.
- **Live Warden lure:** not scripted; see F2.
- **Human feel:** the ward's readability and frustration level were judged from
  captures and the rule model, not a fresh hands-on playtest.
- **Vercel:** no deployment evidence; see O3.
- **Production branch:** `main` remains at `c7b1e17`; the MVP is on `dev` only.
- **Long-run balance:** unchanged from `0.8.0` and out of scope.

## Verdict

**Passed.** The safe-room exploit is closed for walking, dodging, and shop
interaction; protection inside the zone is correctly conditional; the threshold
and refusal feedback match the design; the `0.7.0`/`0.8.0` reward and combat
regressions hold; and every `GOAL.md` success criterion has cited evidence,
including a recorded full-loop run. Local checks pass from a clean install:
typecheck, 198 unit tests in 18 files, production build, and 33/33 Cypress tests
in two consecutive Chrome runs. Hosted CI passed on GitHub for `9263f81`. One
medium process finding (merged before QA), one low evidence limitation (Warden
lure), and one low capture-size limitation remain; none blocks MVP acceptance.
