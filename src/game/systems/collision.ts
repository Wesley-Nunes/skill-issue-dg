import { isCircleWalkable } from "../data/floor";
import type { Floor, Rect, Vec2 } from "../types";

/**
 * Moves a circle by a delta, resolving each axis separately so the body slides
 * along walls instead of sticking to them. Long frames are split into small
 * steps so a fast body cannot tunnel through a tile.
 */
export function moveCircle(
  floor: Floor,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  blocked: readonly Rect[] = [],
): Vec2 {
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(
    1,
    Math.ceil(distance / Math.max(1, radius / 2)),
  );
  const stepX = dx / steps;
  const stepY = dy / steps;

  let nextX = x;
  let nextY = y;
  for (let step = 0; step < steps; step += 1) {
    if (isCircleWalkable(floor, nextX + stepX, nextY, radius, blocked)) {
      nextX += stepX;
    }
    if (isCircleWalkable(floor, nextX, nextY + stepY, radius, blocked)) {
      nextY += stepY;
    }
  }

  return { x: nextX, y: nextY };
}
