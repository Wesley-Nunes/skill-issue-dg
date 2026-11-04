import type { GameEvent, GameState } from "../../game/types";

interface Spark {
  x: number;
  y: number;
  born: number;
  count: number;
  length: number;
  life: number;
  color: string;
}

interface Afterimage {
  x: number;
  y: number;
  born: number;
}

interface Swing {
  angle: number;
  step: number;
  born: number;
}

interface ChainBreak {
  x: number;
  y: number;
  born: number;
}

const AFTERIMAGE_LIFE = 0.2;
const AFTERIMAGE_INTERVAL = 0.04;
const AFTERIMAGES_PER_DODGE = 2;
const SWING_LIFE = 0.6;
export const CHAIN_BREAK_LIFE = 0.18;
const SPARK_COLOR = "rgba(255, 255, 255, 1)";
const WALL_SPARK_COLOR = "rgba(220, 210, 255, 0.9)";

export class VisualEffects {
  sparks: Spark[] = [];
  afterimages: Afterimage[] = [];
  swings: Swing[] = [];
  chainBreaks: ChainBreak[] = [];
  /** Timestamp of the last combo reward, or -Infinity when none is showing. */
  noticeAt = Number.NEGATIVE_INFINITY;

  private lastCapture = 0;
  private dodgeCaptures = 0;

  handle(events: GameEvent[], state: GameState): void {
    for (const event of events) {
      switch (event.type) {
        case "enemy-hit":
          this.sparks.push(
            event.finisher
              ? {
                  x: event.x,
                  y: event.y,
                  born: state.time,
                  count: 6,
                  length: 12,
                  life: 0.16,
                  color: SPARK_COLOR,
                }
              : {
                  x: event.x,
                  y: event.y,
                  born: state.time,
                  count: 4,
                  length: 8,
                  life: 0.12,
                  color: SPARK_COLOR,
                },
          );
          break;
        case "player-hit":
        case "projectile-hit":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 4,
            length: 8,
            life: 0.12,
            color: SPARK_COLOR,
          });
          break;
        case "projectile-blocked":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 4,
            length: 6,
            life: 0.1,
            color: WALL_SPARK_COLOR,
          });
          break;
        case "attack-started":
          this.swings.push({
            angle: event.angle,
            step: event.step,
            born: state.time,
          });
          break;
        case "combo-ended":
          if (event.reason !== "complete") {
            this.chainBreaks.push({
              x: event.x,
              y: event.y,
              born: state.time,
            });
          }
          break;
        case "challenge-complete":
          this.noticeAt = state.time;
          break;
        case "run-reset":
          this.sparks = [];
          this.afterimages = [];
          this.swings = [];
          this.chainBreaks = [];
          this.noticeAt = Number.NEGATIVE_INFINITY;
          this.lastCapture = 0;
          this.dodgeCaptures = 0;
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
    this.sparks = this.sparks.filter((spark) => time - spark.born < spark.life);
    this.afterimages = this.afterimages.filter(
      (image) => time - image.born < AFTERIMAGE_LIFE,
    );
    this.swings = this.swings.filter((swing) => time - swing.born < SWING_LIFE);
    this.chainBreaks = this.chainBreaks.filter(
      (burst) => time - burst.born < CHAIN_BREAK_LIFE,
    );
  }
}
