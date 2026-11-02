import { describe, expect, it } from "vitest";
import { ENEMY, ROOM } from "../data/config";
import { createEnemy } from "../../state/initialState";
import { updateEnemy } from "./enemy";

describe("updateEnemy", () => {
  it("idles while the player is outside the aggro radius", () => {
    const enemy = { ...createEnemy(), x: 448, y: 128 };
    const result = updateEnemy(enemy, { x: 320, y: 320 }, ROOM, 0.1);
    expect(result.enemy.aggro).toBe(false);
    expect(result.enemy.moving).toBe(false);
    expect(result.damageToPlayer).toBe(0);
  });

  it("chases the player after aggro", () => {
    const enemy = { ...createEnemy(), x: 100, y: 100 };
    const result = updateEnemy(enemy, { x: 100, y: 150 }, ROOM, 0.1);
    expect(result.enemy.aggro).toBe(true);
    expect(result.enemy.moving).toBe(true);
    expect(result.enemy.y).toBeCloseTo(100 + ENEMY.speed * 0.1);
  });

  it("idles again once the player leaves the aggro radius", () => {
    const enemy = { ...createEnemy(), x: 100, y: 100, aggro: true };
    const result = updateEnemy(
      enemy,
      { x: 100, y: 100 + ENEMY.aggroRadius + 10 },
      ROOM,
      0.1,
    );
    expect(result.enemy.aggro).toBe(false);
    expect(result.enemy.moving).toBe(false);
    expect(result.enemy.y).toBe(100);
  });

  it("starts a telegraphed attack in range", () => {
    const enemy = { ...createEnemy(), x: 100, y: 100 };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(result.attackStarted).toBe(true);
    expect(result.enemy.windup).toBeCloseTo(ENEMY.windup);
    expect(result.enemy.moving).toBe(false);
  });

  it("enters the active window after the windup", () => {
    const enemy = { ...createEnemy(), x: 100, y: 100, windup: 0.05 };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.1);
    expect(result.enemy.windup).toBe(0);
    expect(result.enemy.active).toBeCloseTo(ENEMY.active);
    expect(result.damageToPlayer).toBe(0);
  });

  it("deals damage once per active window", () => {
    const enemy = {
      ...createEnemy(),
      x: 100,
      y: 100,
      active: 0.1,
      attackHit: false,
    };
    const first = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(first.damageToPlayer).toBe(ENEMY.damage);
    expect(first.enemy.attackHit).toBe(true);

    const second = updateEnemy(first.enemy, { x: 100, y: 120 }, ROOM, 0.01);
    expect(second.damageToPlayer).toBe(0);
  });

  it("starts its cooldown after the active window", () => {
    const enemy = {
      ...createEnemy(),
      x: 100,
      y: 100,
      active: 0.01,
      attackHit: true,
    };
    const result = updateEnemy(enemy, { x: 100, y: 120 }, ROOM, 0.02);
    expect(result.enemy.active).toBe(0);
    expect(result.enemy.attackCooldown).toBeCloseTo(ENEMY.attackCooldown);
  });

  it("cannot chase through a wall", () => {
    const enemy = { ...createEnemy(), x: 30, y: 100 };
    const result = updateEnemy(enemy, { x: 22, y: 60 }, ROOM, 1);
    expect(result.enemy.x).toBe(ROOM.bounds.minX + enemy.radius);
  });

  it("fades out and dies without dealing damage", () => {
    const dying = {
      ...createEnemy(),
      status: "dying" as const,
      fade: ENEMY.fade,
      hp: 0,
    };
    const result = updateEnemy(dying, { x: 100, y: 100 }, ROOM, ENEMY.fade);
    expect(result.enemy.status).toBe("dead");
    expect(result.damageToPlayer).toBe(0);
  });
});
