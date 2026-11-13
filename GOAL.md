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

## Current progress (2026-11-13)

Versions `0.1.0`–`0.7.0` are delivered and merged into `dev`. Together they
provide:

- one playable character with WASD movement, mouse aim, a single light attack,
  dodge with i-frames, HP, and damage;
- a seeded six-room dungeon branch with corridors, tile collision, line of
  sight, three melee/ranged mobs, spirit fragments, and endless descent;
- a Floor Warden the player explicitly summons once every mob is at rest, with
  a telegraphed melee attack and fused bombs;
- skill points earned by resting mobs, a safe-room shop selling a healing
  draught and a one-time Vigor upgrade, and a reward loop that persists across
  floors within a run;
- death, run summary, restart, heal-on-descent, a title/start screen, pause,
  restrained CC0/synthesized audio, a boot loading screen, and a mute toggle;
- a Vite build configured for Vercel (`dev` staging, `main` production).

`0.8.0` is in progress: it removes the three-hit light chain in favour of the
single light attack and adds a numeric depth difficulty curve whose first floor
is the teaching floor. Remaining `docs/about-the-project.md` §10 gaps are
post-death purchases, meta-progression, persistence, income scaling, new enemy
archetypes, a general floor generator, and artifacts.

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
