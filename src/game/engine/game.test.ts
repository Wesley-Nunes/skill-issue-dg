import { describe, expect, it } from "vitest";
import { COMBO, ENEMY_SPAWNS, MELEE, ROOM } from "../data/config";
import { createInitialState } from "../../state/initialState";
import { comboWindowOpen } from "../systems/combo";
import type { GameEvent, InputFrame } from "../types";
import { Game } from "./game";

function createGame(): Game {
  return new Game({ worldViewport: () => ({ width: 480, height: 270 }) });
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
  it("starts with the player and three enemies at their spawns", () => {
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
      ENEMY_SPAWNS.map((spawn) => [spawn.x, spawn.y]),
    );
    expect(game.state.camera).toEqual({ x: 80, y: 114 });
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

  it("chains three timed hits and awards one skill point", () => {
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
    expect(game.state.run.skillPoints).toBe(1);
    expect(game.state.run.challengeEarned).toBe(true);
    expect(events.some((event) => event.type === "challenge-complete")).toBe(
      true,
    );
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
    expect(game.state.run.skillPoints).toBe(0);
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
    expect(game.state.run.skillPoints).toBe(0);
  });

  it("does not award a second point in the same run", () => {
    const game = createGame();
    duel(game);
    playTimedChain(game);
    expect(game.state.run.skillPoints).toBe(1);

    game.state.enemies[0] = {
      ...game.state.enemies[0]!,
      hp: MELEE.maxHp,
      status: "alive",
      x: game.state.player.x + 20,
      y: game.state.player.y,
      stagger: 9,
    };
    playTimedChain(game);

    expect(game.state.run.skillPoints).toBe(1);
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

  it("marks the room cleared when all enemies are dead without ending the run", () => {
    const game = createGame();
    game.state.enemies = game.state.enemies.map((enemy) => ({
      ...enemy,
      status: "dead" as const,
      hp: 0,
    }));

    const events = stepFor(game, 0.05, {});

    expect(game.state.run.roomCleared).toBe(true);
    expect(events.some((event) => event.type === "room-cleared")).toBe(true);
    expect(game.state.status).toBe("playing");
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
    expect(game.state.enemies).toEqual(createInitialState().enemies);
  });

  it("restores skill points, combo state, and projectiles on restart", () => {
    const game = createGame();
    game.state.run = { skillPoints: 1, challengeEarned: true, roomCleared: false };
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
      skillPoints: 0,
      challengeEarned: false,
      roomCleared: false,
    });
    expect(game.state.projectiles).toHaveLength(0);
    expect(game.state.player.comboStep).toBe(0);
    expect(game.state.player.comboHits).toBe(0);
    expect(game.state.player.hp).toBe(6);
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

  it("keeps the camera inside the room", () => {
    const game = createGame();
    game.state.player = {
      ...game.state.player,
      x: ROOM.bounds.maxX - 6,
      y: ROOM.bounds.maxY - 6,
    };

    stepFor(game, 3, {});

    expect(game.state.camera.x).toBeCloseTo(ROOM.width - 480, 3);
    expect(game.state.camera.y).toBeCloseTo(ROOM.height - 270, 3);
  });

  it("resets player, enemies and timers on restart", () => {
    const game = createGame();
    stepFor(game, 0.5, { move: { x: 1, y: 1 } });
    game.reset();

    const initial = createInitialState();
    expect(game.state.time).toBe(initial.time);
    expect(game.state.status).toBe(initial.status);
    expect(game.state.player).toEqual(initial.player);
    expect(game.state.enemies).toEqual(initial.enemies);
    expect(game.state.camera).toEqual({ x: 80, y: 114 });
  });
});
