import { describe, expect, it } from "vitest";
import { createPlayer } from "../../state/initialState";
import { ATTACK } from "../data/config";
import {
  attackPhase,
  attackTotal,
  cancelAttack,
  isInAttackArc,
  markAttackResolved,
  tickAttack,
} from "./attack";

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
    expect(
      isInAttackArc(origin, aim, { x: 20, y: 0 }, ATTACK.reach, ATTACK.halfAngle),
    ).toBe(true);
  });

  it("misses a target behind the player", () => {
    expect(
      isInAttackArc(
        origin,
        aim,
        { x: -20, y: 0 },
        ATTACK.reach,
        ATTACK.halfAngle,
      ),
    ).toBe(false);
  });

  it("misses a target beyond the reach", () => {
    expect(
      isInAttackArc(
        origin,
        aim,
        { x: ATTACK.reach + 1, y: 0 },
        ATTACK.reach,
        ATTACK.halfAngle,
      ),
    ).toBe(false);
  });

  it("respects the 60-degree half-angle boundary", () => {
    expect(
      isInAttackArc(
        origin,
        aim,
        targetAtAngle(59, 20),
        ATTACK.reach,
        ATTACK.halfAngle,
      ),
    ).toBe(true);
    expect(
      isInAttackArc(
        origin,
        aim,
        targetAtAngle(61, 20),
        ATTACK.reach,
        ATTACK.halfAngle,
      ),
    ).toBe(false);
  });
});

describe("tickAttack", () => {
  it("starts one swing on a press", () => {
    const result = tickAttack(createPlayer(), true, 0.01);

    expect(result.started).toBe(true);
    expect(result.player.attacking).toBe(true);
    expect(result.player.attackTime).toBe(0);
    expect(result.player.attackResolved).toBe(false);
  });

  it("stays idle when no press arrives", () => {
    const player = createPlayer();
    const result = tickAttack(player, false, 0.01);

    expect(result.started).toBe(false);
    expect(result.player).toBe(player);
  });

  it("ignores a press while the committed swing is in progress", () => {
    const started = tickAttack(createPlayer(), true, 0.01).player;
    const result = tickAttack(started, true, 0.01);

    expect(result.started).toBe(false);
    expect(result.player.attacking).toBe(true);
    expect(result.player.attackTime).toBeCloseTo(0.01);
  });

  it("ends the swing after windup, active, and recovery", () => {
    const player = { ...createPlayer(), attacking: true, attackTime: 0.4 };
    const result = tickAttack(player, false, 0.01);

    expect(attackTotal()).toBeCloseTo(0.41);
    expect(result.started).toBe(false);
    expect(result.player.attacking).toBe(false);
  });

  it("reports each phase at its boundary", () => {
    const player = createPlayer();
    expect(attackPhase(player)).toBe("idle");
    expect(attackPhase({ ...player, attacking: true, attackTime: 0 })).toBe(
      "windup",
    );
    expect(attackPhase({ ...player, attacking: true, attackTime: 0.1 })).toBe(
      "active",
    );
    expect(attackPhase({ ...player, attacking: true, attackTime: 0.19 })).toBe(
      "recovery",
    );
  });

  it("cancels a swing without resolving it", () => {
    const player = markAttackResolved({
      ...createPlayer(),
      attacking: true,
      attackTime: 0.12,
    });
    const cancelled = cancelAttack(player);

    expect(cancelled.attacking).toBe(false);
    expect(cancelled.attackTime).toBe(0);
    expect(cancelled.attackResolved).toBe(false);
  });
});
