function frames(name: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${name}_f${index}.png`);
}

export const SPRITES = {
  playerIdle: frames("knight_m_idle_anim", 4),
  playerRun: frames("knight_m_run_anim", 4),
  playerHurt: "knight_m_hit_anim_f0.png",
  enemyIdle: frames("chort_idle_anim", 4),
  enemyRun: frames("chort_run_anim", 4),
  rangedIdle: frames("imp_idle_anim", 4),
  rangedRun: frames("imp_run_anim", 4),
  sword: "weapon_knight_sword.png",
  heartFull: "ui_heart_full.png",
  heartHalf: "ui_heart_half.png",
  heartEmpty: "ui_heart_empty.png",
} as const;

export const FLOOR_TILES = Array.from(
  { length: 8 },
  (_, index) => `floor_${index + 1}.png`,
);

export const WALL_TILES = [
  "wall_mid.png",
  "wall_left.png",
  "wall_right.png",
  "wall_top_left.png",
  "wall_top_mid.png",
  "wall_top_right.png",
];

export const ALL_SPRITE_FILES: string[] = [
  ...new Set([
    ...SPRITES.playerIdle,
    ...SPRITES.playerRun,
    SPRITES.playerHurt,
    ...SPRITES.enemyIdle,
    ...SPRITES.enemyRun,
    ...SPRITES.rangedIdle,
    ...SPRITES.rangedRun,
    SPRITES.sword,
    SPRITES.heartFull,
    SPRITES.heartHalf,
    SPRITES.heartEmpty,
    ...FLOOR_TILES,
    ...WALL_TILES,
  ]),
];
