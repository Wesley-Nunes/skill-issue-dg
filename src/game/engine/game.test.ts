import { describe, expect, it } from "vitest";
import { ATTACK, ENEMY, ROOM } from "../data/config";
import { createInitialState } from "../../state/initialState";
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

function stepFor(
  game: Game,
  seconds: number,
  input: InputFrame,
  dt = 0.01,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    events.push(...game.step(dt, input));
  }
  return events;
}

describe("Game", () => {
  it("starts playing with a full-health player and an idle enemy", () => {
    const game = createGame();
    expect(game.state.status).toBe("playing");
    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemy.status).toBe("alive");
    expect(game.state.camera).toEqual({ x: 80, y: 114 });
  });

  it("damages the enemy once per swing when it is inside the attack arc", () => {
    const game = createGame();
    game.state.enemy = {
      ...game.state.enemy,
      x: game.state.player.x + 20,
      y: game.state.player.y,
    };

    const events = stepFor(game, 0.35, idle({ attack: true }));

    expect(game.state.enemy.hp).toBe(ENEMY.maxHp - ATTACK.damage);
    expect(events.filter((event) => event.type === "enemy-hit")).toHaveLength(1);
    expect(events.some((event) => event.type === "attack-started")).toBe(true);
  });

  it("leaves the enemy untouched when the swing misses", () => {
    const game = createGame();
    game.state.enemy = {
      ...game.state.enemy,
      x: game.state.player.x - 20,
      y: game.state.player.y,
    };

    stepFor(game, 0.35, idle({ attack: true }));

    expect(game.state.enemy.hp).toBe(ENEMY.maxHp);
  });

  it("kills the player at 0 HP and restarts on R", () => {
    const game = createGame();
    game.state.player = {
      ...game.state.player,
      hp: 1,
      invulnerable: 0,
    };
    game.state.enemy = {
      ...game.state.enemy,
      x: game.state.player.x + 10,
      y: game.state.player.y,
      active: ENEMY.active,
      attackHit: false,
    };

    const events = stepFor(game, 0.05, idle());

    expect(game.state.player.hp).toBe(0);
    expect(game.state.status).toBe("dead");
    expect(events.some((event) => event.type === "player-died")).toBe(true);

    game.step(0.01, idle({ restart: true }));

    expect(game.state.status).toBe("playing");
    expect(game.state.player.hp).toBe(6);
    expect(game.state.enemy.hp).toBe(ENEMY.maxHp);
    expect(game.state.enemy.status).toBe("alive");
  });

  it("ignores gameplay input while dead", () => {
    const game = createGame();
    game.state.status = "dead";
    const x = game.state.player.x;

    stepFor(game, 0.1, idle({ move: { x: 1, y: 0 } }));

    expect(game.state.player.x).toBe(x);
    expect(game.state.status).toBe("dead");
  });

  it("does not apply enemy damage while the player is invulnerable", () => {
    const game = createGame();
    game.state.player = {
      ...game.state.player,
      invulnerable: 0.5,
    };
    game.state.enemy = {
      ...game.state.enemy,
      x: game.state.player.x + 10,
      y: game.state.player.y,
      active: ENEMY.active,
      attackHit: false,
    };

    stepFor(game, 0.05, idle());

    expect(game.state.player.hp).toBe(6);
  });

  it("keeps the camera inside the room", () => {
    const game = createGame();
    game.state.player = {
      ...game.state.player,
      x: ROOM.bounds.maxX - 6,
      y: ROOM.bounds.maxY - 6,
    };

    stepFor(game, 3, idle());

    expect(game.state.camera.x).toBeCloseTo(ROOM.width - 480, 3);
    expect(game.state.camera.y).toBeCloseTo(ROOM.height - 270, 3);
  });

  it("resets player, enemy and timers on restart", () => {
    const game = createGame();
    stepFor(game, 0.5, idle({ move: { x: 1, y: 1 } }));
    game.reset();

    const initial = createInitialState();
    expect(game.state.time).toBe(initial.time);
    expect(game.state.status).toBe(initial.status);
    expect(game.state.player).toEqual(initial.player);
    expect(game.state.enemy).toEqual(initial.enemy);
    expect(game.state.camera).toEqual({ x: 80, y: 114 });
  });
});
