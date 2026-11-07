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

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnemySpawn {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
}

export interface Floor {
  seed: number;
  depth: number;
  cols: number;
  rows: number;
  width: number;
  height: number;
  /** Row-major walkable tile map. */
  walkable: boolean[];
  /** Generated rooms in world pixels. */
  rooms: Rect[];
  spawn: Vec2;
  stairs: Rect;
  enemySpawns: EnemySpawn[];
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
  /** Spawn position a failed rite returns the enemy to. */
  homeX: number;
  homeY: number;
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
  /** One entry per spirit fragment; true while the fragment is intact. */
  fragments: boolean[];
  /** True once the enemy has been permanently put to rest. */
  rested: boolean;
  /** Seconds left before a failed-rite respawn; 0 when not pending. */
  respawn: number;
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
  /** Current floor number, starting at 1. */
  depth: number;
  /** Spirit gained on this floor, capped at the threshold. */
  spirit: number;
  /** True when every enemy on the floor has been put to rest. */
  floorPurified: boolean;
  /** True when the stairs may be used. Mirrors floorPurified. */
  exitOpen: boolean;
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
  | { type: "fragment-broken"; x: number; y: number }
  | { type: "fragments-restored"; x: number; y: number }
  | { type: "enemy-rested"; x: number; y: number; spirit: number }
  | { type: "enemy-respawned"; x: number; y: number }
  | { type: "floor-purified" }
  | { type: "floor-descended"; depth: number; seed: number }
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
  floor: Floor;
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
    fragments: boolean[];
    rested: boolean;
    respawn: number;
  }>;
  projectiles: Array<{ x: number; y: number }>;
  spirit: number;
  floorPurified: boolean;
  exitOpen: boolean;
  depth: number;
  floor: {
    seed: number;
    depth: number;
    cols: number;
    rows: number;
    width: number;
    height: number;
    spawn: Vec2;
    stairs: Rect;
    rooms: Rect[];
  };
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
