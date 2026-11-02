import type { GameEvent, GameState } from "../../game/types";

interface Spark {
  x: number;
  y: number;
  born: number;
}

interface Afterimage {
  x: number;
  y: number;
  born: number;
}

interface Swing {
  angle: number;
  born: number;
}

const SPARK_LIFE = 0.12;
const AFTERIMAGE_LIFE = 0.2;
const SWING_LIFE = 0.42;
const AFTERIMAGE_INTERVAL = 0.04;
const AFTERIMAGES_PER_DODGE = 2;

export class VisualEffects {
  sparks: Spark[] = [];
  afterimages: Afterimage[] = [];
  swings: Swing[] = [];
  enemyHitAt = Number.NEGATIVE_INFINITY;

  private lastCapture = 0;
  private dodgeCaptures = 0;

  handle(events: GameEvent[], state: GameState): void {
    for (const event of events) {
      switch (event.type) {
        case "enemy-hit":
          this.sparks.push({ x: event.x, y: event.y, born: state.time });
          this.enemyHitAt = state.time;
          break;
        case "player-hit":
          this.sparks.push({ x: event.x, y: event.y, born: state.time });
          break;
        case "attack-started":
          this.swings.push({ angle: event.angle, born: state.time });
          break;
        default:
          break;
      }
    }
  }

  captureDodge(state: GameState): void {
    if (state.player.dodgeTime <= 0) {
      this.lastCapture = 0;
      this.dodgeCaptures = 0;
      return;
    }
    if (this.dodgeCaptures >= AFTERIMAGES_PER_DODGE) return;
    if (state.time - this.lastCapture >= AFTERIMAGE_INTERVAL) {
      this.afterimages.push({
        x: state.player.x,
        y: state.player.y,
        born: state.time,
      });
      this.lastCapture = state.time;
      this.dodgeCaptures += 1;
    }
  }

  prune(time: number): void {
    this.sparks = this.sparks.filter((spark) => time - spark.born < SPARK_LIFE);
    this.afterimages = this.afterimages.filter(
      (image) => time - image.born < AFTERIMAGE_LIFE,
    );
    this.swings = this.swings.filter((swing) => time - swing.born < SWING_LIFE);
  }
}
