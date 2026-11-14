import { describe, expect, it } from "vitest";
import { BOMB, BOSS, MELEE, PROJECTILE, RANGED } from "../data/config";
import { cadenceMultiplier, scaledHp, scalingForDepth } from "./depth";

describe("scaledHp", () => {
  it("matches the design table for melee, ranged, and the Warden", () => {
    const rows = [
      { depth: 1, melee: 8, ranged: 5, boss: 24 },
      { depth: 2, melee: 9, ranged: 5, boss: 26 },
      { depth: 5, melee: 11, ranged: 7, boss: 34 },
      { depth: 6, melee: 12, ranged: 7, boss: 36 },
      { depth: 10, melee: 15, ranged: 9, boss: 46 },
    ];

    for (const row of rows) {
      expect(scaledHp(MELEE.maxHp, row.depth), `melee at ${row.depth}`).toBe(
        row.melee,
      );
      expect(scaledHp(RANGED.maxHp, row.depth), `ranged at ${row.depth}`).toBe(
        row.ranged,
      );
      expect(scaledHp(BOSS.maxHp, row.depth), `boss at ${row.depth}`).toBe(
        row.boss,
      );
    }
  });

  it("never decreases and never rounds below 1", () => {
    let previous = 0;
    for (let depth = 1; depth <= 12; depth += 1) {
      const hp = scaledHp(MELEE.maxHp, depth);
      expect(hp).toBeGreaterThanOrEqual(previous);
      expect(hp).toBeGreaterThanOrEqual(1);
      previous = hp;
    }
  });

  it("reuses the depth-10 row beyond the cap", () => {
    expect(scaledHp(BOSS.maxHp, 11)).toBe(scaledHp(BOSS.maxHp, 10));
    expect(scaledHp(BOSS.maxHp, 40)).toBe(scaledHp(BOSS.maxHp, 10));
  });
});

describe("cadenceMultiplier", () => {
  it("matches the design table and tightens monotonically", () => {
    const rows = [
      { depth: 1, multiplier: 1.15 },
      { depth: 2, multiplier: 1.12 },
      { depth: 5, multiplier: 1.03 },
      { depth: 6, multiplier: 1.0 },
      { depth: 10, multiplier: 0.88 },
    ];

    for (const row of rows) {
      expect(cadenceMultiplier(row.depth), `depth ${row.depth}`).toBeCloseTo(
        row.multiplier,
        5,
      );
    }

    for (let depth = 2; depth <= 10; depth += 1) {
      expect(cadenceMultiplier(depth)).toBeLessThan(
        cadenceMultiplier(depth - 1),
      );
    }
  });

  it("floors at depth 10 and beyond", () => {
    expect(cadenceMultiplier(11)).toBeCloseTo(0.88, 5);
    expect(cadenceMultiplier(40)).toBeCloseTo(0.88, 5);
  });
});

describe("scalingForDepth", () => {
  it("steps damage only at the design thresholds", () => {
    const depth4 = scalingForDepth(4);
    expect(depth4.melee.damage).toBe(MELEE.damage);
    expect(depth4.ranged.damage).toBe(PROJECTILE.damage);
    expect(depth4.boss.damage).toBe(BOSS.damage);
    expect(depth4.boss.bombDamage).toBe(BOMB.damage);

    const depth5 = scalingForDepth(5);
    expect(depth5.melee.damage).toBe(2);
    expect(depth5.ranged.damage).toBe(1);

    const depth6 = scalingForDepth(6);
    expect(depth6.ranged.damage).toBe(2);
    expect(depth6.boss.damage).toBe(3);
    expect(depth6.boss.bombDamage).toBe(2);

    const depth7 = scalingForDepth(7);
    expect(depth7.boss.bombDamage).toBe(3);
  });

  it("matches the cooldown rows at depths 1 and 10", () => {
    const depth1 = scalingForDepth(1);
    expect(depth1.melee.attackInterval).toBe(1.27);
    expect(depth1.ranged.attackInterval).toBe(1.84);
    expect(depth1.boss.attackInterval).toBe(1.84);
    expect(depth1.boss.bombInterval).toBe(2.99);

    const depth10 = scalingForDepth(10);
    expect(depth10.melee.attackInterval).toBe(0.97);
    expect(depth10.ranged.attackInterval).toBe(1.41);
    expect(depth10.boss.attackInterval).toBe(1.41);
    expect(depth10.boss.bombInterval).toBe(2.29);
  });

  it("leaves non-scaling enemy behaviour alone", () => {
    const shallow = scalingForDepth(1);
    const deep = scalingForDepth(10);

    // Only numbers carried by the scaling payload differ; movement, aggro,
    // range, windup, and projectile properties stay at their base constants.
    expect(Object.keys(deep.melee).sort()).toEqual(
      Object.keys(shallow.melee).sort(),
    );
    expect(MELEE.speed).toBe(55);
    expect(RANGED.aggroRadius).toBe(260);
    expect(PROJECTILE.speed).toBe(150);
    expect(PROJECTILE.radius).toBe(4);
  });
});
