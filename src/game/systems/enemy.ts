import { ENEMY } from "../data/config";
import type { Enemy, Room, Vec2 } from "../types";
import { clampToRoom } from "./collision";

export interface EnemyUpdate {
  enemy: Enemy;
  damageToPlayer: number;
  attackStarted: boolean;
}

/** Advances enemy state by dt. Pure: no side effects, no I/O. */
export function updateEnemy(
  enemy: Enemy,
  target: Vec2,
  room: Room,
  dt: number,
): EnemyUpdate {
  if (enemy.status === "dead") {
    return { enemy, damageToPlayer: 0, attackStarted: false };
  }

  if (enemy.status === "dying") {
    const fade = Math.max(0, enemy.fade - dt);
    return {
      enemy: {
        ...enemy,
        fade,
        status: fade <= 0 ? "dead" : "dying",
        moving: false,
      },
      damageToPlayer: 0,
      attackStarted: false,
    };
  }

  let next: Enemy = {
    ...enemy,
    attackCooldown: Math.max(0, enemy.attackCooldown - dt),
  };
  const distance = Math.hypot(target.x - next.x, target.y - next.y);

  if (next.windup > 0) {
    const windup = next.windup - dt;
    if (windup <= 0) {
      return {
        enemy: {
          ...next,
          windup: 0,
          active: ENEMY.active,
          attackHit: false,
          moving: false,
        },
        damageToPlayer: 0,
        attackStarted: false,
      };
    }
    return {
      enemy: { ...next, windup, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
    };
  }

  if (next.active > 0) {
    const active = Math.max(0, next.active - dt);
    let damageToPlayer = 0;
    let attackHit = next.attackHit;

    if (!attackHit && distance <= ENEMY.attackRange) {
      attackHit = true;
      damageToPlayer = ENEMY.damage;
    }

    return {
      enemy: {
        ...next,
        active,
        attackHit,
        moving: false,
        attackCooldown:
          active <= 0 ? ENEMY.attackCooldown : next.attackCooldown,
      },
      damageToPlayer,
      attackStarted: false,
    };
  }

  if (distance > ENEMY.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
    };
  }

  next = { ...next, aggro: true };

  if (distance > ENEMY.attackRange) {
    const direction = {
      x: (target.x - next.x) / distance,
      y: (target.y - next.y) / distance,
    };
    const position = clampToRoom(
      next.x + direction.x * ENEMY.speed * dt,
      next.y + direction.y * ENEMY.speed * dt,
      next.radius,
      room,
    );
    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
    };
  }

  if (next.attackCooldown <= 0) {
    return {
      enemy: { ...next, windup: ENEMY.windup, moving: false },
      damageToPlayer: 0,
      attackStarted: true,
    };
  }

  return {
    enemy: { ...next, moving: false },
    damageToPlayer: 0,
    attackStarted: false,
  };
}
