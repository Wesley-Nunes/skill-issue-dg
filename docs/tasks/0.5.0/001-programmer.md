# 001 — Programmer: portfolio release

## Metadata

| Field | Value |
|---|---|
| Version | `0.5.0` |
| Task ID | `001` |
| Owning agent | `programmer` |
| Status | `Completed` |
| Depends on | `docs/tasks/0.5.0/001-design.md`, `design/0.5.0/design-decisions.md` |
| Produces | Boss and bomb systems, audio system, title/pause/death flow, heal-on-descent, README/Vercel config, tests, `programmer/0.5.0/CoT.md` |

## Context

The `0.4.0` slice clears a floor by resting three mobs, which fills the spirit
meter and opens the stairs. There is no boss, no audio, no title screen, and
no recovery between floors. The operator supplied `big_demon` and `bomb`
frames plus a CC0 audio set under `public/assets/`.

## Objective

Turn the existing vertical slice into a self-contained portfolio release: a
boss encounter that gives the spirit meter a payoff, restrained audio, a
clean start/pause/death flow, and a deployable build.

## In scope

- Boss enemy: summon, movement, melee attack, bomb attack, damage, defeat,
  and stairs unlock.
- Bomb entity: throw arc, landing, fuse, explosion, and player damage.
- Boss HUD, stairs-state wording, and mute indicator.
- Title/start screen, pause overlay, and death summary.
- Heal 2 HP on descent, capped at max HP.
- Web Audio manager: ambient loop, mapped CC0 SFX, pitch/pan variation,
  mute, and synthesized boss layers.
- README, `vercel.json`, and version bump to `0.5.0`.
- Unit and Cypress coverage; update shared Cypress helpers and snapshots.
- Record implementation decisions in `programmer/0.5.0/CoT.md`.

## Out of scope

- Safe rooms, shops, currency, consumables, loot, artifacts, multiple bosses,
  difficulty scaling, floor themes, persistence, meta-progression, or a final
  floor.
- New enemy archetypes, secondary attacks, skills, or remapping.
- New art or audio beyond the supplied assets.
- A settings menu, volume sliders, or accessibility options beyond mute.

## Approved behaviour

1. **Boss summon.** When every non-boss mob on the floor is rested, the spirit
   meter reaches its threshold, the floor is marked purified, and a boss
   spawns at the floor's boss spawn. The stairs remain sealed. A
   `boss-summoned` event is emitted.
2. **Boss combat.** The boss chases the player, performs a telegraphed melee
   attack at close range, and throws a bomb at range. The boss does not carry
   spirit fragments, does not rest, and does not respawn.
3. **Bomb attack.** A bomb is thrown toward the player's position at throw
   time, arcs to a landing point, lands, burns a fuse, and explodes. The blast
   damages the player only if they are inside the radius and not invulnerable.
   Bombs are cleared on descent and restart.
4. **Boss defeat.** Reaching 0 HP puts the boss into its dying state, opens the
   stairs, clears `bossAwake`, and emits `boss-defeated`. The run continues.
5. **Descent.** Stepping on open stairs generates the next floor, increments
   depth, resets spirit/boss state, preserves and heals the player by 2 HP
   (capped), and emits `floor-descended` plus `player-healed` when HP changes.
6. **Title and pause.** The app starts on a title screen. Clicking the canvas
   or pressing Enter/Space starts the run. Escape pauses and resumes. The
   simulation does not advance while title or paused.
7. **Death and restart.** Death shows depth reached and mobs purified. `R`
   starts a fresh depth-1 run with a new seed and full HP.
8. **Audio.** Audio unlocks on the first user gesture. The ambient loop plays
   after unlock. Mapped events play their supplied or synthesized cue. `M`
   toggles mute. Audio failure or an unavailable `AudioContext` must not break
   play or tests.
9. **Deployment.** `npm run build` produces a Vite bundle suitable for Vercel.
   `dev` is the staging branch and `main` is the production branch; the
   repository documents this rather than hard-coding hosting credentials.

## Constraints

- Keep game rules pure and side-effect-free in `src/game/systems/` where
  practical; keep orchestration in `src/game/engine/`, runtime state in
  `src/state/`, presentation in `src/ui/rendering/`, audio in `src/ui/audio/`,
  and input in `src/ui/input/`.
- Reuse existing assets and the current canvas style. No new dependency.
- Apply KISS/YAGNI: one boss, one bomb type, no loot or shop.
- Do not weaken existing unit or e2e coverage without replacing the covered
  behaviour.
- Keep the debug hook behind the existing DEV/`VITE_E2E` condition and out of
  the production bundle.

## Acceptance criteria

1. `generateFloor` exposes a walkable `bossSpawn` inside the final room.
2. Resting every non-boss mob spawns exactly one boss, sets `bossAwake`, keeps
   `exitOpen` false, and emits `boss-summoned`.
3. The boss is damaged by the player's combo, does not rest or respawn, and
   ignores knockback.
4. The boss performs a melee attack and a bomb attack; the bomb lands, fuses,
   explodes, and damages a player inside the blast radius.
5. A dodge or invulnerability window prevents bomb damage.
6. Defeating the boss sets `exitOpen`, clears `bossAwake`, and emits
   `boss-defeated`; the stairs then descend.
7. Descent heals 2 HP, capped at max, and preserves the existing depth and
   spirit reset behaviour.
8. The app starts in a title state, starts on click/Enter/Space, pauses and
   resumes on Escape, and does not simulate while title/paused.
9. Death shows depth and purified-mob count; `R` restarts at depth 1.
10. Audio unlocks on gesture, plays the mapped cues, toggles with `M`, and
    degrades safely when Web Audio is unavailable.
11. `npm run typecheck`, `npm test`, and `npm run build` pass.
12. `CYPRESS_BROWSER=chrome npm run e2e` passes with the title flow and boss
    coverage added.
13. The production bundle contains no `__gameDebug` or `__audioDebug` hooks.
14. `README.md` documents controls, run/build commands, stack, attribution,
    and the Vercel `dev`/`main` branch mapping.

## Dependencies and handoff

Inputs: approved design decisions, current combat/purification behavior,
operator-supplied boss/bomb/audio assets.

Outputs: boss and bomb systems, audio manager, title/pause/death flow,
heal-on-descent, README/Vercel config, unit/e2e tests, implementation log.

Hand off to QA with the tested commit and the commands run.

## Open assumptions / unresolved items

- **Boss fragments:** the boss does not carry spirit fragments in `0.5.0`;
  purification remains the mob mechanic.
- **Boss balance:** values live in `src/game/data/config.ts` and are tuned for
  a roughly 20–40 second fight.
- **Bomb targeting:** the bomb targets the player's position at throw time,
  not a continuously tracked position.
- **Pause:** Escape pauses; there is no separate settings screen.
- **Restart:** `R` restarts directly into a new run, not to the title screen.
- **Vercel:** the operator connects the repository and sets `dev`/`main`;
  the code only supplies the build configuration.
