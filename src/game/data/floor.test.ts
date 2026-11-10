import { describe, expect, it } from "vitest";
import { FLOOR, TILE } from "./config";
import {
  generateFloor,
  isCircleWalkable,
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

function inside(
  point: Vec2,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Walkable tiles immediately outside the shop room's walls. */
function shopEntrances(floor: Floor): Array<{ column: number; row: number }> {
  const room = floor.shop.room;
  const minColumn = Math.round(room.x / TILE);
  const minRow = Math.round(room.y / TILE);
  const maxColumn = Math.round((room.x + room.width) / TILE) - 1;
  const maxRow = Math.round((room.y + room.height) / TILE) - 1;
  const entrances: Array<{ column: number; row: number }> = [];

  for (let column = minColumn; column <= maxColumn; column += 1) {
    if (isWalkableTile(floor, column, minRow - 1)) {
      entrances.push({ column, row: minRow - 1 });
    }
    if (isWalkableTile(floor, column, maxRow + 1)) {
      entrances.push({ column, row: maxRow + 1 });
    }
  }
  for (let row = minRow; row <= maxRow; row += 1) {
    if (isWalkableTile(floor, minColumn - 1, row)) {
      entrances.push({ column: minColumn - 1, row });
    }
    if (isWalkableTile(floor, maxColumn + 1, row)) {
      entrances.push({ column: maxColumn + 1, row });
    }
  }

  return entrances;
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

  it("produces the fixed six-room branch with stable roles", () => {
    const floor = generateFloor(99, 1);

    expect(floor.rooms).toHaveLength(FLOOR.roomCount);
    expect(floor.rooms.map((room) => room.role)).toEqual([
      "start",
      "mob",
      "mob",
      "shop",
      "mob",
      "arena",
    ]);
    for (const room of floor.rooms) {
      expect(room.x).toBeGreaterThanOrEqual(0);
      expect(room.y).toBeGreaterThanOrEqual(0);
      expect(room.x + room.width).toBeLessThanOrEqual(floor.width);
      expect(room.y + room.height).toBeLessThanOrEqual(floor.height);
      expect(room.width).toBeGreaterThan(0);
      expect(room.height).toBeGreaterThan(0);
    }
  });

  it("keeps the junction, shop, gate, altar, stairs, and waystone fixed", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const floor = generateFloor(seed, 1);
      const junction = floor.junction;
      expect(junction.x).toBe(43 * TILE);
      expect(junction.y).toBe(14 * TILE);
      expect(junction.width).toBe(9 * TILE);
      expect(junction.height).toBe(4 * TILE);

      expect(floor.gate.x).toBe(74 * TILE);
      expect(floor.gate.y).toBe(15 * TILE);
      expect(floor.gate.width).toBe(2 * TILE);
      expect(floor.gate.height).toBe(2 * TILE);

      expect(floor.altar.x).toBe(81 * TILE);
      expect(floor.altar.y).toBe(15 * TILE);
      expect(floor.altar.width).toBe(3 * TILE);
      expect(floor.altar.height).toBe(3 * TILE);

      expect(floor.stairs.x).toBe(91 * TILE);
      expect(floor.stairs.y).toBe(19 * TILE);
      expect(floor.waystone.x).toBe(47.5 * TILE);
      expect(floor.waystone.y).toBe(15.5 * TILE);

      expect(floor.shop.stall.x).toBe(15 * TILE);
      expect(floor.shop.stall.y).toBe(5 * TILE);
      expect(floor.shop.interaction.x).toBe(18 * TILE);
      expect(floor.shop.interaction.y).toBe(5 * TILE);
      expect(floor.shop.safe).toEqual(floor.shop.room);
    }
  });

  it("connects the spawn to the stairs through walkable tiles", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const floor = generateFloor(seed, 1);
      expect(reachable(floor, floor.spawn, stairsCentre(floor))).toBe(true);
    }
  });

  it("places the player, altar, boss, and stairs on walkable tiles", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const floor = generateFloor(seed, 1);
      expect(isWalkablePoint(floor, floor.spawn.x, floor.spawn.y)).toBe(true);
      expect(
        isWalkablePoint(floor, stairsCentre(floor).x, stairsCentre(floor).y),
      ).toBe(true);
      expect(
        isWalkablePoint(
          floor,
          floor.altar.x + floor.altar.width / 2,
          floor.altar.y + floor.altar.height / 2,
        ),
      ).toBe(true);
      expect(isWalkablePoint(floor, floor.bossSpawn.x, floor.bossSpawn.y)).toBe(
        true,
      );
      expect(isOnStairs(floor, floor.spawn.x, floor.spawn.y, 6)).toBe(false);
    }
  });

  it("keeps the shop a dead end with a single east entrance", () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const floor = generateFloor(seed, 1);
      const room = floor.shop.room;
      const entrances = shopEntrances(floor);
      expect(entrances.length, `seed ${seed} entrances`).toBeGreaterThan(0);
      for (const entrance of entrances) {
        expect(entrance.column).toBe(Math.round((room.x + room.width) / TILE));
        expect([5, 6]).toContain(entrance.row);
      }
    }
  });

  it("places the gate across the arena corridor and the stairs inside the arena", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const floor = generateFloor(seed, 1);
      const arena = floor.rooms.find((room) => room.role === "arena")!;
      expect(inside(floor.altar, arena)).toBe(true);
      expect(inside(floor.bossSpawn, arena)).toBe(true);
      expect(
        inside(
          {
            x: floor.stairs.x + floor.stairs.width / 2,
            y: floor.stairs.y + floor.stairs.height / 2,
          },
          arena,
        ),
      ).toBe(true);

      const centre = {
        x: floor.gate.x + floor.gate.width / 2,
        y: floor.gate.y + floor.gate.height / 2,
      };
      expect(isWalkablePoint(floor, centre.x, centre.y)).toBe(true);
      expect(isCircleWalkable(floor, centre.x, centre.y, 6, [floor.gate])).toBe(
        false,
      );
      expect(isCircleWalkable(floor, centre.x, centre.y, 6)).toBe(true);
    }
  });

  it("places one enemy per mob room on walkable tiles", () => {
    const floor = generateFloor(7, 1);

    expect(floor.enemySpawns).toHaveLength(3);
    expect(floor.enemySpawns.map((spawn) => spawn.kind)).toEqual([
      "melee",
      "melee",
      "ranged",
    ]);
    for (const spawn of floor.enemySpawns) {
      expect(isWalkablePoint(floor, spawn.x, spawn.y)).toBe(true);
    }

    const mobRooms = floor.rooms.filter((room) => room.role === "mob");
    for (const spawn of floor.enemySpawns) {
      expect(mobRooms.some((room) => inside(spawn, room))).toBe(true);
    }
  });

  it("keeps the start room and the shop free of enemies", () => {
    const floor = generateFloor(7, 1);
    const safeRooms = floor.rooms.filter(
      (room) => room.role === "start" || room.role === "shop",
    );

    for (const spawn of floor.enemySpawns) {
      expect(safeRooms.some((room) => inside(spawn, room))).toBe(false);
    }
  });

  it("keeps the boss spawn inside the arena for every seed", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const floor = generateFloor(seed, 1);
      const arena = floor.rooms.find((room) => room.role === "arena")!;
      expect(inside(floor.bossSpawn, arena)).toBe(true);
      expect(reachable(floor, floor.spawn, floor.bossSpawn)).toBe(true);
    }
  });
});
