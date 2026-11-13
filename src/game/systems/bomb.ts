import { BOMB } from "../data/config";
import type { Bomb, Player, Vec2 } from "../types";

export interface BombStep {
  bomb: Bomb;
  landed: boolean;
  exploded: boolean;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Creates a bomb aimed at the target position captured at throw time. The
 * bomb arcs to that point, then burns its fuse. It flies over walls, so the
 * landing point is the only positional rule the player must read.
 */
export function spawnBomb(
  id: number,
  origin: Vec2,
  target: Vec2,
  damage: number,
): Bomb {
  return {
    id,
    x: origin.x,
    y: origin.y,
    fromX: origin.x,
    fromY: origin.y,
    targetX: target.x,
    targetY: target.y,
    flight: 0,
    landed: false,
    fuse: BOMB.fuse,
    radius: BOMB.radius,
    damage,
  };
}

/** Advances flight or fuse. Exploded bombs are removed by the caller. */
export function advanceBomb(bomb: Bomb, dt: number): BombStep {
  if (!bomb.landed) {
    const flight = bomb.flight + dt;
    if (flight >= BOMB.flightTime) {
      return {
        bomb: {
          ...bomb,
          x: bomb.targetX,
          y: bomb.targetY,
          flight: BOMB.flightTime,
          landed: true,
        },
        landed: true,
        exploded: false,
      };
    }

    const t = flight / BOMB.flightTime;
    return {
      bomb: {
        ...bomb,
        x: lerp(bomb.fromX, bomb.targetX, t),
        y: lerp(bomb.fromY, bomb.targetY, t),
        flight,
      },
      landed: false,
      exploded: false,
    };
  }

  const fuse = bomb.fuse - dt;
  if (fuse <= 0) {
    return { bomb: { ...bomb, fuse: 0 }, landed: false, exploded: true };
  }
  return { bomb: { ...bomb, fuse }, landed: false, exploded: false };
}

/** True when the blast radius reaches the player's body. */
export function bombHitsPlayer(bomb: Bomb, player: Player): boolean {
  return (
    Math.hypot(bomb.x - player.x, bomb.y - player.y) <=
    BOMB.blastRadius + player.radius
  );
}

/** Visual arc height used by the renderer; zero once landed. */
export function bombArcHeight(bomb: Bomb): number {
  if (bomb.landed) return 0;
  const t = Math.min(1, bomb.flight / BOMB.flightTime);
  return Math.sin(Math.PI * t) * BOMB.arcHeight;
}
