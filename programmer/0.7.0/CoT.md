# Implementation decisions — 0.7.0 reward loop, branch shop, and explicit Warden summon

Owner: `programmer` · Task `0.7.0/001` · Implemented on 2026-11-10.

Source contract: `docs/tasks/0.7.0/001-programmer.md` and
`design/0.7.0/design-decisions.md`.

## 1. Scope delivered

- Skill points as the only run currency: +1 per rested mob, +3 for the Warden,
  run-scoped across descent and reset on death/restart.
- The floor is now one fixed six-room branch: start → first mob → junction hub;
  north/west → second mob → shop dead end; east → third mob → gated arena.
  Room sizes and decoration vary by ±1 tile from the seed; roles, anchors,
  entrances, gate, altar, stall, and stairs are fixed.
- A safe-room shop with a canvas modal panel: `E` opens, `W`/`S`/arrows select,
  `Enter` buys, `Escape` closes without pausing, `E` and the mouse are ignored
  while open, and `M` stays global.
- Healing draught (1 point, heals 2 HP, one carried slot, `Q` to use, blocked
  and not consumed at full HP) and one-time Vigor (3 points, +1 max and current
  HP, absent from later shops).
- The arena gate opens when every mob rests; the Warden is summoned only by a
  single `E` interaction at the altar. The shop closes for the floor on summon.
- HUD skill-point and carried-draught indicators, `ceil(maxHp / 2)` hearts, the
  two-line control legend, gate/altar/stall/waystone drawing, and text-first
  feedback for the new states.
- Unit and Cypress coverage plus the version bump to `0.7.0`.

No separate gold/score resource, drops, chests, inventory grid, shop refresh,
meta-progression, persistence, difficulty scaling, new enemies, new art/audio,
or DOM overlay was added.

## 2. Decisions and rationale

### Domain boundaries

- `src/game/systems/shop.ts` is a pure rules module: `shopRows()`,
  `shopAvailable()`, `purchase()`, `useDraught()`, and `clampSelection()`. It
  never touches Canvas, DOM, or player position; the engine applies the returned
  `maxHpGain` and `hp` values.
- `src/game/data/floor.ts` owns the fixed anchors and carving. It keeps a
  row-major `walkable` map and returns the gate, altar, shop rects, waystone,
  and room roles. There is no graph generator or runtime pathfinding.
- `src/game/engine/game.ts` orchestrates: earning, shop open/close/buy, draught
  use, gate unlock, explicit summon, emergence, boss reward, descent, reset, and
  the safe-room damage rule.
- `src/ui/` only presents the state. The shop panel, gate bars, altar rune,
  stall, waystone, HUD rows, and new effects are procedural drawing.

### Run state and per-floor state

`RunState` gained `skillPoints`, `draughtCarried`, `vigorPurchased`, and
`shopClosed`; `GameState` gained the modal `shop` state. `descend()` builds the
next floor with `createInitialState()` and copies only the run-scoped rewards
and raised max HP, so spirit, purification, gate animation, boss, shop closure,
and shop message all reset. `reset()` creates a fresh run and clears them.

### Explicit summon

`summonBoss()` requires `floorPurified`, no live/defeated boss, and no open
exit. It creates the Warden with `BOSS.emergence = 0.8`, sets `shopClosed`, and
closes an open panel. `updateEnemy()` returns idle while `emerging > 0`, so the
Warden cannot move, attack, or damage the player during the emergence window.
Boss defeat awards `ECONOMY.pointsPerWarden` exactly once and opens the stairs.

### Safe room

Enemies receive `floor.shop.safe` in their blocker list, so they cannot enter
the room. `applyDamageToPlayer()` also returns early while the player is inside
the safe rect, which covers bombs and projectiles that reach the threshold.
The modal shop freezes the world by returning from `stepShop()` before any
enemy/projectile/timer update.

### Copy and feedback

The shop footer shortfall copy follows the design contract
(`Need N more skill point(s)`). Every new event has a text-first cue:
`Rested · +1 skill point`, `The arena opens`,
`The Warden rises · the shop closes`,
`Warden defeated · +3 skill points`, `+N HP`, `Already at full HP`, `No draught`,
`The arena is sealed.`, `The shop is closed.`, and `Vigor · Max HP +1`.
Reduced motion shortens or statically renders the new rings, flashes, pulses,
and floating text.

### Debug and test support

`__gameDebug` remains behind `DEV || VITE_E2E`. It gained `prepareRest`,
`restMobs`, `giveSkillPoints`, `teleport`, `prepareRite`, `weakenBoss`,
`setPlayerHp`, `killPlayer`, and `descend`, and the snapshot now exposes gate,
summon, shop, reward, and floor-anchor state. Cypress navigation uses the shared
`walkTo`/`planRoute` BFS over the snapshot walkable map rather than hard-coded
waypoints, so seeded room variation cannot stall the player on a corridor edge.

## 3. Files

Added:

- `src/game/systems/shop.ts`, `src/game/systems/shop.test.ts`
- `cypress/e2e/reward-loop.cy.ts`

Changed:

- `src/game/data/config.ts`, `src/game/data/floor.ts`,
  `src/game/data/floor.test.ts`
- `src/game/engine/game.ts`, `src/game/engine/game.test.ts`
- `src/game/types/index.ts`, `src/state/initialState.ts`
- `src/game/systems/collision.ts`, `damage.ts`, `enemy.ts`, `movement.ts`,
  `projectile.ts`, `testFloor.ts`
- `src/ui/input/input.ts`, `src/ui/debug.ts`,
  `src/ui/rendering/effects.ts`, `src/ui/rendering/renderer.ts`
- `cypress/support/commands.ts`, `cypress/support/game.ts`,
  `cypress/support/index.d.ts`, `cypress/e2e/playable-slice.cy.ts`,
  `cypress/e2e/slice-regressions.cy.ts`
- `src/index.ts`, `README.md`, `package.json`, `package-lock.json`

## 4. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 189 tests in 17 files, pass |
| `npm run build` | Pass |
| `CYPRESS_BROWSER=chrome npm run e2e` | 32/32 pass across 5 specs in 3 m 03 s |
| Production bundle debug hooks | `grep -R "__gameDebug\|__audioDebug\|__bootDebug" dist` finds nothing |
| Production bundle requests | Font served from `/assets/fonts/`; no runtime external request |

New Cypress coverage in `reward-loop.cy.ts`: a real earn → traverse → buy →
use → summon → defeat → descend flow; a sealed gate and blocked premature
summon; insufficient-points and duplicate-draught blocks; one-time Vigor and a
closed shop after summoning; and reward persistence across descent plus reset
on restart.

## 5. Assumptions and residual risks

- **Waystone label size:** the labels are drawn at 8 px rather than the design's
  9 px to fit the plinth without overlapping the branch chevrons. This is a
  low-impact presentation default; the text and arrows carry the meaning.
- **Shop footer:** the hint stays visible on the left and the latest message on
  the right; the message clears after `SHOP.messageTime = 2.5 s`. The panel
  therefore never hides the controls hint, which satisfies the intent without a
  separate fallback state.
- **Safe-room threshold:** the safe rect is the shop room, so the whole room and
  its threshold are safe. The threshold line is presentation only.
- **Audio:** no new cues were added. New events reuse existing rest, heal,
  floor-purified, and boss cues where the audio manager already matches them;
  otherwise they are silent and fully conveyed visually.
- **Hosted CI** has not been run; only local checks are recorded here.
