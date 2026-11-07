import { MELEE, RANGED } from "../data/config";
import type { Enemy, Floor, Vec2 } from "../types";
import { moveCircle } from "./collision";
import { hasLineOfSight } from "./vision";

export interface EnemyUpdate {
  enemy: Enemy;
  damageToPlayer: number;
  attackStarted: boolean;
  /** True when a ranged enemy releases its shot this frame. */
  fired: boolean;
}

function idle(enemy: Enemy): EnemyUpdate {
  return {
    enemy: { ...enemy, moving: false },
    damageToPlayer: 0,
    attackStarted: false,
    fired: false,
  };
}

/** Ends any in-progress attack and blocks the enemy for the duration. */
export function staggerEnemy(enemy: Enemy, duration: number): Enemy {
  if (enemy.status !== "alive") return enemy;
  return {
    ...enemy,
    stagger: Math.max(enemy.stagger, duration),
    windup: 0,
    active: 0,
    attackHit: false,
    moving: false,
  };
}

/** Advances enemy state by dt. Pure: no side effects, no I/O. */
export function updateEnemy(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
): EnemyUpdate {
  if (enemy.status === "dead") {
    return { enemy, damageToPlayer: 0, attackStarted: false, fired: false };
  }

  if (enemy.status === "dying") {
    const fade = Math.max(0, enemy.fade - dt);
    return {
      enemy: {
        ...enemy,
        fade,
        hurtFlash: Math.max(0, enemy.hurtFlash - dt),
        stagger: 0,
        status: fade <= 0 ? "dead" : "dying",
        moving: false,
      },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  const next: Enemy = {
    ...enemy,
    hurtFlash: Math.max(0, enemy.hurtFlash - dt),
    stagger: Math.max(0, enemy.stagger - dt),
    attackCooldown: Math.max(0, enemy.attackCooldown - dt),
  };

  if (enemy.stagger > 0) {
    return idle(next);
  }

  return next.kind === "ranged"
    ? updateRanged(next, target, floor, dt)
    : updateMelee(next, target, floor, dt);
}

function updateMelee(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
): EnemyUpdate {
  let next = enemy;
  const distance = Math.hypot(target.x - next.x, target.y - next.y);

  if (next.windup > 0) {
    const windup = next.windup - dt;
    if (windup <= 0) {
      return {
        enemy: {
          ...next,
          windup: 0,
          active: MELEE.active,
          attackHit: false,
          moving: false,
        },
        damageToPlayer: 0,
        attackStarted: false,
        fired: false,
      };
    }
    return {
      enemy: { ...next, windup, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  if (next.active > 0) {
    const active = Math.max(0, next.active - dt);
    let damageToPlayer = 0;
    let attackHit = next.attackHit;

    if (!attackHit && distance <= MELEE.attackRange) {
      attackHit = true;
      damageToPlayer = MELEE.damage;
    }

    return {
      enemy: {
        ...next,
        active,
        attackHit,
        moving: false,
        attackCooldown:
          active <= 0 ? MELEE.attackCooldown : next.attackCooldown,
      },
      damageToPlayer,
      attackStarted: false,
      fired: false,
    };
  }

  if (distance > MELEE.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  next = { ...next, aggro: true };

  if (distance > MELEE.attackRange) {
    const direction = {
      x: (target.x - next.x) / distance,
      y: (target.y - next.y) / distance,
    };
    const position = moveCircle(
      floor,
      next.x,
      next.y,
      direction.x * MELEE.speed * dt,
      direction.y * MELEE.speed * dt,
      next.radius,
    );
    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  if (next.attackCooldown <= 0) {
    return {
      enemy: { ...next, windup: MELEE.windup, moving: false },
      damageToPlayer: 0,
      attackStarted: true,
      fired: false,
    };
  }

  return idle(next);
}

function updateRanged(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
): EnemyUpdate {
  let next = enemy;
  const distance = Math.hypot(target.x - next.x, target.y - next.y);

  if (next.windup > 0) {
    const windup = next.windup - dt;
    if (windup <= 0) {
      return {
        enemy: {
          ...next,
          windup: 0,
          attackCooldown: RANGED.attackCooldown,
          moving: false,
        },
        damageToPlayer: 0,
        attackStarted: false,
        fired: true,
      };
    }
    return {
      enemy: { ...next, windup, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  if (distance > RANGED.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  next = { ...next, aggro: true };
  if (distance === 0) return idle(next);

  // Kiting takes priority over firing: a ranged enemy that is too close backs
  // off instead of standing still in a telegraphed shot.
  if (distance < RANGED.nearRange || distance > RANGED.farRange) {
    const retreating = distance < RANGED.nearRange;
    const direction = retreating
      ? { x: (next.x - target.x) / distance, y: (next.y - target.y) / distance }
      : { x: (target.x - next.x) / distance, y: (target.y - next.y) / distance };
    const position = moveCircle(
      floor,
      next.x,
      next.y,
      direction.x * RANGED.speed * dt,
      direction.y * RANGED.speed * dt,
      next.radius,
    );

    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
    };
  }

  if (
    next.attackCooldown <= 0 &&
    hasLineOfSight(next, target, floor)
  ) {
    return {
      enemy: { ...next, windup: RANGED.telegraph, moving: false },
      damageToPlayer: 0,
      attackStarted: true,
      fired: false,
    };
  }

  return idle(next);
}
