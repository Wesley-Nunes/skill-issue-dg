export const DISPLAY_FONT_FAMILY = '"Grenze Gotisch", system-ui, sans-serif';

export type FontStatus = "pending" | "loaded" | "fallback";

const FONT_LOAD_TIMEOUT_MS = 3000;

/** Builds a canvas font shorthand for the display typeface. */
export function displayFont(size: number, weight = 600): string {
  return `${weight} ${size}px ${DISPLAY_FONT_FAMILY}`;
}

/**
 * Waits for the weights used by the display surfaces. A slow or broken font
 * falls back to the system stack instead of blocking the title screen.
 */
export async function loadDisplayFont(): Promise<Exclude<FontStatus, "pending">> {
  if (typeof document === "undefined" || !document.fonts) {
    return "fallback";
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"fallback">((resolve) => {
    timer = setTimeout(() => resolve("fallback"), FONT_LOAD_TIMEOUT_MS);
  });

  const load = Promise.all([
    document.fonts.load(`600 56px ${DISPLAY_FONT_FAMILY}`),
    document.fonts.load(`500 30px ${DISPLAY_FONT_FAMILY}`),
  ])
    .then(
      () =>
        (document.fonts.check(`600 56px ${DISPLAY_FONT_FAMILY}`)
          ? "loaded"
          : "fallback") as "loaded" | "fallback",
    )
    .catch(() => "fallback" as const);

  try {
    return await Promise.race([load, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
