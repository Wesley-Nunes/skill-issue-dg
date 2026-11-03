import { describe, expect, it } from "vitest";
import { COMBO } from "../data/config";
import { createPlayer } from "../../state/initialState";
import type { Player } from "../types";
import {
  comboPhase,
  markStepResolved,
  resetCombo,
  stepDefinition,
  stepTotal,
  tickCombo,
} from "./combo";

const DT = 0.01;

describe("combo chain", () => {
  it("starts at step 1 on the first press", () => {
    const player = tickCombo(createPlayer(), true, DT);
    expect(player.comboStep).toBe(1);
    expect(comboPhase(player)).toBe("windup");
  });

  it("moves through windup, active, recovery, and the window", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);

    player = tickCombo(player, false, stepDefinition(1).windup);
    expect(comboPhase(player)).toBe("active");

    player = tickCombo(player, false, stepDefinition(1).active);
    expect(comboPhase(player)).toBe("recovery");

    player = tickCombo(player, false, stepDefinition(1).recovery);
    expect(comboPhase(player)).toBe("window");

    player = tickCombo(player, false, COMBO.window);
    expect(player.comboStep).toBe(0);
  });

  it("advances to the next step when input is buffered during a swing", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);

    player = tickCombo(player, true, DT);
    expect(player.comboQueued).toBe(true);
    expect(player.comboStep).toBe(1);

    player = tickCombo(player, false, stepTotal(1));
    expect(player.comboStep).toBe(2);
    expect(player.comboHits).toBe(1);
  });

  it("advances when the press lands inside the chain window", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);
    player = tickCombo(player, false, stepTotal(1) + 0.05);
    expect(comboPhase(player)).toBe("window");

    player = tickCombo(player, true, DT);
    expect(player.comboStep).toBe(2);
  });

  it("ends the chain when a step whiffs", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, false);

    player = tickCombo(player, true, DT);
    expect(player.comboQueued).toBe(true);

    player = tickCombo(player, false, stepTotal(1));
    expect(player.comboStep).toBe(0);
    expect(player.comboQueued).toBe(false);
    expect(player.comboHits).toBe(0);
  });

  it("ends the chain when the window expires without a press", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);
    player = tickCombo(player, false, stepTotal(1) + COMBO.window + DT);
    expect(player.comboStep).toBe(0);
  });

  it("hands the finisher back to step 1 and clears chain hits", () => {
    let player: Player = { ...createPlayer(), comboStep: 3, comboHits: 2 };
    player = markStepResolved(player, true);
    expect(player.comboHits).toBe(3);

    player = tickCombo(player, true, DT);
    player = tickCombo(player, false, stepTotal(3));

    expect(player.comboStep).toBe(1);
    expect(player.comboHits).toBe(0);
  });

  it("does not advance when the buffer arrives after the window", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);
    player = tickCombo(player, false, stepTotal(1) + COMBO.window + DT);
    expect(player.comboStep).toBe(0);

    player = tickCombo(player, true, DT);
    expect(player.comboStep).toBe(1);
  });

  it("counts only the steps that connect", () => {
    let player = tickCombo(createPlayer(), true, DT);
    player = markStepResolved(player, true);
    player = tickCombo(player, true, DT);
    player = tickCombo(player, false, stepTotal(1));
    expect(player.comboStep).toBe(2);
    expect(player.comboHits).toBe(1);

    player = markStepResolved(player, false);
    player = tickCombo(player, false, stepTotal(2));
    expect(player.comboStep).toBe(0);
    expect(player.comboHits).toBe(0);
  });

  it("resets the chain state cleanly", () => {
    const player = resetCombo({
      ...createPlayer(),
      comboStep: 2,
      comboTime: 0.2,
      comboHits: 1,
      comboQueued: true,
      comboResolved: true,
    });
    expect(player.comboStep).toBe(0);
    expect(player.comboHits).toBe(0);
    expect(player.comboQueued).toBe(false);
    expect(player.comboResolved).toBe(false);
  });
});
