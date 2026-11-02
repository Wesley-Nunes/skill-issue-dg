import { describe, expect, it } from "vitest";
import { DODGE, ROOM } from "../data/config";
import { createPlayer } from "../../state/initialState";
import {
  canDodge,
  startDodge,
  tickDodgeTimers,
} from "./dodge";
import { movePlayer } from "./movement";

describe("startDodge", () => {
  it("applies duration, cooldown, direction and invulnerability", () => {
    const player = createPlayer();
    const dodged = startDodge(player, { x: 1, y: 0 });

    expect(dodged.dodgeTime).toBeCloseTo(DODGE.duration);
    expect(dodged.dodgeCooldown).toBeCloseTo(DODGE.cooldown);
    expect(dodged.dodgeDir).toEqual({ x: 1, y: 0 });
    expect(dodged.invulnerable).toBeCloseTo(DODGE.invulnerability);
    expect(canDodge(dodged)).toBe(false);
  });

  it("uses aim direction when there is no movement input", () => {
    const dodged = startDodge(createPlayer(), { x: 0, y: 0 });
    expect(dodged.dodgeDir).toEqual(createPlayer().aim);
  });

  it("cannot start while on cooldown", () => {
    const player = {
      ...createPlayer(),
      dodgeCooldown: 0.2,
    };
    expect(startDodge(player, { x: 1, y: 0 })).toBe(player);
  });

  it("travels the configured distance over its duration", () => {
    const step = 0.01;
    let player = startDodge(createPlayer(), { x: 1, y: 0 });
    const startX = player.x;

    for (let elapsed = 0; elapsed < DODGE.duration; elapsed += step) {
      player = movePlayer(player, { x: 1, y: 0 }, step, ROOM);
      player = tickDodgeTimers(player, step);
    }

    expect(player.x - startX).toBeCloseTo(DODGE.distance);
  });

  it("stops moving at the wall", () => {
    let player = { ...startDodge(createPlayer(), { x: -1, y: 0 }), x: 60 };
    for (let elapsed = 0; elapsed < DODGE.duration; elapsed += 0.01) {
      player = movePlayer(player, { x: -1, y: 0 }, 0.01, ROOM);
      player = tickDodgeTimers(player, 0.01);
    }
    expect(player.x).toBe(ROOM.bounds.minX + player.radius);
  });
});
