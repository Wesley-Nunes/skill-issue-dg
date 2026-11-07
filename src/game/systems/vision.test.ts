import { describe, expect, it } from "vitest";
import { hasLineOfSight } from "./vision";
import { openFloor } from "./testFloor";

const ROOM = openFloor();

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
        { x: 500, y: ROOM.rooms[0]!.y - 20 },
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
