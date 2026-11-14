import type { Enemy } from "../types";

/** Copy shown when the sealed ward refuses entry or a shop interaction. */
export const WARD_MESSAGE = "The ward holds — enemies are hunting.";

/**
 * True while at least one living enemy is hunting the player. Dying, dead, and
 * rested enemies do not count, and a boss's harmless emergence never sets
 * aggro. Pure: the caller owns all state.
 */
export function isInCombat(enemies: readonly Enemy[]): boolean {
  return enemies.some((enemy) => enemy.status === "alive" && enemy.aggro);
}
