import type { Room, Vec2 } from "../types";

const SAMPLE_STEP = 4;

/**
 * True when the segment between two points stays inside the walkable room.
 * The shipped room is a convex rectangle, so this always passes there; it
 * exists so rooms with interior walls can use the same ranged-enemy rule.
 */
export function hasLineOfSight(
  from: Vec2,
  to: Vec2,
  room: Room,
  step: number = SAMPLE_STEP,
): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(1, Math.ceil(distance / step));

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (
      x < room.bounds.minX ||
      x > room.bounds.maxX ||
      y < room.bounds.minY ||
      y > room.bounds.maxY
    ) {
      return false;
    }
  }

  return true;
}
