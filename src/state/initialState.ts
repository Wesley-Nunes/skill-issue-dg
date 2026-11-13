import { BOSS, MELEE, PLAYER, PURIFICATION, RANGED } from "../game/data/config";
import { generateFloor } from "../game/data/floor";
import { scalingForDepth, type DepthStats } from "../game/systems/depth";
import type {
  Enemy,
  EnemySpawn,
  Floor,
  GameState,
  GameStatus,
  Player,
  Vec2,
} from "../game/types";

export function createPlayer(spawn: Vec2 = { x: 0, y: 0 }): Player {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    aim: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    facing: 1,
    invulnerable: 0,
    hurtFlash: 0,
    dodgeTime: 0,
    dodgeCooldown: 0,
    dodgeDir: { x: 0, y: 0 },
    attacking: false,
    attackTime: 0,
    attackResolved: false,
    moving: false,
  };
}

/**
 * Creates a mob from its spawn and the floor's depth scaling. The melee and
 * ranged bases differ only in their chosen stats block.
 */
export function createEnemy(
  spawn: EnemySpawn,
  stats: DepthStats = scalingForDepth(1)[
    spawn.kind === "ranged" ? "ranged" : "melee"
  ],
): Enemy {
  const base = spawn.kind === "ranged" ? RANGED : MELEE;

  return {
    id: spawn.id,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    homeX: spawn.x,
    homeY: spawn.y,
    radius: base.radius,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
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
    fragments: PURIFICATION.angles.map(() => true),
    rested: false,
    respawn: 0,
    attackKind: null,
    damage: stats.damage,
    attackInterval: stats.attackInterval,
    bombDamage: stats.bombDamage,
    bombInterval: stats.bombInterval,
    bombCooldown: 0,
    emerging: 0,
  };
}

/** Creates the Floor Warden at its floor spawn. */
export function createBoss(
  floor: Floor,
  stats: DepthStats = scalingForDepth(floor.depth).boss,
  emerging = 0,
): Enemy {
  return {
    id: "floor-warden",
    kind: "boss",
    x: floor.bossSpawn.x,
    y: floor.bossSpawn.y,
    homeX: floor.bossSpawn.x,
    homeY: floor.bossSpawn.y,
    radius: BOSS.radius,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
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
    fragments: [],
    rested: false,
    respawn: 0,
    attackKind: null,
    damage: stats.damage,
    attackInterval: stats.attackInterval,
    bombDamage: stats.bombDamage,
    bombInterval: stats.bombInterval,
    bombCooldown: stats.bombInterval,
    emerging,
  };
}

export function createEnemies(floor: Floor): Enemy[] {
  const scaling = scalingForDepth(floor.depth);
  return floor.enemySpawns.map((spawn) =>
    createEnemy(spawn, spawn.kind === "ranged" ? scaling.ranged : scaling.melee),
  );
}

export function createInitialState(
  seed = 1,
  depth = 1,
  status: GameStatus = "playing",
): GameState {
  const floor = generateFloor(seed, depth);
  const player = createPlayer(floor.spawn);

  return {
    time: 0,
    status,
    player,
    enemies: createEnemies(floor),
    projectiles: [],
    bombs: [],
    nextProjectileId: 1,
    nextBombId: 1,
    hitstop: 0,
    camera: { x: 0, y: 0 },
    pointer: { x: player.x + 80, y: player.y - 80 },
    floor,
    run: {
      depth,
      spirit: 0,
      floorPurified: false,
      bossAwake: false,
      exitOpen: false,
      gateOpenedAt: null,
      shopClosed: false,
      skillPoints: 0,
      draughtCarried: false,
      vigorPurchased: false,
    },
    shop: {
      open: false,
      selection: 0,
      message: null,
      tone: "success",
      messageAt: 0,
    },
  };
}
