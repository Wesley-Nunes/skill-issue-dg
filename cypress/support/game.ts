import type { DebugSnapshot } from "../../src/game/types";

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

/** True once the smoothed camera has caught up with its clamped target. */
export function cameraSettled(snapshot: DebugSnapshot): boolean {
  const targetX = clamp(
    snapshot.player.x - snapshot.viewport.width / 2,
    0,
    640 - snapshot.viewport.width,
  );
  const targetY = clamp(
    snapshot.player.y - snapshot.viewport.height / 2,
    0,
    384 - snapshot.viewport.height,
  );
  return (
    Math.abs(snapshot.camera.x - targetX) < 1 &&
    Math.abs(snapshot.camera.y - targetY) < 1
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

/** World-space centre of the upper-right intact fragment. */
export function fragmentPoint(enemy: DebugSnapshot["enemies"][number]) {
  const angle = (-45 * Math.PI) / 180;
  return {
    x: enemy.x + Math.cos(angle) * 12,
    y: enemy.y - 10 + Math.sin(angle) * 12,
  };
}

/** WASD keys that move the player toward a world-space delta. */
export function movementKeys(dx: number, dy: number): string[] {
  const keys: string[] = [];
  if (dy < -6) keys.push("w");
  else if (dy > 6) keys.push("s");
  if (dx < -6) keys.push("a");
  else if (dx > 6) keys.push("d");
  return keys;
}
