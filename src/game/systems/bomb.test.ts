import { describe, expect, it } from "vitest";
import { BOMB } from "../data/config";
import { createPlayer } from "../../state/initialState";
import {
  advanceBomb,
  bombArcHeight,
  bombHitsPlayer,
  spawnBomb,
} from "./bomb";
import { openFloor } from "./testFloor";

const ORIGIN = { x: 100, y: 100 };
const TARGET = { x: 160, y: 140 };

describe("boss bombs", () => {
  it("starts in flight toward the captured target", () => {
    const bomb = spawnBomb(1, ORIGIN, TARGET, BOMB.damage);
    expect(bomb.landed).toBe(false);
    expect(bomb.flight).toBe(0);
    expect(bomb.fuse).toBe(BOMB.fuse);
    expect([bomb.fromX, bomb.fromY]).toEqual([ORIGIN.x, ORIGIN.y]);
    expect([bomb.targetX, bomb.targetY]).toEqual([TARGET.x, TARGET.y]);
  });

  it("lands at the target after the flight time", () => {
    const started = spawnBomb(1, ORIGIN, TARGET, BOMB.damage);
    const landed = advanceBomb(started, BOMB.flightTime);

    expect(landed.landed).toBe(true);
    expect(landed.exploded).toBe(false);
    expect([landed.bomb.x, landed.bomb.y]).toEqual([TARGET.x, TARGET.y]);
    expect(bombArcHeight(landed.bomb)).toBe(0);
  });

  it("explodes when the fuse runs out", () => {
    const landed = advanceBomb(
      spawnBomb(1, ORIGIN, TARGET, BOMB.damage),
      BOMB.flightTime,
    ).bomb;
    const before = advanceBomb(landed, BOMB.fuse - 0.1);
    expect(before.exploded).toBe(false);

    const after = advanceBomb(before.bomb, 0.2);
    expect(after.exploded).toBe(true);
  });

  it("arcs above the ground mid-flight", () => {
    const half = advanceBomb(
      spawnBomb(1, ORIGIN, TARGET, BOMB.damage),
      BOMB.flightTime / 2,
    ).bomb;
    expect(bombArcHeight(half)).toBeGreaterThan(BOMB.arcHeight * 0.9);
    expect(bombArcHeight(half)).toBeLessThanOrEqual(BOMB.arcHeight);
  });

  it("hits only a player inside the blast radius", () => {
    const bomb = {
      ...spawnBomb(1, ORIGIN, TARGET, BOMB.damage),
      landed: true,
      x: TARGET.x,
      y: TARGET.y,
    };
    const inside = {
      ...createPlayer(openFloor().spawn),
      x: TARGET.x + BOMB.blastRadius,
      y: TARGET.y,
    };
    const outside = {
      ...createPlayer(openFloor().spawn),
      x: TARGET.x + BOMB.blastRadius + 40,
      y: TARGET.y,
    };

    expect(bombHitsPlayer(bomb, inside)).toBe(true);
    expect(bombHitsPlayer(bomb, outside)).toBe(false);
  });
});
