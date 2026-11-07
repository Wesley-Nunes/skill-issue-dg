import { DODGE, PLAYER } from "../data/config";
import type { Floor, Player, Vec2 } from "../types";
import { moveCircle } from "./collision";

/** Clamps raw movement input to a unit vector so diagonals are not faster. */
export function normalizeMove(move: Vec2): Vec2 {
  const length = Math.hypot(move.x, move.y);
  if (length === 0) return { x: 0, y: 0 };
  if (length <= 1) return { x: move.x, y: move.y };
  return { x: move.x / length, y: move.y / length };
}

export function movePlayer(
  player: Player,
  move: Vec2,
  dt: number,
  floor: Floor,
): Player {
  const dodging = player.dodgeTime > 0;
  const direction = dodging ? player.dodgeDir : normalizeMove(move);
  const speed = dodging ? DODGE.distance / DODGE.duration : PLAYER.speed;
  // A dodge only advances for the time left in its window, so a long frame
  // cannot push the player past the configured distance.
  const step = dodging ? Math.min(dt, player.dodgeTime) : dt;
  const position = moveCircle(
    floor,
    player.x,
    player.y,
    direction.x * speed * step,
    direction.y * speed * step,
    player.radius,
  );

  return {
    ...player,
    x: position.x,
    y: position.y,
    moving: direction.x !== 0 || direction.y !== 0,
  };
}
