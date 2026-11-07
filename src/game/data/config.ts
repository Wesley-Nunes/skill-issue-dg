import type { ComboStep } from "../types";

export const TILE = 16;
export const ZOOM = 3;

/**
 * First dungeon slice: a four-room chain joined by two-tile-high corridors.
 * Room sizes and gaps vary by seed; the chain keeps every floor traversable
 * without a pathfinding or graph generator.
 */
export const FLOOR = {
  cols: 96,
  rows: 30,
  roomCount: 4,
  roomWidth: { min: 12, max: 17 },
  roomHeight: { min: 10, max: 14 },
  roomGap: { min: 4, max: 6 },
  corridorRows: 2,
  corridorRow: 15,
  margin: 2,
} as const;

export const PLAYER = {
  speed: 120,
  radius: 6,
  maxHp: 6,
  damageInvulnerability: 0.6,
  hurtFlash: 0.15,
  hurtFlashWhite: 0.08,
} as const;

export const COMBO = {
  steps: [
    {
      windup: 0.08,
      active: 0.1,
      recovery: 0.12,
      reach: 34,
      halfAngle: (55 * Math.PI) / 180,
      damage: 2,
    },
    {
      windup: 0.07,
      active: 0.09,
      recovery: 0.1,
      reach: 36,
      halfAngle: (55 * Math.PI) / 180,
      damage: 2,
    },
    {
      windup: 0.12,
      active: 0.12,
      recovery: 0.2,
      reach: 40,
      halfAngle: (80 * Math.PI) / 180,
      damage: 4,
    },
  ] satisfies ComboStep[],
  /**
   * Short beat after a step's active window before the next input opens. It
   * keeps the reply window away from the click rhythm of a mash.
   */
  windowDelay: 0.06,
  /** How long the next step's input window stays open. */
  window: 0.1,
  /** How long the completed finisher stays on screen after it lands. */
  finisherHold: 0.12,
  hitstop: 0.06,
  knockback: 6,
  stagger: 0.15,
} as const;

export const MELEE = {
  speed: 55,
  radius: 6,
  maxHp: 10,
  aggroRadius: 160,
  attackRange: 26,
  windup: 0.45,
  active: 0.1,
  attackCooldown: 1.1,
  damage: 1,
} as const;

export const RANGED = {
  speed: 70,
  radius: 6,
  maxHp: 6,
  aggroRadius: 260,
  nearRange: 110,
  farRange: 240,
  telegraph: 0.5,
  attackCooldown: 1.6,
} as const;

export const ENEMY_FADE = 0.25;

/**
 * Spirit purification rules. A mob carries one fragment per angle; all of
 * them must be broken without losing HP before the mob can rest.
 */
export const PURIFICATION = {
  /** Fragment orbit angles around the enemy, measured from its body centre. */
  angles: [(-135 * Math.PI) / 180, (-45 * Math.PI) / 180],
  orbitRadius: 12,
  /** Vertical offset of the orbit centre from the enemy's feet. */
  orbitOffsetY: -10,
  fragmentRadius: 3.2,
  fragmentColor: "#bfe9ff",
  bobAmplitude: 1.2,
  bobSpeed: 3,
  spiritPerMob: 34,
  spiritThreshold: 100,
  /** Delay before a conventionally killed mob returns at its spawn. */
  respawnDelay: 2,
} as const;

export const PROJECTILE = {
  speed: 150,
  radius: 4,
  life: 1.6,
  damage: 1,
  spawnOffset: 10,
} as const;

export const DODGE = {
  distance: 64,
  duration: 0.18,
  invulnerability: 0.25,
  cooldown: 0.9,
} as const;

export const CAMERA = {
  tau: 0.12,
} as const;

export const IMPACT = {
  flash: 0.08,
} as const;

export const ASSET_BASE = "/assets/dungeon-tileset-ii/frames/";
