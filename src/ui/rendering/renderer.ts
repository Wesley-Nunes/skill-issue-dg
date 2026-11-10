import {
  BOMB,
  BOSS,
  COMBO,
  ENEMY_FADE,
  GATE,
  MELEE,
  PLAYER,
  PURIFICATION,
  SHOP,
  TILE,
  ZOOM,
} from "../../game/data/config";
import {
  floorTileAt,
  isWalkableTile,
  wallTiles,
} from "../../game/data/floor";
import { SPRITES } from "../../game/data/sprites";
import { bombArcHeight } from "../../game/systems/bomb";
import { comboWindowOpen } from "../../game/systems/combo";
import {
  fragmentPosition,
  hasAllFragmentsBroken,
} from "../../game/systems/purification";
import { shopAvailable, shopRows } from "../../game/systems/shop";
import type {
  Bomb,
  Enemy,
  Floor,
  GameEvent,
  GameState,
  Viewport,
} from "../../game/types";
import type { AssetMap } from "./assets";
import {
  CHAIN_BREAK_LIFE,
  EXPLOSION_LIFE,
  FLOATING_TEXT_LIFE,
  HEAL_PULSE_LIFE,
  VisualEffects,
  type TextTone,
} from "./effects";
import { displayFont } from "./fonts";

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
const EMBER = "#ff6a4d";
const EMBER_TRACK = "rgba(255, 106, 77, 0.16)";
const EMBER_BORDER = "rgba(255, 106, 77, 0.55)";
const TITLE_TEXT = "#f2e9da";
const MUTED_TEXT = "rgba(255, 255, 255, 0.55)";
const HINT_TEXT = "rgba(255, 255, 255, 0.50)";
const SECONDARY_TEXT = "rgba(255, 255, 255, 0.70)";
const BOSS_BAR_MAX_WIDTH = 360;
const BOSS_BAR_HEIGHT = 10;
const SKILL_POINTS_TOP = 112;
const DRAUGHT_TOP = 136;
const PANEL_BG = "rgba(11, 10, 15, 0.94)";
const PANEL_BORDER = "rgba(191, 233, 255, 0.35)";
const PANEL_SELECTED = "rgba(191, 233, 255, 0.08)";
const PANEL_DIVIDER = "rgba(255, 255, 255, 0.12)";
const STALL_WOOD = "rgba(44, 36, 34, 0.95)";
const STALL_EDGE = "rgba(242, 233, 218, 0.18)";
const GATE_IRON = "rgba(38, 34, 44, 0.95)";
const GATE_HIGHLIGHT = "rgba(242, 233, 218, 0.25)";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toneColor(tone: TextTone): string {
  if (tone === "cyan") return SPIRIT_COLOR;
  if (tone === "ember") return EMBER;
  return SECONDARY_TEXT;
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

  private get reducedMotion(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  draw(state: GameState, events: GameEvent[], muted = false): void {
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
    this.drawShopDecor(state);
    this.drawWaystone(state);
    this.drawGate(state);
    this.drawAltar(state);
    this.drawStairs(state);
    this.drawShadows(state);
    this.drawBossAuras(state);
    this.drawEntities(state);
    this.drawFragments(state);
    this.drawAfterimages(state);
    this.drawProjectiles(state);
    this.drawBombs(state);
    this.drawSword(state);
    this.drawSwing(state);
    this.drawTelegraphs(state);
    this.drawSparks(state);
    this.drawExplosions(state);
    this.drawFloatingTexts(state);
    this.drawComboGauge(state);
    this.drawAim(state);

    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (state.status !== "title") {
      this.drawHud(state, cssWidth, cssHeight, muted);
    }
    this.drawBanners(state, cssWidth, cssHeight);
    this.drawFloorEntryFlash(state, cssWidth, cssHeight);
    this.drawScreenFlash(state, cssWidth, cssHeight);
    if (state.shop.open) {
      this.drawShopPanel(state, cssWidth, cssHeight);
    }

    if (state.status === "title") {
      this.drawTitleOverlay(cssWidth, cssHeight);
    } else if (state.status === "paused") {
      this.drawPauseOverlay(cssWidth, cssHeight);
    } else if (state.status === "dead") {
      this.drawDeathOverlay(state, cssWidth, cssHeight);
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

  private drawWorldLabel(
    text: string,
    x: number,
    y: number,
    color: string,
    size = 9,
    align: CanvasTextAlign = "center",
  ): void {
    const context = this.context;
    context.font = `${size}px system-ui, sans-serif`;
    context.textAlign = align;
    context.textBaseline = "middle";
    const width = context.measureText(text).width;
    const left = align === "center" ? x - width / 2 : x;
    context.fillStyle = "rgba(11, 10, 15, 0.80)";
    context.fillRect(left - 3, y - size / 2 - 2, width + 6, size + 4);
    context.strokeStyle = color;
    context.lineWidth = 0.5;
    context.strokeRect(left - 3, y - size / 2 - 2, width + 6, size + 4);
    context.fillStyle = color;
    context.fillText(text, x, y);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawShopDecor(state: GameState): void {
    const context = this.context;
    const shop = state.floor.shop;
    const closed = state.run.shopClosed;
    const player = state.player;
    const pulse = this.reducedMotion
      ? 0.7
      : 0.55 + 0.2 * (0.5 + 0.5 * Math.sin(state.time * 3));

    // Safe threshold: a cyan line with rune ticks across the entrance.
    const threshold = shop.threshold;
    context.strokeStyle = `rgba(191, 233, 255, ${0.45 + 0.15 * pulse})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(threshold.x, threshold.y + threshold.height / 2);
    context.lineTo(
      threshold.x + threshold.width,
      threshold.y + threshold.height / 2,
    );
    context.stroke();
    for (let index = 0; index < 2; index += 1) {
      const tickX = threshold.x + threshold.width * (0.3 + index * 0.4);
      context.beginPath();
      context.moveTo(tickX - 2, threshold.y + threshold.height / 2 - 3);
      context.lineTo(tickX, threshold.y + threshold.height / 2);
      context.lineTo(tickX + 2, threshold.y + threshold.height / 2 - 3);
      context.stroke();
    }

    // Stall: a simple procedural counter against the west wall.
    const stall = shop.stall;
    context.fillStyle = STALL_WOOD;
    context.fillRect(stall.x, stall.y, stall.width, stall.height);
    context.strokeStyle = STALL_EDGE;
    context.lineWidth = 1;
    context.strokeRect(stall.x + 0.5, stall.y + 0.5, stall.width - 1, stall.height - 1);

    // Awning: open stripes or a drawn-down closed band.
    if (closed) {
      context.fillStyle = "rgba(20, 16, 20, 0.95)";
      context.fillRect(stall.x, stall.y, stall.width, 5);
      context.strokeStyle = "rgba(255, 106, 77, 0.35)";
      context.strokeRect(stall.x, stall.y, stall.width, 5);
    } else {
      for (let index = 0; index < 4; index += 1) {
        context.fillStyle =
          index % 2 === 0
            ? "rgba(191, 233, 255, 0.30)"
            : "rgba(242, 233, 218, 0.18)";
        context.fillRect(stall.x + index * (stall.width / 4), stall.y, stall.width / 4, 4);
      }
    }

    // Bottle glyph and ember lantern.
    const bottleX = stall.x + stall.width / 2;
    const bottleY = stall.y + stall.height / 2 + 2;
    context.strokeStyle = closed ? "rgba(255,255,255,0.30)" : SPIRIT_COLOR;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(bottleX - 2, bottleY - 7);
    context.lineTo(bottleX + 2, bottleY - 7);
    context.lineTo(bottleX + 2, bottleY - 3);
    context.lineTo(bottleX + 4, bottleY + 1);
    context.lineTo(bottleX + 4, bottleY + 6);
    context.lineTo(bottleX - 4, bottleY + 6);
    context.lineTo(bottleX - 4, bottleY + 1);
    context.lineTo(bottleX - 2, bottleY - 3);
    context.closePath();
    context.stroke();

    context.fillStyle = closed
      ? "rgba(255, 106, 77, 0.35)"
      : `rgba(255, 106, 77, ${0.6 + 0.25 * pulse})`;
    context.beginPath();
    context.arc(stall.x + stall.width - 4, stall.y + 8, 2, 0, Math.PI * 2);
    context.fill();

    this.drawWorldLabel(
      closed ? "CLOSED" : "SHOP · SAFE",
      stall.x + stall.width / 2,
      stall.y - 7,
      closed ? "rgba(255, 106, 77, 0.85)" : SPIRIT_COLOR,
      9,
    );

    const inZone =
      player.x >= shop.interaction.x &&
      player.x <= shop.interaction.x + shop.interaction.width &&
      player.y >= shop.interaction.y &&
      player.y <= shop.interaction.y + shop.interaction.height;
    if (!inZone) return;

    if (shopAvailable(state.run)) {
      this.drawWorldLabel(
        "[E] Browse wares",
        stall.x + stall.width / 2,
        stall.y - 19,
        SPIRIT_COLOR,
        9,
      );
    } else if (closed) {
      this.drawWorldLabel(
        "[E] Shop closed",
        stall.x + stall.width / 2,
        stall.y - 19,
        "rgba(255, 255, 255, 0.55)",
        9,
      );
    }
  }

  private drawWaystone(state: GameState): void {
    const context = this.context;
    const point = state.floor.waystone;

    context.fillStyle = "rgba(24, 20, 30, 0.95)";
    context.fillRect(point.x - 5, point.y - 3, 10, 7);
    context.strokeStyle = "rgba(191, 233, 255, 0.35)";
    context.lineWidth = 1;
    context.strokeRect(point.x - 5, point.y - 3, 10, 7);

    context.strokeStyle = SPIRIT_COLOR;
    context.beginPath();
    context.moveTo(point.x - 3, point.y);
    context.lineTo(point.x - 6, point.y - 3);
    context.moveTo(point.x - 3, point.y);
    context.lineTo(point.x - 6, point.y + 3);
    context.stroke();

    context.strokeStyle = EMBER;
    context.beginPath();
    context.moveTo(point.x + 3, point.y);
    context.lineTo(point.x + 6, point.y - 3);
    context.moveTo(point.x + 3, point.y);
    context.lineTo(point.x + 6, point.y + 3);
    context.stroke();

    this.drawWorldLabel("SHOP", point.x - 12, point.y - 10, SPIRIT_COLOR, 8);
    this.drawWorldLabel("WARDEN", point.x + 13, point.y - 10, EMBER, 8);
  }

  private drawGate(state: GameState): void {
    const context = this.context;
    const gate = state.floor.gate;
    const open = state.run.floorPurified;
    const rested = state.enemies.filter(
      (enemy) => enemy.kind !== "boss" && enemy.rested,
    ).length;
    const total = state.enemies.filter((enemy) => enemy.kind !== "boss").length;
    const opening = !open
      ? 0
      : this.reducedMotion || state.run.gateOpenedAt === null
        ? 1
        : clamp(
            (state.time - state.run.gateOpenedAt) / GATE.openTime,
            0,
            1,
          );

    if (open) {
      context.fillStyle = `rgba(191, 233, 255, ${0.1 * opening})`;
      context.fillRect(gate.x, gate.y, gate.width, gate.height);
      context.strokeStyle = `rgba(191, 233, 255, ${opening})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(gate.x, gate.y);
      context.lineTo(gate.x, gate.y + 5);
      context.moveTo(gate.x + gate.width, gate.y);
      context.lineTo(gate.x + gate.width, gate.y + 5);
      context.moveTo(gate.x, gate.y + gate.height);
      context.lineTo(gate.x, gate.y + gate.height - 5);
      context.moveTo(gate.x + gate.width, gate.y + gate.height);
      context.lineTo(gate.x + gate.width, gate.y + gate.height - 5);
      context.stroke();
    }

    if (opening < 1) {
      // The bars sink into the floor as the arena opens.
      const sink = opening * (gate.height + 2);
      context.save();
      context.beginPath();
      context.rect(gate.x, gate.y, gate.width, gate.height);
      context.clip();
      context.fillStyle = GATE_IRON;
      context.fillRect(gate.x, gate.y + sink, gate.width, gate.height);
      context.strokeStyle = GATE_HIGHLIGHT;
      context.lineWidth = 1;
      for (let index = 0; index < 5; index += 1) {
        const barX = gate.x + 3 + index * ((gate.width - 6) / 4);
        context.beginPath();
        context.moveTo(barX, gate.y + 2 + sink);
        context.lineTo(barX, gate.y + gate.height - 2 + sink);
        context.stroke();
      }
      context.fillStyle = EMBER;
      context.beginPath();
      context.arc(
        gate.x + gate.width / 2,
        gate.y + gate.height / 2 + sink,
        2.5,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.restore();
    }

    this.drawWorldLabel(
      open ? "Arena open" : `Arena sealed · ${rested}/${total} at rest`,
      gate.x + gate.width / 2,
      gate.y - 8,
      open ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.60)",
      9,
    );
  }

  private drawAltar(state: GameState): void {
    const context = this.context;
    const altar = state.floor.altar;
    const centreX = altar.x + altar.width / 2;
    const centreY = altar.y + altar.height / 2;
    const unlocked = state.run.floorPurified;
    const summoned = state.run.bossAwake || state.run.exitOpen;
    const pulse = this.reducedMotion
      ? 0.75
      : 0.55 + 0.25 * (0.5 + 0.5 * Math.sin((state.time / 2) * Math.PI * 2));
    const color = summoned
      ? "rgba(255, 106, 77, 0.55)"
      : unlocked
        ? `rgba(191, 233, 255, ${pulse})`
        : "rgba(130, 130, 145, 0.45)";

    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(centreX, centreY, 13, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(centreX, centreY, 7, 0, Math.PI * 2);
    context.stroke();

    for (let index = 0; index < 3; index += 1) {
      const angle = (Math.PI * 2 * index) / 3 - Math.PI / 2;
      const markX = centreX + Math.cos(angle) * 10;
      const markY = centreY + Math.sin(angle) * 10;
      const lit = unlocked && !summoned;
      context.fillStyle = lit ? SPIRIT_COLOR : "rgba(130, 130, 145, 0.45)";
      context.beginPath();
      context.arc(markX, markY, 1.8, 0, Math.PI * 2);
      context.fill();
    }

    if (!unlocked) {
      context.strokeStyle = "rgba(255, 106, 77, 0.45)";
      context.beginPath();
      context.moveTo(centreX - 5, centreY - 9);
      context.lineTo(centreX + 2, centreY - 2);
      context.lineTo(centreX - 2, centreY + 4);
      context.stroke();
    }

    if (!unlocked || summoned) return;
    const distance = Math.hypot(
      state.player.x - centreX,
      state.player.y - centreY,
    );
    if (distance > SHOP.altarPromptRange) return;

    this.drawWorldLabel(
      "[E] Summon the Warden",
      centreX,
      centreY - 22,
      SPIRIT_COLOR,
      9,
    );
    this.drawWorldLabel(
      "Closes the shop for this floor",
      centreX,
      centreY - 11,
      "rgba(255, 106, 77, 0.85)",
      8,
    );
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
      if (enemy.status === "dead") continue;
      if (enemy.kind === "boss") {
        context.beginPath();
        context.ellipse(
          Math.round(enemy.x),
          Math.round(enemy.y),
          12,
          4,
          0,
          0,
          Math.PI * 2,
        );
        context.fill();
        continue;
      }
      draw(enemy.x, enemy.y);
    }

    for (const bomb of state.bombs) {
      const x = bomb.landed ? bomb.x : bomb.targetX;
      const y = bomb.landed ? bomb.y : bomb.targetY;
      context.fillStyle = "rgba(0, 0, 0, 0.4)";
      context.beginPath();
      context.ellipse(
        Math.round(x),
        Math.round(y),
        bomb.landed ? 6 : 8,
        bomb.landed ? 3 : 4,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }

  /** Slow ember ring under the Warden so it reads heavier than a mob. */
  private drawBossAuras(state: GameState): void {
    const context = this.context;
    for (const enemy of state.enemies) {
      if (enemy.kind !== "boss" || enemy.status !== "alive") continue;
      const pulse = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(state.time * 2.5));
      context.strokeStyle = `rgba(255, 106, 77, ${pulse})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(enemy.x, enemy.y, 18, 0, Math.PI * 2);
      context.stroke();
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
    const boss = enemy.kind === "boss";
    const ranged = enemy.kind === "ranged";
    const frames = boss
      ? enemy.moving
        ? SPRITES.bossRun
        : SPRITES.bossIdle
      : enemy.moving
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
      !boss && enemy.status === "alive" && hasAllFragmentsBroken(enemy);
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
    const height = boss ? 36 : ranged ? 16 : 23;
    const offsetX = boss ? -16 : -8;

    if (readyToRest) {
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
    context.drawImage(sprite, offsetX, -height);
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

  private drawBombs(state: GameState): void {
    const context = this.context;

    for (const bomb of state.bombs) {
      if (!bomb.landed) {
        this.drawBombFlight(state, bomb);
        continue;
      }

      const remaining = Math.max(0, bomb.fuse);
      const speed = remaining < 0.35 ? 14 : 6;
      const pulse = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(state.time * speed));
      context.strokeStyle = `rgba(255, 92, 82, ${pulse})`;
      context.lineWidth = 1.6;
      context.beginPath();
      context.arc(bomb.x, bomb.y, BOMB.blastRadius, 0, Math.PI * 2);
      context.stroke();

      const frames = SPRITES.bomb;
      const file =
        frames[Math.floor(state.time * 10) % frames.length] ?? frames[0];
      if (!file) continue;
      context.drawImage(this.image(file), Math.round(bomb.x) - 8, Math.round(bomb.y) - 12);

      const sparkAlpha = 0.55 + 0.45 * Math.sin(state.time * 24);
      context.fillStyle = `rgba(255, 210, 120, ${sparkAlpha})`;
      context.beginPath();
      context.arc(bomb.x + 2, bomb.y - 14, 1.8, 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawBombFlight(state: GameState, bomb: Bomb): void {
    const context = this.context;
    const height = bombArcHeight(bomb);

    context.strokeStyle = "rgba(255, 140, 80, 0.35)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(bomb.x, bomb.y, 3, 0, Math.PI * 2);
    context.stroke();

    const frames = SPRITES.bomb;
    const file =
      frames[Math.floor(state.time * 10) % frames.length] ?? frames[0];
    if (!file) return;
    context.drawImage(
      this.image(file),
      Math.round(bomb.x) - 8,
      Math.round(bomb.y - height) - 8,
    );
  }

  private drawExplosions(state: GameState): void {
    const context = this.context;

    for (const explosion of this.effects.explosions) {
      const age = state.time - explosion.born;
      if (age < 0 || age >= EXPLOSION_LIFE) continue;
      const progress = age / EXPLOSION_LIFE;
      const radius = explosion.radius * (0.35 + 0.65 * progress);
      const alpha = 1 - progress;

      context.fillStyle = `rgba(255, 150, 80, ${0.18 * alpha})`;
      context.beginPath();
      context.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = `rgba(255, 200, 130, ${0.8 * alpha})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
      context.stroke();
    }

    const reduced = this.reducedMotion;
    for (const ring of this.effects.rings) {
      const age = state.time - ring.born;
      const life = reduced ? Math.min(ring.life, 0.2) : ring.life;
      if (age < 0 || age >= life) continue;
      const progress = reduced ? 1 : age / ring.life;
      const radius = reduced
        ? ring.radius * 0.5
        : ring.radius * (0.2 + 0.8 * progress);
      context.strokeStyle = reduced
        ? `rgba(${ring.color}, 0.6)`
        : `rgba(${ring.color}, ${1 - progress})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
  }

  private drawFloatingTexts(state: GameState): void {
    const context = this.context;
    const reduced = this.reducedMotion;

    for (const text of this.effects.floatingTexts) {
      const age = state.time - text.born;
      if (age < 0 || age >= FLOATING_TEXT_LIFE) continue;
      const progress = age / FLOATING_TEXT_LIFE;
      const y = reduced ? text.y : text.y - 16 * progress;
      const alpha = reduced
        ? age < 1
          ? 1
          : Math.max(0, 1 - (age - 1) / 0.2)
        : age < 0.8
          ? 1
          : Math.max(0, 1 - (age - 0.8) / 0.4);

      context.font = "13px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      const width = context.measureText(text.text).width;
      const color = toneColor(text.tone);
      context.globalAlpha = alpha;
      context.fillStyle = "rgba(11, 10, 15, 0.80)";
      context.fillRect(text.x - width / 2 - 4, y - 9, width + 8, 18);
      context.strokeStyle = color;
      context.lineWidth = 0.6;
      context.strokeRect(text.x - width / 2 - 4, y - 9, width + 8, 18);
      context.fillStyle = color;
      context.fillText(text.text, text.x, y);
      context.globalAlpha = 1;
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawBanners(
    state: GameState,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const context = this.context;
    const reduced = this.reducedMotion;

    for (const banner of this.effects.banners) {
      const age = state.time - banner.born;
      if (age < 0 || age >= banner.life) continue;
      const fade = reduced
        ? Math.min(1, Math.max(0, (banner.life - age) / 0.2))
        : Math.min(1, Math.max(0, (banner.life - age) / 0.35));
      const color = toneColor(banner.tone);
      const y = cssHeight * 0.28;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = displayFont(26, 600);
      const width = context.measureText(banner.text).width;
      context.globalAlpha = fade;
      context.fillStyle = "rgba(11, 10, 15, 0.72)";
      context.fillRect(cssWidth / 2 - width / 2 - 12, y - 20, width + 24, 40);
      context.fillStyle = color;
      context.fillText(banner.text, cssWidth / 2, y);
      context.globalAlpha = 1;
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
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

      if (enemy.kind === "boss") {
        if (enemy.attackKind === "bomb") {
          const charge = 0.4 + 0.4 * Math.sin(state.time * 18);
          context.fillStyle = `rgba(255, 150, 80, ${charge})`;
          context.beginPath();
          context.arc(enemy.x, enemy.y - 18, 4, 0, Math.PI * 2);
          context.fill();
          continue;
        }
        context.strokeStyle = "rgba(255, 70, 60, 0.4)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(enemy.x, enemy.y, BOSS.attackRange, 0, Math.PI * 2);
        context.stroke();
        continue;
      }

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
    if (state.status === "dead" || state.shop.open) return;
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
    muted: boolean,
  ): void {
    const context = this.context;
    const heartCount = Math.ceil(state.player.maxHp / 2);

    for (let index = 0; index < heartCount; index += 1) {
      const filled = state.player.hp - index * 2;
      const file =
        filled >= 2
          ? SPRITES.heartFull
          : filled === 1
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

    this.drawHealPulse(state, heartCount);

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
    context.fillStyle = state.run.bossAwake
      ? EMBER
      : state.run.exitOpen || state.run.floorPurified
        ? SPIRIT_COLOR
        : "rgba(255, 255, 255, 0.55)";
    context.fillText(
      state.run.bossAwake
        ? "Boss awakened"
        : state.run.exitOpen
          ? "Stairs open"
          : state.run.floorPurified
            ? "Arena open"
            : "Arena sealed",
      cssWidth - HUD_INSET,
      HUD_INSET + 23,
    );
    context.textAlign = "left";

    // The spirit meter is hidden on the death screen, which covers the HUD.
    if (state.status !== "dead") {
      const percent = Math.round(state.run.spirit);
      const label = state.run.bossAwake
        ? "Boss awakened"
        : state.run.floorPurified
          ? "Floor purified"
          : `Spirit: ${percent}%`;

      context.font = "14px system-ui, sans-serif";
      context.textBaseline = "top";
      context.textAlign = "left";
      context.fillStyle = state.run.bossAwake
        ? EMBER
        : state.run.spirit > 0 || state.run.floorPurified
          ? SPIRIT_COLOR
          : "rgba(255, 255, 255, 0.7)";
      context.fillText(label, HUD_INSET, SPIRIT_TEXT_TOP);

      context.fillStyle = state.run.bossAwake ? EMBER_TRACK : SPIRIT_TRACK;
      context.fillRect(
        HUD_INSET,
        SPIRIT_BAR_TOP,
        SPIRIT_BAR_WIDTH,
        SPIRIT_BAR_HEIGHT,
      );
      const pulse = state.run.bossAwake
        ? 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(state.time * 2.5))
        : 1;
      context.globalAlpha = pulse;
      context.fillStyle = state.run.bossAwake ? EMBER : SPIRIT_COLOR;
      context.fillRect(
        HUD_INSET,
        SPIRIT_BAR_TOP,
        Math.round(
          (SPIRIT_BAR_WIDTH * state.run.spirit) / PURIFICATION.spiritThreshold,
        ),
        SPIRIT_BAR_HEIGHT,
      );
      context.globalAlpha = 1;
      context.strokeStyle = state.run.bossAwake ? EMBER_BORDER : SPIRIT_BORDER;
      context.lineWidth = 1;
      context.strokeRect(
        HUD_INSET + 0.5,
        SPIRIT_BAR_TOP + 0.5,
        SPIRIT_BAR_WIDTH - 1,
        SPIRIT_BAR_HEIGHT - 1,
      );
    }

    this.drawSkillPoints(state);
    this.drawDraught(state);

    if (state.run.bossAwake) {
      this.drawBossBar(state, cssWidth);
    }

    context.textBaseline = "bottom";
    context.fillStyle = SECONDARY_TEXT;
    context.font = "12px system-ui, sans-serif";
    context.textAlign = "left";
    context.fillText(
      "WASD move · Mouse aim · LMB combo · Space dodge",
      HUD_INSET,
      cssHeight - 44,
    );
    context.fillText(
      "E interact · Q draught · Esc pause · M mute · R restart",
      HUD_INSET,
      cssHeight - 26,
    );

    if (muted) {
      context.textAlign = "right";
      context.fillStyle = MUTED_TEXT;
      context.fillText(
        "Muted (M)",
        cssWidth - HUD_INSET,
        cssHeight - 26,
      );
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawSkillPoints(state: GameState): void {
    const context = this.context;
    const points = state.run.skillPoints;
    const highlight =
      this.effects.skillPointHighlightAt !== null &&
      state.time - this.effects.skillPointHighlightAt < 0.35;
    const color = highlight
      ? this.reducedMotion
        ? "#e6f7ff"
        : SPIRIT_COLOR
      : points > 0
        ? SPIRIT_COLOR
        : "rgba(255, 255, 255, 0.45)";
    const centreX = HUD_INSET + 5;
    const centreY = SKILL_POINTS_TOP + 7;

    context.fillStyle = points > 0 || highlight ? color : "transparent";
    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(centreX, centreY - 5);
    context.lineTo(centreX + 5, centreY);
    context.lineTo(centreX, centreY + 5);
    context.lineTo(centreX - 5, centreY);
    context.closePath();
    if (points > 0 || highlight) context.fill();
    context.stroke();

    context.font = "13px system-ui, sans-serif";
    context.fillStyle = "rgba(255, 255, 255, 0.55)";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("Skill points", HUD_INSET + 16, SKILL_POINTS_TOP + 7);

    context.font = "16px system-ui, sans-serif";
    context.fillStyle = color;
    context.textAlign = "right";
    context.fillText(`${points}`, HUD_INSET + 130, SKILL_POINTS_TOP + 7);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawDraught(state: GameState): void {
    const context = this.context;
    const carried = state.run.draughtCarried;
    const color = carried ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.40)";
    const x = HUD_INSET;
    const y = DRAUGHT_TOP;

    // Flask icon.
    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(x + 5, y + 1);
    context.lineTo(x + 9, y + 1);
    context.lineTo(x + 9, y + 4);
    context.lineTo(x + 12, y + 8);
    context.lineTo(x + 12, y + 15);
    context.lineTo(x + 2, y + 15);
    context.lineTo(x + 2, y + 8);
    context.lineTo(x + 5, y + 4);
    context.closePath();
    if (carried) {
      context.fillStyle = "rgba(191, 233, 255, 0.25)";
      context.fill();
    }
    context.stroke();

    context.font = "13px system-ui, sans-serif";
    context.fillStyle = carried ? TITLE_TEXT : "rgba(255, 255, 255, 0.55)";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("Draught", x + 20, y + 8);

    // Q keycap.
    const keyX = x + 78;
    context.strokeStyle = carried ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.30)";
    context.lineWidth = 1;
    context.strokeRect(keyX, y + 1, 14, 14);
    context.fillStyle = carried ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.45)";
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("Q", keyX + 7, y + 9);

    context.font = "13px system-ui, sans-serif";
    context.textAlign = "left";
    context.fillStyle = carried ? SPIRIT_COLOR : "rgba(255, 255, 255, 0.45)";
    context.fillText(carried ? "Carried" : "Empty", x + 100, y + 8);

    context.textBaseline = "alphabetic";
  }

  /** A soft spirit-cyan pulse across the hearts when HP is restored. */
  private drawHealPulse(state: GameState, heartCount: number): void {
    const context = this.context;
    const width =
      heartCount * (HEART_SIZE.width + HEART_GAP) - HEART_GAP;
    for (const pulse of this.effects.healPulses) {
      const age = state.time - pulse.born;
      if (age < 0 || age >= HEAL_PULSE_LIFE) continue;
      const alpha = (1 - age / HEAL_PULSE_LIFE) * 0.4;
      context.strokeStyle = `rgba(191, 233, 255, ${alpha})`;
      context.lineWidth = 2;
      context.strokeRect(
        HUD_INSET - 4,
        HUD_INSET - 4,
        width + 8,
        HEART_SIZE.height + 8,
      );
    }
  }

  private drawBossBar(state: GameState, cssWidth: number): void {
    const boss = state.enemies.find((enemy) => enemy.kind === "boss");
    if (!boss) return;

    const context = this.context;
    const width = Math.min(BOSS_BAR_MAX_WIDTH, cssWidth * 0.5);
    const x = (cssWidth - width) / 2;
    const y = HUD_INSET + 8;
    const ratio = boss.maxHp > 0 ? clamp(boss.hp / boss.maxHp, 0, 1) : 0;
    // The bar fades in over the first 0.3 s of the Warden's emergence.
    const fade =
      boss.emerging > 0
        ? clamp((BOSS.emergence - boss.emerging) / 0.3, 0, 1)
        : 1;

    context.globalAlpha = fade;
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.font = displayFont(16, 600);
    context.fillStyle = EMBER;
    context.fillText(BOSS.name, cssWidth / 2, y - 4);

    context.fillStyle = "rgba(20, 10, 12, 0.85)";
    context.fillRect(x, y, width, BOSS_BAR_HEIGHT);
    context.fillStyle = EMBER;
    context.fillRect(x, y, width * ratio, BOSS_BAR_HEIGHT);
    context.strokeStyle = EMBER_BORDER;
    context.lineWidth = 1;
    context.strokeRect(
      x + 0.5,
      y + 0.5,
      width - 1,
      BOSS_BAR_HEIGHT - 1,
    );

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.globalAlpha = 1;
  }

  private drawShopPanel(
    state: GameState,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const context = this.context;
    const panelWidth = Math.min(560, cssWidth - 64);
    const panelHeight = 300;
    const x = (cssWidth - panelWidth) / 2;
    const y = (cssHeight - panelHeight) / 2;

    context.fillStyle = "rgba(11, 10, 15, 0.62)";
    context.fillRect(0, 0, cssWidth, cssHeight);

    context.fillStyle = PANEL_BG;
    context.fillRect(x, y, panelWidth, panelHeight);
    context.strokeStyle = PANEL_BORDER;
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, panelHeight - 1);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = TITLE_TEXT;
    context.font = displayFont(30, 600);
    context.fillText("Safe-room wares", x + 28, y + 42);

    context.fillStyle = SPIRIT_COLOR;
    context.fillRect(x + 28, y + 50, 120, 2);

    context.textAlign = "right";
    context.font = "14px system-ui, sans-serif";
    context.fillStyle =
      state.run.skillPoints > 0 ? SPIRIT_COLOR : MUTED_TEXT;
    context.fillText(
      `Skill points: ${state.run.skillPoints}`,
      x + panelWidth - 28,
      y + 34,
    );
    context.font = "13px system-ui, sans-serif";
    context.fillStyle = MUTED_TEXT;
    context.fillText(
      `HP ${state.player.hp}/${state.player.maxHp}`,
      x + panelWidth - 28,
      y + 52,
    );
    context.textAlign = "left";

    const rows = shopRows(state.run);
    const selection = clamp(state.shop.selection, 0, Math.max(0, rows.length - 1));
    rows.forEach((row, index) => {
      const rowTop = y + 76 + index * 72;
      const selected = index === selection;

      if (selected) {
        context.fillStyle = PANEL_SELECTED;
        context.fillRect(x + 14, rowTop, panelWidth - 28, 72);
        context.fillStyle = SPIRIT_COLOR;
        context.fillRect(x + 14, rowTop, 3, 72);
        context.strokeStyle = "rgba(191, 233, 255, 0.55)";
        context.lineWidth = 1;
        context.strokeRect(x + 14.5, rowTop + 0.5, panelWidth - 29, 71);
        context.fillStyle = SPIRIT_COLOR;
        context.font = "16px system-ui, sans-serif";
        context.fillText(">", x + 24, rowTop + 42);
      }

      if (row.id === "draught") {
        this.drawFlaskIcon(x + 50, rowTop + 36, row.affordable || row.state === "carried");
      } else {
        this.drawVigorIcon(x + 50, rowTop + 36);
      }

      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillStyle = TITLE_TEXT;
      context.font = "16px system-ui, sans-serif";
      context.fillText(row.name, x + 78, rowTop + 28);

      context.fillStyle = SECONDARY_TEXT;
      context.font = "13px system-ui, sans-serif";
      context.fillText(row.effect, x + 78, rowTop + 48);

      context.textAlign = "right";
      context.font = "14px system-ui, sans-serif";
      context.fillStyle = row.affordable ? SPIRIT_COLOR : MUTED_TEXT;
      context.fillText(
        `${row.cost} point${row.cost === 1 ? "" : "s"}`,
        x + panelWidth - 28,
        rowTop + 28,
      );

      context.font = "13px system-ui, sans-serif";
      context.fillStyle =
        row.state === "buy"
          ? SPIRIT_COLOR
          : row.state === "carried"
            ? SPIRIT_COLOR
            : EMBER;
      context.fillText(row.stateLabel, x + panelWidth - 28, rowTop + 48);

      context.strokeStyle = PANEL_DIVIDER;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + 28, rowTop + 72);
      context.lineTo(x + panelWidth - 28, rowTop + 72);
      context.stroke();
    });

    context.strokeStyle = PANEL_DIVIDER;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + 28, y + 236);
    context.lineTo(x + panelWidth - 28, y + 236);
    context.stroke();

    context.textAlign = "left";
    context.fillStyle = HINT_TEXT;
    context.font = "12px system-ui, sans-serif";
    context.fillText(
      "↑/↓ select · Enter buy · Esc close",
      x + 28,
      y + 258,
    );

    if (state.shop.message !== null) {
      context.textAlign = "right";
      context.font = "13px system-ui, sans-serif";
      context.fillStyle =
        state.shop.tone === "success" ? SPIRIT_COLOR : EMBER;
      context.fillText(
        state.shop.message,
        x + panelWidth - 28,
        y + 258,
      );
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawFlaskIcon(x: number, y: number, filled: boolean): void {
    const context = this.context;
    context.strokeStyle = filled ? SPIRIT_COLOR : MUTED_TEXT;
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(x - 4, y - 11);
    context.lineTo(x + 4, y - 11);
    context.lineTo(x + 4, y - 7);
    context.lineTo(x + 9, y - 1);
    context.lineTo(x + 9, y + 10);
    context.lineTo(x - 9, y + 10);
    context.lineTo(x - 9, y - 1);
    context.lineTo(x - 4, y - 7);
    context.closePath();
    if (filled) {
      context.fillStyle = "rgba(191, 233, 255, 0.22)";
      context.fill();
    }
    context.stroke();
  }

  private drawVigorIcon(x: number, y: number): void {
    const context = this.context;
    context.strokeStyle = SPIRIT_COLOR;
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(x, y + 10);
    context.bezierCurveTo(x - 13, y, x - 9, y - 9, x, y - 3);
    context.bezierCurveTo(x + 9, y - 9, x + 13, y, x, y + 10);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y - 9);
    context.lineTo(x, y - 15);
    context.moveTo(x - 3, y - 12);
    context.lineTo(x, y - 15);
    context.lineTo(x + 3, y - 12);
    context.stroke();
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
      context.font = displayFont(30, 500);
      context.fillText(
        `Depth ${state.run.depth}`,
        cssWidth / 2,
        cssHeight * 0.2,
      );
      context.textAlign = "left";
    }
  }

  private drawScreenFlash(
    state: GameState,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const context = this.context;
    const reduced = this.reducedMotion;
    for (const flash of this.effects.flashes) {
      const age = state.time - flash.born;
      const life = reduced ? 0.2 : flash.life;
      if (age < 0 || age >= life) continue;
      const alpha = reduced ? 0.35 : (1 - age / flash.life) * 0.35;
      context.strokeStyle = `rgba(255, 92, 82, ${alpha})`;
      context.lineWidth = 28;
      context.strokeRect(0, 0, cssWidth, cssHeight);
    }
  }

  private drawTitleOverlay(cssWidth: number, cssHeight: number): void {
    const context = this.context;
    context.fillStyle = "rgba(11, 10, 15, 0.72)";
    context.fillRect(0, 0, cssWidth, cssHeight);

    const centreX = cssWidth / 2;
    const titleY = cssHeight * 0.32;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = TITLE_TEXT;
    context.font = displayFont(56, 600);
    context.fillText("skill issue dg", centreX, titleY);

    context.fillStyle = SPIRIT_COLOR;
    context.fillRect(centreX - 60, titleY + 26, 120, 3);

    context.fillStyle = MUTED_TEXT;
    context.font = "16px system-ui, sans-serif";
    context.fillText("A dark-fantasy action roguelike", centreX, titleY + 52);

    context.font = "14px system-ui, sans-serif";
    context.fillText(
      "WASD move · Mouse aim · LMB combo · Space dodge · E interact · Q draught · Esc pause · M mute",
      centreX,
      titleY + 94,
    );

    const pulse = 0.8 + 0.2 * Math.sin((performance.now() / 1000) * (Math.PI * 2 / 1.2));
    context.fillStyle = `rgba(191, 233, 255, ${pulse})`;
    context.font = "18px system-ui, sans-serif";
    context.fillText("Click to begin", centreX, titleY + 138);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawPauseOverlay(cssWidth: number, cssHeight: number): void {
    const context = this.context;
    context.fillStyle = "rgba(11, 10, 15, 0.6)";
    context.fillRect(0, 0, cssWidth, cssHeight);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = TITLE_TEXT;
    context.font = displayFont(36, 600);
    context.fillText("Paused", cssWidth / 2, cssHeight / 2 - 24);

    context.fillStyle = "rgba(255, 255, 255, 0.8)";
    context.font = "16px system-ui, sans-serif";
    context.fillText("Esc to resume", cssWidth / 2, cssHeight / 2 + 18);

    context.fillStyle = MUTED_TEXT;
    context.font = "14px system-ui, sans-serif";
    context.fillText("M to mute", cssWidth / 2, cssHeight / 2 + 44);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawDeathOverlay(
    state: GameState,
    cssWidth: number,
    cssHeight: number,
  ): void {
    const context = this.context;
    context.fillStyle = "rgba(0, 0, 0, 0.6)";
    context.fillRect(0, 0, cssWidth, cssHeight);

    const centreX = cssWidth / 2;
    const centreY = cssHeight / 2;
    const purified = state.enemies.filter((enemy) => enemy.rested).length;

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = TITLE_TEXT;
    context.font = displayFont(48, 600);
    context.fillText("You died", centreX, centreY - 56);

    context.fillStyle = "rgba(255, 255, 255, 0.8)";
    context.font = "16px system-ui, sans-serif";
    context.fillText(`Depth reached: ${state.run.depth}`, centreX, centreY + 4);
    context.fillText(`Mobs purified: ${purified}`, centreX, centreY + 28);

    context.font = "18px system-ui, sans-serif";
    context.fillText("Press R to restart", centreX, centreY + 72);

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }
}
