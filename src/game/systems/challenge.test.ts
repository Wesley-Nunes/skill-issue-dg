import { describe, expect, it } from "vitest";
import { comboAwardsPoint } from "./challenge";

describe("comboAwardsPoint", () => {
  it("awards when all three steps of a finisher chain connected", () => {
    expect(comboAwardsPoint(3, 3, true, false)).toBe(true);
  });

  it("does not award before the finisher resolves", () => {
    expect(comboAwardsPoint(2, 2, true, false)).toBe(false);
  });

  it("does not award when a step whiffed", () => {
    expect(comboAwardsPoint(2, 3, true, false)).toBe(false);
  });

  it("does not award twice in one run", () => {
    expect(comboAwardsPoint(3, 3, true, true)).toBe(false);
  });
});
