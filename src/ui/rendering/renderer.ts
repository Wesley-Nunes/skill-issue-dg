import {
  ATTACK,
  ENEMY,
  PLAYER,
  TILE,
  WORLD,
  ZOOM,
} from "../../game/data/config";
import { floorTileAt, wallTiles } from "../../game/data/room";
import { SPRITES } from "../../game/data/sprites";
import type {
  GameEvent,
  GameState,
  Viewport,
} from "../../game/types";
import type { AssetMap } from "./assets";
import { VisualEffects } from "./effects";

const VOID_COLOR = "#0b0a0f";
const HUD_INSET = 24;
const HEART_SIZE = { width: 39, height: 36 };
const HEART_GAP = 6;
const SPARK_LENGTH = 8;
const SWING_HALF_ANGLE = (55 * Math.PI) / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly background: HTMLCanvasElement;
  private readonly tintCache = new Map<string, HTMLCanvasElement>();
  private readonly effects = new VisualEffects();
  private dpr = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: AssetMap,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    this.context = context;
    this.background = this.buildBackground();
  }

  worldViewport(): Viewport {
    return {
      width: Math.max(1, this.canvas.clientWidth) / ZOOM,
      height: Math.max(1, this.canvas.clientHeight) / ZOOM,
    };
  }

  draw(state: GameState, events: GameEvent[]): void {
    const { cssWidth, cssHeight } = this.syncSize();
    this.effects.handle(events, state);
    this.effects.captureDodge(state);
    this.effects.prune(state.time);

    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = VOID_COLOR;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scale = ZOOM * this.dpr;
    const cameraX = Math.round(state.camera.x);
    const cameraY = Math.round(state.camera.y);

    context.imageSmoothingEnabled = false;
    context.setTransform(
      scale,
      0,
      0,
      scale,
      -cameraX * scale,
      -cameraY * scale,
    );

    context.drawImage(this.background, 0, 0);
    this.drawShadows(state);
    this.drawEntities(state);
    this.drawAfterimages(state);
    this.drawSword(state);
    this.drawSwing(state);
    this.drawTelegraph(state);
    this.drawSparks(state);
    this.drawAim(state);

    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawHud(state, cssHeight);
    if (state.status === "dead") {
      this.drawDeathOverlay(cssWidth, cssHeight);
    }
  }

  private syncSize(): {
    cssWidth: number;
    cssHeight: number;
  } {
    const cssWidth = Math.max(1, this.canvas.clientWidth);
    const cssHeight = Math.max(1, this.canvas.clientHeight);
    const dpr = clamp(Math.round(window.devicePixelRatio || 1), 1, 2);
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.dpr = dpr;
    return { cssWidth, cssHeight };
  }

  private buildBackground(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = WORLD.width;
    canvas.height = WORLD.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    context.imageSmoothingEnabled = false;
    context.fillStyle = VOID_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 2; row < WORLD.rows - 1; row += 1) {
      for (let column = 1; column < WORLD.cols - 1; column += 1) {
        const tile = this.assets.get(floorTileAt(column, row));
        if (tile) {
          context.drawImage(tile, column * TILE, row * TILE);
        }
      }
    }

    for (const wall of wallTiles()) {
      const tile = this.assets.get(wall.file);
      if (tile) {
        context.drawImage(tile, wall.x, wall.y);
      }
    }

    return canvas;
  }

  private image(file: string): HTMLImageElement {
    const image = this.assets.get(file);
    if (!image) throw new Error(`Missing sprite: ${file}`);
    return image;
  }

  private tint(file: string, color: string): HTMLCanvasElement {
    const key = `${file}|${color}`;
    const cached = this.tintCache.get(key);
    if (cached) return cached;

    const image = this.image(file);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = "source-atop";
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.tintCache.set(key, canvas);
    return canvas;
  }

  private drawShadows(state: GameState): void {
    const context = this.context;
    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    const draw = (x: number, y: number): void => {
      context.beginPath();
      context.ellipse(Math.round(x), Math.round(y), 6, 2.5, 0, 0, Math.PI * 2);
      context.fill();
    };

    draw(state.player.x, state.player.y);
    if (state.enemy.status !== "dead") {
      draw(state.enemy.x, state.enemy.y);
    }
  }

  private drawAfterimages(state: GameState): void {
    const context = this.context;
    const frame = this.image(SPRITES.playerIdle[0] ?? SPRITES.playerHurt);
    for (const image of this.effects.afterimages) {
      const age = state.time - image.born;
      if (age < 0 || age >= 0.2) continue;
      const alpha = 0.25 * (1 - age / 0.2);
      context.globalAlpha = alpha;
      context.drawImage(
        frame,
        Math.round(image.x) - 8,
        Math.round(image.y) - 28,
      );
    }
    context.globalAlpha = 1;
  }

  private drawEntities(state: GameState): void {
    const drawPlayer = (): void => {
      this.drawPlayerSprite(state);
    };

    const drawEnemy = (): void => {
      if (state.enemy.status === "dead") return;
      this.drawEnemySprite(state);
    };

    if (state.player.y <= state.enemy.y) {
      drawPlayer();
      drawEnemy();
    } else {
      drawEnemy();
      drawPlayer();
    }
  }

  private drawPlayerSprite(state: GameState): void {
    const player = state.player;
    const context = this.context;
    const hurt = player.hurtFlash > 0;
    const frames = hurt
      ? [SPRITES.playerHurt]
      : player.moving
        ? SPRITES.playerRun
        : SPRITES.playerIdle;
    const fps = hurt ? 1 : player.moving ? 12 : 6;
    const index = hurt
      ? 0
      : Math.floor(state.time * fps) % frames.length;
    const file = frames[index] ?? frames[0];
    if (!file) return;
    const flash = player.hurtFlash > PLAYER.hurtFlash - PLAYER.hurtFlashWhite;
    const sprite = flash
      ? this.tint(file, "rgba(255, 255, 255, 0.8)")
      : this.image(file);

    context.save();
    context.globalAlpha = player.dodgeTime > 0 ? 0.55 : 1;
    context.translate(Math.round(player.x), Math.round(player.y));
    context.scale(player.facing, 1);
    context.drawImage(sprite, -8, -28);
    context.restore();
    context.globalAlpha = 1;
  }

  private drawEnemySprite(state: GameState): void {
    const enemy = state.enemy;
    const context = this.context;
    const frames = enemy.moving ? SPRITES.enemyRun : SPRITES.enemyIdle;
    const fps = enemy.moving ? 10 : 6;
    const index = Math.floor(state.time * fps) % frames.length;
    const file = frames[index] ?? frames[0];
    if (!file) return;

    const hit = state.time - this.effects.enemyHitAt < 0.08;
    const telegraphing = enemy.windup > 0;
    const sprite = hit
      ? this.tint(file, "rgba(255, 255, 255, 0.85)")
      : telegraphing
        ? this.tint(file, "rgba(255, 70, 60, 0.55)")
        : this.image(file);

    const facing = state.player.x < enemy.x ? -1 : 1;
    const alpha =
      enemy.status === "dying" ? clamp(enemy.fade / ENEMY.fade, 0, 1) : 1;

    context.save();
    context.globalAlpha = alpha;
    context.translate(Math.round(enemy.x), Math.round(enemy.y));
    context.scale(facing, 1);
    context.drawImage(sprite, -8, -23);
    context.restore();
    context.globalAlpha = 1;
  }

  private drawSword(state: GameState): void {
    if (state.status === "dead") return;
    const player = state.player;
    const context = this.context;
    const aimAngle = Math.atan2(player.aim.y, player.aim.x);
    let swordAngle = aimAngle;

    if (
      player.attackTime >= 0 &&
      player.attackTime < ATTACK.windup + ATTACK.active
    ) {
      const progress =
        player.attackTime / (ATTACK.windup + ATTACK.active);
      swordAngle = aimAngle + (-70 + 140 * progress) * (Math.PI / 180);
    }

    context.save();
    context.translate(
      Math.round(player.x + player.aim.x * 6),
      Math.round(player.y - 8 + player.aim.y * 6),
    );
    context.rotate(swordAngle + Math.PI / 2);
    context.drawImage(this.image(SPRITES.sword), -5, -29, 10, 29);
    context.restore();
  }

  private drawSwing(state: GameState): void {
    const context = this.context;
    const player = state.player;
    const activeEnd = ATTACK.windup + ATTACK.active;

    for (const swing of this.effects.swings) {
      const elapsed = state.time - swing.born;
      if (elapsed < ATTACK.windup || elapsed >= activeEnd + 0.12) continue;

      const alpha =
        elapsed < activeEnd
          ? 0.35
          : 0.35 * (1 - (elapsed - activeEnd) / 0.12);
      context.fillStyle = `rgba(255, 214, 120, ${alpha})`;
      context.beginPath();
      context.moveTo(player.x, player.y);
      context.arc(
        player.x,
        player.y,
        ATTACK.reach,
        swing.angle - SWING_HALF_ANGLE,
        swing.angle + SWING_HALF_ANGLE,
      );
      context.closePath();
      context.fill();
    }
  }

  private drawTelegraph(state: GameState): void {
    const enemy = state.enemy;
    if (enemy.windup <= 0) return;

    const context = this.context;
    context.strokeStyle = "rgba(255, 70, 60, 0.35)";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(enemy.x, enemy.y, ENEMY.attackRange, 0, Math.PI * 2);
    context.stroke();
  }

  private drawSparks(state: GameState): void {
    const context = this.context;
    context.lineWidth = 1;

    for (const spark of this.effects.sparks) {
      const age = state.time - spark.born;
      if (age < 0 || age >= 0.12) continue;
      const alpha = 1 - age / 0.12;
      context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      for (let index = 0; index < 4; index += 1) {
        const angle = (Math.PI / 4) * (index * 2 + 1);
        const dx = Math.cos(angle) * SPARK_LENGTH;
        const dy = Math.sin(angle) * SPARK_LENGTH;
        context.beginPath();
        context.moveTo(spark.x, spark.y);
        context.lineTo(spark.x + dx, spark.y + dy);
        context.stroke();
      }
    }
  }

  private drawAim(state: GameState): void {
    if (state.status === "dead") return;
    const context = this.context;
    const player = state.player;
    const pointer = state.pointer;

    context.strokeStyle = "rgba(255, 255, 255, 0.5)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(player.x + player.aim.x * 8, player.y + player.aim.y * 8);
    context.lineTo(player.x + player.aim.x * 20, player.y + player.aim.y * 20);
    context.stroke();

    const drawCross = (color: string, size: number): void => {
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(pointer.x - size, pointer.y);
      context.lineTo(pointer.x + size, pointer.y);
      context.moveTo(pointer.x, pointer.y - size);
      context.lineTo(pointer.x, pointer.y + size);
      context.stroke();
    };
    drawCross("rgba(0, 0, 0, 0.8)", 5);
    drawCross("rgba(255, 255, 255, 0.7)", 4);
  }

  private drawHud(
    state: GameState,
    cssHeight: number,
  ): void {
    const context = this.context;
    const full = Math.floor(state.player.hp / 2);
    const half = state.player.hp % 2;

    for (let index = 0; index < 3; index += 1) {
      const file =
        index < full
          ? SPRITES.heartFull
          : index === full && half === 1
            ? SPRITES.heartHalf
            : SPRITES.heartEmpty;
      context.drawImage(
        this.image(file),
        HUD_INSET + index * (HEART_SIZE.width + HEART_GAP),
        HUD_INSET,
        HEART_SIZE.width,
        HEART_SIZE.height,
      );
    }

    context.font = "14px system-ui, sans-serif";
    context.textBaseline = "bottom";
    context.textAlign = "left";
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.fillText(
      "WASD move · Mouse aim · LMB attack · Space dodge · R restart",
      HUD_INSET,
      cssHeight - HUD_INSET,
    );

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawDeathOverlay(cssWidth: number, cssHeight: number): void {
    const context = this.context;
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, 0, cssWidth, cssHeight);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f2e9da";
    context.font = "48px system-ui, sans-serif";
    context.fillText("You died", cssWidth / 2, cssHeight / 2 - 20);

    context.fillStyle = "rgba(255, 255, 255, 0.8)";
    context.font = "20px system-ui, sans-serif";
    context.fillText("Press R to restart", cssWidth / 2, cssHeight / 2 + 30);

    context.textAlign = "left";
  }
}
