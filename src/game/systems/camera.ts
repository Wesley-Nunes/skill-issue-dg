import { CAMERA } from "../data/config";
import type { Vec2, Viewport } from "../types";

interface WorldBounds {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamps a camera top-left so the view stays inside the world bounds. */
export function clampCamera(
  target: Vec2,
  viewport: Viewport,
  world: WorldBounds,
): Vec2 {
  const maxX = world.width - viewport.width;
  const maxY = world.height - viewport.height;

  return {
    x: maxX <= 0 ? maxX / 2 : clamp(target.x, 0, maxX),
    y: maxY <= 0 ? maxY / 2 : clamp(target.y, 0, maxY),
  };
}

export function updateCamera(
  camera: Vec2,
  target: Vec2,
  dt: number,
  tau: number = CAMERA.tau,
): Vec2 {
  if (tau <= 0) return { x: target.x, y: target.y };
  const alpha = 1 - Math.exp(-dt / tau);
  return {
    x: camera.x + (target.x - camera.x) * alpha,
    y: camera.y + (target.y - camera.y) * alpha,
  };
}
