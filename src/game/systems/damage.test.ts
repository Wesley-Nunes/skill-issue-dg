import { describe, expect, it } from "vitest";
import { PLAYER } from "../data/config";
import { createEnemy, createPlayer } from "../../state/initialState";
import { ENEMY_SPAWNS, ROOM } from "../data/config";
import {
  damageEnemy,
  damagePlayer,
  knockbackEnemy,
  tickPlayerTimers,
} from "./damage";

const meleeSpawn = ENEMY_SPAWNS[0];

describe("damagePlayer", () => {
  it("applies damage and starts invulnerability", () => {
    const result = damagePlayer(createPlayer(), 1);
    expect(result.applied).toBe(true);
    expect(result.died).toBe(false);
    expect(result.player.hp).toBe(PLAYER.maxHp - 1);
    expect(result.player.invulnerable).toBeCloseTo(
      PLAYER.damageInvulnerability,
    );
    expect(result.player.hurtFlash).toBeGreaterThan(0);
  });

  it("blocks a second hit during invulnerability", () => {
    const first = damagePlayer(createPlayer(), 1);
    const second = damagePlayer(first.player, 1);
    expect(second.applied).toBe(false);
    expect(second.player.hp).toBe(first.player.hp);
  });

  it("accepts damage again after invulnerability expires", () => {
    const first = damagePlayer(createPlayer(), 1);
    const cleared = tickPlayerTimers(
      first.player,
      PLAYER.damageInvulnerability,
    );
    const second = damagePlayer(cleared, 1);
    expect(second.applied).toBe(true);
    expect(second.player.hp).toBe(PLAYER.maxHp - 2);
  });

  it("clamps at zero and reports death", () => {
    const result = damagePlayer({ ...createPlayer(), hp: 1 }, 1);
    expect(result.player.hp).toBe(0);
    expect(result.died).toBe(true);
  });

  it("ignores damage once dead", () => {
    const result = damagePlayer({ ...createPlayer(), hp: 0 }, 1);
    expect(result.applied).toBe(false);
  });
});

describe("damageEnemy", () => {
  it("reduces enemy HP and flashes the sprite", () => {
    const result = damageEnemy(createEnemy(meleeSpawn), 2);
    expect(result.enemy.hp).toBe(8);
    expect(result.enemy.hurtFlash).toBeGreaterThan(0);
    expect(result.died).toBe(false);
  });

  it("enters dying state and stops attacking on lethal damage", () => {
    const result = damageEnemy(
      { ...createEnemy(meleeSpawn), hp: 2, windup: 0.3 },
      2,
    );
    expect(result.enemy.hp).toBe(0);
    expect(result.enemy.status).toBe("dying");
    expect(result.enemy.windup).toBe(0);
    expect(result.died).toBe(true);
  });

  it("ignores further damage after death", () => {
    const result = damageEnemy(
      { ...createEnemy(meleeSpawn), status: "dead", hp: 0 },
      2,
    );
    expect(result.enemy.hp).toBe(0);
    expect(result.died).toBe(false);
  });
});

describe("knockbackEnemy", () => {
  it("pushes along the aim direction", () => {
    const enemy = { ...createEnemy(meleeSpawn), x: 100, y: 100 };
    const result = knockbackEnemy(enemy, { x: 1, y: 0 }, 6, ROOM);
    expect(result.x).toBeCloseTo(106);
    expect(result.y).toBeCloseTo(100);
  });

  it("keeps the enemy inside the room", () => {
    const enemy = {
      ...createEnemy(meleeSpawn),
      x: ROOM.bounds.maxX - 2,
      y: 100,
    };
    const result = knockbackEnemy(enemy, { x: 1, y: 0 }, 6, ROOM);
    expect(result.x).toBe(ROOM.bounds.maxX - enemy.radius);
  });

  it("does not move a dying enemy", () => {
    const enemy = { ...createEnemy(meleeSpawn), status: "dying" as const };
    expect(knockbackEnemy(enemy, { x: 1, y: 0 }, 6, ROOM)).toBe(enemy);
  });
});
