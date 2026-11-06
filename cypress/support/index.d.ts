import type { DebugSnapshot } from "../../src/game/types";
import type { ClickWorldOptions, WalkOptions } from "./game";

declare global {
  namespace Cypress {
    interface Chainable {
      /** Reads the game debug snapshot, waiting for the hook to be exposed. */
      gameSnapshot(): Chainable<DebugSnapshot>;
      /**
       * Retries until the snapshot satisfies the predicate, then yields the
       * matching snapshot. The label appears in the timeout error.
       */
      waitForGame(
        check: (snapshot: DebugSnapshot) => boolean,
        label: string,
        timeout?: number,
      ): Chainable<DebugSnapshot>;
      /** Waits until the player dies. */
      waitForDeath(timeout?: number): Chainable<DebugSnapshot>;
      /** Walks the player toward a fixed world position. */
      walkTo(
        worldX: number,
        worldY: number,
        options?: WalkOptions,
      ): Chainable<void>;
      /** Walks the player into melee range of the first living melee enemy. */
      approachMelee(options?: WalkOptions): Chainable<void>;
      /** Moves the pointer and clicks a world-space position on the canvas. */
      clickWorld(
        worldX: number,
        worldY: number,
        options?: ClickWorldOptions,
      ): Chainable<void>;
      /**
       * Clicks a world-space position and retries if the press was swallowed
       * before any swing or damage was observed. Yields once a swing is in
       * progress or an enemy lost health.
       */
      attackWorld(
        worldX: number,
        worldY: number,
        options?: { timeout?: number },
      ): Chainable<void>;
    }
  }
}

export {};
