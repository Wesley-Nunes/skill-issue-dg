import { ZOOM } from "../../game/data/config";
import type { InputFrame, Player, Vec2 } from "../../game/types";

export class Input {
  private readonly keys = new Set<string>();
  private readonly mouse = { x: 0, y: 0 };
  private attackQueued = false;
  private dodgeQueued = false;
  private restartQueued = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("contextmenu", this.onContextMenu);
  }

  sample(player: Player, camera: Vec2): InputFrame {
    const move = {
      x: (this.keys.has("a") ? -1 : 0) + (this.keys.has("d") ? 1 : 0),
      y: (this.keys.has("w") ? -1 : 0) + (this.keys.has("s") ? 1 : 0),
    };

    const pointer = {
      x: camera.x + this.mouse.x / ZOOM,
      y: camera.y + this.mouse.y / ZOOM,
    };
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const length = Math.hypot(dx, dy);
    const aim =
      length > 0.001
        ? { x: dx / length, y: dy / length }
        : { x: Math.SQRT1_2, y: -Math.SQRT1_2 };

    const attack = this.attackQueued;
    const dodge = this.dodgeQueued;
    const restart = this.restartQueued;
    this.attackQueued = false;
    this.dodgeQueued = false;
    this.restartQueued = false;

    return {
      move,
      aim,
      attack,
      dodge,
      restart,
      pointer,
    };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if (event.repeat) return;
    if (key === " ") {
      this.dodgeQueued = true;
      event.preventDefault();
    }
    if (key === "r") {
      this.restartQueued = true;
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    // One press advances one chain step; holding the button does not repeat.
    if (event.button === 0) this.attackQueued = true;
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
