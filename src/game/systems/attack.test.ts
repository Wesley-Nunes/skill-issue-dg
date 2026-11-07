import { describe, expect, it } from "vitest";
import { COMBO } from "../data/config";
import { isInAttackArc } from "./attack";

const origin = { x: 0, y: 0 };
const aim = { x: 1, y: 0 };
const step1 = COMBO.steps[0];

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
      isInAttackArc(origin, aim, { x: 20, y: 0 }, step1.reach, step1.halfAngle),
    ).toBe(true);
  });

  it("misses a target behind the player", () => {
    expect(
      isInAttackArc(origin, aim, { x: -20, y: 0 }, step1.reach, step1.halfAngle),
    ).toBe(false);
  });

  it("misses a target beyond the reach", () => {
    expect(
      isInAttackArc(
        origin,
        aim,
        { x: step1.reach + 1, y: 0 },
        step1.reach,
        step1.halfAngle,
      ),
    ).toBe(false);
  });

  it("respects the arc boundary", () => {
    expect(
      isInAttackArc(
        origin,
        aim,
        targetAtAngle(54, 20),
        step1.reach,
        step1.halfAngle,
      ),
    ).toBe(true);
    expect(
      isInAttackArc(
        origin,
        aim,
        targetAtAngle(56, 20),
        step1.reach,
        step1.halfAngle,
      ),
    ).toBe(false);
  });

  it("the finisher uses its own wider arc", () => {
    const finisher = COMBO.steps[2];
    const target = targetAtAngle(70, 36);
    expect(
      isInAttackArc(origin, aim, target, finisher.reach, finisher.halfAngle),
    ).toBe(true);
    expect(
      isInAttackArc(origin, aim, target, step1.reach, step1.halfAngle),
    ).toBe(false);
  });
});
