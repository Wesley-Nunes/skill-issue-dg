import { COMBO } from "../data/config";
import type { ComboEndReason, ComboStep, Player } from "../types";

export type ComboPhase = "idle" | "windup" | "active" | "recovery" | "window";

/** One tick of the chain state machine. */
export interface ComboTick {
  player: Player;
  /** Step that started on this tick, if any. */
  started?: 1 | 2 | 3;
  /** Why the chain ended on this tick, if it did. */
  ended?: ComboEndReason;
}

/** Returns the tuning definition for chain step 1..3. */
export function stepDefinition(step: number): ComboStep {
  const definition = COMBO.steps[step - 1];
  if (!definition) throw new Error(`Unknown combo step: ${step}`);
  return definition;
}

/** Seconds from the start of the step to the end of its active window. */
export function activeEnd(step: number): number {
  const definition = stepDefinition(step);
  return definition.windup + definition.active;
}

/** Seconds from the start of the step to the moment its input window opens. */
export function windowStart(step: number): number {
  return activeEnd(step) + COMBO.windowDelay;
}

/** Seconds from the start of the step to the moment its input window closes. */
export function windowEnd(step: number): number {
  return windowStart(step) + COMBO.window;
}

/**
 * True while the next step may be started. The window opens one short beat
 * after the current swing lands, so the player replies to the impact rather
 * than matching a mash rhythm.
 */
export function comboWindowOpen(player: Player): boolean {
  if (player.comboStep === 0 || player.comboStep === 3) return false;
  if (!player.comboResolved || !player.comboHitThisStep) return false;
  return (
    player.comboTime >= windowStart(player.comboStep) &&
    player.comboTime <= windowEnd(player.comboStep)
  );
}

export function comboPhase(player: Player): ComboPhase {
  if (player.comboStep === 0) return "idle";
  const definition = stepDefinition(player.comboStep);
  if (player.comboTime < definition.windup) return "windup";
  if (player.comboTime < activeEnd(player.comboStep)) return "active";
  if (player.comboTime < windowStart(player.comboStep)) return "recovery";
  return "window";
}

/** Clears the chain. The player keeps their position, aim, and health. */
export function resetCombo(player: Player): Player {
  return {
    ...player,
    comboStep: 0,
    comboTime: 0,
    comboHits: 0,
    comboResolved: false,
    comboHitThisStep: false,
  };
}

function beginStep(player: Player, step: 1 | 2 | 3): Player {
  return {
    ...player,
    comboStep: step,
    comboTime: 0,
    comboHits: step === 1 ? 0 : player.comboHits,
    comboResolved: false,
    comboHitThisStep: false,
  };
}

/** Records the outcome of a step's hit resolution. */
export function markStepResolved(player: Player, hit: boolean): Player {
  return {
    ...player,
    comboResolved: true,
    comboHitThisStep: hit,
    comboHits: player.comboHits + (hit ? 1 : 0),
  };
}

/**
 * Advances the chain. Only a press inside the window starts the next step;
 * any other press ends the chain. There is no input buffer, so clicking on a
 * fixed rhythm cannot carry the chain past a mistimed link.
 */
export function tickCombo(
  player: Player,
  pressed: boolean,
  dt: number,
): ComboTick {
  if (player.comboStep === 0) {
    return pressed ? { player: beginStep(player, 1), started: 1 } : { player };
  }

  const step = player.comboStep;
  const start = windowStart(step);
  const end = windowEnd(step);
  const time = player.comboTime + dt;

  // The finisher has no next step. Interrupting it before it lands still costs
  // the chain; once it lands, presses are ignored and the completed chain is
  // held on screen for a short beat.
  if (step === 3) {
    const landed = activeEnd(3);
    if (pressed && time < landed) {
      return { player: resetCombo(player), ended: "mistime" };
    }
    const hold = landed + COMBO.finisherHold;
    if (time >= hold) return { player: resetCombo(player), ended: "complete" };
    return { player: { ...player, comboTime: Math.min(time, hold) } };
  }

  if (pressed) {
    if (!player.comboResolved) {
      // Pressed before the swing could resolve: too early.
      return { player: resetCombo(player), ended: "mistime" };
    }
    if (!player.comboHitThisStep) {
      return { player: resetCombo(player), ended: "whiff" };
    }
    if (time >= start && time <= end) {
      const next = (step + 1) as 2 | 3;
      return { player: beginStep(player, next), started: next };
    }
    return { player: resetCombo(player), ended: "mistime" };
  }

  if (time >= activeEnd(step) && !player.comboHitThisStep) {
    return { player: resetCombo(player), ended: "whiff" };
  }

  if (time > end) return { player: resetCombo(player), ended: "timeout" };

  return { player: { ...player, comboTime: time } };
}
