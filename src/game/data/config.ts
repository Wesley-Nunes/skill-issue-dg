import type { ComboStep, EnemyKind, Room, Vec2 } from "../types";

export const TILE = 16;
export const ZOOM = 3;

export const WORLD = {
  cols: 40,
  rows: 24,
  width: 40 * TILE,
  height: 24 * TILE,
} as const;

export const ROOM: Room = {
  width: WORLD.width,
  height: WORLD.height,
  bounds: { minX: TILE, minY: TILE * 2, maxX: TILE * 39, maxY: TILE * 23 },
};

export const PLAYER_SPAWN: Vec2 = { x: 320, y: 320 };

export const ENEMY_SPAWNS: ReadonlyArray<{
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
}> = [
  { id: "melee-a", kind: "melee", x: 448, y: 128 },
  { id: "melee-b", kind: "melee", x: 224, y: 112 },
  { id: "ranged", kind: "ranged", x: 560, y: 96 },
];

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
