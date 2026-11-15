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

/**
 * Keeps living enemy bodies from occupying the same space. The Warden is too
 * heavy to move, so overlapping mobs are pushed away from it. Dying, dead, and
 * resting enemies are only presentation and never block. This runs after
 * movement so kiting enemies are not trapped behind an ally.
 */
export function separateEnemies(
  enemies: readonly Enemy[],
  floor: Floor,
  blocked: readonly Rect[] = [],
): Enemy[] {
  if (enemies.length < 2) return [...enemies];
  const next = enemies.map((enemy) => ({ ...enemy }));

  // A few passes settle ordinary two- and three-mob piles without a solver.
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;

    for (let left = 0; left < next.length; left += 1) {
      for (let right = left + 1; right < next.length; right += 1) {
        const a = next[left]!;
        const b = next[right]!;
        if (a.status !== "alive" || b.status !== "alive") continue;

        const minDistance = a.radius + b.radius;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance) continue;

        if (distance < 1e-6) {
          const angle = ((left * 31 + right * 17) * Math.PI) / 4;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
        } else {
          dx /= distance;
          dy /= distance;
        }

        const overlap = minDistance - distance;
        const moveA = a.kind !== "boss";
        const moveB = b.kind !== "boss";

        if (moveA && moveB) {
          const half = overlap / 2;
          next[left] = pushEnemy(a, -dx * half, -dy * half, floor, blocked);
          next[right] = pushEnemy(b, dx * half, dy * half, floor, blocked);
        } else if (moveA) {
          next[left] = pushEnemy(a, -dx * overlap, -dy * overlap, floor, blocked);
        } else if (moveB) {
          next[right] = pushEnemy(b, dx * overlap, dy * overlap, floor, blocked);
        }

        moved = true;
      }
    }

    if (!moved) break;
  }

  return next;
}

function pushEnemy(
  enemy: Enemy,
  dx: number,
  dy: number,
  floor: Floor,
  blocked: readonly Rect[],
): Enemy {
  const position = moveCircle(
    floor,
    enemy.x,
    enemy.y,
    dx,
    dy,
    enemy.radius,
    blocked,
  );
  return { ...enemy, x: position.x, y: position.y };
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
      damageToPlayer = enemy.damage;
    }

    return {
      enemy: {
        ...next,
        active,
        attackHit,
        moving: false,
        attackCooldown:
          active <= 0 ? next.attackInterval : next.attackCooldown,
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
          attackCooldown: next.attackInterval,
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
          bombCooldown: next.bombInterval,
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
      damageToPlayer = enemy.damage;
    }

    return {
      enemy: {
        ...next,
        active,
        attackHit,
        moving: false,
        attackKind: active <= 0 ? null : next.attackKind,
        attackCooldown:
          active <= 0 ? next.attackInterval : next.attackCooldown,
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
