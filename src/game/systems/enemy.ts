import { BOSS, MELEE, RANGED } from "../data/config";
import type { Enemy, Floor, Rect, Vec2 } from "../types";
import { moveCircle } from "./collision";
import { hasLineOfSight } from "./vision";

export interface EnemyUpdate {
  enemy: Enemy;
  damageToPlayer: number;
  attackStarted: boolean;
  /** True when a ranged enemy releases its shot this frame. */
  fired: boolean;
  /** Set by the boss when a bomb should be spawned this frame. */
  bombTarget: Vec2 | null;
}

function idle(enemy: Enemy): EnemyUpdate {
  return {
    enemy: { ...enemy, moving: false },
    damageToPlayer: 0,
    attackStarted: false,
    fired: false,
    bombTarget: null,
  };
}

/** Ends any in-progress attack and blocks the enemy for the duration. */
export function staggerEnemy(enemy: Enemy, duration: number): Enemy {
  if (enemy.status !== "alive") return enemy;
  const applied =
    enemy.kind === "boss" ? duration * BOSS.staggerScale : duration;
  return {
    ...enemy,
    stagger: Math.max(enemy.stagger, applied),
    windup: 0,
    active: 0,
    attackKind: null,
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
  blocked: readonly Rect[] = [],
): EnemyUpdate {
  if (enemy.status === "dead") {
    return {
      enemy,
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
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
      bombTarget: null,
    };
  }

  const next: Enemy = {
    ...enemy,
    hurtFlash: Math.max(0, enemy.hurtFlash - dt),
    stagger: Math.max(0, enemy.stagger - dt),
    attackCooldown: Math.max(0, enemy.attackCooldown - dt),
    bombCooldown: Math.max(0, enemy.bombCooldown - dt),
  };

  // The Warden is harmless while it emerges: no movement, attack, or damage.
  if (next.kind === "boss" && next.emerging > 0) {
    return idle({ ...next, emerging: Math.max(0, next.emerging - dt) });
  }

  if (enemy.stagger > 0) {
    return idle(next);
  }

  if (next.kind === "boss") return updateBoss(next, target, floor, dt, blocked);
  return next.kind === "ranged"
    ? updateRanged(next, target, floor, dt, blocked)
    : updateMelee(next, target, floor, dt, blocked);
}

function updateMelee(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
  blocked: readonly Rect[],
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
        bombTarget: null,
      };
    }
    return {
      enemy: { ...next, windup, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
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
      bombTarget: null,
    };
  }

  if (distance > MELEE.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
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
      blocked,
    );
    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  if (next.attackCooldown <= 0) {
    return {
      enemy: { ...next, windup: MELEE.windup, moving: false },
      damageToPlayer: 0,
      attackStarted: true,
      fired: false,
      bombTarget: null,
    };
  }

  return idle(next);
}

function updateRanged(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
  blocked: readonly Rect[],
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
        bombTarget: null,
      };
    }
    return {
      enemy: { ...next, windup, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  if (distance > RANGED.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
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
      blocked,
    );

    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
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
      bombTarget: null,
    };
  }

  return idle(next);
}

/**
 * The Floor Warden: chases the player, swipes at close range, and throws a
 * bomb when the player is out of melee reach. The boss never rests or
 * respawns; it is removed by its dying fade.
 */
function updateBoss(
  enemy: Enemy,
  target: Vec2,
  floor: Floor,
  dt: number,
  blocked: readonly Rect[],
): EnemyUpdate {
  let next = enemy;
  const distance = Math.hypot(target.x - next.x, target.y - next.y);

  if (next.windup > 0) {
    const windup = next.windup - dt;
    if (windup > 0) {
      return {
        enemy: { ...next, windup, moving: false },
        damageToPlayer: 0,
        attackStarted: false,
        fired: false,
        bombTarget: null,
      };
    }

    if (next.attackKind === "bomb") {
      return {
        enemy: {
          ...next,
          windup: 0,
          attackKind: null,
          bombCooldown: BOSS.bombCooldown,
          moving: false,
        },
        damageToPlayer: 0,
        attackStarted: false,
        fired: false,
        bombTarget: { x: target.x, y: target.y },
      };
    }

    return {
      enemy: {
        ...next,
        windup: 0,
        active: BOSS.active,
        attackKind: "melee",
        attackHit: false,
        moving: false,
      },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  if (next.active > 0) {
    const active = Math.max(0, next.active - dt);
    let damageToPlayer = 0;
    let attackHit = next.attackHit;

    if (!attackHit && distance <= BOSS.attackRange) {
      attackHit = true;
      damageToPlayer = BOSS.damage;
    }

    return {
      enemy: {
        ...next,
        active,
        attackHit,
        moving: false,
        attackKind: active <= 0 ? null : next.attackKind,
        attackCooldown:
          active <= 0 ? BOSS.attackCooldown : next.attackCooldown,
      },
      damageToPlayer,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  if (distance > BOSS.aggroRadius) {
    return {
      enemy: { ...next, aggro: false, moving: false },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  next = { ...next, aggro: true };

  if (distance <= BOSS.attackRange && next.attackCooldown <= 0) {
    return {
      enemy: {
        ...next,
        windup: BOSS.windup,
        attackKind: "melee",
        moving: false,
      },
      damageToPlayer: 0,
      attackStarted: true,
      fired: false,
      bombTarget: null,
    };
  }

  if (distance > BOSS.attackRange && next.bombCooldown <= 0) {
    return {
      enemy: {
        ...next,
        windup: BOSS.bombWindup,
        attackKind: "bomb",
        moving: false,
      },
      damageToPlayer: 0,
      attackStarted: true,
      fired: false,
      bombTarget: null,
    };
  }

  if (distance > BOSS.attackRange) {
    const direction = {
      x: (target.x - next.x) / distance,
      y: (target.y - next.y) / distance,
    };
    const position = moveCircle(
      floor,
      next.x,
      next.y,
      direction.x * BOSS.speed * dt,
      direction.y * BOSS.speed * dt,
      next.radius,
      blocked,
    );
    return {
      enemy: { ...next, x: position.x, y: position.y, moving: true },
      damageToPlayer: 0,
      attackStarted: false,
      fired: false,
      bombTarget: null,
    };
  }

  return idle(next);
}
