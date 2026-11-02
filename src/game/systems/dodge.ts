import { DODGE } from "../data/config";
import type { Player, Vec2 } from "../types";
import { normalizeMove } from "./movement";

export function canDodge(player: Player): boolean {
  return player.dodgeTime <= 0 && player.dodgeCooldown <= 0;
}

/** Starts a dodge in the movement direction, or the aim direction when idle. */
export function startDodge(player: Player, move: Vec2): Player {
  if (!canDodge(player)) return player;
  const direction = normalizeMove(move);
  const dodgeDir =
    direction.x === 0 && direction.y === 0 ? player.aim : direction;

  return {
    ...player,
    dodgeTime: DODGE.duration,
    dodgeCooldown: DODGE.cooldown,
    dodgeDir,
    invulnerable: Math.max(player.invulnerable, DODGE.invulnerability),
  };
}

export function tickDodgeTimers(player: Player, dt: number): Player {
  return {
    ...player,
    dodgeTime: Math.max(0, player.dodgeTime - dt),
    dodgeCooldown: Math.max(0, player.dodgeCooldown - dt),
  };
}
