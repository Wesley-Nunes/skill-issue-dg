import { CAMERA, COMBO, PROJECTILE, PURIFICATION, ROOM, ZOOM } from "../data/config";
import {
  comboPhase,
  comboWindowOpen,
  markStepResolved,
  resetCombo,
  stepDefinition,
  tickCombo,
} from "../systems/combo";
import { isInAttackArc } from "../systems/attack";
import { clampCamera, updateCamera } from "../systems/camera";
import {
  damageEnemy,
  damagePlayer,
  knockbackEnemy,
  tickPlayerTimers,
} from "../systems/damage";
import { startDodge, tickDodgeTimers } from "../systems/dodge";
import { staggerEnemy, updateEnemy } from "../systems/enemy";
import { movePlayer } from "../systems/movement";
import {
  advanceProjectile,
  projectileHitsPlayer,
  spawnProjectile,
} from "../systems/projectile";
import {
  addSpirit,
  breakFragmentsInArc,
  canRest,
  restoreFragments,
  tickRespawn,
} from "../systems/purification";
import type {
  DebugSnapshot,
  Enemy,
  GameEvent,
  GameState,
  InputFrame,
  Projectile,
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
    if (this.state.status !== "playing") {
      if (input.restart) {
        this.reset();
        return [{ type: "run-reset" }];
      }
      return [];
    }

    const events: GameEvent[] = [];
    const state = this.state;

    // The finisher freezes the simulation briefly. Presses during the freeze
    // are dropped, not penalised: the chain window is frozen with the world.
    if (state.hitstop > 0) {
      state.hitstop = Math.max(0, state.hitstop - dt);
      return events;
    }

    let player = tickPlayerTimers(state.player, dt);
    let pressed = input.attack;

    if (input.dodge) {
      const dodging = startDodge(player, input.move);
      if (dodging !== player) {
        events.push({ type: "dodge-started", x: player.x, y: player.y });
        player = dodging.comboStep > 0 ? resetCombo(dodging) : dodging;
        // A dodge cancels the swing outright instead of starting a new one.
        pressed = false;
      }
    }

    player = movePlayer(player, input.move, dt, ROOM);
    player = tickDodgeTimers(player, dt);
    player = {
      ...player,
      aim: input.aim,
      facing: input.aim.x < 0 ? -1 : 1,
    };

    const combo = tickCombo(player, pressed, dt);
    player = combo.player;
    if (combo.started !== undefined) {
      events.push({
        type: "attack-started",
        angle: Math.atan2(player.aim.y, player.aim.x),
        step: combo.started,
      });
    }
    if (combo.ended !== undefined) {
      events.push({
        type: "combo-ended",
        reason: combo.ended,
        x: player.x,
        y: player.y,
      });
    }

    if (comboPhase(player) === "active" && !player.comboResolved) {
      player = this.resolveComboStep(player, events);
    }

    // Publish the ticked player before enemy logic so enemy damage applies to
    // the current position, health, and invulnerability timers.
    state.player = player;
    state.enemies = this.updateEnemies(player, dt, events);
    player = state.player;

    if (state.status !== "dead") {
      state.projectiles = this.updateProjectiles(player, dt, events);
      player = state.player;
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

    state.player = player;
    state.camera = updateCamera(state.camera, cameraTarget, dt, CAMERA.tau);
    state.pointer = input.pointer;
    state.time += dt;

    return events;
  }

  /**
   * Applies the current step to every fragment and enemy inside its arc.
   * Fragments resolve before damage so a final blow can break the last
   * fragment and put the mob to rest on the same swing.
   */
  private resolveComboStep(player: GameState["player"], events: GameEvent[]) {
    const definition = stepDefinition(player.comboStep);
    const finisher = player.comboStep === 3;
    const origin = { x: player.x, y: player.y };
    let hitAny = false;

    this.state.enemies = this.state.enemies.map((enemy) => {
      if (enemy.status !== "alive") return enemy;

      const fragmentHit = breakFragmentsInArc(
        enemy,
        origin,
        player.aim,
        definition.reach,
        definition.halfAngle,
      );
      let next = fragmentHit.enemy;
      if (fragmentHit.broken.length > 0) {
        hitAny = true;
        for (const position of fragmentHit.broken) {
          events.push({
            type: "fragment-broken",
            x: position.x,
            y: position.y,
          });
        }
      }

      if (
        !isInAttackArc(
          origin,
          player.aim,
          enemy,
          definition.reach,
          definition.halfAngle,
        )
      ) {
        return next;
      }

      hitAny = true;
      const restable = canRest(next);
      const result = damageEnemy(next, definition.damage);
      next = result.enemy;
      if (finisher) {
        next = staggerEnemy(next, COMBO.stagger);
        next = knockbackEnemy(next, player.aim, COMBO.knockback, ROOM);
      }

      events.push({
        type: "enemy-hit",
        x: enemy.x,
        y: enemy.y,
        finisher,
      });

      if (!result.died) return next;

      if (restable) {
        // The rite is complete: the mob rests permanently and yields spirit.
        next = { ...next, rested: true, respawn: 0 };
        const gained = addSpirit(this.state.run.spirit, PURIFICATION.spiritPerMob);
        this.state.run.spirit = gained.spirit;
        events.push({
          type: "enemy-rested",
          x: enemy.x,
          y: enemy.y,
          spirit: gained.spirit,
        });

        if (gained.purified && !this.state.run.floorPurified) {
          this.state.run.floorPurified = true;
          this.state.status = "purified";
          events.push({ type: "floor-purified" });
        }
      } else {
        // A conventional kill is a failed rite; the mob will return.
        next = { ...next, rested: false, respawn: PURIFICATION.respawnDelay };
        events.push({ type: "enemy-died", x: enemy.x, y: enemy.y });
      }

      return next;
    });

    const resolved = markStepResolved(player, hitAny);
    if (finisher && hitAny) this.state.hitstop = COMBO.hitstop;

    return resolved;
  }

  private updateEnemies(
    player: GameState["player"],
    dt: number,
    events: GameEvent[],
  ): Enemy[] {
    const state = this.state;
    const target = { x: player.x, y: player.y };

    return state.enemies.map((current) => {
      const revived = tickRespawn(current, dt);
      if (revived.respawned) {
        events.push({
          type: "enemy-respawned",
          x: revived.enemy.x,
          y: revived.enemy.y,
        });
      }

      const update = updateEnemy(revived.enemy, target, ROOM, dt);
      const next = update.enemy;

      if (update.attackStarted) {
        events.push(
          next.kind === "ranged"
            ? {
                type: "enemy-telegraph-started",
                x: next.x,
                y: next.y,
                kind: "ranged",
              }
            : { type: "enemy-attack-started", x: next.x, y: next.y },
        );
      }

      if (update.fired) {
        const projectile = spawnProjectile(
          state.nextProjectileId,
          { x: next.x, y: next.y },
          target,
        );
        state.nextProjectileId += 1;
        state.projectiles.push(projectile);
        events.push({
          type: "projectile-fired",
          x: projectile.x,
          y: projectile.y,
          angle: Math.atan2(projectile.vy, projectile.vx),
        });
      }

      if (update.damageToPlayer > 0) {
        this.applyDamageToPlayer(update.damageToPlayer, events);
      }

      return next;
    });
  }

  private updateProjectiles(
    player: GameState["player"],
    dt: number,
    events: GameEvent[],
  ): Projectile[] {
    const remaining: Projectile[] = [];

    for (const projectile of this.state.projectiles) {
      const advanced = advanceProjectile(projectile, dt, ROOM);
      if (advanced.wallHit) {
        events.push({
          type: "projectile-blocked",
          x: advanced.projectile.x,
          y: advanced.projectile.y,
        });
        continue;
      }
      if (advanced.expired) continue;

      if (projectileHitsPlayer(advanced.projectile, player)) {
        events.push({
          type: "projectile-hit",
          x: advanced.projectile.x,
          y: advanced.projectile.y,
        });
        this.applyDamageToPlayer(PROJECTILE.damage, events);
        continue;
      }

      remaining.push(advanced.projectile);
    }

    return remaining;
  }

  /** Applies one damage instance, respecting invulnerability and death. */
  private applyDamageToPlayer(amount: number, events: GameEvent[]): void {
    const state = this.state;
    if (state.status === "dead") return;

    const damaged = damagePlayer(state.player, amount);
    if (!damaged.applied) return;

    // Losing HP breaks the rite: every broken fragment returns. A dodge or an
    // i-frame that prevents the HP loss never reaches this point.
    state.enemies = state.enemies.map((enemy) => {
      const restored = restoreFragments(enemy);
      if (restored === enemy) return enemy;
      events.push({
        type: "fragments-restored",
        x: enemy.x,
        y: enemy.y,
      });
      return restored;
    });

    let player = damaged.player;
    if (player.comboStep > 0) {
      // Taking damage ends the chain. A swing already resolved in its active
      // window still landed, so only the remaining chain is lost.
      if (!damaged.died) {
        events.push({
          type: "combo-ended",
          reason: "damage",
          x: player.x,
          y: player.y,
        });
      }
      player = resetCombo(player);
    }

    state.player = player;
    events.push({
      type: "player-hit",
      x: player.x,
      y: player.y,
    });
    if (damaged.died) {
      state.status = "dead";
      events.push({ type: "player-died" });
    }
  }

  snapshot(): DebugSnapshot {
    const view = this.viewportSource.worldViewport();
    const {
      player,
      enemies,
      projectiles,
      camera,
      pointer,
      time,
      status,
      hitstop,
      run,
    } = this.state;

    return {
      time,
      status,
      hitstop,
      player: {
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.maxHp,
        aimX: player.aim.x,
        aimY: player.aim.y,
        dodging: player.dodgeTime > 0,
        invulnerable: player.invulnerable,
        comboStep: player.comboStep,
        comboHits: player.comboHits,
        comboResolved: player.comboResolved,
        comboHitThisStep: player.comboHitThisStep,
        comboWindowOpen: comboWindowOpen(player),
      },
      enemies: enemies.map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        status: enemy.status,
        fragments: [...enemy.fragments],
        rested: enemy.rested,
        respawn: enemy.respawn,
      })),
      projectiles: projectiles.map((projectile) => ({
        x: projectile.x,
        y: projectile.y,
      })),
      spirit: run.spirit,
      floorPurified: run.floorPurified,
      camera: { x: camera.x, y: camera.y },
      pointer,
      viewport: view,
      zoom: ZOOM,
    };
  }
}
