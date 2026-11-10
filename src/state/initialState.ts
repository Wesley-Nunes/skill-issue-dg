import { BOSS, MELEE, PLAYER, PURIFICATION, RANGED } from "../game/data/config";
import { generateFloor } from "../game/data/floor";
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
    comboStep: 0,
    comboTime: 0,
    comboHits: 0,
    comboResolved: false,
    comboHitThisStep: false,
    moving: false,
  };
}

export function createEnemy(spawn: EnemySpawn): Enemy {
  const ranged = spawn.kind === "ranged";
  const stats = ranged ? RANGED : MELEE;

  return {
    id: spawn.id,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    homeX: spawn.x,
    homeY: spawn.y,
    radius: stats.radius,
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
    bombCooldown: 0,
    emerging: 0,
  };
}

/** Creates the Floor Warden at its floor spawn. */
export function createBoss(floor: Floor, emerging = 0): Enemy {
  return {
    id: "floor-warden",
    kind: "boss",
    x: floor.bossSpawn.x,
    y: floor.bossSpawn.y,
    homeX: floor.bossSpawn.x,
    homeY: floor.bossSpawn.y,
    radius: BOSS.radius,
    hp: BOSS.maxHp,
    maxHp: BOSS.maxHp,
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
    bombCooldown: BOSS.bombCooldown,
    emerging,
  };
}

export function createEnemies(floor: Floor): Enemy[] {
  return floor.enemySpawns.map((spawn) => createEnemy(spawn));
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
