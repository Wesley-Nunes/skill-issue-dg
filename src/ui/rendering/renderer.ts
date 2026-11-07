import {
  COMBO,
  ENEMY_FADE,
  MELEE,
  PLAYER,
  PURIFICATION,
  TILE,
  ZOOM,
} from "../../game/data/config";
import {
  floorTileAt,
  isWalkableTile,
  wallTiles,
} from "../../game/data/floor";
import { SPRITES } from "../../game/data/sprites";
import { comboWindowOpen } from "../../game/systems/combo";
import {
  fragmentPosition,
  hasAllFragmentsBroken,
} from "../../game/systems/purification";
import type {
  Enemy,
  Floor,
  GameEvent,
  GameState,
  Viewport,
} from "../../game/types";
import type { AssetMap } from "./assets";
import { CHAIN_BREAK_LIFE, VisualEffects } from "./effects";

const VOID_COLOR = "#0b0a0f";
const HUD_INSET = 24;
const HEART_SIZE = { width: 39, height: 36 };
const HEART_GAP = 6;
const SPIRIT_TEXT_TOP = 74;
const SPIRIT_BAR_TOP = 92;
const SPIRIT_BAR_WIDTH = 120;
const SPIRIT_BAR_HEIGHT = 6;
const SPIRIT_COLOR = "#bfe9ff";
const SPIRIT_TRACK = "rgba(191, 233, 255, 0.16)";
const SPIRIT_BORDER = "rgba(191, 233, 255, 0.45)";
const PROJECTILE_BODY = "rgba(200, 166, 255, 0.85)";
const PROJECTILE_CORE = "rgba(255, 255, 255, 0.95)";
const COMBO_PIP_RADIUS = 2.2;
const COMBO_PIP_SPACING = 7.6;
const COMBO_GAUGE_OFFSET = 34;
const COMBO_PIP_COLOR = "#f2d38a";
const COMBO_PIP_ACTIVE = "rgba(255, 255, 255, 0.92)";
const COMBO_PIP_IDLE = "rgba(255, 255, 255, 0.28)";
const COMBO_BREAK_COLOR = "255, 92, 82";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function stepDefinition(step: number) {
  return COMBO.steps[step - 1] ?? COMBO.steps[0];
}

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private background: HTMLCanvasElement | null = null;
  private backgroundKey = "";
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

    context.drawImage(this.ensureBackground(state.floor), 0, 0);
    this.drawStairs(state);
    this.drawShadows(state);
    this.drawEntities(state);
    this.drawFragments(state);
    this.drawAfterimages(state);
    this.drawProjectiles(state);
    this.drawSword(state);
    this.drawSwing(state);
    this.drawTelegraphs(state);
    this.drawSparks(state);
    this.drawComboGauge(state);
    this.drawAim(state);

    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawHud(state, cssWidth, cssHeight);
    this.drawFloorEntryFlash(state, cssWidth, cssHeight);
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

  private ensureBackground(floor: Floor): HTMLCanvasElement {
    const key = `${floor.seed}:${floor.depth}`;
    if (this.background && this.backgroundKey === key) {
      return this.background;
    }

    const canvas = document.createElement("canvas");
    canvas.width = floor.width;
    canvas.height = floor.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    context.imageSmoothingEnabled = false;
    context.fillStyle = VOID_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < floor.rows; row += 1) {
      for (let column = 0; column < floor.cols; column += 1) {
        if (!isWalkableTile(floor, column, row)) continue;
        const tile = this.assets.get(floorTileAt(column, row));
        if (tile) {
          context.drawImage(tile, column * TILE, row * TILE);
        }
      }
    }

    for (const wall of wallTiles(floor)) {
      const tile = this.assets.get(wall.file);
      if (tile) {
        context.drawImage(tile, wall.x, wall.y);
      }
    }

    this.background = canvas;
    this.backgroundKey = key;
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

  private drawStairs(state: GameState): void {
    const context = this.context;
    const stairs = state.floor.stairs;
    const open = state.run.exitOpen;
    const pulse = 0.55 + 0.25 * Math.sin(state.time * 5);
    const centreX = stairs.x + stairs.width / 2;
    const centreY = stairs.y + stairs.height / 2;

    if (open) {
      context.fillStyle = `rgba(191, 233, 255, ${0.12 + 0.05 * pulse})`;
      context.fillRect(
        stairs.x - 5,
        stairs.y - 5,
        stairs.width + 10,
        stairs.height + 10,
      );
    }

    context.fillStyle = open
      ? "rgba(12, 24, 32, 0.92)"
      : "rgba(4, 6, 10, 0.85)";
    context.fillRect(
      stairs.x + 2,
      stairs.y + 2,
      stairs.width - 4,
      stairs.height - 4,
    );

    context.strokeStyle = open
      ? `rgba(191, 233, 255, ${pulse})`
      : "rgba(150, 150, 165, 0.35)";
    context.lineWidth = 1.5;
    context.strokeRect(
      stairs.x + 2,
      stairs.y + 2,
      stairs.width - 4,
      stairs.height - 4,
    );

    context.strokeStyle = open
      ? "rgba(191, 233, 255, 0.75)"
      : "rgba(130, 130, 145, 0.35)";
    context.lineWidth = 1;
    for (let index = 0; index < 3; index += 1) {
      const inset = 6 + index * 5;
      context.beginPath();
      context.moveTo(stairs.x + inset, stairs.y + inset);
      context.lineTo(
        stairs.x + stairs.width - inset,
        stairs.y + inset,
      );
      context.stroke();
    }

    context.strokeStyle = open
      ? `rgba(191, 233, 255, ${0.55 + 0.3 * pulse})`
      : "rgba(150, 150, 165, 0.35)";
    context.lineWidth = 1.6;
    for (let index = 0; index < 2; index += 1) {
      const offset = (index - 0.5) * 7;
      context.beginPath();
      context.moveTo(centreX - 5, centreY + offset - 2);
      context.lineTo(centreX, centreY + offset + 2);
      context.lineTo(centreX + 5, centreY + offset - 2);
      context.stroke();
    }
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
    for (const enemy of state.enemies) {
      if (enemy.status !== "dead") draw(enemy.x, enemy.y);
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
    const items: Array<{ y: number; draw: () => void }> = [
      { y: state.player.y, draw: () => this.drawPlayerSprite(state) },
    ];
    for (const enemy of state.enemies) {
      if (enemy.status === "dead") continue;
      items.push({ y: enemy.y, draw: () => this.drawEnemySprite(state, enemy) });
    }

    items.sort((a, b) => a.y - b.y);
    for (const item of items) item.draw();
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
    const index = hurt ? 0 : Math.floor(state.time * fps) % frames.length;
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

  private drawEnemySprite(state: GameState, enemy: Enemy): void {
    const context = this.context;
    const ranged = enemy.kind === "ranged";
    const frames = enemy.moving
      ? ranged
        ? SPRITES.rangedRun
        : SPRITES.enemyRun
      : ranged
        ? SPRITES.rangedIdle
        : SPRITES.enemyIdle;
    const fps = enemy.moving ? 10 : 6;
    const index = Math.floor(state.time * fps) % frames.length;
    const file = frames[index] ?? frames[0];
    if (!file) return;

    const telegraphing = enemy.windup > 0;
    const readyToRest =
      enemy.status === "alive" && hasAllFragmentsBroken(enemy);
    const sprite =
      enemy.hurtFlash > 0
        ? this.tint(file, "rgba(255, 255, 255, 0.85)")
        : enemy.stagger > 0
          ? this.tint(file, "rgba(180, 200, 255, 0.35)")
          : telegraphing
            ? this.tint(file, "rgba(255, 70, 60, 0.55)")
            : readyToRest
              ? this.tint(file, "rgba(191, 233, 255, 0.4)")
              : this.image(file);

    const facing = state.player.x < enemy.x ? -1 : 1;
    const alpha =
      enemy.status === "dying" ? clamp(enemy.fade / ENEMY_FADE, 0, 1) : 1;
    const height = ranged ? 16 : 23;

    if (enemy.status === "alive" && hasAllFragmentsBroken(enemy)) {
      const pulse = 0.45 + 0.18 * Math.sin(state.time * 6);
      context.strokeStyle = `rgba(191, 233, 255, ${pulse})`;
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(enemy.x, enemy.y - 10, 13, 0, Math.PI * 2);
      context.stroke();
    }

    context.save();
    context.globalAlpha = alpha;
    context.translate(Math.round(enemy.x), Math.round(enemy.y));
    context.scale(facing, 1);
    context.drawImage(sprite, -8, -height);
    context.restore();
    context.globalAlpha = 1;
  }

  /** Intact spirit fragments orbiting each living enemy. */
  private drawFragments(state: GameState): void {
    const context = this.context;

    for (const enemy of state.enemies) {
      if (enemy.status !== "alive") continue;
      enemy.fragments.forEach((intact, index) => {
        if (!intact) return;
        const position = fragmentPosition(enemy, index);
        const bob =
          Math.sin(state.time * PURIFICATION.bobSpeed + index * Math.PI) *
          PURIFICATION.bobAmplitude;
        const x = position.x;
        const y = position.y + bob;

        context.fillStyle = "rgba(191, 233, 255, 0.18)";
        context.beginPath();
        context.arc(x, y, PURIFICATION.fragmentRadius + 2.6, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = PURIFICATION.fragmentColor;
        context.beginPath();
        context.arc(x, y, PURIFICATION.fragmentRadius, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = "rgba(255, 255, 255, 0.9)";
        context.beginPath();
        context.arc(x, y - 0.6, 1.1, 0, Math.PI * 2);
        context.fill();
      });
    }
  }

  private drawProjectiles(state: GameState): void {
    const context = this.context;
    for (const projectile of state.projectiles) {
      const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
      const direction = { x: projectile.vx / speed, y: projectile.vy / speed };

      for (let index = 1; index <= 3; index += 1) {
        const offset = index * 3;
        context.fillStyle = `rgba(200, 166, 255, ${0.45 / index})`;
        context.beginPath();
        context.arc(
          Math.round(projectile.x - direction.x * offset),
          Math.round(projectile.y - direction.y * offset),
          2,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      context.fillStyle = PROJECTILE_BODY;
      context.beginPath();
      context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = PROJECTILE_CORE;
      context.beginPath();
      context.arc(projectile.x, projectile.y, 2, 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawSword(state: GameState): void {
    if (state.status === "dead") return;
    const player = state.player;
    const context = this.context;
    const aimAngle = Math.atan2(player.aim.y, player.aim.x);
    let swordAngle = aimAngle;

    if (player.comboStep > 0) {
      const definition = stepDefinition(player.comboStep);
      const sweep = definition.windup + definition.active;
      if (player.comboTime < sweep) {
        const progress = player.comboTime / sweep;
        const range = player.comboStep === 3 ? 90 : 70;
        swordAngle = aimAngle + (-range + 2 * range * progress) * (Math.PI / 180);
      }
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

    for (const swing of this.effects.swings) {
      const definition = stepDefinition(swing.step);
      const elapsed = state.time - swing.born;
      const activeEnd = definition.windup + definition.active;
      const fade = swing.step === 3 ? 0.18 : 0.12;
      if (elapsed < definition.windup || elapsed >= activeEnd + fade) continue;

      const alpha =
        elapsed < activeEnd
          ? swing.step === 3
            ? 0.55
            : 0.35
          : (swing.step === 3 ? 0.55 : 0.35) *
            (1 - (elapsed - activeEnd) / fade);
      const color =
        swing.step === 3
          ? `rgba(255, 226, 150, ${alpha})`
          : `rgba(255, 214, 120, ${alpha})`;

      context.fillStyle = color;
      context.beginPath();
      context.moveTo(state.player.x, state.player.y);
      context.arc(
        state.player.x,
        state.player.y,
        definition.reach,
        swing.angle - definition.halfAngle,
        swing.angle + definition.halfAngle,
      );
      context.closePath();
      context.fill();
    }
  }

  private drawTelegraphs(state: GameState): void {
    const context = this.context;

    for (const enemy of state.enemies) {
      if (enemy.status !== "alive" || enemy.windup <= 0) continue;

      if (enemy.kind === "melee") {
        context.strokeStyle = "rgba(255, 70, 60, 0.35)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(enemy.x, enemy.y, MELEE.attackRange, 0, Math.PI * 2);
        context.stroke();
        continue;
      }

      // The sight line is the ranged enemy's non-color telegraph cue and
      // mirrors the line-of-sight rule.
      context.strokeStyle = "rgba(255, 70, 60, 0.35)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(enemy.x, enemy.y);
      context.lineTo(state.player.x, state.player.y);
      context.stroke();
    }
  }

  private drawSparks(state: GameState): void {
    const context = this.context;
    context.lineWidth = 1;

    for (const spark of this.effects.sparks) {
      const age = state.time - spark.born;
      if (age < 0 || age >= spark.life) continue;
      const alpha = 1 - age / spark.life;
      context.globalAlpha = alpha;
      context.strokeStyle = spark.color;
      for (let index = 0; index < spark.count; index += 1) {
        const angle = (Math.PI * 2 * index) / spark.count + Math.PI / 4;
        const dx = Math.cos(angle) * spark.length;
        const dy = Math.sin(angle) * spark.length;
        context.beginPath();
        context.moveTo(spark.x, spark.y);
        context.lineTo(spark.x + dx, spark.y + dy);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }

  /** Three pips above the player: chain count, next input, and break feedback. */
  private drawComboGauge(state: GameState): void {
    if (state.status !== "playing") return;
    const player = state.player;

    if (player.comboStep > 0) {
      const windowOpen = comboWindowOpen(player);
      for (let index = 0; index < 3; index += 1) {
        const step = index + 1;
        const filled = step <= player.comboHits;
        const current = step === player.comboStep && !filled;
        const pulsing = windowOpen && step === player.comboStep + 1;
        const pulse = pulsing
          ? 1.4 + 0.1 * Math.sin(state.time * Math.PI * 16)
          : 1;
        const base = step === 3 ? COMBO_PIP_RADIUS + 0.9 : COMBO_PIP_RADIUS;

        this.drawPip(
          player.x + (index - 1) * COMBO_PIP_SPACING,
          player.y - COMBO_GAUGE_OFFSET,
          base * pulse,
          filled ? COMBO_PIP_COLOR : current ? COMBO_PIP_ACTIVE : COMBO_PIP_IDLE,
        );
      }
    }

    for (const burst of this.effects.chainBreaks) {
      const age = state.time - burst.born;
      if (age < 0 || age >= CHAIN_BREAK_LIFE) continue;
      const progress = age / CHAIN_BREAK_LIFE;
      for (let index = 0; index < 3; index += 1) {
        this.drawPip(
          burst.x +
            (index - 1) * COMBO_PIP_SPACING * (1 - progress * 0.75),
          burst.y - COMBO_GAUGE_OFFSET - progress * 3,
          COMBO_PIP_RADIUS * (1 - progress * 0.6),
          `rgba(${COMBO_BREAK_COLOR}, ${1 - progress})`,
        );
      }
    }
  }

  private drawPip(x: number, y: number, radius: number, color: string): void {
    const context = this.context;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(0, 0, 0, 0.55)";
    context.lineWidth = 0.6;
    context.stroke();
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
    cssWidth: number,
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

    context.textAlign = "right";
    context.textBaseline = "top";
    context.font = "16px system-ui, sans-serif";
    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    context.fillText(
      `Depth ${state.run.depth}`,
      cssWidth - HUD_INSET,
      HUD_INSET,
    );
    context.font = "13px system-ui, sans-serif";
    context.fillStyle = state.run.exitOpen
      ? SPIRIT_COLOR
      : "rgba(255, 255, 255, 0.55)";
    context.fillText(
      state.run.exitOpen ? "Stairs open" : "Stairs sealed",
      cssWidth - HUD_INSET,
      HUD_INSET + 23,
    );
    context.textAlign = "left";

    // The spirit meter is hidden on the death screen, which covers the HUD.
    if (state.status === "playing") {
      const percent = Math.round(state.run.spirit);

      context.font = "14px system-ui, sans-serif";
      context.textBaseline = "top";
      context.textAlign = "left";
      context.fillStyle =
        state.run.spirit > 0 ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.7)";
      context.fillText(`Spirit: ${percent}%`, HUD_INSET, SPIRIT_TEXT_TOP);

      context.fillStyle = SPIRIT_TRACK;
      context.fillRect(
        HUD_INSET,
        SPIRIT_BAR_TOP,
        SPIRIT_BAR_WIDTH,
        SPIRIT_BAR_HEIGHT,
      );
      context.fillStyle = SPIRIT_COLOR;
      context.fillRect(
        HUD_INSET,
        SPIRIT_BAR_TOP,
        Math.round(
          (SPIRIT_BAR_WIDTH * state.run.spirit) / PURIFICATION.spiritThreshold,
        ),
        SPIRIT_BAR_HEIGHT,
      );
      context.strokeStyle = SPIRIT_BORDER;
      context.lineWidth = 1;
      context.strokeRect(
        HUD_INSET + 0.5,
        SPIRIT_BAR_TOP + 0.5,
        SPIRIT_BAR_WIDTH - 1,
        SPIRIT_BAR_HEIGHT - 1,
      );
    }

    context.textBaseline = "bottom";
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.fillText(
      "WASD move · Mouse aim · LMB combo · Space dodge · R restart",
      HUD_INSET,
      cssHeight - HUD_INSET,
    );

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawFloorEntryFlash(
    state: GameState,
    cssWidth: number,
    cssHeight: number,
  ): void {
    if (state.status !== "playing") return;
    const context = this.context;

    if (state.time < 0.35) {
      context.fillStyle = `rgba(191, 233, 255, ${
        0.1 * (1 - state.time / 0.35)
      })`;
      context.fillRect(0, 0, cssWidth, cssHeight);
    }

    if (state.time < 1.6) {
      const fade = Math.min(1, (1.6 - state.time) / 0.45);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = `rgba(232, 247, 255, ${0.85 * fade})`;
      context.font = "30px system-ui, sans-serif";
      context.fillText(
        `Depth ${state.run.depth}`,
        cssWidth / 2,
        cssHeight * 0.2,
      );
      context.textAlign = "left";
    }
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
