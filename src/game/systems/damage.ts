import { ENEMY_FADE, IMPACT, PLAYER } from "../data/config";
import type { Enemy, Floor, Player, Rect, Vec2 } from "../types";
import { moveCircle } from "./collision";

export interface EnemyDamageResult {
  enemy: Enemy;
  died: boolean;
}

export interface PlayerDamageResult {
  player: Player;
  applied: boolean;
  died: boolean;
}

export function damageEnemy(enemy: Enemy, amount: number): EnemyDamageResult {
  if (enemy.status !== "alive") return { enemy, died: false };

  const hp = Math.max(0, enemy.hp - amount);
  if (hp === 0) {
    return {
      enemy: {
        ...enemy,
        hp,
        hurtFlash: IMPACT.flash,
        status: "dying",
        fade: ENEMY_FADE,
        windup: 0,
        active: 0,
        moving: false,
      },
      died: true,
    };
  }

  return {
    enemy: { ...enemy, hp, hurtFlash: IMPACT.flash },
    died: false,
  };
}

/** Pushes an enemy along a direction, keeping it inside the floor. */
export function knockbackEnemy(
  enemy: Enemy,
  direction: Vec2,
  distance: number,
  floor: Floor,
  blocked: readonly Rect[] = [],
): Enemy {
  // The Floor Warden is too heavy to push around.
  if (enemy.status !== "alive" || enemy.kind === "boss") return enemy;
  const position = moveCircle(
    floor,
    enemy.x,
    enemy.y,
    direction.x * distance,
    direction.y * distance,
    enemy.radius,
    blocked,
  );
  return { ...enemy, x: position.x, y: position.y };
}

export function damagePlayer(player: Player, amount: number): PlayerDamageResult {
  if (player.invulnerable > 0 || player.hp <= 0) {
    return { player, applied: false, died: false };
  }

  const hp = Math.max(0, player.hp - amount);
  return {
    player: {
      ...player,
      hp,
      invulnerable: PLAYER.damageInvulnerability,
      hurtFlash: PLAYER.hurtFlash,
    },
    applied: true,
    died: hp === 0,
  };
}

export function tickPlayerTimers(player: Player, dt: number): Player {
  return {
    ...player,
    invulnerable: Math.max(0, player.invulnerable - dt),
    hurtFlash: Math.max(0, player.hurtFlash - dt),
  };
}
