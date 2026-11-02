import { describe, expect, it } from "vitest";
import { createInitialState } from "../../state/initialState";
import { VisualEffects } from "./effects";

describe("VisualEffects", () => {
  it("records a spark and the hit time for an enemy hit", () => {
    const effects = new VisualEffects();
    const state = { ...createInitialState(), time: 1.5 };

    effects.handle([{ type: "enemy-hit", x: 10, y: 20 }], state);

    expect(effects.sparks).toEqual([{ x: 10, y: 20, born: 1.5 }]);
    expect(effects.enemyHitAt).toBe(1.5);
  });

  it("records a swing when an attack starts", () => {
    const effects = new VisualEffects();
    const state = createInitialState();

    effects.handle([{ type: "attack-started", angle: 0 }], state);

    expect(effects.swings).toHaveLength(1);
  });

  it("captures exactly two afterimages per dodge", () => {
    const effects = new VisualEffects();
    const state = createInitialState();
    state.player.dodgeTime = 0.18;

    for (let time = 0; time < 0.18; time += 0.01) {
      state.time = time;
      effects.captureDodge(state);
    }

    expect(effects.afterimages).toHaveLength(2);
  });

  it("starts a new afterimage budget on the next dodge", () => {
    const effects = new VisualEffects();
    const state = createInitialState();

    state.player.dodgeTime = 0.18;
    state.time = 0.04;
    effects.captureDodge(state);
    state.time = 0.08;
    effects.captureDodge(state);
    expect(effects.afterimages).toHaveLength(2);

    state.player.dodgeTime = 0;
    effects.captureDodge(state);

    state.player.dodgeTime = 0.18;
    state.time = 2;
    effects.captureDodge(state);

    expect(effects.afterimages).toHaveLength(3);
  });

  it("prunes effects once they expire", () => {
    const effects = new VisualEffects();
    const state = createInitialState();
    effects.handle(
      [
        { type: "enemy-hit", x: 0, y: 0 },
        { type: "attack-started", angle: 0 },
      ],
      state,
    );
    effects.captureDodge({ ...state, player: { ...state.player, dodgeTime: 0.1 } });

    effects.prune(1);

    expect(effects.sparks).toHaveLength(0);
    expect(effects.swings).toHaveLength(0);
    expect(effects.afterimages).toHaveLength(0);
  });
});
