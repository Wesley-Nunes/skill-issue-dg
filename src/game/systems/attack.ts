import type { Vec2 } from "../types";

/** True when the target center lies inside the aim cone and reach. */
export function isInAttackArc(
  origin: Vec2,
  aim: Vec2,
  target: Vec2,
  reach: number,
  halfAngle: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > reach) return false;
  if (distance === 0) return true;

  const dot = (dx * aim.x + dy * aim.y) / distance;
  const clamped = Math.min(1, Math.max(-1, dot));
  return Math.acos(clamped) <= halfAngle;
}
