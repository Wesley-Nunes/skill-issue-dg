import { describe, expect, it } from "vitest";
import { ATTACK } from "../data/config";
import { createPlayer } from "../../state/initialState";
import { attackPhase, isInAttackArc, tickAttack } from "./attack";

const origin = { x: 0, y: 0 };
const aim = { x: 1, y: 0 };

function targetAtAngle(degrees: number, distance: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance,
  };
}

describe("isInAttackArc", () => {
  it("hits a target in front inside the reach", () => {
    expect(isInAttackArc(origin, aim, { x: 20, y: 0 })).toBe(true);
  });

  it("misses a target behind the player", () => {
    expect(isInAttackArc(origin, aim, { x: -20, y: 0 })).toBe(false);
  });

  it("misses a target beyond the reach", () => {
    expect(
      isInAttackArc(origin, aim, { x: ATTACK.reach + 1, y: 0 }),
    ).toBe(false);
  });

  it("respects the arc boundary", () => {
    expect(isInAttackArc(origin, aim, targetAtAngle(54, 20))).toBe(true);
    expect(isInAttackArc(origin, aim, targetAtAngle(56, 20))).toBe(false);
  });
});

describe("tickAttack", () => {
  it("starts a swing when held and off cooldown", () => {
    const player = createPlayer();
    const next = tickAttack(player, true, 0.016);
    expect(next.attackTime).toBe(0);
    expect(next.attackCooldown).toBeCloseTo(ATTACK.cooldown);
    expect(attackPhase(next)).toBe("windup");
  });

  it("does not start while on cooldown", () => {
    const player = { ...createPlayer(), attackCooldown: 0.2 };
    const next = tickAttack(player, true, 0.1);
    expect(next.attackTime).toBeLessThan(0);
    expect(next.attackCooldown).toBeCloseTo(0.1);
  });

  it("moves through windup, active, recovery, then idle", () => {
    let player = tickAttack(createPlayer(), true, 0.001);
    expect(attackPhase(player)).toBe("windup");

    player = tickAttack(player, false, ATTACK.windup);
    expect(attackPhase(player)).toBe("active");

    player = tickAttack(player, false, ATTACK.active);
    expect(attackPhase(player)).toBe("recovery");

    player = tickAttack(player, false, ATTACK.recovery);
    expect(attackPhase(player)).toBe("idle");
    expect(player.attackTime).toBe(-1);
  });

  it("can start a new swing after the cooldown", () => {
    let player = tickAttack(createPlayer(), true, 0.001);
    player = tickAttack(player, true, ATTACK.cooldown);
    expect(player.attackTime).toBe(0);
  });
});
