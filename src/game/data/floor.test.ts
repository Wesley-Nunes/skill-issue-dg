import { describe, expect, it } from "vitest";
import { FLOOR, TILE } from "./config";
import {
  generateFloor,
  isOnStairs,
  isWalkablePoint,
  isWalkableTile,
  nextSeed,
} from "./floor";
import type { Floor, Vec2 } from "../types";

function tileAt(point: Vec2): { column: number; row: number } {
  return {
    column: Math.floor(point.x / TILE),
    row: Math.floor(point.y / TILE),
  };
}

function reachable(floor: Floor, from: Vec2, to: Vec2): boolean {
  const start = tileAt(from);
  const goal = tileAt(to);
  const seen = new Set<number>([start.row * floor.cols + start.column]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.column === goal.column && current.row === goal.row) {
      return true;
    }

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const column = current.column + dx;
      const row = current.row + dy;
      const key = row * floor.cols + column;
      if (seen.has(key) || !isWalkableTile(floor, column, row)) continue;
      seen.add(key);
      queue.push({ column, row });
    }
  }

  return false;
}

function stairsCentre(floor: Floor): Vec2 {
  return {
    x: floor.stairs.x + floor.stairs.width / 2,
    y: floor.stairs.y + floor.stairs.height / 2,
  };
}

describe("generateFloor", () => {
  it("is deterministic for the same seed and depth", () => {
    const first = generateFloor(4242, 3);
    const second = generateFloor(4242, 3);

    expect(second).toEqual(first);
  });

  it("changes the layout when the seed or depth changes", () => {
    const base = generateFloor(4242, 1);

    expect(generateFloor(nextSeed(4242), 1)).not.toEqual(base);
    expect(generateFloor(4242, 2)).not.toEqual(base);
  });

  it("produces four rooms between the floor margins", () => {
    const floor = generateFloor(99, 1);

    expect(floor.rooms).toHaveLength(FLOOR.roomCount);
    for (const room of floor.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x + room.width).toBeLessThanOrEqual(floor.width);
      expect(room.y + room.height).toBeLessThanOrEqual(floor.height);
      expect(room.width).toBeGreaterThanOrEqual(FLOOR.roomWidth.min * TILE);
      expect(room.width).toBeLessThanOrEqual(FLOOR.roomWidth.max * TILE);
      expect(room.height).toBeGreaterThanOrEqual(FLOOR.roomHeight.min * TILE);
      expect(room.height).toBeLessThanOrEqual(FLOOR.roomHeight.max * TILE);
    }
  });

  it("connects the spawn to the stairs through walkable tiles", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const floor = generateFloor(seed, 1);
      expect(reachable(floor, floor.spawn, stairsCentre(floor))).toBe(true);
    }
  });

  it("places the player and stairs on walkable tiles", () => {
    const floor = generateFloor(2024, 1);

    expect(isWalkablePoint(floor, floor.spawn.x, floor.spawn.y)).toBe(true);
    expect(
      isWalkablePoint(floor, stairsCentre(floor).x, stairsCentre(floor).y),
    ).toBe(true);
    expect(isOnStairs(floor, floor.spawn.x, floor.spawn.y, 6)).toBe(false);
  });

  it("places one enemy per non-start room and all on walkable tiles", () => {
    const floor = generateFloor(7, 1);

    expect(floor.enemySpawns).toHaveLength(FLOOR.roomCount - 1);
    expect(floor.enemySpawns.map((spawn) => spawn.kind)).toEqual([
      "melee",
      "melee",
      "ranged",
    ]);
    for (const spawn of floor.enemySpawns) {
      expect(
        isWalkablePoint(floor, spawn.x, spawn.y),
      ).toBe(true);
    }
  });

  it("keeps the start room free of enemies", () => {
    const floor = generateFloor(7, 1);
    const [start] = floor.rooms;

    for (const spawn of floor.enemySpawns) {
      const inside =
        spawn.x >= start!.x &&
        spawn.x <= start!.x + start!.width &&
        spawn.y >= start!.y &&
        spawn.y <= start!.y + start!.height;
      expect(inside).toBe(false);
    }
  });
});
