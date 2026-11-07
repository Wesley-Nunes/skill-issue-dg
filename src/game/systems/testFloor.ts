import { TILE } from "../data/config";
import type { Floor } from "../types";

/**
 * Open test room matching the old 40 × 24 fixed-room bounds:
 * walkable x = 16..624 and y = 32..368.
 */
export function openFloor(): Floor {
  const cols = 40;
  const rows = 24;
  const walkable = Array.from({ length: cols * rows }, (_, index) => {
    const column = index % cols;
    const row = Math.floor(index / cols);
    return column >= 1 && column <= 38 && row >= 2 && row <= 22;
  });

  return {
    seed: 1,
    depth: 1,
    cols,
    rows,
    width: cols * TILE,
    height: rows * TILE,
    walkable,
    rooms: [
      {
        x: TILE,
        y: TILE * 2,
        width: TILE * 38,
        height: TILE * 21,
      },
    ],
    spawn: { x: 320, y: 320 },
    stairs: { x: 320, y: 320, width: 32, height: 32 },
    bossSpawn: { x: 320, y: 320 },
    enemySpawns: [],
  };
}
