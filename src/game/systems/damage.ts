import { ENEMY, PLAYER } from "../data/config";
import type { Enemy, Player } from "../types";

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
        status: "dying",
        fade: ENEMY.fade,
        windup: 0,
        active: 0,
        moving: false,
      },
      died: true,
    };
  }

  return { enemy: { ...enemy, hp }, died: false };
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
