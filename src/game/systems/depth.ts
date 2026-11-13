import { BOMB, BOSS, DEPTH, MELEE, PROJECTILE, RANGED } from "../data/config";

export interface DepthStats {
  maxHp: number;
  damage: number;
  /** Seconds between attacks. */
  attackInterval: number;
  /** Boss only; zero for other enemies. */
  bombDamage: number;
  /** Boss only; zero for other enemies. */
  bombInterval: number;
}

export interface DepthScaling {
  melee: DepthStats;
  ranged: DepthStats;
  boss: DepthStats;
}

function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) return 1;
  return Math.max(1, Math.min(DEPTH.cap, Math.floor(depth)));
}

/** Rounded HP for a base value at a depth. */
export function scaledHp(base: number, depth: number): number {
  const level = clampDepth(depth);
  const multiplier = Math.min(
    DEPTH.hpMax,
    DEPTH.hpBase + DEPTH.hpStep * (level - 1),
  );
  return Math.max(1, Math.round(base * multiplier));
}

/** Attack cooldown multiplier: above 1 slows the enemy, below 1 speeds it up. */
export function cadenceMultiplier(depth: number): number {
  const level = clampDepth(depth);
  return Math.max(
    DEPTH.cadenceMin,
    DEPTH.cadenceBase - DEPTH.cadenceStep * (level - 1),
  );
}

/**
 * Rounds to two decimals. The epsilon absorbs binary floating-point error so a
 * mathematically exact half (for example 1.1 × 1.15 = 1.265) rounds up as the
 * design table specifies instead of down.
 */
function roundToHundredths(value: number): number {
  return Math.round(value * 100 + 1e-6) / 100;
}

function scaledInterval(base: number, depth: number): number {
  return roundToHundredths(base * cadenceMultiplier(depth));
}

/**
 * Pure depth scaling for every spawnable enemy. Movement speed, aggro radius,
 * attack range, and projectile properties never scale. Damage steps at the
 * depths recorded in design/0.8.0/design-decisions.md §5.4.
 */
export function scalingForDepth(depth: number): DepthScaling {
  const level = clampDepth(depth);

  return {
    melee: {
      maxHp: scaledHp(MELEE.maxHp, level),
      damage: level >= DEPTH.meleeDamageDepth ? 2 : MELEE.damage,
      attackInterval: scaledInterval(MELEE.attackCooldown, level),
      bombDamage: 0,
      bombInterval: 0,
    },
    ranged: {
      maxHp: scaledHp(RANGED.maxHp, level),
      damage:
        level >= DEPTH.rangedDamageDepth ? 2 : PROJECTILE.damage,
      attackInterval: scaledInterval(RANGED.attackCooldown, level),
      bombDamage: 0,
      bombInterval: 0,
    },
    boss: {
      maxHp: scaledHp(BOSS.maxHp, level),
      damage: level >= DEPTH.bossDamageDepth ? 3 : BOSS.damage,
      attackInterval: scaledInterval(BOSS.attackCooldown, level),
      bombDamage: level >= DEPTH.bombDamageDepth ? 3 : BOMB.damage,
      bombInterval: scaledInterval(BOSS.bombCooldown, level),
    },
  };
}
