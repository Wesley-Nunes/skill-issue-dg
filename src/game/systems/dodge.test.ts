import { describe, expect, it } from "vitest";
import { DODGE } from "../data/config";
import { createPlayer } from "../../state/initialState";
import {
  canDodge,
  startDodge,
  tickDodgeTimers,
} from "./dodge";
import { movePlayer } from "./movement";
import { openFloor } from "./testFloor";

const ROOM = openFloor();

describe("startDodge", () => {
  it("applies duration, cooldown, direction and invulnerability", () => {
    const player = createPlayer(ROOM.spawn);
    const dodged = startDodge(player, { x: 1, y: 0 });

    expect(dodged.dodgeTime).toBeCloseTo(DODGE.duration);
    expect(dodged.dodgeCooldown).toBeCloseTo(DODGE.cooldown);
    expect(dodged.dodgeDir).toEqual({ x: 1, y: 0 });
    expect(dodged.invulnerable).toBeCloseTo(DODGE.invulnerability);
    expect(canDodge(dodged)).toBe(false);
  });

  it("uses aim direction when there is no movement input", () => {
    const dodged = startDodge(createPlayer(ROOM.spawn), { x: 0, y: 0 });
    expect(dodged.dodgeDir).toEqual(createPlayer(ROOM.spawn).aim);
  });

  it("cannot start while on cooldown", () => {
    const player = {
      ...createPlayer(ROOM.spawn),
      dodgeCooldown: 0.2,
    };
    expect(startDodge(player, { x: 1, y: 0 })).toBe(player);
  });

  it("travels the configured distance over its duration", () => {
    const step = 0.01;
    let player = startDodge(createPlayer(ROOM.spawn), { x: 1, y: 0 });
    const startX = player.x;

    for (let elapsed = 0; elapsed < DODGE.duration; elapsed += step) {
      player = movePlayer(player, { x: 1, y: 0 }, step, ROOM);
      player = tickDodgeTimers(player, step);
    }

    expect(player.x - startX).toBeCloseTo(DODGE.distance);
  });

  it("stops moving at the wall", () => {
    let player = { ...startDodge(createPlayer(ROOM.spawn), { x: -1, y: 0 }), x: 60 };
    for (let elapsed = 0; elapsed < DODGE.duration; elapsed += 0.01) {
      player = movePlayer(player, { x: -1, y: 0 }, 0.01, ROOM);
      player = tickDodgeTimers(player, 0.01);
    }
    expect(player.x).toBeGreaterThanOrEqual(ROOM.rooms[0]!.x + player.radius);
    expect(player.x).toBeLessThan(60);
  });

  it("does not overshoot the distance on long frames", () => {
    let player = startDodge(createPlayer(ROOM.spawn), { x: 1, y: 0 });
    const startX = player.x;

    for (let frame = 0; frame < 4; frame += 1) {
      player = movePlayer(player, { x: 1, y: 0 }, 0.05, ROOM);
      player = tickDodgeTimers(player, 0.05);
    }

    expect(player.x - startX).toBeCloseTo(DODGE.distance);
  });
});
