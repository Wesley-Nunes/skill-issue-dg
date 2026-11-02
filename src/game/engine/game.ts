import { ATTACK, CAMERA, ROOM, ZOOM } from "../data/config";
import {
  attackPhase,
  isInAttackArc,
  tickAttack,
} from "../systems/attack";
import { clampCamera, updateCamera } from "../systems/camera";
import {
  damageEnemy,
  damagePlayer,
  tickPlayerTimers,
} from "../systems/damage";
import { startDodge, tickDodgeTimers } from "../systems/dodge";
import { updateEnemy } from "../systems/enemy";
import { movePlayer } from "../systems/movement";
import type {
  DebugSnapshot,
  GameEvent,
  GameState,
  InputFrame,
  Viewport,
} from "../types";
import { createInitialState } from "../../state/initialState";

export interface ViewportSource {
  worldViewport(): Viewport;
}

export class Game {
  state: GameState;

  constructor(private readonly viewportSource: ViewportSource) {
    this.state = createInitialState();
    this.snapCamera();
  }

  reset(): void {
    this.state = createInitialState();
    this.snapCamera();
  }

  private snapCamera(): void {
    const view = this.viewportSource.worldViewport();
    this.state.camera = clampCamera(
      {
        x: this.state.player.x - view.width / 2,
        y: this.state.player.y - view.height / 2,
      },
      view,
      ROOM,
    );
  }

  step(dt: number, input: InputFrame): GameEvent[] {
    if (this.state.status === "dead") {
      if (input.restart) this.reset();
      return [];
    }

    const events: GameEvent[] = [];
    let player = tickPlayerTimers(this.state.player, dt);

    if (input.dodge) {
      const dodging = startDodge(player, input.move);
      if (dodging !== player) {
        events.push({ type: "dodge-started", x: player.x, y: player.y });
      }
      player = dodging;
    }

    player = movePlayer(player, input.move, dt, ROOM);
    player = tickDodgeTimers(player, dt);
    player = {
      ...player,
      aim: input.aim,
      facing: input.aim.x < 0 ? -1 : 1,
    };

    const wasIdle = player.attackTime < 0;
    player = tickAttack(player, input.attack, dt);
    if (wasIdle && player.attackTime === 0) {
      events.push({
        type: "attack-started",
        angle: Math.atan2(player.aim.y, player.aim.x),
      });
    }

    if (
      attackPhase(player) === "active" &&
      !player.attackHit &&
      this.state.enemy.status === "alive"
    ) {
      const enemy = this.state.enemy;
      if (isInAttackArc({ x: player.x, y: player.y }, player.aim, enemy)) {
        const result = damageEnemy(enemy, ATTACK.damage);
        this.state.enemy = result.enemy;
        player = { ...player, attackHit: true };
        events.push({ type: "enemy-hit", x: enemy.x, y: enemy.y });
        if (result.died) {
          events.push({ type: "enemy-died", x: enemy.x, y: enemy.y });
        }
      }
    }

    const enemyUpdate = updateEnemy(
      this.state.enemy,
      { x: player.x, y: player.y },
      ROOM,
      dt,
    );
    this.state.enemy = enemyUpdate.enemy;

    if (enemyUpdate.attackStarted) {
      events.push({
        type: "enemy-attack-started",
        x: this.state.enemy.x,
        y: this.state.enemy.y,
      });
    }

    if (enemyUpdate.damageToPlayer > 0) {
      const damaged = damagePlayer(player, enemyUpdate.damageToPlayer);
      if (damaged.applied) {
        player = damaged.player;
        events.push({ type: "player-hit", x: player.x, y: player.y });
        if (damaged.died) {
          this.state.status = "dead";
          events.push({ type: "player-died" });
        }
      }
    }

    const view = this.viewportSource.worldViewport();
    const cameraTarget = clampCamera(
      {
        x: player.x - view.width / 2,
        y: player.y - view.height / 2,
      },
      view,
      ROOM,
    );
    const camera = updateCamera(
      this.state.camera,
      cameraTarget,
      dt,
      CAMERA.tau,
    );

    this.state.player = player;
    this.state.camera = camera;
    this.state.pointer = input.pointer;
    this.state.time += dt;

    return events;
  }

  snapshot(): DebugSnapshot {
    const view = this.viewportSource.worldViewport();
    const { player, enemy, camera, pointer, time, status } = this.state;

    return {
      time,
      status,
      player: {
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.maxHp,
        aimX: player.aim.x,
        aimY: player.aim.y,
        dodging: player.dodgeTime > 0,
        invulnerable: player.invulnerable,
      },
      enemy: {
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        status: enemy.status,
      },
      camera: { x: camera.x, y: camera.y },
      pointer,
      viewport: view,
      zoom: ZOOM,
    };
  }
}
