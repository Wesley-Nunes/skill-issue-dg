import { describe, expect, it } from "vitest";
import { PROJECTILE, ROOM } from "../data/config";
import { createPlayer } from "../../state/initialState";
import type { Projectile } from "../types";
import {
  advanceProjectile,
  projectileHitsPlayer,
  spawnProjectile,
} from "./projectile";

function projectileAt(x: number, y: number): Projectile {
  return {
    id: 1,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PROJECTILE.radius,
    life: PROJECTILE.life,
  };
}

describe("spawnProjectile", () => {
  it("starts offset from the shooter and travels toward the target", () => {
    const projectile = spawnProjectile(3, { x: 100, y: 100 }, { x: 200, y: 100 });
    expect(projectile.id).toBe(3);
    expect(projectile.x).toBeCloseTo(100 + PROJECTILE.spawnOffset);
    expect(projectile.y).toBeCloseTo(100);
    expect(Math.hypot(projectile.vx, projectile.vy)).toBeCloseTo(
      PROJECTILE.speed,
    );
    expect(projectile.vx).toBeGreaterThan(0);
  });
});

describe("advanceProjectile", () => {
  it("moves along its velocity", () => {
    const projectile = { ...projectileAt(100, 100), vx: PROJECTILE.speed };
    const result = advanceProjectile(projectile, 0.1, ROOM);
    expect(result.projectile.x).toBeCloseTo(115);
    expect(result.wallHit).toBe(false);
    expect(result.expired).toBe(false);
  });

  it("is destroyed by the room boundary", () => {
    const projectile = {
      ...projectileAt(ROOM.bounds.maxX - 1, 100),
      vx: PROJECTILE.speed,
    };
    const result = advanceProjectile(projectile, 0.1, ROOM);
    expect(result.wallHit).toBe(true);
  });

  it("expires after its lifetime", () => {
    const projectile = projectileAt(100, 100);
    expect(advanceProjectile(projectile, PROJECTILE.life + 0.01, ROOM).expired).toBe(
      true,
    );
  });
});

describe("projectileHitsPlayer", () => {
  it("hits when the bodies overlap", () => {
    const player = createPlayer();
    expect(
      projectileHitsPlayer(
        projectileAt(player.x + player.radius, player.y),
        player,
      ),
    ).toBe(true);
  });

  it("misses at range", () => {
    const player = createPlayer();
    expect(
      projectileHitsPlayer(projectileAt(player.x + 40, player.y), player),
    ).toBe(false);
  });
});
