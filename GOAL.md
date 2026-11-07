# Project Goal

## Initial goal: deliver the MVP

The initial product goal is to define, build, and validate a playable **Minimum Viable Product (MVP)** for **skill issue dg**, a 2D roguelike game.

The MVP's exact gameplay scope, completion conditions, and success criteria are **not yet locked**. The operator must decide them through the version discovery process led by the docs agent. Do not treat this file as approval for any feature that has not been explicitly agreed.

## Product and engineering principles

All work must apply:

- **KISS** — favor the simplest solution that meets the need.
- **YAGNI** — build only what the approved MVP needs now.
- **SoC** — separate domain rules, game orchestration, runtime state, input, rendering, and UI.
- **Pragmatism** — optimize for a playable, understandable, testable result; avoid speculative architecture.

## MVP goal contract — to be completed with the operator

The docs agent must use `docs/about-the-project.md` as the primary product context and work with the operator to establish:

1. **Player experience:** what the player should be able to do and experience in the MVP.
2. **Core loop:** the minimum playable loop, including its start, meaningful decisions, progression, and end/restart conditions.
3. **MVP boundaries:** what is included, explicitly excluded, and deferred.
4. **Success criteria:** observable conditions that demonstrate the MVP works and is worth evaluating.
5. **Technical constraints:** target platform, input assumptions, performance expectations, and project constraints that materially affect implementation.
6. **Quality bar:** required automated checks, test coverage expectations, and manual acceptance checks.

Do not fill these sections with guesses. Record operator-approved decisions in `docs/about-the-project.md` and the versioned task files, then summarize the agreed goal here.

## Current progress (2026-11-07)

The `0.5.0` portfolio release delivers a complete vertical slice:

- one playable character with WASD movement, mouse aim, a three-hit hard-timed
  combo, dodge with i-frames, HP, and damage;
- a seeded four-room dungeon floor with corridors, tile collision, line of
  sight, three melee/ranged mobs, spirit fragments, and endless descent;
- a Floor Warden summoned by a full spirit meter, with a telegraphed melee
  attack and fused bombs;
- death, run summary, restart, heal-on-descent, a title/start screen, pause,
  restrained CC0/synthesized audio, and a mute toggle;
- a Vite build configured for Vercel (`dev` staging, `main` production).

This is **not** a completed MVP. The remaining `docs/about-the-project.md` §9
gaps are the reward loop: consumables, currency, skill points, loot, a safe
room/shop, the post-death purchase flow, and difficulty scaling.

## Definition of MVP completion

The MVP is complete only when all of the following are true:

- the agreed MVP scope is implemented;
- the documented core loop can be experienced end to end;
- the agreed acceptance criteria pass;
- relevant automated tests and project checks pass;
- QA has verified the implementation against both the task and approved design decisions;
- known limitations and intentionally deferred work are documented;
- the orchestrator has reviewed the changes and updated `STATE.md`.

The orchestrator must replace this provisional contract with concrete, testable criteria after operator discovery. Until then, MVP completion is **not defined**.
