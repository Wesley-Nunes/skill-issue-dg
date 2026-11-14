import { describe, expect, it } from "vitest";
import { ATTACK, BOMB, MELEE, PURIFICATION } from "../data/config";
import { isInsideRect, nextSeed } from "../data/floor";
import { createEnemy, createInitialState } from "../../state/initialState";
import { spawnBomb } from "../systems/bomb";
import { scalingForDepth } from "../systems/depth";
import { fragmentPosition } from "../systems/purification";
import { WARD_MESSAGE } from "../systems/safeRoom";
import type { GameEvent, InputFrame } from "../types";
import { Game } from "./game";

const SEED = 12345;
const VIEWPORT = { width: 480, height: 270 };
const DEPTH1 = scalingForDepth(1);

function createGame(seed = SEED): Game {
  const game = new Game({ worldViewport: () => VIEWPORT }, seed);
  game.start();
  return game;
}

function idle(overrides: Partial<InputFrame> = {}): InputFrame {
  return {
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    attack: false,
    dodge: false,
    restart: false,
    start: false,
    pause: false,
    mute: false,
    interact: false,
    useDraught: false,
    menuUp: false,
    menuDown: false,
    confirm: false,
    gesture: false,
    pointer: { x: 0, y: 0 },
    ...overrides,
  };
}

type InputSource = Partial<InputFrame> | ((frame: number) => Partial<InputFrame>);

function stepFor(
  game: Game,
  seconds: number,
  input: InputSource,
  dt = 0.01,
): GameEvent[] {
  const events: GameEvent[] = [];
  const frames = Math.round(seconds / dt);
  for (let frame = 0; frame < frames; frame += 1) {
    const frameInput = typeof input === "function" ? input(frame) : input;
    events.push(...game.step(dt, idle(frameInput)));
  }
  return events;
}

function pressOn(presses: number[]): (frame: number) => Partial<InputFrame> {
  return (frame) => ({ attack: presses.includes(frame) });
}

/** Puts one held melee enemy in front of the player and clears the rest. */
function duel(game: Game) {
  const [first, ...rest] = game.state.enemies;
  game.state.enemies = [
    {
      ...first!,
      x: game.state.player.x + 20,
      y: game.state.player.y,
      stagger: 9,
    },
    ...rest.map((enemy) => ({ ...enemy, status: "dead" as const, hp: 0 })),
  ];
}

describe("Game", () => {
  it("starts on a generated floor with three enemies at their spawns", () => {
    const game = createGame();
    expect(game.state.status).toBe("playing");
    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemies).toHaveLength(3);
    expect(game.state.enemies.map((enemy) => enemy.kind)).toEqual([
      "melee",
      "melee",
      "melee",
    ]);
    expect(game.state.enemies.map((enemy) => [enemy.x, enemy.y])).toEqual(
      game.state.floor.enemySpawns.map((spawn) => [spawn.x, spawn.y]),
    );
    expect(
      game.state.enemies.every(
        (enemy) =>
          enemy.fragments.length === PURIFICATION.angles.length &&
          enemy.fragments.every(Boolean),
      ),
    ).toBe(true);
    expect(game.state.run).toEqual({
      depth: 1,
      spirit: 0,
      floorPurified: false,
      bossAwake: false,
      exitOpen: false,
      gateOpenedAt: null,
      shopClosed: false,
      skillPoints: 0,
      draughtCarried: false,
      vigorPurchased: false,
    });
    expect(game.state.shop.open).toBe(false);
    expect(game.state.floor.rooms).toHaveLength(6);
    expect(game.state.camera).toEqual({
      x: Math.min(
        Math.max(game.state.floor.spawn.x - VIEWPORT.width / 2, 0),
        game.state.floor.width - VIEWPORT.width,
      ),
      y: Math.min(
        Math.max(game.state.floor.spawn.y - VIEWPORT.height / 2, 0),
        game.state.floor.height - VIEWPORT.height,
      ),
    });
  });

  it("deals one swing's damage once when the enemy is inside the arc", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 0.35, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(DEPTH1.melee.maxHp - ATTACK.damage);
    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
    expect(events.some((event) => event.type === "attack-started")).toBe(true);
  });

  it("produces exactly one swing from a single press", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 0.6, (frame) => ({ attack: frame === 0 }));

    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
    expect(
      events.filter((event) => event.type === "attack-started"),
    ).toHaveLength(1);
    expect(game.state.player.attacking).toBe(false);
  });

  it("ignores a press made during the committed swing", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(
      game,
      0.3,
      (frame) => ({ attack: frame === 0 || frame === 15 }),
    );

    expect(
      events.filter((event) => event.type === "attack-started"),
    ).toHaveLength(1);
    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
  });

  it("starts a new swing only after the recovery completes", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 1, pressOn([0, 80]));

    expect(
      events.filter((event) => event.type === "attack-started"),
    ).toHaveLength(2);
    expect(game.state.enemies[0]?.hp).toBe(
      DEPTH1.melee.maxHp - ATTACK.damage * 2,
    );
  });

  it("breaks every intact fragment inside the swing arc", () => {
    const game = createGame();
    const [first, ...rest] = game.state.enemies;
    game.state.enemies = [
      {
        ...first!,
        x: game.state.player.x,
        y: game.state.player.y,
        stagger: 9,
      },
      ...rest.map((enemy) => ({ ...enemy, status: "dead" as const, hp: 0 })),
    ];

    const events = stepFor(game, 0.15, (frame) => ({
      attack: frame === 0,
      aim: { x: 0, y: -1 },
    }));

    expect(game.state.enemies[0]?.fragments).toEqual([false, false]);
    expect(
      events.filter((event) => event.type === "fragment-broken"),
    ).toHaveLength(PURIFICATION.angles.length);
  });

  it("counts a fragment break as a landed swing when the body is out of arc", () => {
    const game = createGame();
    const [first, ...rest] = game.state.enemies;
    game.state.enemies = [
      {
        ...first!,
        x: game.state.player.x,
        y: game.state.player.y + 40,
        stagger: 9,
      },
      ...rest.map((enemy) => ({ ...enemy, status: "dead" as const, hp: 0 })),
    ];

    const fragment = fragmentPosition(game.state.enemies[0]!, 0);
    const dx = fragment.x - game.state.player.x;
    const dy = fragment.y - game.state.player.y;
    const length = Math.hypot(dx, dy);
    const aim = { x: dx / length, y: dy / length };

    const events = stepFor(game, 0.15, (frame) => ({
      attack: frame === 0,
      aim,
    }));

    expect(game.state.enemies[0]?.hp).toBe(DEPTH1.melee.maxHp);
    expect(events.some((event) => event.type === "enemy-hit")).toBe(false);
    expect(
      events.some((event) => event.type === "fragment-broken"),
    ).toBe(true);
    expect(game.state.player.attackResolved).toBe(true);
  });

  it("respawns a conventionally killed mob with its fragments restored", () => {
    const game = createGame();
    duel(game);
    const home = {
      x: game.state.enemies[0]!.homeX,
      y: game.state.enemies[0]!.homeY,
    };
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      // At the reach edge the body is hittable but its offset fragments are
      // not, so the killing blow is a conventional death, not a rite.
      x: game.state.player.x + ATTACK.reach,
      hp: ATTACK.damage,
    };

    stepFor(game, 0.15, pressOn([0]));

    expect(game.state.enemies[0]?.status).toBe("dying");
    expect(game.state.enemies[0]?.rested).toBe(false);
    expect(game.state.enemies[0]?.respawn).toBeCloseTo(
      PURIFICATION.respawnDelay,
      5,
    );
    expect(game.state.run.spirit).toBe(0);
    expect(game.state.run.exitOpen).toBe(false);

    const events = stepFor(game, 2.6, {});

    const revived = game.state.enemies[0]!;
    expect(events.some((event) => event.type === "enemy-respawned")).toBe(true);
    expect(revived.status).toBe("alive");
    expect(revived.hp).toBe(DEPTH1.melee.maxHp);
    expect(revived.fragments).toEqual([true, true]);
    expect([revived.x, revived.y]).toEqual([home.x, home.y]);
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.run.floorPurified).toBe(false);
  });

  it("puts a fully broken mob to rest and grants spirit", () => {
    const game = createGame();
    duel(game);
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      hp: ATTACK.damage,
      fragments: [false, false],
    };

    const events = stepFor(game, 0.15, pressOn([0]));

    const rested = game.state.enemies[0]!;
    expect(rested.rested).toBe(true);
    expect(rested.respawn).toBe(0);
    expect(game.state.run.spirit).toBe(PURIFICATION.spiritPerMob);
    expect(events.some((event) => event.type === "enemy-rested")).toBe(true);
    expect(events.some((event) => event.type === "enemy-died")).toBe(false);

    stepFor(game, 3, {});
    expect(game.state.enemies[0]?.status).toBe("dead");
    expect(game.state.enemies[0]?.rested).toBe(true);
  });

  it("restores every broken fragment when the player loses HP", () => {
    const game = createGame();
    duel(game);
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      hp: DEPTH1.melee.maxHp - 2,
      fragments: [false, false],
    };
    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 2,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1.6,
      },
    ];

    const events = stepFor(game, 0.02, {});

    expect(game.state.player.hp).toBe(5);
    expect(game.state.enemies[0]?.fragments).toEqual([true, true]);
    expect(
      events.some((event) => event.type === "fragments-restored"),
    ).toBe(true);
  });

  it("keeps fragments broken when invulnerability blocks the HP loss", () => {
    const game = createGame();
    duel(game);
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      fragments: [false, false],
    };
    game.state.player = { ...game.state.player, invulnerable: 1 };
    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 2,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1.6,
      },
    ];

    const events = stepFor(game, 0.02, {});

    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemies[0]?.fragments).toEqual([false, false]);
    expect(
      events.some((event) => event.type === "fragments-restored"),
    ).toBe(false);
  });

  it("rests the last mob, awards a point, and unlocks the arena without summoning", () => {
    const game = createGame();
    duel(game);
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            hp: ATTACK.damage,
            fragments: [false, false],
          }
        : { ...enemy, status: "dead", hp: 0, rested: true },
    );
    game.state.run.spirit = PURIFICATION.spiritThreshold - 10;
    const points = game.state.run.skillPoints;

    const events = stepFor(game, 0.15, pressOn([0]));

    expect(game.state.run.spirit).toBe(PURIFICATION.spiritThreshold);
    expect(game.state.run.floorPurified).toBe(true);
    expect(game.state.run.bossAwake).toBe(false);
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.run.gateOpenedAt).not.toBeNull();
    expect(game.state.run.skillPoints).toBe(points + 1);
    expect(game.state.status).toBe("playing");
    expect(events.some((event) => event.type === "floor-purified")).toBe(true);
    expect(events.some((event) => event.type === "boss-summoned")).toBe(false);
    expect(events.some((event) => event.type === "skill-points-earned")).toBe(
      true,
    );
    expect(
      game.state.enemies.filter((enemy) => enemy.kind === "boss"),
    ).toHaveLength(0);
  });

  it("summons the Warden only through the explicit altar interaction", () => {
    const game = createGame();
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
      rested: true,
    }));
    game.state.run.floorPurified = true;
    game.state.run.spirit = PURIFICATION.spiritThreshold;
    const altar = game.state.floor.altar;
    game.state.player = {
      ...game.state.player,
      x: altar.x + altar.width / 2,
      y: altar.y + altar.height / 2,
    };

    const events = game.step(0.01, idle({ interact: true }));

    expect(events.some((event) => event.type === "boss-summoned")).toBe(true);
    expect(game.state.run.bossAwake).toBe(true);
    expect(game.state.run.shopClosed).toBe(true);
    expect(game.state.run.exitOpen).toBe(false);
    const bosses = game.state.enemies.filter((enemy) => enemy.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect([bosses[0]!.x, bosses[0]!.y]).toEqual([
      game.state.floor.bossSpawn.x,
      game.state.floor.bossSpawn.y,
    ]);
    expect(bosses[0]!.emerging).toBeGreaterThan(0);
  });

  it("blocks a summon before the arena is purified", () => {
    const game = createGame();
    const altar = game.state.floor.altar;
    game.state.player = {
      ...game.state.player,
      x: altar.x + altar.width / 2,
      y: altar.y + altar.height / 2,
    };

    const events = game.step(0.01, idle({ interact: true }));

    expect(events.some((event) => event.type === "summon-blocked")).toBe(true);
    expect(game.state.run.bossAwake).toBe(false);
    expect(
      game.state.enemies.filter((enemy) => enemy.kind === "boss"),
    ).toHaveLength(0);
  });

  it("keeps the stairs locked until every enemy is rested", () => {
    const game = createGame();
    const stairs = game.state.floor.stairs;
    game.state.player = {
      ...game.state.player,
      x: stairs.x + stairs.width / 2,
      y: stairs.y + stairs.height / 2,
    };

    stepFor(game, 0.1, {});

    expect(game.state.run.floorPurified).toBe(false);
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.run.depth).toBe(1);
  });

  it("descends to a new floor on open stairs and preserves HP", () => {
    const game = createGame();
    const oldSeed = game.state.floor.seed;
    const stairs = game.state.floor.stairs;
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead",
      hp: 0,
      rested: true,
    }));
    game.state.run.floorPurified = true;
    game.state.run.exitOpen = true;
    game.state.run.spirit = 80;
    game.state.player = {
      ...game.state.player,
      hp: 3,
      x: stairs.x + stairs.width / 2,
      y: stairs.y + stairs.height / 2,
    };

    const events = stepFor(game, 0.02, {});

    expect(events.some((event) => event.type === "floor-descended")).toBe(true);
    expect(game.state.status).toBe("playing");
    expect(game.state.run.depth).toBe(2);
    expect(game.state.floor.depth).toBe(2);
    expect(game.state.floor.seed).toBe(nextSeed(oldSeed));
    expect(game.state.run.spirit).toBe(0);
    expect(game.state.run.floorPurified).toBe(false);
    expect(game.state.run.bossAwake).toBe(false);
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.player.hp).toBe(5);
    expect(game.state.enemies).toHaveLength(3);
    expect(game.state.projectiles).toHaveLength(0);
    expect(events.some((event) => event.type === "player-healed")).toBe(true);
  });

  it("leaves the enemy untouched when the swing misses", () => {
    const game = createGame();
    const [first, ...rest] = game.state.enemies;
    game.state.enemies = [
      { ...first!, x: game.state.player.x - 20, y: game.state.player.y },
      ...rest,
    ];

    stepFor(game, 0.5, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(DEPTH1.melee.maxHp);
    expect(game.state.enemies[0]?.fragments).toEqual([true, true]);
  });

  it("hits every enemy inside the arc once per swing", () => {
    const game = createGame();
    const [first, second, third] = game.state.enemies;
    game.state.enemies = [
      { ...first!, x: game.state.player.x + 20, y: game.state.player.y, stagger: 9 },
      { ...second!, x: game.state.player.x + 20, y: game.state.player.y + 8, stagger: 9 },
      { ...third!, status: "dead", hp: 0 },
    ];

    stepFor(game, 0.35, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(DEPTH1.melee.maxHp - 2);
    expect(game.state.enemies[1]?.hp).toBe(DEPTH1.melee.maxHp - 2);
  });

  it("applies knockback and hitstop on a landed swing", () => {
    const game = createGame();
    duel(game);

    stepFor(game, 0.15, pressOn([0]));

    const enemy = game.state.enemies[0]!;
    expect(enemy.hp).toBe(DEPTH1.melee.maxHp - ATTACK.damage);
    expect(enemy.x).toBeGreaterThan(game.state.player.x + 20);
    expect(game.state.hitstop).toBeGreaterThan(0);
  });

  it("pauses the simulation during hitstop", () => {
    const game = createGame();
    game.state.hitstop = 0.06;
    const time = game.state.time;
    const playerX = game.state.player.x;

    stepFor(game, 0.03, { move: { x: 1, y: 0 } });

    expect(game.state.time).toBe(time);
    expect(game.state.player.x).toBe(playerX);
    expect(game.state.hitstop).toBeCloseTo(0.03, 5);
  });

  it("drops presses made during hitstop instead of buffering them", () => {
    const game = createGame();
    game.state.hitstop = 0.06;
    game.state.player = {
      ...game.state.player,
      attacking: true,
      attackTime: 0.2,
      attackResolved: true,
    };

    const events = stepFor(game, 0.01, { attack: true });

    expect(game.state.player.attacking).toBe(true);
    expect(game.state.player.attackTime).toBe(0.2);
    expect(events.some((event) => event.type === "attack-started")).toBe(false);
    expect(game.state.hitstop).toBeCloseTo(0.05, 5);
  });

  it("never interrupts the Warden's telegraph with a landed swing", () => {
    const game = createGame();
    game.debugSummonBoss();
    const index = game.state.enemies.findIndex(
      (enemy) => enemy.kind === "boss",
    );
    const boss = game.state.enemies[index]!;
    game.state.enemies[index] = {
      ...boss,
      x: game.state.player.x + 20,
      y: game.state.player.y,
      emerging: 0,
      windup: 0.3,
      attackKind: "melee",
      active: 0,
      attackHit: false,
      stagger: 0,
    };

    stepFor(game, 0.15, pressOn([0]));

    const hit = game.state.enemies[index]!;
    expect(hit.hp).toBe(DEPTH1.boss.maxHp - ATTACK.damage);
    expect(hit.stagger).toBe(0);
    expect(hit.attackKind).toBe("melee");
    expect(hit.windup).toBeGreaterThan(0);
  });

  it("spawns a projectile after the ranged telegraph and damages the player", () => {
    const game = createGame();
    const ranged = createEnemy(
      { id: "ranged-test", kind: "ranged", x: 0, y: 0 },
      scalingForDepth(1).ranged,
    );
    const start = game.state.floor.rooms[0]!;
    game.state.player = {
      ...game.state.player,
      x: start.x + 30,
      y: game.state.floor.spawn.y,
    };
    game.state.enemies = [
      { ...game.state.enemies[0]!, status: "dead", hp: 0 },
      { ...game.state.enemies[1]!, status: "dead", hp: 0 },
      {
        ...ranged,
        x: game.state.player.x + 150,
        y: game.state.player.y,
        attackCooldown: 0,
      },
    ];

    const events = stepFor(game, 0.55, {});
    expect(events.some((event) => event.type === "enemy-telegraph-started")).toBe(
      true,
    );
    expect(game.state.projectiles).toHaveLength(1);

    stepFor(game, 1.1, {});
    expect(game.state.player.hp).toBe(5);
    expect(game.state.projectiles).toHaveLength(0);
  });

  it("lets a dodge avoid a projectile entirely", () => {
    const game = createGame();
    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 20,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1.6,
      },
    ];

    game.step(0.01, idle({ dodge: true }));
    stepFor(game, 0.3, {});

    expect(game.state.player.hp).toBe(6);
  });

  it("blocks projectile damage during invulnerability", () => {
    const game = createGame();
    game.state.player = { ...game.state.player, invulnerable: 1 };
    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 8,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1.6,
      },
    ];

    stepFor(game, 0.01, {});

    expect(game.state.player.hp).toBe(6);
    expect(game.state.projectiles).toHaveLength(0);
  });

  it("keeps fragments broken when a dodge avoids the projectile", () => {
    const game = createGame();
    duel(game);
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      fragments: [false, false],
    };
    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 20,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1.6,
      },
    ];

    game.step(0.01, idle({ dodge: true }));
    stepFor(game, 0.3, {});

    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemies[0]?.fragments).toEqual([false, false]);
  });

  it("kills the player at 0 HP and restarts on R", () => {
    const game = createGame();
    game.state.player = { ...game.state.player, hp: 1, invulnerable: 0 };
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      x: game.state.player.x + 10,
      y: game.state.player.y,
      active: MELEE.active,
      attackHit: false,
    };

    const events = stepFor(game, 0.05, {});

    expect(game.state.player.hp).toBe(0);
    expect(game.state.status).toBe("dead");
    expect(events.some((event) => event.type === "player-died")).toBe(true);

    const restartEvents = game.step(0.01, idle({ restart: true }));

    expect(restartEvents.some((event) => event.type === "run-reset")).toBe(true);
    expect(game.state.status).toBe("playing");
    expect(game.state.player.hp).toBe(6);
    expect(game.state.run.depth).toBe(1);
    expect(game.state.floor.seed).toBe(nextSeed(SEED));
    expect(game.state.enemies).toHaveLength(3);
    expect(
      game.state.enemies.every(
        (enemy) => enemy.fragments.every(Boolean) && !enemy.rested,
      ),
    ).toBe(true);
  });

  it("restores spirit, fragments, attack state, and projectiles on restart", () => {
    const game = createGame();
    game.state.run = {
      depth: 1,
      spirit: 80,
      floorPurified: false,
      bossAwake: false,
      exitOpen: false,
      gateOpenedAt: null,
      shopClosed: false,
      skillPoints: 4,
      draughtCarried: true,
      vigorPurchased: true,
    };
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      fragments: [false, false],
    };
    game.state.projectiles = [
      {
        id: 4,
        x: 100,
        y: 100,
        vx: 10,
        vy: 0,
        radius: 4,
        damage: 1,
        life: 1,
      },
    ];
    game.state.player = {
      ...game.state.player,
      hp: 0,
      attacking: true,
      attackTime: 0.2,
      attackResolved: true,
    };
    game.state.status = "dead";

    game.step(0.01, idle({ restart: true }));

    expect(game.state.run).toEqual({
      depth: 1,
      spirit: 0,
      floorPurified: false,
      bossAwake: false,
      exitOpen: false,
      gateOpenedAt: null,
      shopClosed: false,
      skillPoints: 0,
      draughtCarried: false,
      vigorPurchased: false,
    });
    expect(game.state.projectiles).toHaveLength(0);
    expect(game.state.player.attacking).toBe(false);
    expect(game.state.player.attackTime).toBe(0);
    expect(game.state.player.attackResolved).toBe(false);
    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemies[0]?.fragments).toEqual([true, true]);
  });

  it("ignores gameplay input while dead", () => {
    const game = createGame();
    game.state.status = "dead";
    const x = game.state.player.x;

    stepFor(game, 0.1, { move: { x: 1, y: 0 } });

    expect(game.state.player.x).toBe(x);
    expect(game.state.status).toBe("dead");
  });

  it("does not apply enemy damage while the player is invulnerable", () => {
    const game = createGame();
    game.state.player = { ...game.state.player, invulnerable: 0.5 };
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      x: game.state.player.x + 10,
      y: game.state.player.y,
      active: MELEE.active,
      attackHit: false,
    };

    stepFor(game, 0.05, {});

    expect(game.state.player.hp).toBe(6);
  });

  it("keeps the camera inside the floor", () => {
    const game = createGame();
    game.state.player = {
      ...game.state.player,
      x: game.state.floor.width - 6,
      y: game.state.floor.height - 6,
    };

    stepFor(game, 3, {});

    expect(game.state.camera.x).toBeCloseTo(game.state.floor.width - 480, 3);
    expect(game.state.camera.y).toBeCloseTo(game.state.floor.height - 270, 3);
  });

  it("resets player, enemies and timers on restart", () => {
    const game = createGame();
    stepFor(game, 0.5, { move: { x: 1, y: 1 } });
    game.reset();

    const initial = createInitialState(nextSeed(SEED), 1);
    expect(game.state.time).toBe(initial.time);
    expect(game.state.status).toBe(initial.status);
    expect(game.state.player).toEqual(initial.player);
    expect(game.state.floor.seed).toBe(nextSeed(SEED));
    expect(game.state.run.depth).toBe(1);
    expect(game.state.camera).toEqual({
      x: Math.min(
        Math.max(game.state.floor.spawn.x - VIEWPORT.width / 2, 0),
        game.state.floor.width - VIEWPORT.width,
      ),
      y: Math.min(
        Math.max(game.state.floor.spawn.y - VIEWPORT.height / 2, 0),
        game.state.floor.height - VIEWPORT.height,
      ),
    });
  });

  it("starts on the title screen and does not simulate until started", () => {
    const game = new Game({ worldViewport: () => VIEWPORT }, SEED);
    expect(game.state.status).toBe("title");

    const time = game.state.time;
    stepFor(game, 0.5, { move: { x: 1, y: 0 } });
    expect(game.state.status).toBe("title");
    expect(game.state.time).toBe(time);

    const events = game.step(0.01, idle({ start: true }));
    expect(game.state.status).toBe("playing");
    expect(events.some((event) => event.type === "run-started")).toBe(true);
  });

  it("pauses and resumes without advancing the simulation", () => {
    const game = createGame();

    const paused = game.step(0.01, idle({ pause: true }));
    expect(game.state.status).toBe("paused");
    expect(paused.some((event) => event.type === "run-paused")).toBe(true);

    const time = game.state.time;
    const x = game.state.player.x;
    stepFor(game, 0.5, { move: { x: 1, y: 0 } });
    expect(game.state.time).toBe(time);
    expect(game.state.player.x).toBe(x);

    const resumed = game.step(0.01, idle({ pause: true }));
    expect(game.state.status).toBe("playing");
    expect(resumed.some((event) => event.type === "run-resumed")).toBe(true);
  });

  it("summons exactly one Warden and keeps the stairs sealed", () => {
    const game = createGame();
    game.debugSummonBoss();
    game.debugSummonBoss();

    const bosses = game.state.enemies.filter((enemy) => enemy.kind === "boss");
    expect(bosses).toHaveLength(1);
    expect(bosses[0]?.hp).toBe(DEPTH1.boss.maxHp);
    expect(game.state.run.bossAwake).toBe(true);
    expect(game.state.run.floorPurified).toBe(true);
    expect(game.state.run.exitOpen).toBe(false);
  });

  it("defeats the Warden, opens the stairs, and ignores knockback", () => {
    const game = createGame();
    game.debugSummonBoss();
    const index = game.state.enemies.findIndex(
      (enemy) => enemy.kind === "boss",
    );
    const boss = game.state.enemies[index]!;
    game.state.enemies[index] = {
      ...boss,
      x: game.state.player.x + 20,
      y: game.state.player.y,
      hp: ATTACK.damage,
      stagger: 9,
    };
    const x = game.state.enemies[index]!.x;

    const events = stepFor(game, 0.2, pressOn([0]));

    expect(game.state.enemies[index]?.hp).toBe(0);
    expect(game.state.enemies[index]?.status).toBe("dying");
    expect(game.state.enemies[index]?.x).toBe(x);
    expect(game.state.run.bossAwake).toBe(false);
    expect(game.state.run.exitOpen).toBe(true);
    expect(events.some((event) => event.type === "boss-defeated")).toBe(true);
  });

  it("damages the player when a bomb explodes inside the blast", () => {
    const game = createGame();
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
      rested: true,
    }));
    game.state.bombs = [
      spawnBomb(
        1,
        { x: game.state.player.x + 40, y: game.state.player.y },
        { x: game.state.player.x, y: game.state.player.y },
        BOMB.damage,
      ),
    ];

    const events = stepFor(game, BOMB.flightTime + BOMB.fuse + 0.1, {});

    expect(game.state.player.hp).toBe(6 - BOMB.damage);
    expect(events.some((event) => event.type === "bomb-landed")).toBe(true);
    expect(events.some((event) => event.type === "bomb-exploded")).toBe(true);
    expect(game.state.bombs).toHaveLength(0);
  });

  it("lets invulnerability avoid bomb damage", () => {
    const game = createGame();
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
      rested: true,
    }));
    game.state.player = { ...game.state.player, invulnerable: 5 };
    game.state.bombs = [
      spawnBomb(
        1,
        { x: game.state.player.x + 40, y: game.state.player.y },
        { x: game.state.player.x, y: game.state.player.y },
        BOMB.damage,
      ),
    ];

    stepFor(game, BOMB.flightTime + BOMB.fuse + 0.1, {});

    expect(game.state.player.hp).toBe(6);
  });

  it("caps the descent heal at max HP and skips the event when full", () => {
    const game = createGame();
    const stairs = game.state.floor.stairs;
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
      rested: true,
    }));
    game.state.run.exitOpen = true;
    game.state.player = {
      ...game.state.player,
      hp: 5,
      x: stairs.x + stairs.width / 2,
      y: stairs.y + stairs.height / 2,
    };

    const events = stepFor(game, 0.02, {});

    expect(game.state.player.hp).toBe(6);
    expect(events.some((event) => event.type === "player-healed")).toBe(true);

    const full = createGame();
    full.state.enemies = full.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
      rested: true,
    }));
    full.state.run.exitOpen = true;
    const nextStairs = full.state.floor.stairs;
    full.state.player = {
      ...full.state.player,
      hp: 6,
      x: nextStairs.x + nextStairs.width / 2,
      y: nextStairs.y + nextStairs.height / 2,
    };

    const fullEvents = stepFor(full, 0.02, {});

    expect(full.state.player.hp).toBe(6);
    expect(fullEvents.some((event) => event.type === "player-healed")).toBe(
      false,
    );
  });

  it("awards one skill point for a rest and none for a conventional kill", () => {
    const rested = createGame();
    duel(rested);
    rested.state.enemies[0] = {
      ...rested.state.enemies[0]!,
      hp: ATTACK.damage,
      fragments: [false, false],
    };

    stepFor(rested, 0.15, pressOn([0]));

    expect(rested.state.enemies[0]?.rested).toBe(true);
    expect(rested.state.run.skillPoints).toBe(1);

    const killed = createGame();
    duel(killed);
    killed.state.enemies[0] = {
      ...killed.state.enemies[0]!,
      // At exactly the reach edge the body is hittable but its offset
      // fragments are not, so the killing blow is not a rite.
      x: killed.state.player.x + ATTACK.reach,
      hp: ATTACK.damage,
      fragments: [true, true],
    };

    stepFor(killed, 0.15, pressOn([0]));

    expect(killed.state.enemies[0]?.rested).toBe(false);
    expect(killed.state.run.skillPoints).toBe(0);
    expect(killed.state.run.spirit).toBe(0);
  });

  it("blocks the player at the arena gate until the floor is purified", () => {
    const game = createGame();
    const gate = game.state.floor.gate;
    game.state.player = {
      ...game.state.player,
      x: gate.x - 24,
      y: gate.y + gate.height / 2,
    };

    stepFor(game, 1.5, { move: { x: 1, y: 0 } });

    expect(game.state.player.x).toBeLessThan(gate.x - game.state.player.radius);
  });

  it("keeps enemies out of the shop safe zone", () => {
    const game = createGame();
    const safe = game.state.floor.shop.safe;
    game.state.player = {
      ...game.state.player,
      x: safe.x + safe.width / 2,
      y: safe.y + safe.height / 2,
    };
    const enemy = game.state.enemies[0]!;
    game.state.enemies = [
      {
        ...enemy,
        x: safe.x + safe.width + 20,
        y: safe.y + safe.height / 2,
        aggro: true,
      },
      ...game.state.enemies.slice(1),
    ];

    stepFor(game, 1.5, {});

    const moved = game.state.enemies[0]!;
    const inside =
      moved.x >= safe.x &&
      moved.x <= safe.x + safe.width &&
      moved.y >= safe.y &&
      moved.y <= safe.y + safe.height;
    expect(inside).toBe(false);
    expect(game.state.player.hp).toBe(6);
  });

  it("refuses safe-zone entry while an enemy hunts and reopens when it stops", () => {
    const game = createGame();
    const safe = game.state.floor.shop.safe;
    const threshold = game.state.floor.shop.threshold;
    const y = threshold.y + threshold.height / 2;
    game.state.player = {
      ...game.state.player,
      x: safe.x + safe.width + 10,
      y,
    };
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            x: game.state.player.x + 40,
            y,
            aggro: true,
            stagger: 9,
          }
        : { ...enemy, aggro: false },
    );

    const blocked = stepFor(game, 0.5, { move: { x: -1, y: 0 } });

    expect(game.state.player.x).toBeGreaterThan(safe.x + safe.width);
    const refusals = blocked.filter(
      (event) => event.type === "safe-room-blocked",
    );
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toMatchObject({ message: WARD_MESSAGE });

    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      aggro: false,
    }));
    stepFor(game, 0.5, { move: { x: -1, y: 0 } });

    expect(
      isInsideRect(safe, game.state.player.x, game.state.player.y),
    ).toBe(true);
  });

  it("throttles refused-entry messages while the player keeps pushing", () => {
    const game = createGame();
    const safe = game.state.floor.shop.safe;
    const threshold = game.state.floor.shop.threshold;
    const y = threshold.y + threshold.height / 2;
    game.state.player = {
      ...game.state.player,
      x: safe.x + safe.width + 10,
      y,
    };
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            x: game.state.player.x + 40,
            y,
            aggro: true,
            stagger: 9,
          }
        : { ...enemy, aggro: false },
    );

    const blocked = stepFor(game, 5, { move: { x: -1, y: 0 } });
    const refusals = blocked.filter(
      (event) => event.type === "safe-room-blocked",
    );

    expect(refusals).toHaveLength(3);
  });

  it("never traps a player who is already inside the safe zone", () => {
    const game = createGame();
    const safe = game.state.floor.shop.safe;
    const threshold = game.state.floor.shop.threshold;
    const y = threshold.y + threshold.height / 2;
    game.state.player = {
      ...game.state.player,
      x: safe.x + safe.width - 4,
      y,
    };
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            x: safe.x + safe.width + 40,
            y,
            aggro: true,
            stagger: 9,
          }
        : { ...enemy, aggro: false },
    );

    stepFor(game, 0.5, { move: { x: 1, y: 0 } });

    expect(game.state.player.x).toBeGreaterThan(safe.x + safe.width);
    expect(
      isInsideRect(safe, game.state.player.x, game.state.player.y),
    ).toBe(false);
  });

  it("refuses a dodge into the safe zone while an enemy hunts", () => {
    const game = createGame();
    const safe = game.state.floor.shop.safe;
    const threshold = game.state.floor.shop.threshold;
    const y = threshold.y + threshold.height / 2;
    game.state.player = {
      ...game.state.player,
      x: safe.x + safe.width + 10,
      y,
    };
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            x: game.state.player.x + 40,
            y,
            aggro: true,
            stagger: 9,
          }
        : { ...enemy, aggro: false },
    );

    stepFor(game, 0.4, (frame) => ({
      dodge: frame === 0,
      move: { x: -1, y: 0 },
    }));

    expect(game.state.player.x).toBeGreaterThan(safe.x + safe.width);
    expect(
      isInsideRect(safe, game.state.player.x, game.state.player.y),
    ).toBe(false);
  });

  it("applies damage inside the safe zone only while an enemy hunts", () => {
    const makeBomb = (game: Game) => {
      const player = game.state.player;
      return {
        ...spawnBomb(
          99,
          { x: player.x, y: player.y },
          { x: player.x, y: player.y },
          BOMB.damage,
        ),
        landed: true,
        flight: BOMB.flightTime,
        fuse: 0.01,
      };
    };

    const sealed = createGame();
    const sealedSafe = sealed.state.floor.shop.safe;
    sealed.state.player = {
      ...sealed.state.player,
      x: sealedSafe.x + sealedSafe.width / 2,
      y: sealedSafe.y + sealedSafe.height / 2,
    };
    sealed.state.enemies = sealed.state.enemies.map((enemy, index) =>
      index === 0
        ? { ...enemy, aggro: true, stagger: 9 }
        : { ...enemy, aggro: false },
    );
    sealed.state.bombs = [makeBomb(sealed)];
    stepFor(sealed, 0.05, {});
    expect(sealed.state.player.hp).toBe(6 - BOMB.damage);

    const open = createGame();
    const openSafe = open.state.floor.shop.safe;
    open.state.player = {
      ...open.state.player,
      x: openSafe.x + openSafe.width / 2,
      y: openSafe.y + openSafe.height / 2,
    };
    open.state.enemies = open.state.enemies.map((enemy) => ({
      ...enemy,
      aggro: false,
    }));
    open.state.bombs = [makeBomb(open)];
    stepFor(open, 0.05, {});
    expect(open.state.player.hp).toBe(6);
  });

  it("refuses to open the shop while an enemy hunts", () => {
    const game = createGame();
    const shop = game.state.floor.shop;
    game.state.player = {
      ...game.state.player,
      x: shop.interaction.x + shop.interaction.width / 2,
      y: shop.interaction.y + shop.interaction.height / 2,
    };
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? { ...enemy, aggro: true, stagger: 9 }
        : { ...enemy, aggro: false },
    );

    const events = stepFor(game, 0.01, { interact: true });

    expect(events.some((event) => event.type === "shop-opened")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "shop-unavailable",
        message: WARD_MESSAGE,
      }),
    );
    expect(game.state.shop.open).toBe(false);
  });

  it("opens the shop in the stall zone, buys Vigor, and closes with Escape", () => {
    const game = createGame();
    const shop = game.state.floor.shop;
    game.state.player = {
      ...game.state.player,
      x: shop.interaction.x + shop.interaction.width / 2,
      y: shop.interaction.y + shop.interaction.height / 2,
    };
    game.state.run.skillPoints = 3;

    const opened = game.step(0.01, idle({ interact: true }));
    expect(opened.some((event) => event.type === "shop-opened")).toBe(true);
    expect(game.state.shop.open).toBe(true);
    expect(game.state.status).toBe("playing");

    game.step(0.01, idle({ menuDown: true }));
    expect(game.state.shop.selection).toBe(1);

    const bought = game.step(0.01, idle({ confirm: true }));
    expect(bought.some((event) => event.type === "shop-purchase")).toBe(true);
    expect(game.state.run.vigorPurchased).toBe(true);
    expect(game.state.run.skillPoints).toBe(0);
    expect(game.state.player.maxHp).toBe(7);
    expect(game.state.player.hp).toBe(7);
    expect(game.state.shop.selection).toBe(0);

    const closed = game.step(0.01, idle({ pause: true }));
    expect(closed.some((event) => event.type === "shop-closed")).toBe(true);
    expect(game.state.shop.open).toBe(false);
    expect(game.state.status).toBe("playing");
  });

  it("buys and uses a draught through the engine", () => {
    const game = createGame();
    const shop = game.state.floor.shop;
    game.state.player = {
      ...game.state.player,
      x: shop.interaction.x + shop.interaction.width / 2,
      y: shop.interaction.y + shop.interaction.height / 2,
      hp: 4,
    };
    game.state.run.skillPoints = 1;

    game.step(0.01, idle({ interact: true }));
    game.step(0.01, idle({ confirm: true }));
    expect(game.state.run.draughtCarried).toBe(true);
    expect(game.state.run.skillPoints).toBe(0);

    game.step(0.01, idle({ pause: true }));
    const used = game.step(0.01, idle({ useDraught: true }));

    expect(used.some((event) => event.type === "draught-used")).toBe(true);
    expect(game.state.player.hp).toBe(6);
    expect(game.state.run.draughtCarried).toBe(false);

    const empty = game.step(0.01, idle({ useDraught: true }));
    expect(empty.some((event) => event.type === "draught-blocked")).toBe(true);
    expect(game.state.player.hp).toBe(6);
  });

  it("closes the shop for the floor when the Warden is summoned", () => {
    const game = createGame();
    const shop = game.state.floor.shop;
    game.state.player = {
      ...game.state.player,
      x: shop.interaction.x + shop.interaction.width / 2,
      y: shop.interaction.y + shop.interaction.height / 2,
    };
    game.state.run.skillPoints = 1;
    game.step(0.01, idle({ interact: true }));
    expect(game.state.shop.open).toBe(true);

    game.debugSummonBoss();

    expect(game.state.shop.open).toBe(false);
    expect(game.state.run.shopClosed).toBe(true);
    expect(game.state.run.bossAwake).toBe(true);

    const blocked = game.step(0.01, idle({ interact: true }));
    expect(blocked.some((event) => event.type === "shop-unavailable")).toBe(
      true,
    );
    expect(game.state.shop.open).toBe(false);
  });

  it("does not summon a second Warden from a repeat altar interaction", () => {
    const game = createGame();
    game.debugSummonBoss();
    const altar = game.state.floor.altar;
    game.state.player = {
      ...game.state.player,
      x: altar.x + altar.width / 2,
      y: altar.y + altar.height / 2,
    };

    game.step(0.01, idle({ interact: true }));

    expect(
      game.state.enemies.filter((enemy) => enemy.kind === "boss"),
    ).toHaveLength(1);
  });

  it("preserves run-scoped rewards across descent and resets per-floor state", () => {
    const game = createGame();
    const stairs = game.state.floor.stairs;
    game.state.run = {
      ...game.state.run,
      spirit: 80,
      floorPurified: true,
      bossAwake: true,
      exitOpen: true,
      gateOpenedAt: 1,
      shopClosed: true,
      skillPoints: 4,
      draughtCarried: true,
      vigorPurchased: true,
    };
    game.state.player = {
      ...game.state.player,
      hp: 6,
      maxHp: 7,
      x: stairs.x + stairs.width / 2,
      y: stairs.y + stairs.height / 2,
    };

    stepFor(game, 0.02, {});

    expect(game.state.run.depth).toBe(2);
    expect(game.state.run.skillPoints).toBe(4);
    expect(game.state.run.draughtCarried).toBe(true);
    expect(game.state.run.vigorPurchased).toBe(true);
    expect(game.state.player.maxHp).toBe(7);
    expect(game.state.player.hp).toBe(7);
    expect(game.state.run.spirit).toBe(0);
    expect(game.state.run.floorPurified).toBe(false);
    expect(game.state.run.bossAwake).toBe(false);
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.run.gateOpenedAt).toBeNull();
    expect(game.state.run.shopClosed).toBe(false);
  });

  it("clears run-scoped rewards on death and restart", () => {
    const game = createGame();
    game.state.run.skillPoints = 5;
    game.state.run.draughtCarried = true;
    game.state.run.vigorPurchased = true;
    game.state.player = { ...game.state.player, maxHp: 7, hp: 0 };
    game.state.status = "dead";

    game.step(0.01, idle({ restart: true }));

    expect(game.state.status).toBe("playing");
    expect(game.state.run.skillPoints).toBe(0);
    expect(game.state.run.draughtCarried).toBe(false);
    expect(game.state.run.vigorPurchased).toBe(false);
    expect(game.state.player.maxHp).toBe(6);
    expect(game.state.player.hp).toBe(6);
  });

  it("reports shop, gate, and summon state in the debug snapshot", () => {
    const game = createGame();
    game.debugPrepareRite();
    const snapshot = game.snapshot();

    expect(snapshot.gateOpen).toBe(true);
    expect(snapshot.summonAvailable).toBe(true);
    expect(snapshot.shopOpen).toBe(false);
    expect(snapshot.shopClosed).toBe(false);
    expect(snapshot.shopRows.map((row) => row.id)).toEqual([
      "draught",
      "vigor",
    ]);
    expect(snapshot.floor.rooms).toHaveLength(6);
    expect(snapshot.floor.shop.safe).toEqual(game.state.floor.shop.safe);
  });
});
