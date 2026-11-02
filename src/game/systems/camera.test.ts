import { describe, expect, it } from "vitest";
import { ROOM } from "../data/config";
import { clampCamera, updateCamera } from "./camera";

describe("clampCamera", () => {
  it("clamps to the top-left corner", () => {
    expect(clampCamera({ x: -50, y: -50 }, { width: 480, height: 270 }, ROOM)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("clamps to the bottom-right corner", () => {
    const camera = clampCamera(
      { x: 9999, y: 9999 },
      { width: 480, height: 270 },
      ROOM,
    );
    expect(camera.x).toBe(ROOM.width - 480);
    expect(camera.y).toBe(ROOM.height - 270);
  });

  it("centers the room when the viewport is larger", () => {
    const camera = clampCamera(
      { x: 0, y: 0 },
      { width: ROOM.width + 100, height: ROOM.height + 100 },
      ROOM,
    );
    expect(camera.x).toBe(-50);
    expect(camera.y).toBe(-50);
  });
});

describe("updateCamera", () => {
  it("moves toward the target smoothly", () => {
    const camera = updateCamera({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.12, 0.12);
    expect(camera.x).toBeGreaterThan(50);
    expect(camera.x).toBeLessThan(100);
  });

  it("snaps when the time constant is zero", () => {
    expect(updateCamera({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.016, 0)).toEqual({
      x: 100,
      y: 50,
    });
  });
});
