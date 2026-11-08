import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIO_MANIFEST } from "./audio";

const AUDIO_DIR = resolve(process.cwd(), "public/assets/audio");

describe("AUDIO_MANIFEST", () => {
  it("contains every cue used by the game, including the late additions", () => {
    expect(AUDIO_MANIFEST).toEqual(
      expect.arrayContaining([
        "caverns.ogg",
        "cloth1.ogg",
        "cloth2.ogg",
        "cloth3.ogg",
        "cloth4.ogg",
        "creak2.ogg",
        "impactBell_heavy_000.ogg",
        "impactBell_heavy_001.ogg",
        "falling.mp3",
      ]),
    );
  });

  it("has no duplicate entries", () => {
    expect(new Set(AUDIO_MANIFEST).size).to.equal(AUDIO_MANIFEST.length);
  });

  it("points at files that exist in public/assets/audio", () => {
    for (const file of AUDIO_MANIFEST) {
      expect(existsSync(resolve(AUDIO_DIR, file)), file).to.equal(true);
    }
  });

  it("keeps the long ambient bed last for readable boot progress", () => {
    expect(AUDIO_MANIFEST.at(-1)).to.equal("caverns.ogg");
  });
});
