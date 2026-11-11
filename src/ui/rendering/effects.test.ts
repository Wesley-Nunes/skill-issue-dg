import { describe, expect, it } from "vitest";
import { createInitialState } from "../../state/initialState";
import { VisualEffects } from "./effects";

describe("VisualEffects", () => {
  it("records a finisher spark larger than a normal one", () => {
    const effects = new VisualEffects();
    const state = { ...createInitialState(), time: 1.5 };

    effects.handle(
      [{ type: "enemy-hit", x: 10, y: 20, finisher: true }],
      state,
    );

    expect(effects.sparks).toHaveLength(1);
    expect(effects.sparks[0]).toMatchObject({
      x: 10,
      y: 20,
      born: 1.5,
      count: 6,
      length: 12,
    });
  });

  it("records a swing with its chain step", () => {
    const effects = new VisualEffects();
    const state = createInitialState();

    effects.handle([{ type: "attack-started", angle: 0, step: 2 }], state);

    expect(effects.swings).toHaveLength(1);
    expect(effects.swings[0]?.step).toBe(2);
  });

  it("records pale sparks when a fragment breaks", () => {
    const effects = new VisualEffects();
    const state = { ...createInitialState(), time: 3 };

    effects.handle([{ type: "fragment-broken", x: 4, y: 8 }], state);

    expect(effects.sparks).toHaveLength(1);
    expect(effects.sparks[0]).toMatchObject({
      x: 4,
      y: 8,
      born: 3,
      count: 6,
      color: "rgba(191, 233, 255, 1)",
    });
  });

  it("clears transient state on a run reset", () => {
    const effects = new VisualEffects();
    const state = createInitialState();
    effects.handle(
      [
        { type: "enemy-hit", x: 0, y: 0, finisher: false },
        { type: "attack-started", angle: 0, step: 1 },
        { type: "fragment-broken", x: 2, y: 3 },
      ],
      state,
    );

    effects.handle([{ type: "run-reset" }], state);

    expect(effects.sparks).toHaveLength(0);
    expect(effects.swings).toHaveLength(0);
  });

  it("clears transient state on descent because the floor clock restarts", () => {
    const effects = new VisualEffects();
    const state = { ...createInitialState(), time: 12 };
    effects.handle(
      [
        { type: "boss-defeated", x: 0, y: 0 },
        { type: "skill-points-earned", amount: 3, total: 3 },
        { type: "draught-used", x: 1, y: 2, healed: 2 },
      ],
      state,
    );

    effects.handle([{ type: "floor-descended", depth: 2, seed: 7 }], state);

    expect(effects.sparks).toHaveLength(0);
    expect(effects.rings).toHaveLength(0);
    expect(effects.floatingTexts).toHaveLength(0);
    expect(effects.banners).toHaveLength(0);
    expect(effects.healPulses).toHaveLength(0);
    expect(effects.skillPointHighlightAt).toBeNull();
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
        { type: "enemy-hit", x: 0, y: 0, finisher: false },
        { type: "attack-started", angle: 0, step: 1 },
      ],
      state,
    );
    effects.captureDodge({
      ...state,
      player: { ...state.player, dodgeTime: 0.1 },
    });

    effects.prune(1);

    expect(effects.sparks).toHaveLength(0);
    expect(effects.swings).toHaveLength(0);
    expect(effects.afterimages).toHaveLength(0);
  });
});
