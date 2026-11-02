import {
  ENEMY,
  ENEMY_SPAWN,
  PLAYER,
  PLAYER_SPAWN,
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
    attackTime: -1,
    attackCooldown: 0,
    attackHit: false,
    moving: false,
  };
}

export function createEnemy(): Enemy {
  return {
    x: ENEMY_SPAWN.x,
    y: ENEMY_SPAWN.y,
    radius: ENEMY.radius,
    hp: ENEMY.maxHp,
    maxHp: ENEMY.maxHp,
    status: "alive",
    fade: 0,
    aggro: false,
    windup: 0,
    active: 0,
    attackCooldown: 0,
    attackHit: false,
    moving: false,
  };
}

export function createInitialState(): GameState {
  return {
    time: 0,
    status: "playing",
    player: createPlayer(),
    enemy: createEnemy(),
    camera: { x: 0, y: 0 },
    pointer: { x: PLAYER_SPAWN.x + 80, y: PLAYER_SPAWN.y - 80 },
  };
}
