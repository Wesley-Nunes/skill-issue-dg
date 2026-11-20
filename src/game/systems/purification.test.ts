import { describe, expect, it } from "vitest";
import { PURIFICATION } from "../data/config";
import { createInitialState } from "../../state/initialState";
import type { Enemy } from "../types";
import {
  addSpirit,
  breakFragmentsInArc,
  canRest,
  fragmentPosition,
  hasAllFragmentsBroken,
  resetEnemyRite,
  reviveEnemy,
  tickRespawn,
} from "./purification";

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return { ...createInitialState().enemies[0]!, ...overrides };
}

describe("purification", () => {
  it("places fragments on the approved orbit", () => {
    const target = enemy({ x: 100, y: 100 });
    const left = fragmentPosition(target, 0);
    const right = fragmentPosition(target, 1);

    expect(left.x).toBeCloseTo(100 - Math.SQRT1_2 * PURIFICATION.orbitRadius, 5);
    expect(left.y).toBeCloseTo(
      100 + PURIFICATION.orbitOffsetY - Math.SQRT1_2 * PURIFICATION.orbitRadius,
      5,
    );
    expect(right.x).toBeCloseTo(
      100 + Math.SQRT1_2 * PURIFICATION.orbitRadius,
      5,
    );
    expect(right.y).toBeCloseTo(left.y, 5);
  });

  it("breaks every intact fragment inside the arc", () => {
    const target = enemy({ x: 100, y: 100 });
    const result = breakFragmentsInArc(
      target,
      { x: 100, y: 100 },
      { x: 0, y: -1 },
      34,
      (55 * Math.PI) / 180,
    );

    expect(result.enemy.fragments).toEqual([false, false]);
    expect(result.broken).toHaveLength(PURIFICATION.angles.length);
    expect(hasAllFragmentsBroken(result.enemy)).toBe(true);
  });

  it("leaves fragments outside the arc intact", () => {
    const target = enemy({ x: 100, y: 100 });
    const result = breakFragmentsInArc(
      target,
      { x: 100, y: 100 },
      { x: 1, y: 0 },
      34,
      (55 * Math.PI) / 180,
    );

    expect(result.enemy).toBe(target);
    expect(result.broken).toHaveLength(0);
    expect(target.fragments).toEqual([true, true]);
  });

  it("does not break fragments on a dead enemy", () => {
    const target = enemy({ status: "dead", hp: 0 });
    const result = breakFragmentsInArc(
      target,
      { x: target.x, y: target.y },
      { x: 0, y: -1 },
      34,
      (55 * Math.PI) / 180,
    );

    expect(result.enemy).toBe(target);
    expect(result.broken).toHaveLength(0);
  });

  it("resets every broken fragment and the HP of a living mob", () => {
    const target = enemy({ hp: 4, maxHp: 10, fragments: [false, false] });
    const reset = resetEnemyRite(target);

    expect(reset.fragments).toEqual([true, true]);
    expect(reset.hp).toBe(10);
    expect(resetEnemyRite(reset)).toBe(reset);
    expect(resetEnemyRite({ ...target, status: "dying" })).toEqual({
      ...target,
      status: "dying",
    });
  });

  it("resets HP even when every fragment is intact", () => {
    const target = enemy({ hp: 2, maxHp: 10, fragments: [true, true] });
    expect(resetEnemyRite(target).hp).toBe(10);
  });

  it("never resets the Warden", () => {
    const boss = enemy({ kind: "boss", hp: 5, maxHp: 30 });
    expect(resetEnemyRite(boss)).toBe(boss);
  });

  it("marks a mob as restable only when alive with no fragments", () => {
    expect(canRest(enemy({ fragments: [true, false] }))).toBe(false);
    expect(canRest(enemy({ fragments: [false, false] }))).toBe(true);
    expect(
      canRest(enemy({ fragments: [false, false], status: "dying" })),
    ).toBe(false);
  });

  it("revives a failed rite at the spawn with a full rite", () => {
    const target = enemy({
      x: 10,
      y: 10,
      homeX: 448,
      homeY: 128,
      hp: 0,
      status: "dead",
      fragments: [false, false],
      respawn: 2,
    });

    const revived = reviveEnemy(target);

    expect([revived.x, revived.y]).toEqual([448, 128]);
    expect(revived.hp).toBe(target.maxHp);
    expect(revived.status).toBe("alive");
    expect(revived.fragments).toEqual([true, true]);
    expect(revived.respawn).toBe(0);
    expect(revived.rested).toBe(false);
  });

  it("counts down a failed rite and then revives", () => {
    const target = enemy({ status: "dead", hp: 0, respawn: 0.5 });

    const waiting = tickRespawn(target, 0.2);
    expect(waiting.respawned).toBe(false);
    expect(waiting.enemy.respawn).toBeCloseTo(0.3, 5);

    const revived = tickRespawn(waiting.enemy, 0.4);
    expect(revived.respawned).toBe(true);
    expect(revived.enemy.status).toBe("alive");
  });

  it("never revives a rested enemy", () => {
    const target = enemy({ status: "dead", hp: 0, rested: true, respawn: 0 });
    const result = tickRespawn(target, 1);

    expect(result.respawned).toBe(false);
    expect(result.enemy).toBe(target);
  });

  it("adds spirit up to the threshold", () => {
    expect(addSpirit(0, PURIFICATION.spiritPerMob)).toEqual({
      spirit: PURIFICATION.spiritPerMob,
      purified: false,
    });
    expect(addSpirit(90, PURIFICATION.spiritPerMob)).toEqual({
      spirit: PURIFICATION.spiritThreshold,
      purified: true,
    });
    expect(addSpirit(100, PURIFICATION.spiritPerMob)).toEqual({
      spirit: PURIFICATION.spiritThreshold,
      purified: true,
    });
  });
});
