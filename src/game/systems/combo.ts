import { COMBO } from "../data/config";
import type { ComboStep, Player } from "../types";

export type ComboPhase = "idle" | "windup" | "active" | "recovery" | "window";

/** Returns the tuning definition for chain step 1..3. */
export function stepDefinition(step: number): ComboStep {
  const definition = COMBO.steps[step - 1];
  if (!definition) throw new Error(`Unknown combo step: ${step}`);
  return definition;
}

/** Windup + active + recovery. */
export function stepTotal(step: number): number {
  const definition = stepDefinition(step);
  return definition.windup + definition.active + definition.recovery;
}

export function comboPhase(player: Player): ComboPhase {
  if (player.comboStep === 0) return "idle";
  const definition = stepDefinition(player.comboStep);
  const activeEnd = definition.windup + definition.active;
  if (player.comboTime < definition.windup) return "windup";
  if (player.comboTime < activeEnd) return "active";
  if (player.comboTime < activeEnd + definition.recovery) return "recovery";
  return "window";
}

/** Clears the chain and any buffered press. */
export function resetCombo(player: Player): Player {
  return {
    ...player,
    comboStep: 0,
    comboTime: 0,
    comboHits: 0,
    comboQueued: false,
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
    comboQueued: false,
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
 * Advances the chain by dt. A press starts step 1 when idle, or buffers the
 * next step when a step is already running. Advancing, whiffing out, and the
 * chain window are resolved here; hit detection happens in the engine.
 */
export function tickCombo(player: Player, pressed: boolean, dt: number): Player {
  let next = player;

  if (pressed) {
    next =
      next.comboStep === 0
        ? beginStep(next, 1)
        : { ...next, comboQueued: true };
  }

  if (next.comboStep === 0) return next;

  const step = next.comboStep;
  const total = stepTotal(step);
  const time = next.comboTime + dt;

  if (time < total) {
    return { ...next, comboTime: time };
  }

  // The step is over: only a step that connected lets the chain continue.
  if (!next.comboResolved || !next.comboHitThisStep) {
    return resetCombo(next);
  }

  if (next.comboQueued) {
    // A finisher always hands back to step 1 so chains cannot loop at step 3.
    return step < 3 ? beginStep(next, (step + 1) as 2 | 3) : beginStep(next, 1);
  }

  if (time - total >= COMBO.window) {
    return resetCombo(next);
  }

  return { ...next, comboTime: total + Math.min(time - total, COMBO.window) };
}
