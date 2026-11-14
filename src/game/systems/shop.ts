import { ECONOMY } from "../data/config";
import type {
  Player,
  RunState,
  ShopItemId,
  ShopMessageTone,
} from "../types";

export interface ShopRow {
  id: ShopItemId;
  cost: number;
  affordable: boolean;
  /** Stable row state for tests and debug snapshots. */
  state: "buy" | "need" | "carried" | "purchased";
  /** Player-facing state text. */
  stateLabel: string;
  /** One-line effect description. */
  effect: string;
  name: string;
}

export interface PurchaseOutcome {
  run: RunState;
  item: ShopItemId;
  success: boolean;
  message: string;
  tone: ShopMessageTone;
  /** Max HP gained by this purchase; the engine applies it to the player. */
  maxHpGain: number;
}

export interface DraughtOutcome {
  run: RunState;
  hp: number;
  healed: number;
  consumed: boolean;
  reason: "empty" | "full" | null;
  message: string;
}

function needLabel(count: number): string {
  return `Need ${count} more skill point${count === 1 ? "" : "s"}`;
}

/** The current shop inventory. Vigor disappears once purchased this run. */
export function shopRows(run: RunState): ShopRow[] {
  const rows: ShopRow[] = [];

  const draughtAffordable = run.skillPoints >= ECONOMY.draughtCost;
  rows.push({
    id: "draught",
    name: "Healing draught",
    effect: `Heals ${ECONOMY.draughtHeal} HP · carried until used`,
    cost: ECONOMY.draughtCost,
    affordable: draughtAffordable,
    state: run.draughtCarried
      ? "carried"
      : draughtAffordable
        ? "buy"
        : "need",
    stateLabel: run.draughtCarried
      ? "Carried · Q to use"
      : draughtAffordable
        ? "Buy"
        : `Need ${ECONOMY.draughtCost - run.skillPoints} more`,
  });

  if (!run.vigorPurchased) {
    const vigorAffordable = run.skillPoints >= ECONOMY.vigorCost;
    rows.push({
      id: "vigor",
      name: "Vigor",
      effect: `Max HP +${ECONOMY.vigorMaxHpGain} · one time this run`,
      cost: ECONOMY.vigorCost,
      affordable: vigorAffordable,
      state: vigorAffordable ? "buy" : "need",
      stateLabel: vigorAffordable
        ? "Buy"
        : `Need ${ECONOMY.vigorCost - run.skillPoints} more`,
    });
  }

  return rows;
}

/** True when the shop may be opened or purchased from right now. */
export function shopAvailable(run: RunState): boolean {
  return !run.shopClosed && !run.bossAwake && !run.exitOpen;
}

/**
 * Attempts a purchase. Pure: the caller applies `maxHpGain` to the player and
 * writes the returned run state back.
 */
export function purchase(run: RunState, item: ShopItemId): PurchaseOutcome {
  const fail = (message: string): PurchaseOutcome => ({
    run,
    item,
    success: false,
    message,
    tone: "blocked",
    maxHpGain: 0,
  });

  if (!shopAvailable(run)) {
    return fail("The shop is closed.");
  }

  if (item === "draught") {
    if (run.draughtCarried) {
      return fail("You already carry a draught. Use Q first.");
    }
    if (run.skillPoints < ECONOMY.draughtCost) {
      return fail(needLabel(ECONOMY.draughtCost - run.skillPoints));
    }
    return {
      run: {
        ...run,
        skillPoints: run.skillPoints - ECONOMY.draughtCost,
        draughtCarried: true,
      },
      item,
      success: true,
      message: "Purchased: Healing draught",
      tone: "success",
      maxHpGain: 0,
    };
  }

  if (run.vigorPurchased) {
    return fail("Vigor was already purchased this run.");
  }
  if (run.skillPoints < ECONOMY.vigorCost) {
    return fail(needLabel(ECONOMY.vigorCost - run.skillPoints));
  }
  return {
    run: {
      ...run,
      skillPoints: run.skillPoints - ECONOMY.vigorCost,
      vigorPurchased: true,
    },
    item,
    success: true,
    message: `Vigor purchased · Max HP +${ECONOMY.vigorMaxHpGain}`,
    tone: "success",
    maxHpGain: ECONOMY.vigorMaxHpGain,
  };
}

/**
 * Uses the carried draught. Full HP is blocked and keeps the draught; an empty
 * slot is a no-op. Healing caps at maximum HP.
 */
export function useDraught(run: RunState, player: Player): DraughtOutcome {
  if (!run.draughtCarried) {
    return {
      run,
      hp: player.hp,
      healed: 0,
      consumed: false,
      reason: "empty",
      message: "No draught",
    };
  }

  if (player.hp >= player.maxHp) {
    return {
      run,
      hp: player.hp,
      healed: 0,
      consumed: false,
      reason: "full",
      message: "Already at full HP",
    };
  }

  const healed = Math.min(ECONOMY.draughtHeal, player.maxHp - player.hp);
  return {
    run: { ...run, draughtCarried: false },
    hp: player.hp + healed,
    healed,
    consumed: true,
    reason: null,
    message: `+${healed} HP`,
  };
}

/** Clamps a shop selection index to the current row count. */
export function clampSelection(selection: number, rowCount: number): number {
  return Math.max(0, Math.min(selection, Math.max(0, rowCount - 1)));
}
