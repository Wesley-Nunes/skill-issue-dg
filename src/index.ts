import "./ui/styles/main.css";
import { Game } from "./game/engine/game";
import { ALL_SPRITE_FILES } from "./game/data/sprites";
import { AUDIO_MANIFEST, AudioManager } from "./ui/audio/audio";
import { BootProgress } from "./ui/boot/progress";
import { BootScreen } from "./ui/boot/screen";
import { Input } from "./ui/input/input";
import { loadAssets } from "./ui/rendering/assets";
import {
  loadDisplayFont,
  type FontStatus,
} from "./ui/rendering/fonts";
import { Renderer } from "./ui/rendering/renderer";

const MIN_BOOT_DISPLAY_MS = 700;

let activeBoot: BootScreen | null = null;

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game");
  if (!canvas) throw new Error("Game canvas not found.");

  const bootRoot = document.querySelector<HTMLElement>("#boot");
  const boot = bootRoot
    ? new BootScreen(bootRoot, MIN_BOOT_DISPLAY_MS)
    : null;
  activeBoot = boot;
  const debugEnabled =
    import.meta.env.DEV || import.meta.env.VITE_E2E === "1";

  if (debugEnabled && boot) {
    window.__bootDebug = { getState: () => boot.snapshot() };
  }

  const imageTotal = ALL_SPRITE_FILES.length;
  const audioTotal = AUDIO_MANIFEST.length;
  const progress = new BootProgress(imageTotal + audioTotal + 1);
  let imagesSettled = 0;
  let audioSettled = 0;
  let fontStatus: FontStatus = "pending";

  const updateBoot = (): void => {
    boot?.update({
      percent: progress.percent,
      images: { settled: imagesSettled, total: imageTotal },
      audio: { settled: audioSettled, total: audioTotal },
      font: fontStatus,
    });
  };

  updateBoot();

  const audio = new AudioManager();

  const fontPromise = loadDisplayFont().then((status) => {
    fontStatus = status;
    progress.complete();
    updateBoot();
    return status;
  });

  const assetsPromise = loadAssets(() => {
    imagesSettled += 1;
    progress.complete();
    updateBoot();
  });

  const audioPromise = audio.preload(() => {
    audioSettled += 1;
    progress.complete();
    updateBoot();
  });

  const [assets] = await Promise.all([
    assetsPromise,
    audioPromise,
    fontPromise,
  ]);
  updateBoot();

  const renderer = new Renderer(canvas, assets);
  const game = new Game(renderer);
  // Paint the title behind the opaque overlay so the reveal is a fade, not a
  // blank-frame handoff. Input is attached only after the fade.
  renderer.draw(game.state, [], audio.isMuted);

  boot?.markReady();
  await boot?.waitForMinimum();
  await boot?.fadeOut();

  const input = new Input(canvas);
  let previous = performance.now();

  const frame = (now: number): void => {
    const dt = Math.min(Math.max((now - previous) / 1000, 0), 0.05);
    previous = now;

    const inputFrame = input.sample(game.state.player, game.state.camera);
    if (inputFrame.gesture) audio.unlock();
    if (inputFrame.mute) audio.toggleMute();

    const events = game.step(dt, inputFrame);
    audio.handle(events, game.state);
    audio.update(game.state);
    renderer.draw(game.state, events, audio.isMuted);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  if (debugEnabled) {
    window.__gameDebug = {
      getSnapshot: () => game.snapshot(),
      summonBoss: () => game.debugSummonBoss(),
    };
    window.__audioDebug = { getState: () => audio.snapshot() };
  }

  boot?.markDone();
}

function showError(error: unknown): void {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);

  if (activeBoot) {
    activeBoot.fail(message);
    return;
  }

  const container = document.createElement("pre");
  container.className = "boot-error";
  container.textContent = `Failed to start the game:\n${message}`;
  document.body.replaceChildren(container);
}

start().catch(showError);
