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
      /** Test-only: rests every mob and awards the normal points. */
      restMobs(): void;
      /** Test-only: leaves one enemy one hit from a successful rest. */
      prepareRest(id: string): void;
      /** Test-only: grants skill points. */
      giveSkillPoints(amount: number): void;
      /** Test-only: moves the player without walking. */
      teleport(x: number, y: number): void;
      /** Test-only: unlocks the arena without summoning. */
      prepareRite(): void;
      /** Test-only: leaves the Warden one hit from defeat. */
      weakenBoss(hp?: number): void;
      /** Test-only: sets the player's current HP. */
      setPlayerHp(hp: number): void;
      /** Test-only: ends the run. */
      killPlayer(): void;
      /** Test-only: descends immediately. */
      descend(): void;
    };
    __audioDebug?: {
      getState(): AudioSnapshot;
    };
    __bootDebug?: {
      getState(): BootSnapshot;
    };
  }
}
