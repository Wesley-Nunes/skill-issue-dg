export interface Vec2 {
  x: number;
  y: number;
}

export type GameStatus = "title" | "playing" | "paused" | "dead";

export type EnemyStatus = "alive" | "dying" | "dead";

export type EnemyKind = "melee" | "ranged" | "boss";

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

export type RoomRole = "start" | "mob" | "shop" | "arena";

export interface FloorRoom extends Rect {
  role: RoomRole;
}

/** The fixed safe-room shop anchors for one floor. */
export interface ShopFloor {
  room: Rect;
  stall: Rect;
  /** Interaction zone in front of the counter. */
  interaction: Rect;
  /** Area where enemies cannot enter or damage the player. */
  safe: Rect;
  /** Safe threshold band across the entrance. */
  threshold: Rect;
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
  /** The six fixed-role rooms in world pixels. */
  rooms: FloorRoom[];
  /** The junction hub between the two branches. */
  junction: Rect;
  spawn: Vec2;
  stairs: Rect;
  /** Where the Floor Warden appears once the floor is purified. */
  bossSpawn: Vec2;
  enemySpawns: EnemySpawn[];
  /** Arena gate; blocks the arena until the floor is purified. */
  gate: Rect;
  /** Altar sigil where the player explicitly summons the Warden. */
  altar: Rect;
  shop: ShopFloor;
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
  /** True while a single light swing is in progress. */
  attacking: boolean;
  /** Seconds elapsed in the current swing. */
  attackTime: number;
  /** True once the current swing has applied its damage. */
  attackResolved: boolean;
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
  /** Internal freeze timer; no player action applies it. */
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
  /** Boss only: the windup currently in progress. */
  attackKind: "melee" | "bomb" | null;
  /** Damage this enemy deals with its own attack. */
  damage: number;
  /** Seconds between this enemy's attacks, after depth scaling. */
  attackInterval: number;
  /** Boss only: damage of a bomb blast, after depth scaling. */
  bombDamage: number;
  /** Boss only: seconds between bombs, after depth scaling. */
  bombInterval: number;
  /** Boss only: seconds until the next bomb throw. */
  bombCooldown: number;
  /** Boss only: seconds left in the harmless summon emergence. */
  emerging: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  /** Damage on hit, after depth scaling. */
  damage: number;
}

/** A thrown boss bomb: it arcs to a landing point, fuses, then explodes. */
export interface Bomb {
  id: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  /** Seconds elapsed in flight. */
  flight: number;
  landed: boolean;
  /** Seconds left on the fuse once landed. */
  fuse: number;
  radius: number;
  /** Blast damage, after depth scaling. */
  damage: number;
}

export interface RunState {
  /** Current floor number, starting at 1. */
  depth: number;
  /** Spirit gained on this floor, capped at the threshold. */
  spirit: number;
  /** True when every non-boss mob on the floor has been put to rest. */
  floorPurified: boolean;
  /** True while the Floor Warden is summoned and still alive. */
  bossAwake: boolean;
  /** True when the Warden is defeated and the stairs may be used. */
  exitOpen: boolean;
  /** Presentation clock start for the gate-opening animation. */
  gateOpenedAt: number | null;
  /** True once the shop is closed for this floor (after summoning). */
  shopClosed: boolean;
  /** Run-scoped skill points. */
  skillPoints: number;
  /** Run-scoped carried healing draught. */
  draughtCarried: boolean;
  /** Run-scoped one-time Vigor purchase. */
  vigorPurchased: boolean;
}

export type ShopItemId = "draught" | "vigor";

export type ShopMessageTone = "success" | "blocked";

/** Runtime state for the canvas shop panel. */
export interface ShopState {
  open: boolean;
  selection: number;
  message: string | null;
  tone: ShopMessageTone;
  messageAt: number;
}

export type GameEvent =
  | { type: "attack-started"; angle: number }
  | { type: "enemy-hit"; x: number; y: number }
  | { type: "enemy-died"; x: number; y: number }
  | { type: "player-hit"; x: number; y: number }
  | { type: "player-died" }
  | { type: "dodge-started"; x: number; y: number }
  | { type: "enemy-attack-started"; x: number; y: number }
  | { type: "enemy-telegraph-started"; x: number; y: number; kind: EnemyKind }
  | {
      type: "boss-attack-started";
      x: number;
      y: number;
      kind: "melee" | "bomb";
    }
  | { type: "projectile-fired"; x: number; y: number; angle: number }
  | { type: "projectile-hit"; x: number; y: number }
  | { type: "projectile-blocked"; x: number; y: number }
  | { type: "fragment-broken"; x: number; y: number }
  | { type: "fragments-restored"; x: number; y: number }
  | { type: "enemy-rested"; x: number; y: number; spirit: number }
  | { type: "enemy-respawned"; x: number; y: number }
  | { type: "floor-purified" }
  | { type: "boss-summoned"; x: number; y: number }
  | { type: "boss-defeated"; x: number; y: number }
  | { type: "bomb-thrown"; x: number; y: number; targetX: number; targetY: number }
  | { type: "bomb-landed"; x: number; y: number }
  | { type: "bomb-exploded"; x: number; y: number; radius: number }
  | { type: "player-healed"; x: number; y: number; amount: number }
  | {
      type: "skill-points-earned";
      amount: number;
      total: number;
      x?: number;
      y?: number;
    }
  | { type: "shop-opened" }
  | { type: "shop-closed" }
  | {
      type: "shop-purchase";
      item: ShopItemId;
      success: boolean;
      message: string;
    }
  | { type: "draught-used"; x: number; y: number; healed: number }
  | {
      type: "draught-blocked";
      x: number;
      y: number;
      reason: "empty" | "full";
      message: string;
    }
  | { type: "summon-blocked"; x: number; y: number; message: string }
  | { type: "shop-unavailable"; x: number; y: number; message: string }
  | { type: "safe-room-blocked"; x: number; y: number; message: string }
  | { type: "vigor-purchased"; x: number; y: number; maxHp: number }
  | { type: "floor-descended"; depth: number; seed: number }
  | { type: "run-started" }
  | { type: "run-paused" }
  | { type: "run-resumed" }
  | { type: "run-reset" };

export interface GameState {
  time: number;
  status: GameStatus;
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  bombs: Bomb[];
  nextProjectileId: number;
  nextBombId: number;
  hitstop: number;
  camera: Vec2;
  pointer: Vec2;
  floor: Floor;
  run: RunState;
  shop: ShopState;
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
    attacking: boolean;
    attackTime: number;
    attackResolved: boolean;
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
    attackKind: "melee" | "bomb" | null;
    bombCooldown: number;
    emerging: number;
  }>;
  projectiles: Array<{ x: number; y: number }>;
  bombs: Array<{
    id: number;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    landed: boolean;
    fuse: number;
  }>;
  spirit: number;
  floorPurified: boolean;
  bossAwake: boolean;
  exitOpen: boolean;
  depth: number;
  gateOpen: boolean;
  /** True while a living enemy is hunting the player; seals the shop ward. */
  inCombat: boolean;
  summonAvailable: boolean;
  skillPoints: number;
  draughtCarried: boolean;
  vigorPurchased: boolean;
  shopOpen: boolean;
  shopClosed: boolean;
  shopSelection: number;
  shopMessage: string | null;
  shopTone: ShopMessageTone;
  shopRows: Array<{
    id: ShopItemId;
    cost: number;
    affordable: boolean;
    state: string;
    stateLabel: string;
  }>;
  floor: {
    seed: number;
    depth: number;
    cols: number;
    rows: number;
    width: number;
    height: number;
    /** Row-major walkable tile map, exposed for test navigation only. */
    walkable: boolean[];
    spawn: Vec2;
    stairs: Rect;
    bossSpawn: Vec2;
    rooms: FloorRoom[];
    junction: Rect;
    gate: Rect;
    altar: Rect;
    shop: ShopFloor;
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
  /** True on the frame a click or Enter/Space should leave the title screen. */
  start: boolean;
  /** True on the frame Escape is pressed. */
  pause: boolean;
  /** True on the frame M is pressed. */
  mute: boolean;
  /** True on the frame E is pressed. */
  interact: boolean;
  /** True on the frame Q is pressed. */
  useDraught: boolean;
  /** One-press shop navigation. */
  menuUp: boolean;
  menuDown: boolean;
  /** True on the frame Enter is pressed. */
  confirm: boolean;
  /** True on any user gesture; used to unlock audio once. */
  gesture: boolean;
  pointer: Vec2;
}
