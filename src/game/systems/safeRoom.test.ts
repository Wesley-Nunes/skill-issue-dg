import { describe, expect, it } from "vitest";
import { createEnemy } from "../../state/initialState";
import type { Enemy, EnemySpawn } from "../types";
import { isInCombat } from "./safeRoom";

const SPAWN: EnemySpawn = {
  id: "test-mob",
  kind: "melee",
  x: 0,
  y: 0,
};

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return { ...createEnemy(SPAWN), ...overrides };
}

describe("isInCombat", () => {
  it("is true when a living enemy is hunting", () => {
    expect(isInCombat([enemy({ aggro: true })])).toBe(true);
  });

  it("is false when no living enemy is hunting", () => {
    expect(isInCombat([enemy({ aggro: false })])).toBe(false);
    expect(isInCombat([])).toBe(false);
  });

  it("ignores a hunting enemy that is dying or already dead", () => {
    expect(isInCombat([enemy({ aggro: true, status: "dying" })])).toBe(false);
    expect(isInCombat([enemy({ aggro: true, status: "dead" })])).toBe(false);
    expect(
      isInCombat([enemy({ aggro: true, status: "dead", rested: true })]),
    ).toBe(false);
  });

  it("ignores a harmless emerging boss that has never aggroed", () => {
    expect(
      isInCombat([
        enemy({ kind: "boss", aggro: false, emerging: 0.8, status: "alive" }),
      ]),
    ).toBe(false);
  });

  it("is true when any one of several enemies is hunting", () => {
    expect(
      isInCombat([
        enemy({ id: "a", aggro: false }),
        enemy({ id: "b", aggro: true }),
        enemy({ id: "c", aggro: false }),
      ]),
    ).toBe(true);
  });
});
