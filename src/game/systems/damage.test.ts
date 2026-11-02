import { describe, expect, it } from "vitest";
import { PLAYER } from "../data/config";
import { createEnemy, createPlayer } from "../../state/initialState";
import {
  damageEnemy,
  damagePlayer,
  tickPlayerTimers,
} from "./damage";

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
  it("reduces enemy HP", () => {
    const result = damageEnemy(createEnemy(), 2);
    expect(result.enemy.hp).toBe(4);
    expect(result.died).toBe(false);
  });

  it("enters dying state and stops attacking on lethal damage", () => {
    const result = damageEnemy({ ...createEnemy(), hp: 2, windup: 0.3 }, 2);
    expect(result.enemy.hp).toBe(0);
    expect(result.enemy.status).toBe("dying");
    expect(result.enemy.windup).toBe(0);
    expect(result.died).toBe(true);
  });

  it("ignores further damage after death", () => {
    const result = damageEnemy(
      { ...createEnemy(), status: "dead", hp: 0 },
      2,
    );
    expect(result.enemy.hp).toBe(0);
    expect(result.died).toBe(false);
  });
});
