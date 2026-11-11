import { FLOOR, TILE } from "./config";
import type {
  EnemySpawn,
  Floor,
  FloorRoom,
  Rect,
  RoomRole,
  Vec2,
} from "../types";

export interface WallTile {
  file: string;
  x: number;
  y: number;
}

interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FLOOR_VARIANTS = 8;

/**
 * Fixed anchors for the six-room branch. The junction is a hub, not a counted
 * room. Room sizes may vary by one tile; the anchors, roles, entrances, gate,
 * altar, stall, and stairs stay put.
 */
const ANCHORS = {
  start: { x: 3, y: 12, width: 14, height: 9 },
  firstMob: { x: 22, y: 12, width: 16, height: 9 },
  junction: { x: 43, y: 14, width: 9, height: 4 },
  secondMob: { x: 38, y: 2, width: 15, height: 8 },
  shop: { x: 14, y: 2, width: 17, height: 8 },
  thirdMob: { x: 56, y: 12, width: 15, height: 9 },
  arena: { x: 77, y: 6, width: 18, height: 19 },
} as const;

/** Deterministic PRNG used for floor layout. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value += Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
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

function toPixels(rect: TileRect): Rect {
  return {
    x: rect.x * TILE,
    y: rect.y * TILE,
    width: rect.width * TILE,
    height: rect.height * TILE,
  };
}

function vary(
  random: () => number,
  base: TileRect,
): TileRect {
  return {
    x: base.x,
    y: base.y,
    width: Math.max(
      1,
      base.width + randomInt(random, -FLOOR.roomVariation, FLOOR.roomVariation),
    ),
    height: Math.max(
      1,
      base.height + randomInt(random, -FLOOR.roomVariation, FLOOR.roomVariation),
    ),
  };
}

function roomCentreTile(room: TileRect): { column: number; row: number } {
  return {
    column: room.x + Math.floor(room.width / 2),
    row: room.y + Math.floor(room.height / 2),
  };
}

/** Generates one deterministic six-room branch floor for a seed and depth. */
export function generateFloor(seed: number, depth = 1): Floor {
  const random = createRandom(seed ^ Math.imul(depth, 0x9e3779b9));

  const start = vary(random, ANCHORS.start);
  const firstMob = vary(random, ANCHORS.firstMob);
  const junction = { ...ANCHORS.junction };
  const secondMob = vary(random, ANCHORS.secondMob);
  const shopRoom = vary(random, ANCHORS.shop);
  const thirdMob = vary(random, ANCHORS.thirdMob);
  const arena = { ...ANCHORS.arena };

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
  const carveRect = (rect: TileRect): void => {
    for (let row = rect.y; row < rect.y + rect.height; row += 1) {
      for (let column = rect.x; column < rect.x + rect.width; column += 1) {
        carve(column, row);
      }
    }
  };
  const carveHorizontal = (
    fromColumn: number,
    toColumn: number,
    topRow: number,
  ): void => {
    for (let row = topRow; row < topRow + FLOOR.corridorRows; row += 1) {
      for (let column = fromColumn; column < toColumn; column += 1) {
        carve(column, row);
      }
    }
  };
  const carveVertical = (
    column: number,
    fromRow: number,
    toRow: number,
  ): void => {
    for (let row = fromRow; row < toRow; row += 1) {
      for (let offset = 0; offset < FLOOR.corridorRows; offset += 1) {
        carve(column + offset, row);
      }
    }
  };

  for (const room of [
    start,
    firstMob,
    junction,
    secondMob,
    shopRoom,
    thirdMob,
    arena,
  ]) {
    carveRect(room);
  }

  // Main east-west corridor: start -> first mob -> junction -> third mob ->
  // arena. The gate sits inside the final span.
  carveHorizontal(start.x + start.width, firstMob.x, FLOOR.corridorRow);
  carveHorizontal(firstMob.x + firstMob.width, junction.x, FLOOR.corridorRow);
  carveHorizontal(junction.x + junction.width, thirdMob.x, FLOOR.corridorRow);
  carveHorizontal(thirdMob.x + thirdMob.width, arena.x, FLOOR.corridorRow);

  // North branch from the junction to the second mob room.
  carveVertical(
    FLOOR.northCorridorColumn,
    secondMob.y + secondMob.height,
    junction.y,
  );

  // West branch from the second mob room to the shop dead end.
  carveHorizontal(
    shopRoom.x + shopRoom.width,
    secondMob.x,
    FLOOR.shopCorridorRow,
  );

  const startCentre = tileCenter(5, 16);
  const firstCentre = roomCentreTile(firstMob);
  const secondCentre = roomCentreTile(secondMob);
  const thirdCentre = roomCentreTile(thirdMob);

  const spawn = startCentre;
  const stairs: Rect = {
    x: 91 * TILE,
    y: 19 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
  };
  const bossSpawn = tileCenter(88, 11);
  const gate: Rect = {
    x: 74 * TILE,
    y: FLOOR.corridorRow * TILE,
    width: 2 * TILE,
    height: FLOOR.corridorRows * TILE,
  };
  const altar: Rect = {
    x: 81 * TILE,
    y: 15 * TILE,
    width: 3 * TILE,
    height: 3 * TILE,
  };
  const shop: Floor["shop"] = {
    room: toPixels(shopRoom),
    stall: {
      x: 15 * TILE,
      y: 5 * TILE,
      width: 3 * TILE,
      height: 3 * TILE,
    },
    interaction: {
      x: 18 * TILE,
      y: 5 * TILE,
      width: 3 * TILE,
      height: 3 * TILE,
    },
    safe: toPixels(shopRoom),
    threshold: {
      x: (shopRoom.x + shopRoom.width - 2) * TILE,
      y: FLOOR.shopCorridorRow * TILE,
      width: 2 * TILE,
      height: FLOOR.corridorRows * TILE,
    },
  };

  const rooms: FloorRoom[] = [
    { ...toPixels(start), role: "start" as RoomRole },
    { ...toPixels(firstMob), role: "mob" as RoomRole },
    { ...toPixels(secondMob), role: "mob" as RoomRole },
    { ...toPixels(shopRoom), role: "shop" as RoomRole },
    { ...toPixels(thirdMob), role: "mob" as RoomRole },
    { ...toPixels(arena), role: "arena" as RoomRole },
  ];

  const enemySpawns: EnemySpawn[] = [
    {
      id: "melee-1",
      kind: "melee",
      ...tileCenter(firstCentre.column, firstCentre.row),
    },
    {
      id: "melee-2",
      kind: "melee",
      ...tileCenter(secondCentre.column, secondCentre.row),
    },
    {
      id: "ranged-3",
      kind: "ranged",
      ...tileCenter(thirdCentre.column, thirdCentre.row),
    },
  ];

  return {
    seed,
    depth,
    cols: FLOOR.cols,
    rows: FLOOR.rows,
    width: FLOOR.cols * TILE,
    height: FLOOR.rows * TILE,
    walkable,
    rooms,
    junction: toPixels(junction),
    spawn,
    stairs,
    bossSpawn,
    enemySpawns,
    gate,
    altar,
    shop,
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

/** True when a circle overlaps a rectangle. */
export function circleOverlapsRect(
  x: number,
  y: number,
  radius: number,
  rect: Rect,
): boolean {
  // A body whose centre is already inside the rectangle is blocked even when
  // it does not touch an edge (e.g. a gate spanning the whole corridor).
  if (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  ) {
    return true;
  }
  const closestX = Math.min(Math.max(x, rect.x), rect.x + rect.width);
  const closestY = Math.min(Math.max(y, rect.y), rect.y + rect.height);
  return Math.hypot(x - closestX, y - closestY) < radius;
}

/** True when a circle's whole body is inside walkable tiles. */
export function isCircleWalkable(
  floor: Floor,
  x: number,
  y: number,
  radius: number,
  blocked: readonly Rect[] = [],
): boolean {
  for (const rect of blocked) {
    if (circleOverlapsRect(x, y, radius, rect)) return false;
  }

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

/** True when a world-space point is inside a rectangle. */
export function isInsideRect(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}
