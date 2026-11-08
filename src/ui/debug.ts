import type { DebugSnapshot } from "../game/types";
import type { AudioSnapshot } from "./audio/audio";
import type { BootSnapshot } from "./boot/screen";

export type { AudioSnapshot, BootSnapshot, DebugSnapshot };

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
    __bootDebug?: {
      getState(): BootSnapshot;
    };
  }
}
