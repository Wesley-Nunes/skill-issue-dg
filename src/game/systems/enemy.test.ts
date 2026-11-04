import { describe, expect, it } from "vitest";
import { ENEMY_SPAWNS, MELEE, RANGED, ROOM } from "../data/config";
import { createEnemy } from "../../state/initialState";
import { staggerEnemy, updateEnemy } from "./enemy";

const meleeSpawn = ENEMY_SPAWNS[0];
const rangedSpawn = ENEMY_SPAWNS[2];

describe("melee enemy", () => {
  it("idles while the player is outside the aggro radius", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 448, y: 128 };
    const result = updateEnemy(enemy, { x: 320, y: 320 }, ROOM, 0.1);
    expect(result.enemy.aggro).toBe(false);
    expect(result.enemy.moving).toBe(false);
    expect(result.damageToPlayer).toBe(0);
  });

  it("chases the player after aggro", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 100, y: 100 };
    const result = updateEnemy(enemy, { x: 100, y: 150 }, ROOM, 0.1);
    expect(result.enemy.aggro).toBe(true);
    expect(result.enemy.moving).toBe(true);
    expect(result.enemy.y).toBeCloseTo(100 + MELEE.speed * 0.1);
  });

  it("idles again once the player leaves the aggro radius", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 100, y: 100, aggro: true };
    const result = updateEnemy(
      enemy,
      { x: 100, y: 100 + MELEE.aggroRadius + 10 },
      ROOM,
      0.1,
    );
    expect(result.enemy.aggro).toBe(false);
    expect(result.enemy.moving).toBe(false);
    expect(result.enemy.y).toBe(100);
  });

  it("starts a telegraphed attack in range", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 100, y: 100 };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(result.attackStarted).toBe(true);
    expect(result.enemy.windup).toBeCloseTo(MELEE.windup);
    expect(result.enemy.moving).toBe(false);
  });

  it("enters the active window after the windup", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 100, y: 100, windup: 0.05 };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.1);
    expect(result.enemy.windup).toBe(0);
    expect(result.enemy.active).toBeCloseTo(MELEE.active);
    expect(result.damageToPlayer).toBe(0);
  });

  it("deals damage once per active window", () => {
    const enemy = {
      ...createEnemy(meleeSpawn),
      x: 100,
      y: 100,
      active: 0.1,
      attackHit: false,
    };
    const first = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(first.damageToPlayer).toBe(MELEE.damage);
    expect(first.enemy.attackHit).toBe(true);

    const second = updateEnemy(first.enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(second.damageToPlayer).toBe(0);
  });

  it("starts its cooldown after the active window", () => {
    const enemy = {
      ...createEnemy(meleeSpawn),
      x: 100,
      y: 100,
      active: 0.01,
      attackHit: true,
    };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.02);
    expect(result.enemy.active).toBe(0);
    expect(result.enemy.attackCooldown).toBeCloseTo(MELEE.attackCooldown);
  });

  it("cannot chase through a wall", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 30, y: 100 };
    const result = updateEnemy(enemy, { x: 22, y: 60 }, ROOM, 1);
    expect(result.enemy.x).toBe(ROOM.bounds.minX + enemy.radius);
  });

  it("fades out and dies without dealing damage", () => {
    const dying = {
      ...createEnemy(meleeSpawn),
      status: "dying" as const,
      fade: 0.25,
      hp: 0,
    };
    const result = updateEnemy(dying, { x: 100, y: 100 }, ROOM, 0.25);
    expect(result.enemy.status).toBe("dead");
    expect(result.damageToPlayer).toBe(0);
  });
});

describe("ranged enemy", () => {
  it("idles while the player is outside the aggro radius", () => {
    const enemy = { ...createEnemy(rangedSpawn), x: 100, y: 100 };
    const result = updateEnemy(
      enemy,
      { x: 100, y: 100 + RANGED.aggroRadius + 20 },
      ROOM,
      0.1,
    );
    expect(result.enemy.aggro).toBe(false);
    expect(result.enemy.moving).toBe(false);
    expect(result.attackStarted).toBe(false);
  });

  it("retreats when the player is closer than the near threshold", () => {
    const enemy = { ...createEnemy(rangedSpawn), x: 100, y: 100 };
    const result = updateEnemy(enemy, { x: 100, y: 150 }, ROOM, 0.1);
    expect(result.enemy.moving).toBe(true);
    expect(result.enemy.y).toBeLessThan(100);
  });

  it("closes when the player is beyond the far threshold", () => {
    const enemy = { ...createEnemy(rangedSpawn), x: 100, y: 100 };
    const result = updateEnemy(
      enemy,
      { x: 100, y: 100 + RANGED.farRange + 10 },
      ROOM,
      0.1,
    );
    expect(result.enemy.moving).toBe(true);
    expect(result.enemy.y).toBeGreaterThan(100);
  });

  it("holds and telegraphs a shot inside the band", () => {
    const enemy = { ...createEnemy(rangedSpawn), x: 100, y: 100 };
    const result = updateEnemy(
      enemy,
      { x: 100, y: 100 + RANGED.nearRange + 20 },
      ROOM,
      0.01,
    );
    expect(result.attackStarted).toBe(true);
    expect(result.enemy.windup).toBeCloseTo(RANGED.telegraph);
    expect(result.enemy.moving).toBe(false);
  });

  it("does not fire before its cooldown is ready", () => {
    const enemy = {
      ...createEnemy(rangedSpawn),
      x: 100,
      y: 100,
      attackCooldown: 1,
    };
    const result = updateEnemy(enemy, { x: 100, y: 250 }, ROOM, 0.01);
    expect(result.attackStarted).toBe(false);
    expect(result.enemy.windup).toBe(0);
  });

  it("fires at the end of the telegraph and starts its cooldown", () => {
    const enemy = {
      ...createEnemy(rangedSpawn),
      x: 100,
      y: 100,
      windup: 0.01,
    };
    const result = updateEnemy(enemy, { x: 100, y: 250 }, ROOM, 0.02);
    expect(result.fired).toBe(true);
    expect(result.enemy.windup).toBe(0);
    expect(result.enemy.attackCooldown).toBeCloseTo(RANGED.attackCooldown);
  });

  it("stops moving during the telegraph", () => {
    const enemy = {
      ...createEnemy(rangedSpawn),
      x: 100,
      y: 100,
      windup: RANGED.telegraph,
    };
    const result = updateEnemy(enemy, { x: 100, y: 150 }, ROOM, 0.05);
    expect(result.enemy.moving).toBe(false);
    expect(result.enemy.y).toBe(100);
  });

  it("does not fire without line of sight", () => {
    const enemy = { ...createEnemy(rangedSpawn), x: 100, y: 100 };
    const result = updateEnemy(
      enemy,
      { x: 100, y: ROOM.bounds.minY - 20 },
      ROOM,
      0.01,
    );
    expect(result.attackStarted).toBe(false);
    expect(result.enemy.windup).toBe(0);
  });

  it("does not retreat through the room wall", () => {
    const enemy = {
      ...createEnemy(rangedSpawn),
      x: 100,
      y: ROOM.bounds.minY + 20,
    };
    const result = updateEnemy(
      enemy,
      { x: 100, y: ROOM.bounds.minY + 26 },
      ROOM,
      0.5,
    );
    expect(result.enemy.y).toBe(ROOM.bounds.minY + enemy.radius);
  });

  it("never damages the player directly", () => {
    const enemy = {
      ...createEnemy(rangedSpawn),
      x: 100,
      y: 100,
      windup: 0.01,
    };
    const result = updateEnemy(enemy, { x: 100, y: 105 }, ROOM, 0.02);
    expect(result.damageToPlayer).toBe(0);
  });
});

describe("stagger", () => {
  it("cancels a telegraphed attack and blocks movement", () => {
    const enemy = staggerEnemy(
      {
        ...createEnemy(meleeSpawn),
        x: 100,
        y: 100,
        windup: 0.3,
      },
      MELEE.windup,
    );
    expect(enemy.windup).toBe(0);
    expect(enemy.stagger).toBeGreaterThan(0);

    const result = updateEnemy(enemy, { x: 100, y: 150 }, ROOM, 0.05);
    expect(result.enemy.moving).toBe(false);
    expect(result.enemy.y).toBe(100);
    expect(result.enemy.stagger).toBeLessThan(enemy.stagger);
  });

  it("cannot be staggered while dying", () => {
    const dying = {
      ...createEnemy(meleeSpawn),
      status: "dying" as const,
    };
    expect(staggerEnemy(dying, 0.15)).toBe(dying);
  });
});
