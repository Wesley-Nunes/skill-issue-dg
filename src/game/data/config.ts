import type { Room, Vec2 } from "../types";

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
export const ENEMY_SPAWN: Vec2 = { x: 448, y: 128 };

export const PLAYER = {
  speed: 120,
  radius: 6,
  maxHp: 6,
  damageInvulnerability: 0.6,
  hurtFlash: 0.15,
  hurtFlashWhite: 0.08,
} as const;

export const ENEMY = {
  speed: 55,
  radius: 6,
  maxHp: 6,
  aggroRadius: 160,
  attackRange: 26,
  windup: 0.45,
  active: 0.1,
  attackCooldown: 1.1,
  fade: 0.25,
  damage: 1,
} as const;

export const ATTACK = {
  windup: 0.08,
  active: 0.1,
  recovery: 0.12,
  cooldown: 0.45,
  reach: 34,
  halfAngle: (55 * Math.PI) / 180,
  damage: 2,
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

export const ASSET_BASE = "/assets/dungeon-tileset-ii/frames/";
