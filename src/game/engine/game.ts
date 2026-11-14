import {
  ATTACK,
  BOMB,
  BOSS,
  CAMERA,
  ECONOMY,
  HEAL_ON_DESCENT,
  PURIFICATION,
  SHOP,
  ZOOM,
} from "../data/config";
import {
  isInsideRect,
  isOnStairs,
  nextSeed,
  randomSeed,
} from "../data/floor";
import { advanceBomb, bombHitsPlayer, spawnBomb } from "../systems/bomb";
import {
  attackPhase,
  cancelAttack,
  isInAttackArc,
  markAttackResolved,
  tickAttack,
} from "../systems/attack";
import { clampCamera, updateCamera } from "../systems/camera";
import {
  damageEnemy,
  damagePlayer,
  knockbackEnemy,
  tickPlayerTimers,
} from "../systems/damage";
import { scalingForDepth } from "../systems/depth";
import { startDodge, tickDodgeTimers } from "../systems/dodge";
import { updateEnemy } from "../systems/enemy";
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
import { isInCombat, WARD_MESSAGE } from "../systems/safeRoom";
import {
  clampSelection,
  purchase,
  shopAvailable,
  shopRows,
  useDraught,
} from "../systems/shop";
import type {
  Bomb,
  DebugSnapshot,
  Enemy,
  GameEvent,
  GameState,
  InputFrame,
  Projectile,
  Rect,
  ShopItemId,
  Viewport,
} from "../types";
import { createBoss, createInitialState } from "../../state/initialState";

export interface ViewportSource {
  worldViewport(): Viewport;
}

export class Game {
  state: GameState;
  /** Last time a refused-entry message was shown; throttles held movement. */
  private wardMessageAt = -Infinity;

  constructor(
    private readonly viewportSource: ViewportSource,
    seed = randomSeed(),
  ) {
    this.state = createInitialState(seed, 1, "title");
    this.snapCamera();
  }

  /** Leaves the title screen. Does nothing once the run has started. */
  start(): GameEvent[] {
    if (this.state.status !== "title") return [];
    this.state.status = "playing";
    return [{ type: "run-started" }];
  }

  reset(): void {
    this.state = createInitialState(
      nextSeed(this.state.floor.seed),
      1,
      "playing",
    );
    this.wardMessageAt = -Infinity;
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
      this.state.floor,
    );
  }

  /** The closed arena gate blocks the player until the floor is purified. */
  private playerBlockers(): Rect[] {
    return this.state.run.floorPurified ? [] : [this.state.floor.gate];
  }

  /** Enemies also cannot cross into the safe shop room. */
  private enemyBlockers(): Rect[] {
    const blockers: Rect[] = [this.state.floor.shop.safe];
    if (!this.state.run.floorPurified) blockers.push(this.state.floor.gate);
    return blockers;
  }

  step(dt: number, input: InputFrame): GameEvent[] {
    if (this.state.status === "title") {
      return input.start ? this.start() : [];
    }

    if (this.state.status === "paused") {
      if (!input.pause) return [];
      this.state.status = "playing";
      return [{ type: "run-resumed" }];
    }

    if (this.state.status === "dead") {
      if (!input.restart) return [];
      this.reset();
      return [{ type: "run-reset" }];
    }

    // The shop panel is modal: Escape closes it instead of pausing, and the
    // rest of the world is frozen while it is open.
    if (this.state.shop.open) {
      return this.stepShop(dt, input);
    }

    if (input.pause) {
      this.state.status = "paused";
      return [{ type: "run-paused" }];
    }

    const events: GameEvent[] = [];
    const state = this.state;

    // A landed swing freezes the simulation briefly. Inputs during the freeze
    // are dropped rather than buffered.
    if (state.hitstop > 0) {
      state.hitstop = Math.max(0, state.hitstop - dt);
      return events;
    }

    if (input.interact) {
      this.handleInteract(events);
      if (state.shop.open) return events;
    }

    if (input.useDraught) {
      this.handleUseDraught(events);
    }

    let player = tickPlayerTimers(state.player, dt);
    let pressed = input.attack;

    if (input.dodge) {
      const dodging = startDodge(player, input.move);
      if (dodging !== player) {
        events.push({ type: "dodge-started", x: player.x, y: player.y });
        player = dodging.attacking ? cancelAttack(dodging) : dodging;
        // A dodge cancels the swing outright instead of starting a new one.
        pressed = false;
      }
    }

    const beforeMove = { x: player.x, y: player.y };
    player = movePlayer(
      player,
      input.move,
      dt,
      state.floor,
      this.playerBlockers(),
    );
    // The ward is one-way: it refuses entry while an enemy hunts but never
    // blocks a player who is already inside from leaving.
    const safe = state.floor.shop.safe;
    if (
      isInCombat(state.enemies) &&
      !isInsideRect(safe, beforeMove.x, beforeMove.y) &&
      isInsideRect(safe, player.x, player.y)
    ) {
      player = { ...player, x: beforeMove.x, y: beforeMove.y, moving: false };
      this.emitWardBlocked(events);
    }
    player = tickDodgeTimers(player, dt);
    player = {
      ...player,
      aim: input.aim,
      facing: input.aim.x < 0 ? -1 : 1,
    };

    const attack = tickAttack(player, pressed, dt);
    player = attack.player;
    if (attack.started) {
      events.push({
        type: "attack-started",
        angle: Math.atan2(player.aim.y, player.aim.x),
      });
    }

    if (attackPhase(player) === "active" && !player.attackResolved) {
      player = this.resolveAttack(player, events);
    }

    // Publish the ticked player before enemy logic so enemy damage applies to
    // the current position, health, and invulnerability timers.
    state.player = player;
    state.enemies = this.updateEnemies(player, dt, events);
    player = state.player;

    if (state.status !== "dead") {
      this.updateBombs(dt, events);
      player = state.player;
    }

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
      state.floor,
    );

    state.player = player;
    state.camera = updateCamera(state.camera, cameraTarget, dt, CAMERA.tau);
    state.pointer = input.pointer;
    state.time += dt;

    if (
      state.status === "playing" &&
      state.run.exitOpen &&
      isOnStairs(state.floor, player.x, player.y, player.radius)
    ) {
      this.descend(events);
    }

    return events;
  }

  /** Handles the modal shop. The world does not advance except its clock. */
  private stepShop(dt: number, input: InputFrame): GameEvent[] {
    const state = this.state;
    const events: GameEvent[] = [];
    state.time += dt;
    state.pointer = input.pointer;

    if (
      state.shop.message !== null &&
      state.time - state.shop.messageAt > SHOP.messageTime
    ) {
      state.shop.message = null;
    }

    if (input.pause) {
      this.closeShop(events);
      return events;
    }

    if (state.status !== "playing" || !shopAvailable(state.run)) {
      this.closeShop(events);
      return events;
    }

    const rows = shopRows(state.run);
    if (input.menuUp) {
      state.shop.selection = clampSelection(
        state.shop.selection - 1,
        rows.length,
      );
    }
    if (input.menuDown) {
      state.shop.selection = clampSelection(
        state.shop.selection + 1,
        rows.length,
      );
    }
    if (input.confirm) {
      const row = rows[clampSelection(state.shop.selection, rows.length)];
      if (row) this.buy(row.id, events);
    }

    return events;
  }

  private openShop(events: GameEvent[]): void {
    const state = this.state;
    state.shop.open = true;
    state.shop.selection = 0;
    state.shop.message = null;
    state.shop.messageAt = 0;
    events.push({ type: "shop-opened" });
  }

  private closeShop(events: GameEvent[]): void {
    if (!this.state.shop.open) return;
    this.state.shop.open = false;
    this.state.shop.message = null;
    events.push({ type: "shop-closed" });
  }

  /** Shows the refusal message at the threshold, throttled while pushing. */
  private emitWardBlocked(events: GameEvent[]): void {
    const state = this.state;
    if (state.time - this.wardMessageAt < SHOP.wardMessageCooldown) return;
    this.wardMessageAt = state.time;
    const threshold = state.floor.shop.threshold;
    events.push({
      type: "safe-room-blocked",
      x: threshold.x + threshold.width / 2,
      y: threshold.y + threshold.height / 2,
      message: WARD_MESSAGE,
    });
  }

  private buy(item: ShopItemId, events: GameEvent[]): void {
    const state = this.state;
    const outcome = purchase(state.run, item);
    state.run = outcome.run;
    state.shop.message = outcome.message;
    state.shop.tone = outcome.tone;
    state.shop.messageAt = state.time;

    if (outcome.success && outcome.maxHpGain > 0) {
      const maxHp = state.player.maxHp + outcome.maxHpGain;
      state.player = {
        ...state.player,
        maxHp,
        hp: Math.min(maxHp, state.player.hp + outcome.maxHpGain),
      };
      events.push({
        type: "vigor-purchased",
        x: state.player.x,
        y: state.player.y,
        maxHp,
      });
    }

    events.push({
      type: "shop-purchase",
      item,
      success: outcome.success,
      message: outcome.message,
    });

    state.shop.selection = clampSelection(
      state.shop.selection,
      shopRows(state.run).length,
    );
  }

  private handleUseDraught(events: GameEvent[]): void {
    const state = this.state;
    const outcome = useDraught(state.run, state.player);
    state.run = outcome.run;

    if (outcome.consumed) {
      state.player = { ...state.player, hp: outcome.hp };
      events.push({
        type: "player-healed",
        x: state.player.x,
        y: state.player.y,
        amount: outcome.healed,
      });
      events.push({
        type: "draught-used",
        x: state.player.x,
        y: state.player.y,
        healed: outcome.healed,
      });
      return;
    }

    events.push({
      type: "draught-blocked",
      x: state.player.x,
      y: state.player.y,
      reason: outcome.reason ?? "empty",
      message: outcome.message,
    });
  }

  /** `E` is the single context interact key for the stall and the altar. */
  private handleInteract(events: GameEvent[]): void {
    const state = this.state;
    const player = state.player;
    const floor = state.floor;

    if (isInsideRect(floor.shop.interaction, player.x, player.y)) {
      if (isInCombat(state.enemies)) {
        events.push({
          type: "shop-unavailable",
          x: player.x,
          y: player.y,
          message: WARD_MESSAGE,
        });
        return;
      }
      if (!shopAvailable(state.run)) {
        events.push({
          type: "shop-unavailable",
          x: player.x,
          y: player.y,
          message: "The shop is closed.",
        });
        return;
      }
      this.openShop(events);
      return;
    }

    const altarX = floor.altar.x + floor.altar.width / 2;
    const altarY = floor.altar.y + floor.altar.height / 2;
    if (
      Math.hypot(player.x - altarX, player.y - altarY) >
      SHOP.altarPromptRange
    ) {
      return;
    }

    if (!state.run.floorPurified) {
      events.push({
        type: "summon-blocked",
        x: player.x,
        y: player.y,
        message: "The arena is sealed.",
      });
      return;
    }

    if (state.run.bossAwake || state.run.exitOpen) return;
    this.summonBoss(events);
  }

  /**
   * Applies the current step to every fragment and enemy inside its arc.
   * Fragments resolve before damage so a final blow can break the last
   * fragment and put the mob to rest on the same swing.
   */
  private resolveAttack(player: GameState["player"], events: GameEvent[]) {
    const origin = { x: player.x, y: player.y };
    let hitAny = false;
    let restedAny = false;

    const enemies = this.state.enemies.map((enemy) => {
      if (enemy.status !== "alive") return enemy;

      const fragmentHit = breakFragmentsInArc(
        enemy,
        origin,
        player.aim,
        ATTACK.reach,
        ATTACK.halfAngle,
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
          ATTACK.reach,
          ATTACK.halfAngle,
        )
      ) {
        return next;
      }

      hitAny = true;
      const restable = canRest(next);
      const result = damageEnemy(next, ATTACK.damage);
      next = result.enemy;
      next = knockbackEnemy(
        next,
        player.aim,
        ATTACK.knockback,
        this.state.floor,
        this.enemyBlockers(),
      );

      events.push({
        type: "enemy-hit",
        x: enemy.x,
        y: enemy.y,
      });

      if (!result.died) return next;

      if (next.kind === "boss") {
        // The Warden never rests; its defeat is what opens the stairs.
        this.state.run.bossAwake = false;
        this.state.run.exitOpen = true;
        events.push({ type: "boss-defeated", x: enemy.x, y: enemy.y });
        if (!this.state.run.floorPurified) {
          // Defensive: a boss defeat should always follow purification.
          this.state.run.floorPurified = true;
        }
        this.state.run.skillPoints += ECONOMY.pointsPerWarden;
        events.push({
          type: "skill-points-earned",
          amount: ECONOMY.pointsPerWarden,
          total: this.state.run.skillPoints,
          x: enemy.x,
          y: enemy.y,
        });
        return next;
      }

      if (restable) {
        // The rite is complete: the mob rests permanently and yields spirit.
        next = { ...next, rested: true, respawn: 0 };
        restedAny = true;
        const gained = addSpirit(
          this.state.run.spirit,
          PURIFICATION.spiritPerMob,
        );
        this.state.run.spirit = gained.spirit;
        this.state.run.skillPoints += ECONOMY.pointsPerMob;
        events.push({
          type: "enemy-rested",
          x: enemy.x,
          y: enemy.y,
          spirit: gained.spirit,
        });
        events.push({
          type: "skill-points-earned",
          amount: ECONOMY.pointsPerMob,
          total: this.state.run.skillPoints,
          x: enemy.x,
          y: enemy.y,
        });
      } else {
        // A conventional kill is a failed rite; the mob will return.
        next = { ...next, rested: false, respawn: PURIFICATION.respawnDelay };
        events.push({ type: "enemy-died", x: enemy.x, y: enemy.y });
      }

      return next;
    });
    this.state.enemies = enemies;

    if (
      restedAny &&
      !this.state.run.floorPurified &&
      enemies
        .filter((enemy) => enemy.kind !== "boss")
        .every((enemy) => enemy.rested)
    ) {
      // Purification opens the arena gate but never summons the Warden.
      this.state.run.floorPurified = true;
      this.state.run.gateOpenedAt = this.state.time;
      events.push({ type: "floor-purified" });
    }

    const resolved = markAttackResolved(player);
    if (hitAny) this.state.hitstop = ATTACK.hitstop;

    return resolved;
  }

  /** Explicitly summons the floor's Warden once the arena is unlocked. */
  private summonBoss(events: GameEvent[]): boolean {
    const state = this.state;
    if (!state.run.floorPurified) return false;
    if (state.run.bossAwake || state.run.exitOpen) return false;
    if (state.enemies.some((enemy) => enemy.kind === "boss")) return false;

    const boss = createBoss(
      state.floor,
      scalingForDepth(state.floor.depth).boss,
      BOSS.emergence,
    );
    state.enemies = [...state.enemies, boss];
    state.run.bossAwake = true;
    state.run.exitOpen = false;
    state.run.shopClosed = true;
    if (state.shop.open) {
      state.shop.open = false;
      state.shop.message = null;
      events.push({ type: "shop-closed" });
    }
    events.push({ type: "boss-summoned", x: boss.x, y: boss.y });
    return true;
  }

  /**
   * Test-only shortcut exposed by the debug hook in dev and e2e builds. It
   * rests every mob and summons the Warden without simulating the ritual.
   */
  debugSummonBoss(): void {
    if (this.state.status !== "playing") return;
    this.debugRestMobs();
    this.summonBoss([]);
  }

  /** Test-only: rests every mob and awards the normal points. */
  debugRestMobs(): void {
    if (this.state.status !== "playing") return;
    const state = this.state;
    let awarded = 0;
    state.enemies = state.enemies.map((enemy) => {
      if (enemy.kind === "boss" || enemy.rested) return enemy;
      awarded += ECONOMY.pointsPerMob;
      return {
        ...enemy,
        hp: 0,
        status: "dead" as const,
        rested: true,
        respawn: 0,
        fragments: enemy.fragments.map(() => false),
      };
    });
    state.run.spirit = PURIFICATION.spiritThreshold;
    state.run.skillPoints += awarded;
    if (!state.run.floorPurified) {
      state.run.floorPurified = true;
      state.run.gateOpenedAt = state.time;
    }
  }

  /** Test-only: leaves one enemy one hit from a successful rest. */
  debugPrepareRest(id: string): void {
    const state = this.state;
    state.enemies = state.enemies.map((enemy) =>
      enemy.id === id
        ? {
            ...enemy,
            hp: 1,
            status: "alive" as const,
            rested: false,
            respawn: 0,
            fragments: enemy.fragments.map(() => false),
          }
        : enemy,
    );
  }

  /** Test-only: grants skill points without changing other run state. */
  debugGiveSkillPoints(amount: number): void {
    this.state.run.skillPoints = Math.max(
      0,
      this.state.run.skillPoints + Math.trunc(amount),
    );
  }

  /** Test-only: moves the player without simulating a walk. */
  debugTeleport(x: number, y: number): void {
    this.state.player = { ...this.state.player, x, y };
    this.snapCamera();
  }

  /** Test-only: sets one enemy's hunting flag for the ward rule. */
  debugSetEnemyAggro(id: string, aggro = true): void {
    this.state.enemies = this.state.enemies.map((enemy) =>
      enemy.id === id ? { ...enemy, aggro } : enemy,
    );
  }

  /** Test-only: unlocks the arena without summoning the Warden. */
  debugPrepareRite(): void {
    this.debugRestMobs();
  }

  /** Test-only: leaves the Warden one hit from defeat. */
  debugWeakenBoss(hp = 1): void {
    this.state.enemies = this.state.enemies.map((enemy) =>
      enemy.kind === "boss"
        ? {
            ...enemy,
            hp: Math.max(1, Math.min(hp, enemy.maxHp)),
            status: "alive" as const,
            emerging: 0,
          }
        : enemy,
    );
  }

  /** Test-only: sets the player's current HP within the legal range. */
  debugSetPlayerHp(hp: number): void {
    const state = this.state;
    state.player = {
      ...state.player,
      hp: Math.max(1, Math.min(hp, state.player.maxHp)),
      invulnerable: 0,
    };
  }

  /** Test-only: ends the run without waiting for enemy damage. */
  debugKillPlayer(): void {
    this.state.player = { ...this.state.player, hp: 0 };
    this.state.status = "dead";
  }

  /** Test-only: descends immediately using the normal descent rules. */
  debugDescend(): void {
    if (this.state.status !== "playing") return;
    this.descend([]);
  }

  private updateEnemies(
    player: GameState["player"],
    dt: number,
    events: GameEvent[],
  ): Enemy[] {
    const state = this.state;
    const target = { x: player.x, y: player.y };
    const blocked = this.enemyBlockers();

    return state.enemies.map((current) => {
      const revived = tickRespawn(current, dt);
      if (revived.respawned) {
        events.push({
          type: "enemy-respawned",
          x: revived.enemy.x,
          y: revived.enemy.y,
        });
      }

      const update = updateEnemy(
        revived.enemy,
        target,
        state.floor,
        dt,
        blocked,
      );
      const next = update.enemy;

      if (update.attackStarted) {
        if (next.kind === "boss") {
          events.push({
            type: "boss-attack-started",
            x: next.x,
            y: next.y,
            kind: next.attackKind ?? "melee",
          });
        } else if (next.kind === "ranged") {
          events.push({
            type: "enemy-telegraph-started",
            x: next.x,
            y: next.y,
            kind: "ranged",
          });
        } else {
          events.push({
            type: "enemy-attack-started",
            x: next.x,
            y: next.y,
          });
        }
      }

      if (update.bombTarget) {
        const bomb = spawnBomb(
          state.nextBombId,
          { x: next.x, y: next.y },
          update.bombTarget,
          next.bombDamage,
        );
        state.nextBombId += 1;
        state.bombs.push(bomb);
        events.push({
          type: "bomb-thrown",
          x: bomb.fromX,
          y: bomb.fromY,
          targetX: bomb.targetX,
          targetY: bomb.targetY,
        });
      }

      if (update.fired) {
        const projectile = spawnProjectile(
          state.nextProjectileId,
          { x: next.x, y: next.y },
          target,
          next.damage,
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

  private updateBombs(dt: number, events: GameEvent[]): void {
    const state = this.state;
    const remaining: Bomb[] = [];

    for (const bomb of state.bombs) {
      const advanced = advanceBomb(bomb, dt);
      if (advanced.landed) {
        events.push({
          type: "bomb-landed",
          x: advanced.bomb.x,
          y: advanced.bomb.y,
        });
      }

      if (advanced.exploded) {
        events.push({
          type: "bomb-exploded",
          x: advanced.bomb.x,
          y: advanced.bomb.y,
          radius: BOMB.blastRadius,
        });
        if (bombHitsPlayer(advanced.bomb, state.player)) {
          this.applyDamageToPlayer(advanced.bomb.damage, events);
        }
        continue;
      }

      remaining.push(advanced.bomb);
    }

    state.bombs = remaining;
  }

  private updateProjectiles(
    player: GameState["player"],
    dt: number,
    events: GameEvent[],
  ): Projectile[] {
    const remaining: Projectile[] = [];
    const blocked = this.playerBlockers();

    for (const projectile of this.state.projectiles) {
      const advanced = advanceProjectile(
        projectile,
        dt,
        this.state.floor,
        blocked,
      );
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
        this.applyDamageToPlayer(advanced.projectile.damage, events);
        continue;
      }

      remaining.push(advanced.projectile);
    }

    return remaining;
  }

  /**
   * Generates the next floor. Skill points, the carried draught, Vigor, and
   * the raised maximum HP persist; per-floor state resets.
   */
  private descend(events: GameEvent[]): void {
    const current = this.state;
    const depth = current.run.depth + 1;
    const seed = nextSeed(current.floor.seed);
    const next = createInitialState(seed, depth);
    const hp = Math.min(
      current.player.maxHp,
      current.player.hp + HEAL_ON_DESCENT,
    );
    next.player = {
      ...next.player,
      hp,
      maxHp: current.player.maxHp,
    };
    next.run = {
      ...next.run,
      skillPoints: current.run.skillPoints,
      draughtCarried: current.run.draughtCarried,
      vigorPurchased: current.run.vigorPurchased,
    };

    this.state = next;
    this.wardMessageAt = -Infinity;
    this.snapCamera();
    events.push({ type: "floor-descended", depth, seed });
    if (hp > current.player.hp) {
      events.push({
        type: "player-healed",
        x: next.player.x,
        y: next.player.y,
        amount: hp - current.player.hp,
      });
    }
  }

  /** Applies one damage instance, respecting invulnerability and death. */
  private applyDamageToPlayer(amount: number, events: GameEvent[]): void {
    const state = this.state;
    if (state.status === "dead") return;

    // The safe zone protects only between encounters. While a living enemy
    // hunts, damage applies inside it just like anywhere else.
    if (
      !isInCombat(state.enemies) &&
      isInsideRect(state.floor.shop.safe, state.player.x, state.player.y)
    ) {
      return;
    }

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

    const player = damaged.player;
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
      bombs,
      camera,
      pointer,
      time,
      status,
      hitstop,
      floor,
      run,
      shop,
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
        attacking: player.attacking,
        attackTime: player.attackTime,
        attackResolved: player.attackResolved,
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
        attackKind: enemy.attackKind,
        bombCooldown: enemy.bombCooldown,
        emerging: enemy.emerging,
      })),
      projectiles: projectiles.map((projectile) => ({
        x: projectile.x,
        y: projectile.y,
      })),
      bombs: bombs.map((bomb) => ({
        id: bomb.id,
        x: bomb.x,
        y: bomb.y,
        targetX: bomb.targetX,
        targetY: bomb.targetY,
        landed: bomb.landed,
        fuse: bomb.fuse,
      })),
      spirit: run.spirit,
      floorPurified: run.floorPurified,
      bossAwake: run.bossAwake,
      exitOpen: run.exitOpen,
      depth: run.depth,
      gateOpen: run.floorPurified,
      inCombat: isInCombat(enemies),
      summonAvailable:
        run.floorPurified && !run.bossAwake && !run.exitOpen,
      skillPoints: run.skillPoints,
      draughtCarried: run.draughtCarried,
      vigorPurchased: run.vigorPurchased,
      shopOpen: shop.open,
      shopClosed: run.shopClosed,
      shopSelection: shop.selection,
      shopMessage: shop.message,
      shopTone: shop.tone,
      shopRows: shopRows(run).map((row) => ({
        id: row.id,
        cost: row.cost,
        affordable: row.affordable,
        state: row.state,
        stateLabel: row.stateLabel,
      })),
      floor: {
        seed: floor.seed,
        depth: floor.depth,
        cols: floor.cols,
        rows: floor.rows,
        width: floor.width,
        height: floor.height,
        walkable: [...floor.walkable],
        spawn: { x: floor.spawn.x, y: floor.spawn.y },
        stairs: { ...floor.stairs },
        bossSpawn: { x: floor.bossSpawn.x, y: floor.bossSpawn.y },
        rooms: floor.rooms.map((room) => ({ ...room })),
        junction: { ...floor.junction },
        gate: { ...floor.gate },
        altar: { ...floor.altar },
        shop: {
          room: { ...floor.shop.room },
          stall: { ...floor.shop.stall },
          interaction: { ...floor.shop.interaction },
          safe: { ...floor.shop.safe },
          threshold: { ...floor.shop.threshold },
        },
      },
      camera: { x: camera.x, y: camera.y },
      pointer,
      viewport: view,
      zoom: ZOOM,
    };
  }
}
