# 001 — Design: portfolio release

## Metadata

| Field | Value |
|---|---|
| Version | `0.5.0` |
| Task ID | `001` |
| Owning agent | `design` |
| Status | `Passed` |
| Depends on | Operator approval of the portfolio-release scope (2026-11-07) |
| Produces | `design/0.5.0/design-decisions.md` |

## Context

`0.4.0` is merged. The game has a seeded four-room floor, tile collision, a
three-hit combo, dodge, two enemy archetypes, spirit fragments, and endless
descent. Purifying every mob fills the spirit meter and opens the stairs, but
the meter has no payoff and there is no boss, audio, title screen, or pause.

The operator approved a `0.5.0` portfolio release: a floor boss, minimal
audio, a title/start screen, death and pause presentation, heal-on-descent,
and a deployable README/Vercel build. The operator supplied `big_demon` and
`bomb` frames and a CC0 audio set.

## Objective

Define the player-visible and interaction decisions for the floor boss, bomb
attack, title/pause/death screens, boss HUD, audio feedback, and the
presentation changes needed for a portfolio-quality build.

## In scope

- Boss summon presentation when the spirit meter fills.
- Boss silhouette, scale, aura, melee telegraph, hurt and death states.
- Bomb throw, landing marker, fuse, explosion, and blast-radius readability.
- Boss health bar, boss-awakened HUD state, and stairs-state wording.
- Title/start screen, pause overlay, and death summary.
- Mute indicator and the audio feedback map for existing events.
- Floor-entry/descent feedback when HP is restored.
- Presentation requirements for the README and Vercel build.

## Out of scope

- Safe rooms, shops, currency, consumables, loot, artifacts, multiple bosses,
  difficulty scaling, floor themes, persistence, meta-progression, or a final
  floor.
- New combat mechanics beyond the boss melee/bomb pattern.
- New art beyond the operator-supplied boss, bomb, and audio assets.
- A settings menu, remapping, or accessibility options beyond readable cues.

## Approved behaviour

Operator-approved on 2026-11-07:

1. A boss appears on every floor when the spirit meter fills. Defeating it
   opens the stairs; death remains the only run end.
2. The boss uses the `big_demon` frames and throws bombs using the `bomb`
   frames.
3. Audio uses the supplied CC0 files for concrete events and synthesized
   layers for the boss's presence.
4. The build deploys to Vercel: `dev` is staging and `main` is production.
5. Descending restores 2 HP, capped at the maximum.

## Constraints

- Reuse the existing dark-dungeon visual language and canvas-drawn effects.
- No new runtime dependency or asset pipeline.
- Keep the HUD readable at 1024 × 640 and 1440 × 810.
- Keep the boss and bomb states deterministic for a given seed and input.
- Design decisions must be concrete enough for QA to verify states and cues.
- Audio must never block play; the game remains fully playable muted.

## Acceptance criteria

1. The design file specifies boss spawn, aura, telegraph, hurt, and defeat
   states.
2. The design file specifies bomb flight, landing marker, fuse, blast radius,
   and explosion cues.
3. The design file specifies the title, pause, death, boss-bar, and
   mute-indicator layouts.
4. The design file maps each new and existing event to an audio cue or
   explicitly leaves it silent.
5. Every visual choice uses existing assets or procedural canvas drawing.
6. Deferred work is listed without implying approval.

## Open assumptions / unresolved items

- No blocking design question remains. Low-impact defaults are recorded in the
  design decision document.
