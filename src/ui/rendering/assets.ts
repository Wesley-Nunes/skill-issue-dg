import { ASSET_BASE } from "../../game/data/config";
import { ALL_SPRITE_FILES } from "../../game/data/sprites";

export type AssetMap = Map<string, HTMLImageElement>;

const MAX_ATTEMPTS = 3;

/**
 * Loads one image, retrying the request when the browser fails to fetch or
 * decode it. A missing or unreadable file still fails loudly after the last
 * attempt instead of leaving a half-drawn room.
 */
async function loadImage(file: string): Promise<HTMLImageElement> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const image = new Image();
    const cacheBuster = attempt === 1 ? "" : `?retry=${attempt}`;
    image.src = `${ASSET_BASE}${file}${cacheBuster}`;

    try {
      await image.decode();
      return image;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
      }
    }
  }

  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Could not load ${file} after ${MAX_ATTEMPTS} attempts: ${reason}`,
  );
}

/**
 * Loads frames one at a time. Requesting every frame at once intermittently
 * aborts a response, which surfaces as an undecodable image during boot.
 */
export async function loadAssets(
  onSettled?: (file: string) => void,
): Promise<AssetMap> {
  const assets: AssetMap = new Map();

  for (const file of ALL_SPRITE_FILES) {
    assets.set(file, await loadImage(file));
    onSettled?.(file);
  }

  return assets;
}
