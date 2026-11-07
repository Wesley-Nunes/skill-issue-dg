import { isWalkablePoint } from "../data/floor";
import type { Floor, Vec2 } from "../types";

const SAMPLE_STEP = 4;

/**
 * True when the segment between two points stays on walkable tiles. Corridor
 * walls and room edges block ranged sight, not just the outer floor boundary.
 */
export function hasLineOfSight(
  from: Vec2,
  to: Vec2,
  floor: Floor,
  step: number = SAMPLE_STEP,
): boolean {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(1, Math.ceil(distance / step));

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (!isWalkablePoint(floor, x, y)) return false;
  }

  return true;
}
