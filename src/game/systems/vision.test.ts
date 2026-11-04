import { describe, expect, it } from "vitest";
import { ROOM } from "../data/config";
import { hasLineOfSight } from "./vision";

describe("hasLineOfSight", () => {
  it("sees across the open room", () => {
    expect(hasLineOfSight({ x: 100, y: 100 }, { x: 500, y: 300 }, ROOM)).toBe(
      true,
    );
  });

  it("is blocked when the segment leaves the walkable area", () => {
    expect(
      hasLineOfSight(
        { x: 100, y: 100 },
        { x: 500, y: ROOM.bounds.minY - 20 },
        ROOM,
      ),
    ).toBe(false);
  });

  it("sees a target at the same position", () => {
    expect(
      hasLineOfSight({ x: 100, y: 100 }, { x: 100, y: 100 }, ROOM),
    ).toBe(true);
  });
});
