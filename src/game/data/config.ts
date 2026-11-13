export const TILE = 16;
export const ZOOM = 3;

/**
 * The fixed six-room branch: start, three mob rooms, a shop dead end, and the
 * boss arena. Room anchors and roles are fixed; sizes vary by one tile and
 * decoration varies by seed. There is no graph generator or pathfinding.
 */
export const FLOOR = {
  cols: 96,
  rows: 30,
  roomCount: 6,
  roomVariation: 1,
  corridorRows: 2,
  corridorRow: 15,
  shopCorridorRow: 5,
  northCorridorColumn: 47,
  margin: 2,
} as const;

/** Skill-point economy and safe-room shop tuning. */
export const ECONOMY = {
  pointsPerMob: 1,
  pointsPerWarden: 3,
  draughtCost: 1,
  draughtHeal: 2,
  vigorCost: 3,
  vigorMaxHpGain: 1,
} as const;

export const PLAYER = {
  speed: 120,
  radius: 6,
  maxHp: 6,
  damageInvulnerability: 0.6,
  hurtFlash: 0.15,
  hurtFlashWhite: 0.08,
} as const;

/** One committed light swing. See design/0.8.0/design-decisions.md §2. */
export const ATTACK = {
  windup: 0.1,
  active: 0.09,
  recovery: 0.22,
  reach: 36,
  halfAngle: (60 * Math.PI) / 180,
  damage: 2,
  knockback: 6,
  hitstop: 0.05,
} as const;

/** Depth difficulty curve. Values are design-owned; see design/0.8.0 §5. */
export const DEPTH = {
  cap: 10,
  hpBase: 0.8,
  hpStep: 0.08,
  hpMax: 1.52,
  cadenceBase: 1.15,
  cadenceStep: 0.03,
  cadenceMin: 0.88,
  /** Depth from which the melee mob hits for 2. */
  meleeDamageDepth: 5,
  /** Depth from which the projectile hits for 2. */
  rangedDamageDepth: 6,
  /** Depth from which the Warden's melee hits for 3. */
  bossDamageDepth: 6,
  /** Depth from which a bomb blast hits for 3. */
  bombDamageDepth: 7,
} as const;

export const MELEE = {
  speed: 55,
  radius: 6,
  maxHp: 10,
  aggroRadius: 160,
  attackRange: 26,
  windup: 0.45,
  active: 0.1,
  attackCooldown: 1.1,
  damage: 1,
} as const;

export const RANGED = {
  speed: 70,
  radius: 6,
  maxHp: 6,
  aggroRadius: 260,
  nearRange: 110,
  farRange: 240,
  telegraph: 0.5,
  attackCooldown: 1.6,
} as const;

/** The Floor Warden: one boss per floor, summoned by a full spirit meter. */
export const BOSS = {
  name: "Floor Warden",
  radius: 12,
  maxHp: 30,
  speed: 38,
  aggroRadius: 240,
  attackRange: 40,
  windup: 0.55,
  active: 0.14,
  attackCooldown: 1.6,
  damage: 2,
  bombCooldown: 2.6,
  bombWindup: 0.7,
  /** Harmless emergence window after the explicit summon. */
  emergence: 0.8,
} as const;

/** Presentation timing for the arena gate and the shop panel message. */
export const GATE = {
  openTime: 0.4,
} as const;

export const SHOP = {
  /** How long a purchase message stays in the panel footer. */
  messageTime: 2.5,
  /** Interaction range around the altar and stall zones. */
  altarPromptRange: 48,
} as const;

/** A thrown boss bomb: arc to the target, fuse, then a radial blast. */
export const BOMB = {
  radius: 5,
  flightTime: 0.65,
  fuse: 1.0,
  blastRadius: 30,
  damage: 2,
  /** Visual arc height in world pixels. */
  arcHeight: 18,
} as const;

/** HP restored when the player takes the stairs to the next floor. */
export const HEAL_ON_DESCENT = 2;

export const ENEMY_FADE = 0.25;

/**
 * Spirit purification rules. A mob carries one fragment per angle; all of
 * them must be broken without losing HP before the mob can rest.
 */
export const PURIFICATION = {
  /** Fragment orbit angles around the enemy, measured from its body centre. */
  angles: [(-135 * Math.PI) / 180, (-45 * Math.PI) / 180],
  orbitRadius: 12,
  /** Vertical offset of the orbit centre from the enemy's feet. */
  orbitOffsetY: -10,
  fragmentRadius: 3.2,
  fragmentColor: "#bfe9ff",
  bobAmplitude: 1.2,
  bobSpeed: 3,
  spiritPerMob: 34,
  spiritThreshold: 100,
  /** Delay before a conventionally killed mob returns at its spawn. */
  respawnDelay: 2,
} as const;

export const PROJECTILE = {
  speed: 150,
  radius: 4,
  life: 1.6,
  damage: 1,
  spawnOffset: 10,
} as const;

export const DODGE = {
  distance: 64,
  duration: 0.18,
  invulnerability: 0.25,
  cooldown: 0.9,
} as const;

export const CAMERA = {
  tau: 0.12,
} as const;

export const IMPACT = {
  flash: 0.08,
} as const;

export const ASSET_BASE = "/assets/dungeon-tileset-ii/frames/";
export const AUDIO_BASE = "/assets/audio/";
