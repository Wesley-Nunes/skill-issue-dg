import { AUDIO_BASE } from "../../game/data/config";
import type { GameEvent, GameState } from "../../game/types";

export interface AudioSnapshot {
  supported: boolean;
  unlocked: boolean;
  muted: boolean;
  ambient: boolean;
  bossLayers: boolean;
  preloaded: number;
  preloadTotal: number;
}

interface PlayOptions {
  volume?: number;
  rate?: number;
  pan?: number;
  loop?: boolean;
}

const MASTER_VOLUME = 0.5;
const AMBIENT_VOLUME = 0.16;

const PUNCH = [
  "impactPunch_heavy_000.ogg",
  "impactPunch_heavy_001.ogg",
  "impactPunch_heavy_002.ogg",
  "impactPunch_heavy_003.ogg",
  "impactPunch_heavy_004.ogg",
];

const SOFT = [
  "impactSoft_heavy_000.ogg",
  "impactSoft_heavy_001.ogg",
  "impactSoft_heavy_002.ogg",
  "impactSoft_heavy_003.ogg",
  "impactSoft_heavy_004.ogg",
];

const GENERIC = [
  "impactGeneric_light_000.ogg",
  "impactGeneric_light_001.ogg",
  "impactGeneric_light_002.ogg",
  "impactGeneric_light_003.ogg",
  "impactGeneric_light_004.ogg",
];

const GLASS = [
  "impactGlass_light_000.ogg",
  "impactGlass_light_001.ogg",
  "impactGlass_light_002.ogg",
  "impactGlass_light_003.ogg",
  "impactGlass_light_004.ogg",
];

const EXPLOSIONS = [
  "explosion1.ogg",
  "explosion2.ogg",
  "explosion3.ogg",
  "explosion4.ogg",
];

const CLOTH = ["cloth1.ogg", "cloth2.ogg", "cloth3.ogg", "cloth4.ogg"];

/**
 * Every audio file the game can play. Keep the long ambient bed last so the
 * boot bar advances through the short cues before its decode finishes.
 */
export const AUDIO_MANIFEST: readonly string[] = [
  "knifeSlice.ogg",
  "metalClick.ogg",
  "metalLatch.ogg",
  "monster_roar.ogg",
  "fuse.ogg",
  "falling.mp3",
  "doorOpen_2.ogg",
  "doorClose_3.ogg",
  "impactBell_heavy_000.ogg",
  "impactBell_heavy_001.ogg",
  "creak2.ogg",
  ...PUNCH,
  ...SOFT,
  ...GENERIC,
  ...GLASS,
  ...EXPLOSIONS,
  ...CLOTH,
  "caverns.ogg",
];

const AUDIO_FETCH_TIMEOUT_MS = 10_000;
const AUDIO_DECODE_TIMEOUT_MS = 10_000;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    AUDIO_FETCH_TIMEOUT_MS,
  );

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function decodeWithTimeout(
  context: BaseAudioContext,
  data: ArrayBuffer,
): Promise<AudioBuffer> {
  let timer: number | undefined;

  try {
    return await Promise.race([
      context.decodeAudioData(data),
      new Promise<AudioBuffer>((_, reject) => {
        timer = window.setTimeout(
          () => reject(new Error("Audio decode timed out.")),
          AUDIO_DECODE_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

function audioSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { AudioContext?: unknown }).AudioContext === "function"
  );
}

/**
 * Owns the Web Audio graph. Concrete events play supplied CC0 files; the
 * Warden's presence, breathing, fire, and growls are synthesized. Every
 * method is failure-tolerant: an unavailable or blocked context leaves the
 * game fully playable and silent.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private bossBus: GainNode | null = null;
  private bossNodes: AudioScheduledSourceNode[] = [];
  private fuseSources: AudioBufferSourceNode[] = [];
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly pending = new Map<string, Promise<AudioBuffer | null>>();
  private noise: AudioBuffer | null = null;
  private unlocked = false;
  private muted = false;
  private supported = audioSupported();

  get isMuted(): boolean {
    return this.muted;
  }

  /** Creates and resumes the context from the first user gesture. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.supported = audioSupported();
    if (!this.supported) return;

    try {
      const Constructor = (
        window as unknown as { AudioContext: typeof AudioContext }
      ).AudioContext;
      const context = new Constructor();
      const master = context.createGain();
      master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      void context.resume().catch(() => undefined);
      this.startAmbient();
      for (const file of AUDIO_MANIFEST) void this.load(file);
    } catch {
      this.context = null;
      this.master = null;
      this.supported = false;
    }
  }

  /**
   * Downloads and decodes every cue before the first gesture. Decoding uses
   * an offline context, so no autoplay permission is required and the
   * resulting buffers remain usable by the live context created on unlock.
   */
  async preload(
    onSettled?: (file: string, loaded: boolean) => void,
  ): Promise<void> {
    const context = this.supported ? this.createDecodeContext() : null;

    for (const file of AUDIO_MANIFEST) {
      if (this.buffers.has(file)) {
        onSettled?.(file, true);
        continue;
      }

      let loaded = false;
      if (context) {
        try {
          const response = await fetchWithTimeout(`${AUDIO_BASE}${file}`);
          if (!response.ok) throw new Error(`Missing audio: ${file}`);
          const data = await response.arrayBuffer();
          const buffer = await decodeWithTimeout(context, data);
          this.buffers.set(file, buffer);
          loaded = true;
        } catch {
          // Optional audio: keep boot moving and let the game stay silent.
        }
      }

      onSettled?.(file, loaded);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    }
    return this.muted;
  }

  handle(events: GameEvent[], state: GameState): void {
    if (!this.unlocked) return;

    const panFor = (x: number | undefined): number =>
      x === undefined ? 0 : clamp((x - state.player.x) / 240, -0.6, 0.6);
    const gainFor = (x: number | undefined, base: number): number =>
      x === undefined
        ? base
        : base *
          clamp(1 - Math.abs(x - state.player.x) / 600, 0.35, 1);

    for (const event of events) {
      switch (event.type) {
        case "run-started":
          this.play("metalClick.ogg", { volume: 0.35 });
          break;
        case "attack-started":
          this.play("knifeSlice.ogg", {
            volume: 0.26,
            rate: 1,
            pan: panFor(state.player.x),
          });
          break;
        case "enemy-hit":
          this.play(pick(PUNCH), {
            volume: gainFor(event.x, 0.3),
            rate: randomBetween(0.95, 1.05),
            pan: panFor(event.x),
          });
          break;
        case "player-hit":
          this.play(pick(SOFT), {
            volume: 0.32,
            rate: 0.85,
            pan: 0,
          });
          this.synthTone(70, 0.18, "sine", 0.18, 38);
          break;
        case "projectile-fired":
          this.synthTone(320, 0.24, "sine", 0.05, 880);
          this.synthTone(1400, 0.12, "triangle", 0.03, 620);
          break;
        case "projectile-hit":
          this.play(pick(SOFT), { volume: 0.28, rate: 0.9 });
          break;
        case "projectile-blocked":
          this.play(pick(GENERIC), {
            volume: gainFor(event.x, 0.18),
            rate: 0.95,
            pan: panFor(event.x),
          });
          break;
        case "fragment-broken":
          this.play(pick(GLASS), {
            volume: gainFor(event.x, 0.22),
            rate: 1.25,
            pan: panFor(event.x),
          });
          this.synthTone(1320, 0.16, "sine", 0.06, 1760);
          break;
        case "enemy-rested":
          this.play("impactBell_heavy_000.ogg", {
            volume: gainFor(event.x, 0.18),
            rate: 1.1,
            pan: panFor(event.x),
          });
          this.synthChord(220, 0.9, 0.05);
          break;
        case "enemy-died":
          this.play("impactSoft_heavy_002.ogg", {
            volume: gainFor(event.x, 0.28),
            rate: 0.8,
            pan: panFor(event.x),
          });
          this.synthTone(96, 0.32, "sawtooth", 0.05, 60);
          break;
        case "enemy-respawned":
          this.synthTone(180, 0.45, "triangle", 0.05, 420);
          break;
        case "floor-purified":
          this.play("impactBell_heavy_001.ogg", {
            volume: 0.3,
            rate: 0.8,
          });
          this.synthChord(262, 1.1, 0.06);
          break;
        case "boss-summoned":
          this.play("monster_roar.ogg", { volume: 0.5, rate: 0.75 });
          this.startBossLayers();
          this.duck();
          break;
        case "boss-attack-started":
          if (event.kind === "melee") {
            this.synthTone(72, 0.4, "sawtooth", 0.06, 54);
          }
          break;
        case "bomb-thrown":
          this.play("falling.mp3", {
            volume: 0.3,
            rate: 0.8,
            pan: panFor(event.x),
          });
          break;
        case "bomb-landed":
          this.play(pick(GENERIC), {
            volume: gainFor(event.x, 0.22),
            rate: 0.9,
            pan: panFor(event.x),
          });
          this.startFuse();
          break;
        case "bomb-exploded":
          this.stopFuses();
          this.play(pick(EXPLOSIONS), {
            volume: gainFor(event.x, 0.5),
            rate: randomBetween(0.9, 1.05),
            pan: panFor(event.x),
          });
          this.synthTone(54, 0.5, "sine", 0.2, 28);
          this.duck();
          break;
        case "boss-defeated":
          this.play("monster_roar.ogg", { volume: 0.45, rate: 0.7 });
          this.play("impactBell_heavy_000.ogg", { volume: 0.3, rate: 0.7 });
          this.play("metalLatch.ogg", { volume: 0.22, rate: 0.9 });
          this.play("creak2.ogg", { volume: 0.2, rate: 0.8 });
          this.stopBossLayers();
          break;
        case "player-healed":
          this.synthTone(660, 0.4, "sine", 0.09, 990);
          break;
        case "floor-descended":
          this.play("doorOpen_2.ogg", { volume: 0.3, rate: 0.9 });
          this.play("doorClose_3.ogg", { volume: 0.25, rate: 0.9 });
          this.synthTone(48, 0.6, "sine", 0.12, 32);
          break;
        case "player-died":
          this.synthTone(60, 0.9, "sawtooth", 0.16, 28);
          this.play("monster_roar.ogg", { volume: 0.25, rate: 0.55 });
          this.stopBossLayers();
          break;
        case "run-reset":
          this.stopBossLayers();
          this.stopFuses();
          break;
        case "dodge-started":
          this.play(pick(CLOTH), { volume: 0.16, rate: 1 });
          break;
        default:
          break;
      }
    }
  }

  /** Keeps synthesized boss layers in sync with the run state. */
  update(state: GameState): void {
    if (!this.unlocked || !this.context) return;
    if (state.status === "playing" && state.run.bossAwake) {
      this.startBossLayers();
    } else {
      this.stopBossLayers();
    }
  }

  snapshot(): AudioSnapshot {
    return {
      supported: this.supported,
      unlocked: this.unlocked,
      muted: this.muted,
      ambient: this.ambientSource !== null,
      bossLayers: this.bossBus !== null,
      preloaded: this.buffers.size,
      preloadTotal: AUDIO_MANIFEST.length,
    };
  }

  private createDecodeContext(): BaseAudioContext | null {
    try {
      if (typeof OfflineAudioContext === "function") {
        return new OfflineAudioContext(1, 1, 44_100);
      }
    } catch {
      // Fall through to the lazy load-on-unlock path.
    }
    return null;
  }

  private async load(file: string): Promise<AudioBuffer | null> {
    const context = this.context;
    if (!context) return null;

    const cached = this.buffers.get(file);
    if (cached) return cached;

    const inFlight = this.pending.get(file);
    if (inFlight) return inFlight;

    const promise = fetch(`${AUDIO_BASE}${file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Missing audio: ${file}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(file, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => {
        this.pending.delete(file);
      });

    this.pending.set(file, promise);
    return promise;
  }

  private play(file: string, options: PlayOptions = {}): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return;

    void this.load(file).then((buffer) => {
      if (!buffer || !this.context || !this.master || this.muted) return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = options.loop ?? false;
      source.playbackRate.value = options.rate ?? 1;

      const gain = this.context.createGain();
      gain.gain.value = options.volume ?? 0.3;

      source.connect(gain);
      if (typeof this.context.createStereoPanner === "function") {
        const panner = this.context.createStereoPanner();
        panner.pan.value = clamp(options.pan ?? 0, -1, 1);
        gain.connect(panner).connect(this.master);
      } else {
        gain.connect(this.master);
      }
      source.start();
    });
  }

  private startAmbient(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.ambientSource) return;

    void this.load("caverns.ogg").then((buffer) => {
      if (
        !buffer ||
        !this.context ||
        !this.master ||
        this.ambientSource
      ) {
        return;
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = AMBIENT_VOLUME;
      source.connect(gain).connect(this.master);
      source.start();
      this.ambientSource = source;
      this.ambientGain = gain;
    });
  }

  private duck(): void {
    const context = this.context;
    const gain = this.ambientGain;
    if (!context || !gain) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.04, gain.gain.value), now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.15);
    gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, now + 1.4);
  }

  private startFuse(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return;

    void this.load("fuse.ogg").then((buffer) => {
      if (!buffer || !this.context || !this.master || this.muted) return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = 0.16;
      source.connect(gain).connect(this.master);
      source.start();
      this.fuseSources.push(source);
    });
  }

  private stopFuses(): void {
    for (const source of this.fuseSources) {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
    }
    this.fuseSources = [];
  }

  private noiseBuffer(): AudioBuffer | null {
    const context = this.context;
    if (!context) return null;
    if (this.noise) return this.noise;

    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    this.noise = buffer;
    return buffer;
  }

  private startBossLayers(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.bossBus) return;

    const bus = context.createGain();
    bus.gain.value = 0;
    bus.connect(master);
    bus.gain.linearRampToValueAtTime(0.22, context.currentTime + 1.2);

    const nodes: AudioScheduledSourceNode[] = [];

    // Low distorted presence bed.
    const presence = context.createOscillator();
    presence.type = "sawtooth";
    presence.frequency.value = 55;
    const presenceFilter = context.createBiquadFilter();
    presenceFilter.type = "lowpass";
    presenceFilter.frequency.value = 180;
    presenceFilter.Q.value = 3;
    const presenceGain = context.createGain();
    presenceGain.gain.value = 0.18;
    presence.connect(presenceFilter).connect(presenceGain).connect(bus);
    presence.start();
    nodes.push(presence);

    const harmonic = context.createOscillator();
    harmonic.type = "triangle";
    harmonic.frequency.value = 82.5;
    const harmonicGain = context.createGain();
    harmonicGain.gain.value = 0.08;
    harmonic.connect(harmonicGain).connect(bus);
    harmonic.start();
    nodes.push(harmonic);

    // Furnace-like filtered-noise breathing with a slow swell.
    const noise = this.noiseBuffer();
    if (noise) {
      const breath = context.createBufferSource();
      breath.buffer = noise;
      breath.loop = true;
      const breathFilter = context.createBiquadFilter();
      breathFilter.type = "bandpass";
      breathFilter.frequency.value = 420;
      breathFilter.Q.value = 0.8;
      const breathGain = context.createGain();
      breathGain.gain.value = 0.06;
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.25;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain).connect(breathGain.gain);
      lfo.start();
      breath.connect(breathFilter).connect(breathGain).connect(bus);
      breath.start();
      nodes.push(breath, lfo);

      // Sparse high-passed crackle for magic.
      const crackle = context.createBufferSource();
      crackle.buffer = noise;
      crackle.loop = true;
      const crackleFilter = context.createBiquadFilter();
      crackleFilter.type = "highpass";
      crackleFilter.frequency.value = 1800;
      const crackleGain = context.createGain();
      crackleGain.gain.value = 0.025;
      crackle.connect(crackleFilter).connect(crackleGain).connect(bus);
      crackle.start();
      nodes.push(crackle);
    }

    this.bossBus = bus;
    this.bossNodes = nodes;
  }

  private stopBossLayers(): void {
    const context = this.context;
    const bus = this.bossBus;
    if (!context || !bus) return;

    const nodes = this.bossNodes;
    this.bossBus = null;
    this.bossNodes = [];
    const now = context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.6);
    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          // The node may already have stopped.
        }
      }
      bus.disconnect();
    }, 700);
  }

  private synthTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFrequency?: number,
  ): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        now + duration,
      );
    }
    const gain = context.createGain();
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private synthChord(frequency: number, duration: number, volume: number): void {
    this.synthTone(frequency, duration, "sine", volume);
    this.synthTone(frequency * 1.25, duration, "sine", volume * 0.7);
    this.synthTone(frequency * 1.5, duration, "triangle", volume * 0.5);
  }
}
