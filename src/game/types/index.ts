export interface Vec2 {
  x: number;
  y: number;
}

export type GameStatus = "playing" | "dead";

/** Why a combo chain stopped being available. */
export type ComboEndReason =
  | "mistime"
  | "whiff"
  | "timeout"
  | "damage"
  | "complete";

export type EnemyStatus = "alive" | "dying" | "dead";

export type EnemyKind = "melee" | "ranged";

export interface Room {
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Viewport {
  width: number;
  height: number;
}

/** One step of the three-hit light combo. */
export interface ComboStep {
  windup: number;
  active: number;
  recovery: number;
  reach: number;
  halfAngle: number;
  damage: number;
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
  /** 0 = idle, 1..3 = current chain step. */
  comboStep: 0 | 1 | 2 | 3;
  /** Seconds elapsed in the current step. */
  comboTime: number;
  /** Steps of the current chain that have connected, 0..3. */
  comboHits: number;
  comboResolved: boolean;
  comboHitThisStep: boolean;
  moving: boolean;
}

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  status: EnemyStatus;
  fade: number;
  hurtFlash: number;
  stagger: number;
  aggro: boolean;
  windup: number;
  active: number;
  attackCooldown: number;
  attackHit: boolean;
  moving: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
}

export interface RunState {
  skillPoints: number;
  challengeEarned: boolean;
  roomCleared: boolean;
}

export type GameEvent =
  | { type: "attack-started"; angle: number; step: number }
  | { type: "combo-ended"; reason: ComboEndReason; x: number; y: number }
  | { type: "enemy-hit"; x: number; y: number; finisher: boolean }
  | { type: "enemy-died"; x: number; y: number }
  | { type: "player-hit"; x: number; y: number }
  | { type: "player-died" }
  | { type: "dodge-started"; x: number; y: number }
  | { type: "enemy-attack-started"; x: number; y: number }
  | { type: "enemy-telegraph-started"; x: number; y: number; kind: EnemyKind }
  | { type: "projectile-fired"; x: number; y: number; angle: number }
  | { type: "projectile-hit"; x: number; y: number }
  | { type: "projectile-blocked"; x: number; y: number }
  | { type: "challenge-complete"; points: number }
  | { type: "room-cleared" }
  | { type: "run-reset" };

export interface GameState {
  time: number;
  status: GameStatus;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  nextProjectileId: number;
  hitstop: number;
  camera: Vec2;
  pointer: Vec2;
  run: RunState;
}

/** Read-only view of the run used by development tooling and browser tests. */
export interface DebugSnapshot {
  time: number;
  status: GameStatus;
  hitstop: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    aimX: number;
    aimY: number;
    dodging: boolean;
    invulnerable: number;
    comboStep: number;
    comboHits: number;
    comboResolved: boolean;
    comboHitThisStep: boolean;
    comboWindowOpen: boolean;
  };
  enemies: Array<{
    id: string;
    kind: EnemyKind;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    status: EnemyStatus;
  }>;
  projectiles: Array<{ x: number; y: number }>;
  skillPoints: number;
  challengeEarned: boolean;
  roomCleared: boolean;
  camera: Vec2;
  pointer: Vec2;
  viewport: Viewport;
  zoom: number;
}

export interface InputFrame {
  move: Vec2;
  aim: Vec2;
  /** True on the frame the attack button is pressed; holding does not repeat. */
  attack: boolean;
  dodge: boolean;
  restart: boolean;
  pointer: Vec2;
}
