import type { DebugSnapshot, Vec2 } from "../../src/game/types";

/** Options shared by the movement commands. */
export interface WalkOptions {
  /** Stop once the player is this many world pixels from the target. */
  stop?: number;
  /** Maximum time to keep walking, in milliseconds. */
  timeout?: number;
}

export interface ClickWorldOptions {
  /** Mouse button to click; defaults to the primary button. */
  button?: number;
}

/** Clamps a value into the inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Camera top-left that frames the player inside the floor bounds. */
export function cameraTarget(snapshot: DebugSnapshot): { x: number; y: number } {
  return {
    x: clamp(
      snapshot.player.x - snapshot.viewport.width / 2,
      0,
      snapshot.floor.width - snapshot.viewport.width,
    ),
    y: clamp(
      snapshot.player.y - snapshot.viewport.height / 2,
      0,
      snapshot.floor.height - snapshot.viewport.height,
    ),
  };
}

/** True once the smoothed camera has caught up with its clamped target. */
export function cameraSettled(snapshot: DebugSnapshot): boolean {
  const target = cameraTarget(snapshot);
  return (
    Math.abs(snapshot.camera.x - target.x) < 1 &&
    Math.abs(snapshot.camera.y - target.y) < 1
  );
}

/** The first living melee enemy, or the first enemy as a fallback. */
export function meleeTarget(snapshot: DebugSnapshot) {
  return (
    snapshot.enemies.find(
      (enemy) => enemy.kind === "melee" && enemy.status === "alive",
    ) ?? snapshot.enemies[0]!
  );
}

/** The living Floor Warden, or the first boss entry as a fallback. */
export function bossTarget(snapshot: DebugSnapshot) {
  return (
    snapshot.enemies.find(
      (enemy) => enemy.kind === "boss" && enemy.status === "alive",
    ) ?? snapshot.enemies.find((enemy) => enemy.kind === "boss")!
  );
}

/** World-space centre of the upper-right intact fragment. */
export function fragmentPoint(enemy: DebugSnapshot["enemies"][number]) {
  const angle = (-45 * Math.PI) / 180;
  return {
    x: enemy.x + Math.cos(angle) * 12,
    y: enemy.y - 10 + Math.sin(angle) * 12,
  };
}

/**
 * Plans a tile-centre route from the player to a world-space target.
 *
 * The floor is a fixed branch rather than an open field, so walking straight
 * at a room across a wall stalls the player. The route is a test-only BFS over
 * the snapshot's walkable tiles; the game itself has no pathfinding.
 */
export function planRoute(
  snapshot: DebugSnapshot,
  target: Vec2,
  stop = 8,
): Vec2[] {
  const cols = snapshot.floor.cols;
  const rows = snapshot.floor.rows;
  const tile = snapshot.floor.width / cols;
  const startColumn = clamp(Math.floor(snapshot.player.x / tile), 0, cols - 1);
  const startRow = clamp(Math.floor(snapshot.player.y / tile), 0, rows - 1);
  const goalColumn = clamp(Math.floor(target.x / tile), 0, cols - 1);
  const goalRow = clamp(Math.floor(target.y / tile), 0, rows - 1);
  const index = (column: number, row: number): number => row * cols + column;
  const walkable = snapshot.floor.walkable;
  const start = index(startColumn, startRow);

  if (walkable[start] !== true) return [];

  const parent = new Int32Array(cols * rows).fill(-1);
  parent[start] = start;
  const queue = [start];
  let best = start;
  let bestDistance = Math.hypot(
    startColumn - goalColumn,
    startRow - goalRow,
  );

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]!;
    const column = current % cols;
    const row = Math.floor(current / cols);
    const distance = Math.hypot(column - goalColumn, row - goalRow);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = current;
    }
    if (current === index(goalColumn, goalRow)) {
      best = current;
      break;
    }

    const neighbours: number[] = [];
    if (column + 1 < cols) neighbours.push(index(column + 1, row));
    if (column > 0) neighbours.push(index(column - 1, row));
    if (row + 1 < rows) neighbours.push(index(column, row + 1));
    if (row > 0) neighbours.push(index(column, row - 1));
    for (const neighbour of neighbours) {
      if (walkable[neighbour] !== true || parent[neighbour] !== -1) continue;
      parent[neighbour] = current;
      queue.push(neighbour);
    }
  }

  const tiles: number[] = [];
  let node = best;
  while (node !== start) {
    tiles.push(node);
    node = parent[node]!;
    if (node === -1) return [];
  }
  tiles.reverse();

  const points = tiles.map((tileIndex) => ({
    x: ((tileIndex % cols) + 0.5) * tile,
    y: (Math.floor(tileIndex / cols) + 0.5) * tile,
  }));

  // Keep only the turns so each leg is one straight walk.
  const compact: Vec2[] = [];
  points.forEach((point, pointIndex) => {
    const previous = compact[compact.length - 1];
    const next = points[pointIndex + 1];
    if (!previous || !next) {
      compact.push(point);
      return;
    }
    const sameX = Math.abs(previous.x - point.x) < 0.01;
    const sameY = Math.abs(previous.y - point.y) < 0.01;
    const nextSameX = Math.abs(point.x - next.x) < 0.01;
    const nextSameY = Math.abs(point.y - next.y) < 0.01;
    if (sameX !== nextSameX || sameY !== nextSameY) compact.push(point);
  });

  const final = compact[compact.length - 1];
  if (final && Math.hypot(final.x - target.x, final.y - target.y) < stop) {
    compact.pop();
  }
  return compact;
}

/** WASD keys that move the player toward a world-space delta. */
export function movementKeys(dx: number, dy: number): string[] {
  const keys: string[] = [];
  if (dy < -2) keys.push("w");
  else if (dy > 2) keys.push("s");
  if (dx < -2) keys.push("a");
  else if (dx > 2) keys.push("d");
  return keys;
}
