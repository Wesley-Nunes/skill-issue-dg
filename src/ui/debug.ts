import type { DebugSnapshot } from "../game/types";

export type { DebugSnapshot };

declare global {
  interface Window {
    __gameDebug?: {
      getSnapshot(): DebugSnapshot;
    };
  }
}
