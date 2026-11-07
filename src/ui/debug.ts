import type { DebugSnapshot } from "../game/types";
import type { AudioSnapshot } from "./audio/audio";

export type { AudioSnapshot, DebugSnapshot };

declare global {
  interface Window {
    __gameDebug?: {
      getSnapshot(): DebugSnapshot;
      /** Test-only shortcut that rests the floor and summons the Warden. */
      summonBoss(): void;
    };
    __audioDebug?: {
      getState(): AudioSnapshot;
    };
  }
}
