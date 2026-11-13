import { PROJECTILE } from "../data/config";
import { isCircleWalkable } from "../data/floor";
import type { Floor, Player, Projectile, Rect, Vec2 } from "../types";

export interface ProjectileStep {
  projectile: Projectile;
  wallHit: boolean;
  expired: boolean;
}

/** Creates a projectile aimed from an enemy toward a target point. */
export function spawnProjectile(
  id: number,
  origin: Vec2,
  target: Vec2,
  damage: number,
): Projectile {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy) || 1;
  const direction = { x: dx / length, y: dy / length };

  return {
    id,
    x: origin.x + direction.x * PROJECTILE.spawnOffset,
    y: origin.y + direction.y * PROJECTILE.spawnOffset,
    vx: direction.x * PROJECTILE.speed,
    vy: direction.y * PROJECTILE.speed,
    radius: PROJECTILE.radius,
    life: PROJECTILE.life,
    damage,
  };
}

/** Advances a projectile; walls and lifetime end it. */
export function advanceProjectile(
  projectile: Projectile,
  dt: number,
  floor: Floor,
  blocked: readonly Rect[] = [],
): ProjectileStep {
  const life = projectile.life - dt;
  const next: Projectile = {
    ...projectile,
    x: projectile.x + projectile.vx * dt,
    y: projectile.y + projectile.vy * dt,
    life,
  };

  const wallHit = !isCircleWalkable(
    floor,
    next.x,
    next.y,
    next.radius,
    blocked,
  );

  return { projectile: next, wallHit, expired: life <= 0 };
}

/** True when the projectile overlaps the player's body. */
export function projectileHitsPlayer(
  projectile: Projectile,
  player: Player,
): boolean {
  const distance = Math.hypot(
    projectile.x - player.x,
    projectile.y - player.y,
  );
  return distance <= projectile.radius + player.radius;
}
