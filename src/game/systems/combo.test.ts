import { describe, expect, it } from "vitest";
import { COMBO } from "../data/config";
import { createPlayer } from "../../state/initialState";
import type { Player } from "../types";
import {
  activeEnd,
  comboPhase,
  comboWindowOpen,
  markStepResolved,
  resetCombo,
  stepDefinition,
  tickCombo,
  windowEnd,
  windowStart,
} from "./combo";

const DT = 0.01;

function start(): Player {
  return tickCombo(createPlayer(), true, DT).player;
}

function advance(player: Player, seconds: number, pressed = false): Player {
  return tickCombo(player, pressed, seconds).player;
}

describe("combo chain", () => {
  it("starts at step 1 on the first press and stays idle otherwise", () => {
    const idle = tickCombo(createPlayer(), false, DT);
    expect(idle.player.comboStep).toBe(0);

    const started = tickCombo(createPlayer(), true, DT);
    expect(started.started).toBe(1);
    expect(started.player.comboStep).toBe(1);
    expect(comboPhase(started.player)).toBe("windup");
  });

  it("opens the window one beat after the impact", () => {
    let player = markStepResolved(start(), true);
    const definition = stepDefinition(1);
    player = advance(player, definition.windup + definition.active);
    expect(comboPhase(player)).toBe("recovery");
    expect(comboWindowOpen(player)).toBe(false);

    player = advance(player, COMBO.windowDelay);
    expect(comboPhase(player)).toBe("window");
    expect(comboWindowOpen(player)).toBe(true);
  });

  it("keeps the window closed while the swing is still active", () => {
    let player = markStepResolved(start(), true);
    player = advance(player, stepDefinition(1).windup);

    expect(comboPhase(player)).toBe("active");
    expect(comboWindowOpen(player)).toBe(false);
  });

  it("advances inside the window and starts the next step immediately", () => {
    let player = markStepResolved(start(), true);
    player = advance(player, windowStart(1));

    const advanced = tickCombo(player, true, DT);
    expect(advanced.started).toBe(2);
    expect(advanced.player.comboStep).toBe(2);
    expect(advanced.player.comboTime).toBe(0);
    expect(advanced.player.comboHits).toBe(1);
  });

  it("ends the chain on a press before the window", () => {
    const player = markStepResolved(start(), true);

    const early = tickCombo(player, true, DT);
    expect(early.ended).toBe("mistime");
    expect(early.player.comboStep).toBe(0);
    expect(early.player.comboHits).toBe(0);
  });

  it("ends the chain on a press in the beat before the window", () => {
    let player = markStepResolved(start(), true);
    player = advance(player, activeEnd(1) + DT);

    const early = tickCombo(player, true, DT);
    expect(early.ended).toBe("mistime");
    expect(early.player.comboStep).toBe(0);
  });

  it("ends the chain on a press after the window", () => {
    let player = markStepResolved(start(), true);
    player = advance(player, windowEnd(1));
    expect(comboWindowOpen(player)).toBe(true);

    const late = tickCombo(player, true, DT);
    expect(late.ended).toBe("mistime");
    expect(late.player.comboStep).toBe(0);
  });

  it("ends the chain when the window expires without a press", () => {
    const player = markStepResolved(start(), true);

    const expired = tickCombo(player, false, windowEnd(1) + DT);
    expect(expired.ended).toBe("timeout");
    expect(expired.player.comboStep).toBe(0);
  });

  it("ends the chain when a step connects with nothing", () => {
    const player = markStepResolved(start(), false);

    const whiffed = tickCombo(player, false, activeEnd(1));
    expect(whiffed.ended).toBe("whiff");
    expect(whiffed.player.comboStep).toBe(0);
  });

  it("counts only the steps that connect", () => {
    let player = markStepResolved(start(), true);
    player = advance(player, windowStart(1));
    player = tickCombo(player, true, DT).player;
    expect(player.comboStep).toBe(2);
    expect(player.comboHits).toBe(1);

    player = markStepResolved(player, false);
    player = advance(player, activeEnd(2));
    expect(player.comboStep).toBe(0);
    expect(player.comboHits).toBe(0);
  });

  it("ends the chain when the finisher is interrupted", () => {
    let player: Player = { ...createPlayer(), comboStep: 3, comboHits: 2 };
    player = markStepResolved(player, true);

    const interrupted = tickCombo(player, true, DT);
    expect(interrupted.ended).toBe("mistime");
    expect(interrupted.player.comboStep).toBe(0);
  });

  it("holds the landed finisher, then hands back to idle", () => {
    let player: Player = { ...createPlayer(), comboStep: 3, comboHits: 2 };
    player = markStepResolved(player, true);
    expect(player.comboHits).toBe(3);

    // Once the finisher lands, presses are ignored rather than punished.
    player = advance(player, activeEnd(3));
    const held = tickCombo(player, true, DT);
    expect(held.ended).toBeUndefined();
    expect(held.player.comboStep).toBe(3);
    expect(comboWindowOpen(held.player)).toBe(false);

    const done = tickCombo(held.player, false, COMBO.finisherHold);
    expect(done.ended).toBe("complete");
    expect(done.player.comboStep).toBe(0);
    expect(done.player.comboHits).toBe(0);
  });

  it("resets the chain state cleanly", () => {
    const player = resetCombo({
      ...createPlayer(),
      comboStep: 2,
      comboTime: 0.2,
      comboHits: 1,
      comboResolved: true,
      comboHitThisStep: true,
    });

    expect(player.comboStep).toBe(0);
    expect(player.comboTime).toBe(0);
    expect(player.comboHits).toBe(0);
    expect(player.comboResolved).toBe(false);
    expect(player.comboHitThisStep).toBe(false);
  });
});
