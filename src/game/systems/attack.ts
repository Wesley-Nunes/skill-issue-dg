import { ATTACK } from "../data/config";
import type { Player, Vec2 } from "../types";

export type AttackPhase = "idle" | "windup" | "active" | "recovery";

export function attackPhase(player: Player): AttackPhase {
  if (player.attackTime < 0) return "idle";
  if (player.attackTime < ATTACK.windup) return "windup";
  if (player.attackTime < ATTACK.windup + ATTACK.active) return "active";
  return "recovery";
}

/** Advances the swing timers and starts a new swing when held and off cooldown. */
export function tickAttack(player: Player, held: boolean, dt: number): Player {
  let next: Player = {
    ...player,
    attackCooldown: Math.max(0, player.attackCooldown - dt),
  };

  if (next.attackTime >= 0) {
    next.attackTime += dt;
    if (next.attackTime >= ATTACK.windup + ATTACK.active + ATTACK.recovery) {
      next.attackTime = -1;
    }
  }

  if (held && next.attackTime < 0 && next.attackCooldown <= 0) {
    next = {
      ...next,
      attackTime: 0,
      attackCooldown: ATTACK.cooldown,
      attackHit: false,
    };
  }

  return next;
}

/** True when the target center lies inside the aim cone and reach. */
export function isInAttackArc(
  origin: Vec2,
  aim: Vec2,
  target: Vec2,
  reach: number = ATTACK.reach,
  halfAngle: number = ATTACK.halfAngle,
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
