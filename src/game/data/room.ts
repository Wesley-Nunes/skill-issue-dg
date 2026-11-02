import { TILE, WORLD } from "./config";

export interface WallTile {
  file: string;
  x: number;
  y: number;
}

const FLOOR_VARIANTS = 8;

export function floorTileAt(column: number, row: number): string {
  const hash =
    Math.imul(column + 1, 73856093) ^ Math.imul(row + 1, 19349663);
  const mixed = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  return `floor_${(mixed % FLOOR_VARIANTS) + 1}.png`;
}

export function wallTiles(): WallTile[] {
  const tiles: WallTile[] = [];
  const lastColumn = WORLD.cols - 1;
  const lastRow = WORLD.rows - 1;

  for (let column = 0; column <= lastColumn; column += 1) {
    const file =
      column === 0
        ? "wall_top_left.png"
        : column === lastColumn
          ? "wall_top_right.png"
          : "wall_top_mid.png";
    tiles.push({ file, x: column * TILE, y: 0 });
    tiles.push({ file: "wall_mid.png", x: column * TILE, y: TILE });
  }

  for (let row = 2; row < lastRow; row += 1) {
    tiles.push({ file: "wall_left.png", x: 0, y: row * TILE });
    tiles.push({ file: "wall_right.png", x: lastColumn * TILE, y: row * TILE });
  }

  for (let column = 0; column <= lastColumn; column += 1) {
    tiles.push({ file: "wall_mid.png", x: column * TILE, y: lastRow * TILE });
  }

  return tiles;
}
