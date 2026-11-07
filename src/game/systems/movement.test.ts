import { describe, expect, it } from "vitest";
import { PLAYER } from "../data/config";
import { createPlayer } from "../../state/initialState";
import { movePlayer, normalizeMove } from "./movement";
import { openFloor } from "./testFloor";

const ROOM = openFloor();

describe("normalizeMove", () => {
  it("keeps cardinal input at unit length", () => {
    expect(normalizeMove({ x: 1, y: 0 })).toEqual({ x: 1, y: 0 });
  });

  it("normalizes diagonal input so it is not faster", () => {
    const move = normalizeMove({ x: 1, y: 1 });
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1);
  });

  it("returns zero for no input", () => {
    expect(normalizeMove({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("movePlayer", () => {
  it("moves at the configured speed", () => {
    const player = createPlayer(ROOM.spawn);
    const moved = movePlayer(player, { x: 1, y: 0 }, 1, ROOM);
    expect(moved.x - player.x).toBeCloseTo(PLAYER.speed);
    expect(moved.y).toBe(player.y);
  });

  it("moves diagonally at the same speed as cardinal movement", () => {
    const player = { ...createPlayer(ROOM.spawn), y: 200 };
    const moved = movePlayer(player, { x: 1, y: 1 }, 1, ROOM);
    const distance = Math.hypot(moved.x - player.x, moved.y - player.y);
    expect(distance).toBeCloseTo(PLAYER.speed);
  });

  it("stops the body at the wall boundary", () => {
    const player = { ...createPlayer(ROOM.spawn), x: 30, y: 200 };
    const moved = movePlayer(player, { x: -1, y: 0 }, 1, ROOM);
    expect(moved.x).toBeGreaterThanOrEqual(ROOM.rooms[0]!.x + player.radius);
    expect(moved.x).toBeLessThan(player.x);
  });

  it("slides along a wall while pushing into it", () => {
    const player = { ...createPlayer(ROOM.spawn), x: 30, y: 200 };
    const moved = movePlayer(player, { x: -1, y: 1 }, 1, ROOM);
    expect(moved.x).toBeGreaterThanOrEqual(ROOM.rooms[0]!.x + player.radius);
    expect(moved.x).toBeLessThan(player.x);
    expect(moved.y).toBeGreaterThan(player.y);
  });
});
