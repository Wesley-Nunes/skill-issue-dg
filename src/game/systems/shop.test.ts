import { describe, expect, it } from "vitest";
import { ECONOMY } from "../data/config";
import { createPlayer } from "../../state/initialState";
import type { RunState } from "../types";
import {
  clampSelection,
  purchase,
  shopAvailable,
  shopRows,
  useDraught,
} from "./shop";

function run(overrides: Partial<RunState> = {}): RunState {
  return {
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
    ...overrides,
  };
}

describe("shopRows", () => {
  it("offers the draught and Vigor with approved prices", () => {
    const rows = shopRows(run({ skillPoints: 3 }));

    expect(rows.map((row) => row.id)).toEqual(["draught", "vigor"]);
    expect(rows.map((row) => row.cost)).toEqual([
      ECONOMY.draughtCost,
      ECONOMY.vigorCost,
    ]);
    expect(rows.every((row) => row.affordable)).toBe(true);
  });

  it("reports the shortfall for unaffordable rows", () => {
    const rows = shopRows(run({ skillPoints: 1 }));

    expect(rows[0]?.stateLabel).toBe("Buy");
    expect(rows[1]?.affordable).toBe(false);
    expect(rows[1]?.stateLabel).toBe("Need 2 more");
  });

  it("shows the carried draught and hides purchased Vigor", () => {
    const rows = shopRows(
      run({ skillPoints: 1, draughtCarried: true, vigorPurchased: true }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("draught");
    expect(rows[0]?.state).toBe("carried");
    expect(rows[0]?.stateLabel).toBe("Carried · Q to use");
  });
});

describe("purchase", () => {
  it("buys the draught at exactly the required points", () => {
    const result = purchase(run({ skillPoints: 1 }), "draught");

    expect(result.success).toBe(true);
    expect(result.run.skillPoints).toBe(0);
    expect(result.run.draughtCarried).toBe(true);
    expect(result.message).toBe("Purchased: Healing draught");
  });

  it("blocks the draught with insufficient points without deducting", () => {
    const before = run({ skillPoints: 0 });
    const result = purchase(before, "draught");

    expect(result.success).toBe(false);
    expect(result.run).toBe(before);
    expect(result.run.skillPoints).toBe(0);
    expect(result.tone).toBe("blocked");
  });

  it("blocks a second draught while one is carried", () => {
    const before = run({ skillPoints: 3, draughtCarried: true });
    const result = purchase(before, "draught");

    expect(result.success).toBe(false);
    expect(result.run).toBe(before);
    expect(result.message).toBe("You already carry a draught. Use Q first.");
  });

  it("buys Vigor at exactly the required points", () => {
    const result = purchase(run({ skillPoints: 3 }), "vigor");

    expect(result.success).toBe(true);
    expect(result.run.skillPoints).toBe(0);
    expect(result.run.vigorPurchased).toBe(true);
    expect(result.maxHpGain).toBe(1);
  });

  it("blocks Vigor one point short without deducting", () => {
    const before = run({ skillPoints: 2 });
    const result = purchase(before, "vigor");

    expect(result.success).toBe(false);
    expect(result.run).toBe(before);
    expect(result.message).toBe("Need 1 more skill point");
  });

  it("blocks a repeat Vigor purchase", () => {
    const before = run({ skillPoints: 5, vigorPurchased: true });
    const result = purchase(before, "vigor");

    expect(result.success).toBe(false);
    expect(result.run).toBe(before);
    expect(result.run.skillPoints).toBe(5);
  });

  it("blocks every purchase after the shop closes", () => {
    const before = run({ skillPoints: 5, shopClosed: true });
    const result = purchase(before, "draught");

    expect(result.success).toBe(false);
    expect(result.run).toBe(before);
    expect(result.message).toBe("The shop is closed.");
  });
});

describe("useDraught", () => {
  it("is a no-op without a draught", () => {
    const player = createPlayer();
    const result = useDraught(run(), player);

    expect(result.consumed).toBe(false);
    expect(result.reason).toBe("empty");
    expect(result.hp).toBe(player.hp);
  });

  it("does not consume the draught at full HP", () => {
    const player = createPlayer();
    const before = run({ draughtCarried: true });
    const result = useDraught(before, player);

    expect(result.consumed).toBe(false);
    expect(result.reason).toBe("full");
    expect(result.run.draughtCarried).toBe(true);
    expect(result.hp).toBe(player.maxHp);
  });

  it("heals one HP at one below maximum and consumes the draught", () => {
    const player = { ...createPlayer(), hp: 5 };
    const result = useDraught(run({ draughtCarried: true }), player);

    expect(result.healed).toBe(1);
    expect(result.hp).toBe(6);
    expect(result.consumed).toBe(true);
    expect(result.run.draughtCarried).toBe(false);
  });

  it("heals two HP and caps at maximum", () => {
    const player = { ...createPlayer(), hp: 1 };
    const result = useDraught(run({ draughtCarried: true }), player);

    expect(result.healed).toBe(2);
    expect(result.hp).toBe(3);
    expect(result.consumed).toBe(true);
  });

  it("caps healing at a Vigor-raised maximum", () => {
    const player = { ...createPlayer(), hp: 6, maxHp: 7 };
    const result = useDraught(run({ draughtCarried: true }), player);

    expect(result.healed).toBe(1);
    expect(result.hp).toBe(7);
    expect(result.consumed).toBe(true);
  });
});

describe("shop availability and selection", () => {
  it("is unavailable after summoning, after boss defeat, or when closed", () => {
    expect(shopAvailable(run())).toBe(true);
    expect(shopAvailable(run({ bossAwake: true }))).toBe(false);
    expect(shopAvailable(run({ exitOpen: true }))).toBe(false);
    expect(shopAvailable(run({ shopClosed: true }))).toBe(false);
  });

  it("clamps selection to the row count", () => {
    expect(clampSelection(-1, 2)).toBe(0);
    expect(clampSelection(1, 2)).toBe(1);
    expect(clampSelection(5, 2)).toBe(1);
    expect(clampSelection(0, 0)).toBe(0);
  });
});
