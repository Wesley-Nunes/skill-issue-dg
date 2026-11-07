# Implementation log — 0.5.0 portfolio release

Owner: `programmer` · Task `0.5.0/001` · Branch
`feature/0.5.0-001-portfolio-release`.

## 1. What shipped

- Floor Warden boss summoned when the last non-boss mob rests; the spirit
  meter reaches 100%, the HUD switches to **Boss awakened**, and the stairs
  stay sealed until the Warden dies.
- Telegraphed Warden melee plus a thrown bomb that arcs to the player's
  position at throw time, lands, fuses, and explodes.
- Boss bar, ember summon/flash effects, boss aura, bomb telegraph and
  explosion visuals, and updated sealed/awakened/open HUD states.
- Title screen, Escape pause/resume, `M` mute, and a death summary with depth
  and purified-mob count. `R` restarts directly into a fresh run.
- Heal 2 HP on descent, capped at 6, with a heart pulse and synth cue only
  when HP actually increases.
- Web Audio manager: `caverns.ogg` ambient loop, mapped CC0 event cues,
  synthesized boss presence/breathing/fire/voice/magic layers, pan and
  distance attenuation, ducking, mute, and safe degradation.
- README, `vercel.json`, and version `0.5.0`.

## 2. Main decisions

### Boss as an enemy kind

The Warden is an `Enemy` with `kind: "boss"` in the existing `enemies` array,
not a separate entity or system. This reuses targeting, damage, collision,
stagger, fading, rendering order, and snapshots with the smallest possible
surface. `createBoss(floor)` builds it at `floor.bossSpawn`; the boss is
excluded from the all-mobs-rested check and from fragment/rest rules.

`src/game/systems/enemy.ts` keeps `updateBoss` pure and returns a
`bombTarget` when a bomb windup completes. `Game` turns that into a bomb
entity. Boss values live in `BOSS` and `BOMB` in
`src/game/data/config.ts`.

### Summon and stairs

`Game.summonBoss` is idempotent: it refuses if `bossAwake` is already set or a
boss already exists. Resting every non-boss mob sets `floorPurified`, emits
`floor-purified`, then summons the Warden and keeps `exitOpen` false. Boss
death clears `bossAwake`, sets `exitOpen`, and emits `boss-defeated` without
resting or respawning the boss.

### Bombs

`src/game/systems/bomb.ts` is pure: `spawnBomb`, `advanceBomb`,
`bombHitsPlayer`, and `bombArcHeight`. A bomb flies over walls to the captured
target, so only the landing marker and blast ring matter to the player.
Explosions damage only the player, respect invulnerability, and are removed
after detonation. Descent and restart clear the array.

### Title, pause, death

`GameStatus` is now `"title" | "playing" | "paused" | "dead"`. The constructor
starts in `title`; `Game.start()` is the only transition out. `step` returns
early for title and paused, so the world clock does not advance. `R` from
death calls the existing `reset`, which starts at depth 1 with a new seed.
Input queues start on click/Enter/Space, pause on Escape, mute on `M`, and
restart on `R`.

### Audio

`AudioManager` creates the `AudioContext` lazily on the first user gesture and
loads the supplied files from `AUDIO_BASE`. Every play path checks the context
and buffer and catches failures, so a blocked or unsupported context leaves
the game silent but playable. Ambient loops at 0.16 gain; roars/explosions
temporarily duck it. World cues pan by horizontal offset and attenuate with
distance. Boss layers are an oscillator/noise bed that starts on summon and
stops on death, reset, or return to a non-boss state.

### Debug hooks

`window.__gameDebug.summonBoss()` rests the floor and summons the Warden
without simulating the ritual. It exists only under
`import.meta.env.DEV || import.meta.env.VITE_E2E === "1"`. The same guard
exposes `__audioDebug`. Production builds contain neither hook.

## 3. Files changed

- Added: `src/game/systems/bomb.ts`, `src/ui/audio/audio.ts`,
  `public/assets/audio/ATTRIBUTION.md`, `vercel.json`.
- Updated: `src/game/data/{config,floor,sprites}.ts`,
  `src/game/types/index.ts`, `src/game/systems/{damage,enemy}.ts`,
  `src/state/initialState.ts`, `src/game/engine/game.ts`, `src/index.ts`,
  `src/ui/debug.ts`, `src/ui/input/input.ts`,
  `src/ui/rendering/{effects,renderer}.ts`.
- Tests: `src/game/systems/bomb.test.ts`, plus updates to
  `src/game/data/floor.test.ts`, `src/game/engine/game.test.ts`,
  `src/game/systems/enemy.test.ts`, and `src/game/systems/testFloor.ts`.
- Cypress: `cypress/e2e/portfolio-release.cy.ts`, plus updates to
  `cypress/e2e/{playable-slice,slice-regressions}.cy.ts`,
  `cypress/support/{commands,game,index.d}.ts`.
- Assets: `caverns.ogg` re-encoded to 1.4 MB; `monster_roar.wav` converted to
  `monster_roar.ogg` (74 KB); no other audio processing.
- `package.json` and `package-lock.json` version `0.5.0`.

## 4. Coverage added

Unit (14 files, 150 tests, all passing):

- Boss spawn is walkable and inside the final room across seeds.
- Resting every non-boss mob summons exactly one Warden, sets `bossAwake`,
  keeps `exitOpen` false, and emits `boss-summoned`.
- Boss chases, telegraphs melee, starts and releases a bomb windup, damages
  once per active window, scales stagger, and ignores knockback.
- Boss defeat opens the stairs, clears `bossAwake`, and emits
  `boss-defeated`.
- Bomb spawn, flight, landing, fuse, explosion, arc height, and blast hit.
- Bomb damage respects invulnerability; descent clears bombs.
- Descent heals 2 HP, caps at max, and emits `player-healed` only on a change.
- Title does not simulate until started; pause freezes time and player
  position; resume restores play.
- Restart still resets depth, seed, HP, spirit, fragments, and enemy state.

Cypress (3 specs, 20 tests, all passing in Chrome):

- Title screen opens, freezes, and starts on Enter.
- Escape pauses and resumes without advancing time or position.
- Boss summon keeps the stairs sealed and places the Warden at `bossSpawn`.
- The Warden throws a bomb, the bomb explodes, and the blast damages the
  player.
- Existing combat, purification, camera, projectile, death, and restart specs
  still pass after switching them to the title-start helper.

## 5. Assumptions recorded

- The Warden carries no spirit fragments and cannot be rested or respawned.
- Bombs target the player's position at throw time and can fly over walls.
- `R` restarts directly into a new run; it does not return to the title.
- Escape is the only pause input; there is no settings screen or remapping.
- Audio unlock is the title click/key press; no gameplay rule depends on
  hearing a cue.
- Boss tuning is the approved 20–40 second fight; no difficulty scaling.
- `dev` is the Vercel staging branch and `main` is production; the operator
  connects the project.

## 6. Verification

Run from the branch:

```text
npm run typecheck                    # pass
npm test                             # 14 files, 150 tests pass
npm run build                        # pass
CYPRESS_BROWSER=chrome npm run e2e   # 3 specs, 20/20 pass
```

The production bundle was checked with
`grep -R "__gameDebug\|__audioDebug" dist` and returned no matches. The e2e
bundle is built separately with `VITE_E2E=1`.

## 7. Known limits

- Hosted CI and the Vercel deployment are verified on GitHub after the branch
  is pushed; neither was run or emulated locally.
- Audio is verified through debug state, unit/browser behavior, and manual
  listening; headless e2e does not assert audible output.
- The boss/bomb browser test depends on the Warden choosing a bomb; the
  approach distance and cooldown are tuned to make that reliable, but it is
  still a timing-sensitive scenario.
- Safe rooms, shops, currency, consumables, loot, artifacts, multiple bosses,
  difficulty scaling, floor themes, persistence, meta-progression, and a final
  floor remain deferred.
