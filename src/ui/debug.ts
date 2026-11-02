import type { GameStatus, Vec2, Viewport } from "../game/types";

export interface DebugSnapshot {
  time: number;
  status: GameStatus;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    aimX: number;
    aimY: number;
    dodging: boolean;
    invulnerable: number;
  };
  enemy: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    status: string;
  };
  camera: Vec2;
  pointer: Vec2;
  viewport: Viewport;
  zoom: number;
}

declare global {
  interface Window {
    __gameDebug?: {
      getSnapshot(): DebugSnapshot;
    };
  }
}
