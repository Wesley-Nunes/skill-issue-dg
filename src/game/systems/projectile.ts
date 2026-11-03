import { PROJECTILE } from "../data/config";
import type { Player, Projectile, Room, Vec2 } from "../types";

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
  };
}

/** Advances a projectile; walls and lifetime end it. */
export function advanceProjectile(
  projectile: Projectile,
  dt: number,
  room: Room,
): ProjectileStep {
  const life = projectile.life - dt;
  const next: Projectile = {
    ...projectile,
    x: projectile.x + projectile.vx * dt,
    y: projectile.y + projectile.vy * dt,
    life,
  };

  const wallHit =
    next.x - next.radius < room.bounds.minX ||
    next.x + next.radius > room.bounds.maxX ||
    next.y - next.radius < room.bounds.minY ||
    next.y + next.radius > room.bounds.maxY;

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
