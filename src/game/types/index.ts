export interface Vec2 {
  x: number;
  y: number;
}

export type GameStatus = "playing" | "dead";

export type EnemyStatus = "alive" | "dying" | "dead";

export interface Room {
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  aim: Vec2;
  facing: -1 | 1;
  invulnerable: number;
  hurtFlash: number;
  dodgeTime: number;
  dodgeCooldown: number;
  dodgeDir: Vec2;
  attackTime: number;
  attackCooldown: number;
  attackHit: boolean;
  moving: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  status: EnemyStatus;
  fade: number;
  aggro: boolean;
  windup: number;
  active: number;
  attackCooldown: number;
  attackHit: boolean;
  moving: boolean;
}

export type GameEvent =
  | { type: "attack-started"; angle: number }
  | { type: "enemy-hit"; x: number; y: number }
  | { type: "enemy-died"; x: number; y: number }
  | { type: "player-hit"; x: number; y: number }
  | { type: "player-died" }
  | { type: "dodge-started"; x: number; y: number }
  | { type: "enemy-attack-started"; x: number; y: number };

export interface GameState {
  time: number;
  status: GameStatus;
  player: Player;
  enemy: Enemy;
  camera: Vec2;
  pointer: Vec2;
}

export interface InputFrame {
  move: Vec2;
  aim: Vec2;
  attack: boolean;
  dodge: boolean;
  restart: boolean;
  pointer: Vec2;
}
