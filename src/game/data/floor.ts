import { FLOOR, TILE } from "./config";
import type { EnemySpawn, Floor, Rect, Vec2 } from "../types";

export interface WallTile {
  file: string;
  x: number;
  y: number;
}

interface TileRoom {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FLOOR_VARIANTS = 8;

/** Deterministic PRNG used for floor layout. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^=
      value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(
  random: () => number,
  min: number,
  max: number,
): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

export function randomSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0]!;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function tileCenter(column: number, row: number): Vec2 {
  return {
    x: (column + 0.5) * TILE,
    y: (row + 0.5) * TILE,
  };
}

/** Generates one deterministic four-room floor for a seed and depth. */
export function generateFloor(seed: number, depth = 1): Floor {
  const random = createRandom(seed ^ Math.imul(depth, 0x9e3779b9));
  const widths = Array.from({ length: FLOOR.roomCount }, () =>
    randomInt(random, FLOOR.roomWidth.min, FLOOR.roomWidth.max),
  );
  const heights = Array.from({ length: FLOOR.roomCount }, () =>
    randomInt(random, FLOOR.roomHeight.min, FLOOR.roomHeight.max),
  );
  const gaps = Array.from(
    { length: FLOOR.roomCount - 1 },
    () => randomInt(random, FLOOR.roomGap.min, FLOOR.roomGap.max),
  );

  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    gaps.reduce((sum, gap) => sum + gap, 0);
  const startX = Math.max(
    FLOOR.margin,
    Math.floor((FLOOR.cols - totalWidth) / 2),
  );
  const corridorCenter = FLOOR.corridorRow + FLOOR.corridorRows / 2;

  const rooms: TileRoom[] = [];
  let column = startX;
  for (let index = 0; index < FLOOR.roomCount; index += 1) {
    const height = heights[index]!;
    const row = Math.min(
      Math.max(
        Math.round(corridorCenter - height / 2),
        FLOOR.margin,
      ),
      FLOOR.rows - height - FLOOR.margin,
    );
    rooms.push({
      x: column,
      y: row,
      width: widths[index]!,
      height,
    });
    column += widths[index]! + (gaps[index] ?? 0);
  }

  const walkable = Array.from(
    { length: FLOOR.cols * FLOOR.rows },
    () => false,
  );
  const carve = (columnIndex: number, rowIndex: number): void => {
    if (
      columnIndex < 0 ||
      columnIndex >= FLOOR.cols ||
      rowIndex < 0 ||
      rowIndex >= FLOOR.rows
    ) {
      return;
    }
    walkable[rowIndex * FLOOR.cols + columnIndex] = true;
  };

  for (const room of rooms) {
    for (let row = room.y; row < room.y + room.height; row += 1) {
      for (let col = room.x; col < room.x + room.width; col += 1) {
        carve(col, row);
      }
    }
  }

  for (let index = 0; index < rooms.length - 1; index += 1) {
    const room = rooms[index]!;
    const next = rooms[index + 1]!;
    const top = FLOOR.corridorRow;
    for (let row = top; row < top + FLOOR.corridorRows; row += 1) {
      for (let col = room.x + room.width; col < next.x; col += 1) {
        carve(col, row);
      }
    }
  }

  const first = rooms[0]!;
  const last = rooms[rooms.length - 1]!;
  const spawn = tileCenter(
    first.x + Math.floor(first.width / 2),
    FLOOR.corridorRow,
  );
  const stairsColumn = last.x + last.width - 3;
  const stairs: Rect = {
    x: stairsColumn * TILE,
    y: FLOOR.corridorRow * TILE,
    width: 2 * TILE,
    height: FLOOR.corridorRows * TILE,
  };

  const kinds = ["melee", "melee", "ranged"] as const;
  const enemySpawns: EnemySpawn[] = rooms.slice(1).map((room, index) => {
    const kind = kinds[index] ?? "melee";
    const centre = tileCenter(
      room.x + Math.floor(room.width / 2),
      FLOOR.corridorRow,
    );
    return {
      id: `${kind}-${index + 1}`,
      kind,
      x: centre.x,
      y: centre.y,
    };
  });

  return {
    seed,
    depth,
    cols: FLOOR.cols,
    rows: FLOOR.rows,
    width: FLOOR.cols * TILE,
    height: FLOOR.rows * TILE,
    walkable,
    rooms: rooms.map((room) => ({
      x: room.x * TILE,
      y: room.y * TILE,
      width: room.width * TILE,
      height: room.height * TILE,
    })),
    spawn,
    stairs,
    enemySpawns,
  };
}

export function isWalkableTile(
  floor: Floor,
  column: number,
  row: number,
): boolean {
  if (
    column < 0 ||
    column >= floor.cols ||
    row < 0 ||
    row >= floor.rows
  ) {
    return false;
  }
  return floor.walkable[row * floor.cols + column] === true;
}

/** True when a world-space point lies on a walkable tile. */
export function isWalkablePoint(floor: Floor, x: number, y: number): boolean {
  return isWalkableTile(
    floor,
    Math.floor(x / TILE),
    Math.floor(y / TILE),
  );
}

/** True when a circle's whole body is inside walkable tiles. */
export function isCircleWalkable(
  floor: Floor,
  x: number,
  y: number,
  radius: number,
): boolean {
  const minColumn = Math.floor((x - radius) / TILE);
  const maxColumn = Math.floor((x + radius) / TILE);
  const minRow = Math.floor((y - radius) / TILE);
  const maxRow = Math.floor((y + radius) / TILE);

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      if (isWalkableTile(floor, column, row)) continue;

      const left = column * TILE;
      const top = row * TILE;
      const closestX = Math.min(Math.max(x, left), left + TILE);
      const closestY = Math.min(Math.max(y, top), top + TILE);
      if (Math.hypot(x - closestX, y - closestY) < radius) {
        return false;
      }
    }
  }

  return true;
}

/** Stable floor variant for a tile coordinate. */
export function floorTileAt(column: number, row: number): string {
  const hash =
    Math.imul(column + 1, 73856093) ^ Math.imul(row + 1, 19349663);
  const mixed = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  return `floor_${(mixed % FLOOR_VARIANTS) + 1}.png`;
}

/** Wall frames for solid tiles that border walkable space. */
export function wallTiles(floor: Floor): WallTile[] {
  const tiles: WallTile[] = [];
  const isWallBody = (column: number, row: number): boolean =>
    !isWalkableTile(floor, column, row) &&
    isWalkableTile(floor, column, row + 1);

  for (let row = 0; row < floor.rows; row += 1) {
    for (let column = 0; column < floor.cols; column += 1) {
      if (isWalkableTile(floor, column, row)) continue;

      const below = isWalkableTile(floor, column, row + 1);
      const above = isWalkableTile(floor, column, row - 1);
      const left = isWalkableTile(floor, column - 1, row);
      const right = isWalkableTile(floor, column + 1, row);

      let file: string | undefined;
      if (below || above) {
        file = "wall_mid.png";
      } else if (right) {
        file = "wall_left.png";
      } else if (left) {
        file = "wall_right.png";
      } else if (isWalkableTile(floor, column, row + 2)) {
        const leftBody = isWallBody(column - 1, row + 1);
        const rightBody = isWallBody(column + 1, row + 1);
        file = !leftBody
          ? "wall_top_left.png"
          : !rightBody
            ? "wall_top_right.png"
            : "wall_top_mid.png";
      }

      if (file) {
        tiles.push({ file, x: column * TILE, y: row * TILE });
      }
    }
  }

  return tiles;
}

/** True when a world-space circle overlaps the stairs rectangle. */
export function isOnStairs(floor: Floor, x: number, y: number, radius: number): boolean {
  return (
    x + radius > floor.stairs.x &&
    x - radius < floor.stairs.x + floor.stairs.width &&
    y + radius > floor.stairs.y &&
    y - radius < floor.stairs.y + floor.stairs.height
  );
}
