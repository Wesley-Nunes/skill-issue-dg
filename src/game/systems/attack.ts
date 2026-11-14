import { ATTACK } from "../data/config";
import type { Player, Vec2 } from "../types";

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

export type AttackPhase = "idle" | "windup" | "active" | "recovery";

/** Seconds from the start of the swing to the end of its active window. */
export function activeEnd(): number {
  return ATTACK.windup + ATTACK.active;
}

/** Seconds from the start of the swing to the end of its recovery. */
export function attackTotal(): number {
  return activeEnd() + ATTACK.recovery;
}

export function attackPhase(player: Player): AttackPhase {
  if (!player.attacking) return "idle";
  if (player.attackTime < ATTACK.windup) return "windup";
  if (player.attackTime < activeEnd()) return "active";
  return "recovery";
}

export interface AttackTick {
  player: Player;
  /** True on the tick a new swing starts. */
  started: boolean;
}

/**
 * Advances the single light swing. One press starts one swing; a press during
 * a swing is ignored rather than buffered, and holding the button does not
 * repeat. The swing ends after its recovery.
 */
export function tickAttack(
  player: Player,
  pressed: boolean,
  dt: number,
): AttackTick {
  if (!player.attacking) {
    if (!pressed) return { player, started: false };
    return {
      player: {
        ...player,
        attacking: true,
        attackTime: 0,
        attackResolved: false,
      },
      started: true,
    };
  }

  const time = player.attackTime + dt;
  if (time >= attackTotal()) {
    return { player: cancelAttack(player), started: false };
  }
  return { player: { ...player, attackTime: time }, started: false };
}

/** Records that the active window has applied its damage. */
export function markAttackResolved(player: Player): Player {
  return { ...player, attackResolved: true };
}

/** Ends a swing without resolving it; used by the dodge cancel. */
export function cancelAttack(player: Player): Player {
  return {
    ...player,
    attacking: false,
    attackTime: 0,
    attackResolved: false,
  };
}
