import "./ui/styles/main.css";
import { Game } from "./game/engine/game";
import { AudioManager } from "./ui/audio/audio";
import { Input } from "./ui/input/input";
import { loadAssets } from "./ui/rendering/assets";
import { Renderer } from "./ui/rendering/renderer";

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game");
  if (!canvas) throw new Error("Game canvas not found.");

  const assets = await loadAssets();
  const renderer = new Renderer(canvas, assets);
  const input = new Input(canvas);
  const audio = new AudioManager();
  const game = new Game(renderer);

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

  if (import.meta.env.DEV || import.meta.env.VITE_E2E === "1") {
    window.__gameDebug = {
      getSnapshot: () => game.snapshot(),
      summonBoss: () => game.debugSummonBoss(),
    };
    window.__audioDebug = { getState: () => audio.snapshot() };
  }
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const container = document.createElement("pre");
  container.className = "boot-error";
  container.textContent = `Failed to start the game:\n${message}`;
  document.body.replaceChildren(container);
}

start().catch(showError);
