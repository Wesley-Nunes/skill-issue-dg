/**
 * The combo challenge awards one point per run when all three steps of a
 * chain connect. The caller supplies the chain bookkeeping.
 */
export function comboAwardsPoint(
  comboHits: number,
  step: number,
  resolved: boolean,
  alreadyEarned: boolean,
): boolean {
  return !alreadyEarned && resolved && step === 3 && comboHits === 3;
}
