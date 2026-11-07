import { describe, expect, it } from "vitest";
import { COMBO, MELEE, PURIFICATION } from "../data/config";
import { nextSeed } from "../data/floor";
import { createInitialState } from "../../state/initialState";
import { comboWindowOpen } from "../systems/combo";
import { fragmentPosition } from "../systems/purification";
import type { GameEvent, InputFrame } from "../types";
import { Game } from "./game";

const SEED = 12345;
const VIEWPORT = { width: 480, height: 270 };

function createGame(seed = SEED): Game {
  return new Game({ worldViewport: () => VIEWPORT }, seed);
}

function idle(overrides: Partial<InputFrame> = {}): InputFrame {
  return {
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    attack: false,
    dodge: false,
    restart: false,
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

/** Puts one staggered melee enemy in front of the player and clears the rest. */
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

/**
 * Plays the chain by pressing only while the input window is open. Every swing
 * connects because the duel enemy stands in front of the player.
 */
function playTimedChain(game: Game, stopAtFinisher = false): GameEvent[] {
  const events: GameEvent[] = [];
  events.push(...game.step(0.01, idle({ attack: true })));

  for (let guard = 0; guard < 500; guard += 1) {
    const player = game.state.player;
    if (player.comboStep === 0) break;
    if (stopAtFinisher && player.comboStep === 3 && player.comboResolved) break;
    events.push(
      ...game.step(0.01, idle({ attack: comboWindowOpen(player) })),
    );
  }

  return events;
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
      "ranged",
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
      exitOpen: false,
    });
    expect(game.state.floor.rooms).toHaveLength(4);
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

  it("deals step-1 damage once when the enemy is inside the arc", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 0.35, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp - COMBO.steps[0].damage);
    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
    expect(events.some((event) => event.type === "attack-started")).toBe(true);
  });

  it("does not repeat the swing while the button is held", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 0.6, (frame) => ({ attack: frame === 0 }));

    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
    expect(game.state.player.comboStep).toBe(0);
  });

  it("chains three timed hits", () => {
    const game = createGame();
    duel(game);

    const events = playTimedChain(game);

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp - (2 + 2 + 4));
    expect(
      events
        .filter((event) => event.type === "attack-started")
        .map((event) => event.step),
    ).toEqual([1, 2, 3]);
    expect(
      events.some(
        (event) => event.type === "combo-ended" && event.reason !== "complete",
      ),
    ).toBe(false);
  });

  it("never chains while the attack is mashed", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 2, { attack: true });

    expect(
      events.some(
        (event) => event.type === "attack-started" && event.step > 1,
      ),
    ).toBe(false);
    expect(events.some((event) => event.type === "enemy-hit")).toBe(false);
    expect(game.state.player.comboStep).toBeLessThan(2);
  });

  it("does not chain on a steady five-hertz click", () => {
    const game = createGame();
    duel(game);

    const events = stepFor(game, 3, (frame) => ({ attack: frame % 20 === 0 }));

    expect(
      events.some(
        (event) => event.type === "attack-started" && event.step > 1,
      ),
    ).toBe(false);
    expect(game.state.player.comboStep).toBeLessThan(2);
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

  it("counts a fragment break as a connected step when the body is out of arc", () => {
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

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp);
    expect(events.some((event) => event.type === "enemy-hit")).toBe(false);
    expect(
      events.some((event) => event.type === "fragment-broken"),
    ).toBe(true);
    expect(game.state.player.comboHits).toBe(1);
    expect(game.state.player.comboResolved).toBe(true);
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
      hp: COMBO.steps[0].damage,
    };

    stepFor(game, 0.15, pressOn([0]));

    expect(game.state.enemies[0]?.status).toBe("dying");
    expect(game.state.enemies[0]?.rested).toBe(false);
    expect(game.state.enemies[0]?.respawn).toBeCloseTo(
      PURIFICATION.respawnDelay,
      5,
    );
    expect(game.state.run.spirit).toBe(0);

    const events = stepFor(game, 2.6, {});

    const revived = game.state.enemies[0]!;
    expect(events.some((event) => event.type === "enemy-respawned")).toBe(true);
    expect(revived.status).toBe("alive");
    expect(revived.hp).toBe(MELEE.maxHp);
    expect(revived.fragments).toEqual([true, true]);
    expect([revived.x, revived.y]).toEqual([home.x, home.y]);
  });

  it("puts a fully broken mob to rest and grants spirit", () => {
    const game = createGame();
    duel(game);
    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      hp: COMBO.steps[0].damage,
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
      hp: MELEE.maxHp - 2,
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

  it("opens the stairs when every enemy rests and keeps the run playing", () => {
    const game = createGame();
    duel(game);
    game.state.enemies = game.state.enemies.map((enemy, index) =>
      index === 0
        ? {
            ...enemy,
            hp: COMBO.steps[0].damage,
            fragments: [false, false],
          }
        : { ...enemy, status: "dead", hp: 0, rested: true },
    );
    game.state.run.spirit = PURIFICATION.spiritThreshold - 10;

    const events = stepFor(game, 0.15, pressOn([0]));

    expect(game.state.run.spirit).toBe(PURIFICATION.spiritThreshold);
    expect(game.state.run.floorPurified).toBe(true);
    expect(game.state.run.exitOpen).toBe(true);
    expect(game.state.status).toBe("playing");
    expect(events.some((event) => event.type === "floor-purified")).toBe(true);

    const time = game.state.time;
    const x = game.state.player.x;
    stepFor(game, 0.4, { move: { x: 1, y: 0 } });

    expect(game.state.time).toBeGreaterThan(time);
    expect(game.state.player.x).toBeGreaterThan(x);
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
    expect(game.state.run.exitOpen).toBe(false);
    expect(game.state.player.hp).toBe(3);
    expect(game.state.enemies).toHaveLength(3);
    expect(game.state.projectiles).toHaveLength(0);
  });

  it("leaves the enemy untouched when the swing misses", () => {
    const game = createGame();
    const [first, ...rest] = game.state.enemies;
    game.state.enemies = [
      { ...first!, x: game.state.player.x - 20, y: game.state.player.y },
      ...rest,
    ];

    stepFor(game, 0.5, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp);
    expect(game.state.enemies[0]?.fragments).toEqual([true, true]);
  });

  it("hits every enemy inside the arc once per step", () => {
    const game = createGame();
    const [first, second, third] = game.state.enemies;
    game.state.enemies = [
      { ...first!, x: game.state.player.x + 20, y: game.state.player.y, stagger: 9 },
      { ...second!, x: game.state.player.x + 20, y: game.state.player.y + 8, stagger: 9 },
      { ...third!, status: "dead", hp: 0 },
    ];

    stepFor(game, 0.35, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp - 2);
    expect(game.state.enemies[1]?.hp).toBe(MELEE.maxHp - 2);
  });

  it("applies finisher stagger, knockback, and hitstop", () => {
    const game = createGame();
    duel(game);

    playTimedChain(game, true);

    const enemy = game.state.enemies[0]!;
    expect(enemy.hp).toBe(MELEE.maxHp - 8);
    expect(enemy.stagger).toBeGreaterThan(0);
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
      comboStep: 1,
      comboTime: 0.2,
      comboResolved: true,
      comboHitThisStep: true,
    };

    const events = stepFor(game, 0.01, { attack: true });

    expect(game.state.player.comboStep).toBe(1);
    expect(game.state.player.comboTime).toBe(0.2);
    expect(events.some((event) => event.type === "combo-ended")).toBe(false);
    expect(game.state.hitstop).toBeCloseTo(0.05, 5);
  });

  it("ends the chain when the player takes damage", () => {
    const game = createGame();
    duel(game);
    stepFor(game, 0.19, pressOn([0]));

    expect(game.state.enemies[0]?.hp).toBe(MELEE.maxHp - 2);
    expect(game.state.player.comboStep).toBe(1);

    game.state.projectiles = [
      {
        id: 1,
        x: game.state.player.x + 2,
        y: game.state.player.y,
        vx: -150,
        vy: 0,
        radius: 4,
        life: 1.6,
      },
    ];
    const events = stepFor(game, 0.02, {});

    expect(game.state.player.hp).toBe(5);
    expect(game.state.player.comboStep).toBe(0);
    expect(
      events.some(
        (event) =>
          event.type === "combo-ended" && event.reason === "damage",
      ),
    ).toBe(true);
  });

  it("spawns a projectile after the ranged telegraph and damages the player", () => {
    const game = createGame();
    const [, , ranged] = game.state.enemies;
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
        ...ranged!,
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

  it("restores spirit, fragments, combo state, and projectiles on restart", () => {
    const game = createGame();
    game.state.run = {
      depth: 1,
      spirit: 80,
      floorPurified: false,
      exitOpen: false,
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
        life: 1,
      },
    ];
    game.state.player = {
      ...game.state.player,
      hp: 0,
      comboStep: 2,
      comboHits: 1,
    };
    game.state.status = "dead";

    game.step(0.01, idle({ restart: true }));

    expect(game.state.run).toEqual({
      depth: 1,
      spirit: 0,
      floorPurified: false,
      exitOpen: false,
    });
    expect(game.state.projectiles).toHaveLength(0);
    expect(game.state.player.comboStep).toBe(0);
    expect(game.state.player.comboHits).toBe(0);
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
});
