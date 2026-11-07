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

interface Explosion {
  x: number;
  y: number;
  born: number;
  radius: number;
}

interface Ring {
  x: number;
  y: number;
  born: number;
  radius: number;
  life: number;
  color: string;
}

interface Flash {
  born: number;
  life: number;
}

interface HealPulse {
  born: number;
}

export const EXPLOSION_LIFE = 0.25;
export const HEAL_PULSE_LIFE = 0.7;
export const SUMMON_RING_LIFE = 0.6;
export const SUMMON_FLASH_LIFE = 0.6;

const AFTERIMAGE_LIFE = 0.2;
const AFTERIMAGE_INTERVAL = 0.04;
const AFTERIMAGES_PER_DODGE = 2;
const SWING_LIFE = 0.6;
export const CHAIN_BREAK_LIFE = 0.18;
const SPARK_COLOR = "rgba(255, 255, 255, 1)";
const WALL_SPARK_COLOR = "rgba(220, 210, 255, 0.9)";
const FRAGMENT_COLOR = "rgba(191, 233, 255, 1)";
const RESTORED_COLOR = "rgba(150, 220, 255, 0.9)";
const RESTED_COLOR = "rgba(220, 245, 255, 1)";
const RESPAWN_COLOR = "rgba(150, 120, 200, 0.85)";

export class VisualEffects {
  sparks: Spark[] = [];
  afterimages: Afterimage[] = [];
  swings: Swing[] = [];
  chainBreaks: ChainBreak[] = [];
  explosions: Explosion[] = [];
  rings: Ring[] = [];
  flashes: Flash[] = [];
  healPulses: HealPulse[] = [];

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
        case "fragment-broken":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 6,
            length: 7,
            life: 0.18,
            color: FRAGMENT_COLOR,
          });
          break;
        case "fragments-restored":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 5,
            length: 9,
            life: 0.22,
            color: RESTORED_COLOR,
          });
          break;
        case "enemy-rested":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 8,
            length: 14,
            life: 0.35,
            color: RESTED_COLOR,
          });
          break;
        case "enemy-respawned":
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 4,
            length: 8,
            life: 0.2,
            color: RESPAWN_COLOR,
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
        case "boss-summoned":
          this.rings.push({
            x: event.x,
            y: event.y,
            born: state.time,
            radius: 60,
            life: SUMMON_RING_LIFE,
            color: "255, 92, 82",
          });
          this.flashes.push({
            born: state.time,
            life: SUMMON_FLASH_LIFE,
          });
          break;
        case "bomb-exploded":
          this.explosions.push({
            x: event.x,
            y: event.y,
            born: state.time,
            radius: event.radius,
          });
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 8,
            length: 14,
            life: 0.22,
            color: "rgba(255, 170, 90, 1)",
          });
          break;
        case "boss-defeated":
          this.rings.push({
            x: event.x,
            y: event.y,
            born: state.time,
            radius: 44,
            life: 0.5,
            color: "255, 92, 82",
          });
          this.sparks.push({
            x: event.x,
            y: event.y,
            born: state.time,
            count: 10,
            length: 18,
            life: 0.35,
            color: "rgba(255, 150, 90, 1)",
          });
          break;
        case "player-healed":
          this.healPulses.push({ born: state.time });
          break;
        case "run-reset":
          this.sparks = [];
          this.afterimages = [];
          this.swings = [];
          this.chainBreaks = [];
          this.explosions = [];
          this.rings = [];
          this.flashes = [];
          this.healPulses = [];
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
    this.explosions = this.explosions.filter(
      (explosion) => time - explosion.born < EXPLOSION_LIFE,
    );
    this.rings = this.rings.filter((ring) => time - ring.born < ring.life);
    this.flashes = this.flashes.filter(
      (flash) => time - flash.born < flash.life,
    );
    this.healPulses = this.healPulses.filter(
      (pulse) => time - pulse.born < HEAL_PULSE_LIFE,
    );
  }
}
