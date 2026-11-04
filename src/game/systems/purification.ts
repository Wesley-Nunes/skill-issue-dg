import { PURIFICATION } from "../data/config";
import type { Enemy, Vec2 } from "../types";
import { isInAttackArc } from "./attack";

/** World position of one spirit fragment around an enemy. */
export function fragmentPosition(enemy: Enemy, index: number): Vec2 {
  const angle = PURIFICATION.angles[index] ?? 0;
  return {
    x: enemy.x + Math.cos(angle) * PURIFICATION.orbitRadius,
    y:
      enemy.y +
      PURIFICATION.orbitOffsetY +
      Math.sin(angle) * PURIFICATION.orbitRadius,
  };
}

/** True when every spirit fragment has been broken. */
export function hasAllFragmentsBroken(enemy: Enemy): boolean {
  return enemy.fragments.every((intact) => !intact);
}

/** True when the enemy is alive and may be killed permanently. */
export function canRest(enemy: Enemy): boolean {
  return enemy.status === "alive" && hasAllFragmentsBroken(enemy);
}

export interface FragmentBreakResult {
  enemy: Enemy;
  /** World positions of the fragments broken by this swing. */
  broken: Vec2[];
}

/**
 * Breaks every intact fragment inside the light attack's arc. A single swing
 * can break more than one fragment. Fragments outside the arc are untouched.
 */
export function breakFragmentsInArc(
  enemy: Enemy,
  origin: Vec2,
  aim: Vec2,
  reach: number,
  halfAngle: number,
): FragmentBreakResult {
  if (enemy.status !== "alive") return { enemy, broken: [] };

  const broken: Vec2[] = [];
  const fragments = enemy.fragments.map((intact, index) => {
    if (!intact) return false;
    const position = fragmentPosition(enemy, index);
    if (!isInAttackArc(origin, aim, position, reach, halfAngle)) return true;
    broken.push(position);
    return false;
  });

  if (broken.length === 0) return { enemy, broken };
  return { enemy: { ...enemy, fragments }, broken };
}

/** Restores every broken fragment on a living enemy. */
export function restoreFragments(enemy: Enemy): Enemy {
  if (enemy.status !== "alive") return enemy;
  if (enemy.fragments.every(Boolean)) return enemy;
  return { ...enemy, fragments: enemy.fragments.map(() => true) };
}

/** Returns a conventionally killed enemy to its spawn with a fresh rite. */
export function reviveEnemy(enemy: Enemy): Enemy {
  return {
    ...enemy,
    x: enemy.homeX,
    y: enemy.homeY,
    hp: enemy.maxHp,
    status: "alive",
    fade: 0,
    hurtFlash: 0,
    stagger: 0,
    aggro: false,
    windup: 0,
    active: 0,
    attackCooldown: 0,
    attackHit: false,
    moving: false,
    fragments: enemy.fragments.map(() => true),
    rested: false,
    respawn: 0,
  };
}

export interface RespawnResult {
  enemy: Enemy;
  respawned: boolean;
}

/**
 * Counts down a failed rite. A rested enemy is left dead forever.
 * The caller emits the respawn event when `respawned` is true.
 */
export function tickRespawn(enemy: Enemy, dt: number): RespawnResult {
  if (enemy.status !== "dead" || enemy.rested || enemy.respawn <= 0) {
    return { enemy, respawned: false };
  }

  const respawn = enemy.respawn - dt;
  if (respawn <= 0) return { enemy: reviveEnemy(enemy), respawned: true };
  return { enemy: { ...enemy, respawn }, respawned: false };
}

export interface SpiritResult {
  spirit: number;
  purified: boolean;
}

/** Adds spirit, clamped to the threshold, and reports a full meter. */
export function addSpirit(spirit: number, amount: number): SpiritResult {
  const next = Math.min(
    PURIFICATION.spiritThreshold,
    Math.max(0, spirit) + amount,
  );
  return { spirit: next, purified: next >= PURIFICATION.spiritThreshold };
}
