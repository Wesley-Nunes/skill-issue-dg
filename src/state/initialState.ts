import {
  ENEMY_SPAWNS,
  MELEE,
  PLAYER,
  PLAYER_SPAWN,
  RANGED,
} from "../game/data/config";
import type { Enemy, GameState, Player } from "../game/types";

export function createPlayer(): Player {
  return {
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
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

export function createEnemy(
  spawn: (typeof ENEMY_SPAWNS)[number],
): Enemy {
  const ranged = spawn.kind === "ranged";
  const stats = ranged ? RANGED : MELEE;

  return {
    id: spawn.id,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
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
  };
}

export function createEnemies(): Enemy[] {
  return ENEMY_SPAWNS.map((spawn) => createEnemy(spawn));
}

export function createInitialState(): GameState {
  return {
    time: 0,
    status: "playing",
    player: createPlayer(),
    enemies: createEnemies(),
    projectiles: [],
    nextProjectileId: 1,
    hitstop: 0,
    camera: { x: 0, y: 0 },
    pointer: { x: PLAYER_SPAWN.x + 80, y: PLAYER_SPAWN.y - 80 },
    run: { skillPoints: 0, challengeEarned: false, roomCleared: false },
  };
}
