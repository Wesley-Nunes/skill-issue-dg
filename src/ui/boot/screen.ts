import type { FontStatus } from "../rendering/fonts";

export type BootPhase = "loading" | "ready" | "done" | "error";

export interface BootCount {
  settled: number;
  total: number;
}

export interface BootSnapshot {
  phase: BootPhase;
  percent: number;
  images: BootCount;
  audio: BootCount;
  font: FontStatus;
  startedAt: number;
  readyAt: number | null;
  doneAt: number | null;
  error: string | null;
}

export interface BootUpdate {
  percent: number;
  images: BootCount;
  audio: BootCount;
  font: FontStatus;
}

const DEFAULT_MIN_DISPLAY_MS = 700;
const FADE_FALLBACK_MS = 450;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/**
 * Owns the static boot overlay markup. It only presents boot state; asset and
 * audio loading stay in their own modules.
 */
export class BootScreen {
  private readonly progressElement: HTMLElement;
  private readonly fillElement: HTMLElement;
  private readonly percentElement: HTMLElement;
  private readonly errorElement: HTMLElement;
  private readonly errorMessageElement: HTMLPreElement;
  private readonly liveElement: HTMLElement;
  private readonly startedAt = performance.now();

  private phase: BootPhase = "loading";
  private percent = 0;
  private images: BootCount = { settled: 0, total: 0 };
  private audio: BootCount = { settled: 0, total: 0 };
  private font: FontStatus = "pending";
  private readyAt: number | null = null;
  private doneAt: number | null = null;
  private error: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly minDisplayMs = DEFAULT_MIN_DISPLAY_MS,
  ) {
    const progressElement = root.querySelector<HTMLElement>(".boot__progress");
    const fillElement = root.querySelector<HTMLElement>(".boot__fill");
    const percentElement = root.querySelector<HTMLElement>(".boot__percent");
    const errorElement = root.querySelector<HTMLElement>(".boot__error");
    const errorMessageElement =
      root.querySelector<HTMLPreElement>(".boot__error .boot-error");
    const liveElement = root.querySelector<HTMLElement>(".boot__live");

    if (
      !progressElement ||
      !fillElement ||
      !percentElement ||
      !errorElement ||
      !errorMessageElement ||
      !liveElement
    ) {
      throw new Error("Boot screen markup is incomplete.");
    }

    this.progressElement = progressElement;
    this.fillElement = fillElement;
    this.percentElement = percentElement;
    this.errorElement = errorElement;
    this.errorMessageElement = errorMessageElement;
    this.liveElement = liveElement;
  }

  update(update: BootUpdate): void {
    this.percent = Math.max(
      this.percent,
      Math.min(100, Math.max(0, Math.floor(update.percent))),
    );
    this.images = { ...update.images };
    this.audio = { ...update.audio };
    this.font = update.font;
    this.renderProgress();
  }

  /** Marks every unit settled and announces completion before the fade. */
  markReady(): void {
    this.percent = 100;
    this.phase = "ready";
    this.readyAt = performance.now();
    this.renderProgress();
    this.liveElement.textContent = "Loading complete.";
  }

  /** Leaves a short minimum display time before the fade begins. */
  async waitForMinimum(): Promise<void> {
    const elapsed = performance.now() - this.startedAt;
    const remaining = this.minDisplayMs - elapsed;
    if (remaining > 0) await wait(remaining);
  }

  /** Fades the overlay and removes it from the document. */
  async fadeOut(): Promise<void> {
    this.root.classList.add("boot--fading");

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        this.root.removeEventListener("transitionend", onTransitionEnd);
        resolve();
      };
      const onTransitionEnd = (event: TransitionEvent): void => {
        if (event.target === this.root && event.propertyName === "opacity") {
          finish();
        }
      };

      this.root.addEventListener("transitionend", onTransitionEnd);
      window.setTimeout(finish, FADE_FALLBACK_MS);
    });

    this.root.remove();
  }

  markDone(): void {
    this.phase = "done";
    this.doneAt = performance.now();
    this.root.removeAttribute("aria-busy");
  }

  fail(message: string): void {
    this.phase = "error";
    this.error = message;
    this.root.removeAttribute("aria-busy");
    this.root.classList.add("boot--error");
    this.errorElement.hidden = false;
    this.errorMessageElement.textContent = `Failed to start the game:\n${message}`;
    this.liveElement.textContent = "The game could not start.";
  }

  snapshot(): BootSnapshot {
    return {
      phase: this.phase,
      percent: this.percent,
      images: { ...this.images },
      audio: { ...this.audio },
      font: this.font,
      startedAt: this.startedAt,
      readyAt: this.readyAt,
      doneAt: this.doneAt,
      error: this.error,
    };
  }

  private renderProgress(): void {
    this.progressElement.setAttribute("aria-valuenow", String(this.percent));
    this.fillElement.style.transform = `scaleX(${this.percent / 100})`;
    this.percentElement.textContent = `${this.percent}%`;
  }
}
