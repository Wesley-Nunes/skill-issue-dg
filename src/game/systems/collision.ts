import type { Room, Vec2 } from "../types";

/** Clamps a circle's center so the whole body stays inside the walkable room area. */
export function clampToRoom(
  x: number,
  y: number,
  radius: number,
  room: Room,
): Vec2 {
  return {
    x: Math.min(Math.max(x, room.bounds.minX + radius), room.bounds.maxX - radius),
    y: Math.min(Math.max(y, room.bounds.minY + radius), room.bounds.maxY - radius),
  };
}
