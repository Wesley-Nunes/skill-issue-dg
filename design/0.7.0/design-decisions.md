# Design decisions — 0.7.0 reward loop, branch shop, and explicit Warden summon

Owner: `design` · Task `0.7.0/001` · Design contract completed on
2026-11-10 for the operator-approved `0.7.0` reward-loop scope.

## 1. Source and status

- Product context: `docs/about-the-project.md` §3.3, §4.1–4.3, §5.2, §6, §9,
  §11.6.
- Design task: `docs/tasks/0.7.0/001-design.md`.
- Implementation task: `docs/tasks/0.7.0/001-programmer.md`.
- Verification task: `docs/tasks/0.7.0/001-qa.md`.
- Status: design contract complete; no blocking design question remains;
  ready for orchestrator review and implementation.
- The operator approved the product scope on 2026-11-09 and is not available
  for a new design questionnaire. This document reuses the established
  `0.4.0`–`0.6.0` visual language and records reversible defaults for
  low-impact choices as assumptions in §13. It does not change the approved
  prices, reward amounts, topology, shop rules, or run-scoped reset rules.

## 2. Design goals and intended feeling

- The floor should read as one clear branch, not a maze: the junction is a
  real choice, the shop is a safe dead end, and the arena is the goal.
- The shop should feel like a quiet, safe pause in the fight. The player
  should understand what is for sale, what it costs, what is already carried,
  and why a purchase is blocked without trial and error.
- The Warden summon should feel like a deliberate, warned action rather than
  an automatic event. The player should know that summoning closes the shop.
- The HUD should answer three questions at a glance: how hurt am I, what can I
  spend, and what do I carry?
- No new art or audio. The reward loop is expressed through existing tiles,
  sprites, typography, procedural shapes, and text.

## 3. Palette, typography, and shape rules

### Palette

| Role | Value |
|---|---|
| Void / world background | `#0b0a0f` |
| Primary text | `#f2e9da` |
| Spirit cyan (safe, reward, readiness) | `#bfe9ff` |
| Ember (danger, Warden, blocked) | `#ff6a4d` |
| Secondary text | `rgba(255, 255, 255, 0.70)` |
| Hint / disabled text | `rgba(255, 255, 255, 0.50)` |
| Panel background | `rgba(11, 10, 15, 0.94)` |
| Panel / row borders | `rgba(191, 233, 255, 0.35)` |
| Selected row outline | `rgba(191, 233, 255, 0.55)` |
| Row divider | `rgba(255, 255, 255, 0.12)` |
| Safe threshold line | `rgba(191, 233, 255, 0.45)` |
| Gate iron | `rgba(38, 34, 44, 0.95)` |
| Gate highlight | `rgba(242, 233, 218, 0.25)` |
| Stall wood | `rgba(44, 36, 34, 0.95)` |
| Stall edge | `rgba(242, 233, 218, 0.18)` |
| Lantern glow | `rgba(255, 106, 77, 0.80)` |

No new saturated colours are introduced. Ember is used for danger, the
Warden, and blocked actions; cyan is used for safety, readiness, rewards, and
affordability. Every use of colour is paired with text or shape.

### Typography

| Surface | Font | Size / weight |
|---|---|---|
| Shop panel title | Grenze Gotisch | 30 px, 600 |
| Event banners | Grenze Gotisch | 26 px, 600 |
| Boss name | Grenze Gotisch | 16 px, 600 (unchanged) |
| Panel row names | `system-ui` | 16 px, 600 |
| Panel effects, prices, states, header values | `system-ui` | 13–14 px |
| Panel footer, prompts, HUD values, legend | `system-ui` | 12–16 px |
| World labels (gate, shop sign) | `system-ui` | 9–11 px at 3× zoom |

Small text stays in the system stack. Grenze Gotisch is reserved for headings
and event banners. World labels are drawn at 3× zoom, so 9–11 px world text is
27–33 px on screen; each label sits on a dark backing for contrast.

### Shape and icon rules

- Icons are procedural and simple: a diamond for skill points, a flask for the
  draught, a heart with an up-arrow for Vigor, a bottle glyph for the shop, a
  gate/lock glyph for the arena, and a rune circle for the altar.
- State is never colour-only. Icons change fill, outline, or presence; rows
  change their text and selection chevron; gates show bars or an open arch.
- Keycaps are 14–16 px rounded squares with a 1 px border and the key letter in
  `system-ui`.
- Prompts and floating labels use a dark pill (`rgba(11, 10, 15, 0.80)`) with a
  1 px border in the matching accent colour.

## 4. Floor layout and visual hierarchy

### 4.1 Counted rooms and the junction hub

The task calls the layout a “six-room branch” and lists the junction among the
spaces. The junction is a **hub**, not a counted room. The six rooms are:

1. start room;
2. first mob room;
3. second mob room (shop branch);
4. shop dead end;
5. third mob room (arena branch);
6. boss arena.

The hub is a widened two-tile-high corridor crossroad. It carries the choice
but does not add a seventh room. This preserves the approved topology without
adding or removing a room.

The floor remains a 96 × 30 tile world. Room anchors are fixed; room sizes and
gaps may vary by ±1 tile by seed, and decoration varies. The main corridor is
two tiles high at rows 15–16. The shop branch corridor is at rows 5–6. The
north corridor is at columns 47–48. The arena gate sits in the arena corridor
at columns 74–75, rows 15–16.

| Role | Anchor tile rect (x, y, w, h) | Entrance(s) | Contents |
|---|---|---|---|
| Start | 3, 12, 14, 9 | east, rows 15–16 | player spawn at tile centre (5, 16) |
| First mob | 22, 12, 16, 9 | west and east, rows 15–16 | melee mob at room centre (29, 16) |
| Junction hub | 43, 14, 9, 4 | west, north (x 47–48), east | unmarked crossroad |
| Second mob | 38, 2, 15, 8 | south (x 47–48), west rows 5–6 | melee mob at room centre (45, 5.5) |
| Shop | 14, 2, 17, 8 | east, rows 5–6 only | stall x 15–17, y 5–7; threshold x 29–30, y 5–6; safe zone |
| Third mob | 56, 12, 15, 9 | west and east, rows 15–16 | ranged mob at room centre (63, 16) |
| Boss arena | 77, 6, 18, 19 | west, rows 15–16 through the gate | altar x 81–83, y 15–17; boss spawn (88, 11); stairs x 91–92, y 19–20 |

- The start room has one exit. The shop has one entrance and no second exit.
  The arena has one gate entrance; its only other opening is the stairs, which
  are not usable until the Warden is defeated.
- The gate spans the full two-tile corridor. The arena walls meet the gate; it
  cannot be walked around. The shop threshold and the arena gate are the only
  thresholds in this slice.
- The enemy order is melee (first mob), melee (second mob, shop branch), ranged
  (third mob, arena branch). This preserves the existing melee/melee/ranged
  composition and gives the arena branch a different combat texture.
- Seeded variation changes room sizes by ±1 tile, corridor lengths by ±1 tile,
  and decoration (floor variants, crates, rubble, a lantern) only. The anchors,
  room roles, entrances, gate, altar, stall, and stairs are fixed. There is no
  graph generation, pathfinding, or alternate route.

### 4.2 How the branch reads as a choice

- The junction hub is the first open, well-lit crossroad. It has no signpost,
  chevrons, or direction text: the opening to the north and the corridor to the
  east are the only cues, and the player discovers what each leads to.
- The HUD state line and the gate label carry the current goal: `Arena sealed`,
  `Arena open`, `Boss awakened`, or `Stairs open`. Both appear only when the
  player reaches the thing they describe.
- There is no minimap, compass, or waystone. The gate label, the shop sign, and
  the HUD state line are contextual state, not directions.

The branch is physically laid out with the shop branch turning north then west
and the arena branch continuing east. “Left” and “right” in the product
language refer to the two choices at the junction, not to a literal screen
direction.

**Amendment (2026-11-11):** the original waystone and its `SHOP`/`WARDEN`
labels were removed by operator decision. The two 8 px labels shared a baseline
and overlapped each other and the player sprite, and the chevrons pointed
left/right even though the shop route turns north then west. Exploration, the
gate state label, and the shop sign now carry navigation.

### 4.3 Shop dead end

- The shop is a rectangular room at the top-left of the branch, smaller than
  the arena and warmer than the mob rooms.
- The only entrance is the east corridor at rows 5–6. The walls make the dead
  end obvious; there is no second opening.
- A one-tile **safe threshold** band crosses the entrance: a 1 px cyan line
  with two small rune ticks. Above it hangs a small sign reading `SHOP · SAFE`.
- The stall is a 3 × 3 tile procedural counter against the west wall, with a
  dark wood body, a bottle glyph, a closed or open awning, and a small ember
  lantern. There is no shopkeeper sprite; the stall and sign are the
  non-hostile presentation.
- The shop room has no enemy spawns. Enemies may approach the threshold but
  cannot enter or damage the player inside. The safety persists after the shop
  closes; only purchases stop.
- The interaction zone is the 3 × 2 tile area in front of the counter
  (x 18–20, y 5–7). The player must be inside the shop room, which the zone
  implies.

### 4.4 Arena gate, summon point, and stairs

- The arena gate is a 2 × 2 tile barrier at x 74–75, rows 15–16. It is drawn
  as five vertical iron bars with a central ember rune and a small lock glyph.
  A floating label above it reads `Arena sealed · N/3 at rest`, where `N` is
  the number of non-boss mobs rested. The label updates on every rest.
- When all three mobs are at rest, the bars sink into the floor over 0.4 s
  (instant under reduced motion), the rune turns cyan, the label becomes
  `Arena open`, and a cyan ring expands from the gate (static ring under
  reduced motion). The gate collision is removed. The HUD state line changes
  to `Arena open`; the spirit label becomes `Floor purified`.
- The gate is a barrier, not an interactable. There is no `E` prompt at the
  gate; the label and HUD carry the locked/unlocked state.
- The summon point is a 3 × 3 tile **altar sigil** at x 81–83, y 15–17, just
  inside the arena entrance. It is a floor rune, not a collider.
  - Locked: dark grey ring, ember cracks, three unlit marks, no glow. The gate
    prevents access; a debug-only approach shows `The arena is sealed.`
  - Unlocked: cyan ring with a slow 2 s pulse (static under reduced motion),
    three lit marks (one per rested mob), and a prompt when the player is
    within 48 px: `[E] Summon the Warden`, with a second line
    `Closes the shop for this floor` in 11 px ember/muted text.
  - Summoned: the rune goes ember/dark, the marks dim, and the prompt
    disappears.
- The Warden spawns at tile centre (88, 11), about 125 px from the altar
  centre. It emerges over 0.8 s: no movement, no attack, and no damage during
  the emergence. The boss bar fades in over 0.3 s. The existing ember ring,
  screen-edge flash, and roar are reused (reduced motion: static edge tint).
- The stairs remain the existing 0.4.0 marker at x 91–92, y 19–20. They stay
  locked until the Warden is defeated, then use the existing cyan open state.
  Walking onto the open stairs descends as before.

## 5. Shop interaction

### 5.1 Model and trigger

- The shop is a **canvas-drawn modal panel**, consistent with the title,
  pause, and death overlays. No DOM overlay is added.
- The player opens it with `E` while standing in the 3 × 2 tile zone in front
  of the stall. The prompt `[E] Browse wares` appears when the zone is
  satisfied, the run is playing, and the shop is available.
- Opening the shop freezes the world: enemies, projectiles, bombs, timers, and
  the player do not advance while the panel is open. The shop is safe, so this
  cannot be used to escape danger inside the room.
- While the shop is open:
  - `W`/`S` or `↑`/`↓` move the selection; the selection clamps at the ends
    and does not wrap.
  - `Enter` confirms the selected row.
  - `Escape` closes the shop and resumes the world. It must not open the pause
    overlay while the shop is open.
  - `E` is ignored, so the key that opened the shop cannot accidentally buy
    the first row.
  - `Q`, movement, dodge, and attacks are blocked.
  - `M` remains the global mute toggle; it does not affect shop state.
  - The mouse is ignored; the aim line and pointer cross are not drawn while
    the panel is open. The shop is fully keyboard-operable.
- The selection resets to the draught row each time the shop opens. If the
  selected Vigor row disappears after purchase, the selection moves to the
  draught row.
- The shop closes on `Escape`, on death/restart, on summon, or if it becomes
  unavailable. The panel cannot open while the Warden is awake or defeated,
  while the run is dead, or outside the interaction zone.

### 5.2 Panel layout

- Full-screen dim: `rgba(11, 10, 15, 0.62)`, matching the pause overlay.
- Panel: `min(560, viewportWidth − 64)` wide, 300 px tall, centred. Background
  `rgba(11, 10, 15, 0.94)`, 1 px cyan-tinted border.
- Header, top-left: `Safe-room wares` in Grenze Gotisch 30 px, 600, primary
  text. A 120 × 2 px cyan rule sits under the title.
- Header, top-right: `Skill points: N` in 14 px `system-ui`, cyan when N > 0
  and muted when N = 0; `HP N/M` in 13 px muted directly below.
- Two row slots, each 72 px tall, separated by a 1 px row divider. The draught
  is always the first slot; Vigor is the second when unpurchased.
- Each row shows:
  - a 24 × 24 procedural icon (flask; heart with up-arrow);
  - the item name in 16 px `system-ui`, 600;
  - a one-line effect in 13 px secondary text;
  - the price right-aligned in 14 px;
  - the state right-aligned in 13 px.
- The selected row has a 3 px cyan left bar, a `>` chevron, and a 1 px cyan
  outline. Blocked rows are still selectable so the player can read why they
  are blocked; they are not dimmed below readable contrast.
- Footer, above a 1 px rule: left-aligned hint
  `↑/↓ select · Enter buy · Esc close` in 12 px muted text; right-aligned
  message in 13 px. Success messages are cyan; blocked messages are ember.
  The message area has a fixed height and holds the latest message for 2.5 s,
  then falls back to the hint. The panel does not jump when the message
  changes.
- The HUD remains visible but dimmed behind the panel. The panel header repeats
  the skill-point and HP values the player needs for the purchase decision.
- Panel geometry at 560 × 300: 28 px padding; title baseline at y + 38; rule at
  y + 50; right header lines at y + 30 and y + 50; rows at y + 76–148 and
  y + 148–220; footer rule at y + 236; footer baseline at y + 258. At
  1024 × 640 the panel sits at y = 170; at 1440 × 810 it sits at y = 255.

### 5.3 Shop states

**Healing draught**

| State | Row price | Row state | Confirm result |
|---|---|---|---|
| Not carried, ≥ 1 point | `1 point`, cyan | `Buy`, cyan | Deduct 1, set carried, footer `Purchased: Healing draught` |
| Not carried, 0 points | `1 point`, muted | `Need 1 more`, ember | Blocked; footer `Need 1 more skill point` |
| Carried | `1 point`, muted | `Carried · Q to use`, muted/cyan | Blocked; footer `You already carry a draught. Use Q first.` |
| Used (no longer carried) | `1 point` | Returns to `Buy` or `Need 1 more` | As above |

There is no stock counter. The draught is offered whenever the player is not
carrying one. Buying at full HP is allowed; the draught is carried for later.

**Vigor**

| State | Row price | Row state | Confirm result |
|---|---|---|---|
| Unpurchased, ≥ 3 points | `3 points`, cyan | `Buy`, cyan | Deduct 3, raise max and current HP by 1 (capped), footer `Vigor purchased · Max HP +1` |
| Unpurchased, < 3 points | `3 points`, muted | `Need N more`, ember | Blocked; footer `Need N more skill points` |
| Purchased | — | Row absent | No purchase possible; selection moves to the draught if needed |

Vigor is one-time per run. It is absent from the current shop immediately after
purchase and from every later shop. There is no placeholder row.

The header values, row prices, and row states update immediately after every
purchase. Skill points never become negative. The panel does not change the
approved prices or effects.

### 5.4 Closed shop

- After the Warden is summoned, the shop is closed for the floor and remains
  closed after the Warden is defeated until descent.
- The stall’s awning is drawn down, the bottle glyph dims, and the sign reads
  `CLOSED` in muted/ember text with a small lock glyph. The safe threshold
  line stays; the room is still safe.
- Near the stall, the prompt becomes `[E] Shop closed` in muted text. Pressing
  `E` shows the floating text `The shop is closed.` above the stall. No panel
  opens.
- The next floor’s shop reopens. Vigor remains absent if purchased; a carried
  draught is shown as `Carried`.

### 5.5 Shop safety

- The threshold line and `SHOP · SAFE` sign mark the safe boundary. Enemies
  cannot cross it or damage the player inside. The shop has no enemy spawns.
- The player may attack inside the shop while the panel is closed, but there
  are no enemies to fight there. The modal panel freezes the world and blocks
  combat while open.

## 6. Explicit Warden summon

- The arena unlock is the existing `floorPurified` event plus the new gate
  presentation. Resting the last mob fills the spirit meter, sets
  `floorPurified`, opens the gate, and shows the centered banner
  `The arena opens` in cyan for 1.6 s. No Warden appears automatically.
- The summon is a single deliberate interaction at the altar. There is no
  second confirmation dialog: the player must walk to the altar, and the
  prompt itself states the consequence (`Closes the shop for this floor`).
  Walking away cancels. `E` is one-press; holding it does not repeat.
- On a successful summon:
  - the Warden is created at `floor.bossSpawn` (tile centre 88, 11);
  - `bossAwake` becomes true and the stairs stay locked;
  - the shop closes for the floor;
  - the existing boss-summoned ember ring, screen-edge flash, roar, and boss
    layers play;
  - the boss bar fades in over 0.3 s;
  - the centered banner `The Warden rises · the shop closes` appears in ember
    for 1.8 s;
  - the HUD state line becomes `Boss awakened` and the spirit label becomes
    `Boss awakened`;
  - the altar rune goes ember/dark and the summon prompt disappears.
- The Warden emerges for 0.8 s with no movement, attack, or damage. The player
  at the altar is about 125 px from the spawn, outside the Warden’s 40 px melee
  range. After emergence, normal AI begins.
- A summon before unlock is blocked with the floating text
  `The arena is sealed.` (only reachable through debug/test setup). A repeat
  summon, or a summon after the Warden is defeated, is a no-op with no prompt.
- Defeating the Warden keeps the existing boss-defeated feedback, awards 3
  skill points exactly once, opens the stairs, and leaves the shop closed for
  the floor. The centered banner `Warden defeated · +3 skill points` appears
  in ember for 1.8 s.

## 7. HUD

The existing HUD order stays: hearts and spirit top-left, depth and state
top-right, boss bar top-centre, control legend bottom-left, mute indicator
bottom-right. Additions:

| Element | Position / treatment |
|---|---|
| Hearts | x 24, y 24; 39 × 36 sprites, 6 px gap; `ceil(maxHp / 2)` hearts |
| Spirit label | x 24, y 74; 14 px; `Spirit: N%`, `Floor purified`, or `Boss awakened` |
| Spirit bar | x 24, y 92; 120 × 6; existing track/fill/border |
| Skill points | x 24, y 112; 6 px diamond icon; `Skill points` 13 px muted; count 16 px |
| Carried draught | x 24, y 136; 12 × 16 flask icon; `Draught` 13 px; `Q` keycap; state text |
| Depth | top-right, x = width − 24, y 24; 16 px; unchanged |
| State line | top-right, y 47; 13 px; `Arena sealed` / `Arena open` / `Boss awakened` / `Stairs open` |
| Boss bar | top-centre, unchanged; `min(360, width × 0.5)` × 10 px; name 16 px Grenze |
| Control legend | bottom-left, two lines, 12 px `system-ui`, secondary text |
| Mute | bottom-right, aligned with the lower legend line; unchanged |

### Skill points

- 0 points: outline diamond, `Skill points` label muted, count `0` muted.
- More than 0: filled cyan diamond, label muted, count cyan.
- The count updates immediately on earn, spend, and reset. On gain it briefly
  brightens with a 0.35 s cyan highlight (static highlight under reduced
  motion). Affordability is shown in the shop, not by a second HUD state.

### Carried draught

- Empty: outline flask in muted grey, `Draught` label muted, `Q` keycap dim,
  state `Empty` muted.
- Carried: filled cyan flask, `Draught` label primary, `Q` keycap cyan,
  state `Carried` cyan.
- The `Q` keycap is always present so the use key is discoverable; it is
  brighter when the draught is carried.
- The state updates immediately on purchase, use, and reset. It persists across
  descent and resets on death/restart.

### Heart row at a Vigor-raised maximum

- The row draws `ceil(maxHp / 2)` hearts. With one Vigor, maximum HP is 7:
  three full hearts and one half heart (the fourth slot).
- Each heart covers 2 HP: full at 2i+2, half at 2i+1, empty below.
- The heal pulse rectangle width adapts to the number of hearts. The row stays
  left-aligned at x 24 and does not collide with the spirit label at y 74.
- The fourth heart appears immediately on purchase; the footer message and a
  short spirit-cyan pulse across the row confirm the change. Under reduced
  motion the pulse is a static outline for 0.35 s.

### State line labels

| Floor state | State line | Spirit label |
|---|---|---|
| Before purification | `Arena sealed` (muted) | `Spirit: N%` |
| All mobs rested, Warden not summoned | `Arena open` (cyan) | `Floor purified` |
| Warden awake | `Boss awakened` (ember) | `Boss awakened` (ember) |
| Warden defeated | `Stairs open` (cyan) | `Floor purified` |

### Control legend

Two lines, bottom-left, 12 px `system-ui`, secondary text:

```text
WASD move · Mouse aim · LMB combo · Space dodge
E interact · Q draught · Esc pause · M mute · R restart
```

The upper line sits at `cssHeight − 44`; the lower line at
`cssHeight − 26`. The mute indicator stays bottom-right on the lower baseline.
The two-line split keeps the legend readable at 1024 × 640 and avoids the
one-line overflow risk. The title screen’s 14 px controls line adds
`E interact · Q draught`; it remains one line and fits at 1024 × 640.

## 8. Feedback, motion, and audio

### Feedback map

| Event | Visual feedback | Audio |
|---|---|---|
| Mob rests | Floating `Rested · +1 skill point` above the mob; existing rest sparks; HUD count highlight | Existing rest cue |
| Last mob rests | Above plus centered `The arena opens` (cyan, 1.6 s); cyan ring at the gate; HUD `Arena open`; spirit `Floor purified` | Existing floor-purified cue |
| Warden defeated | Existing boss-defeated ring/sparks; centered `Warden defeated · +3 skill points` (ember, 1.8 s); HUD count highlight; boss bar clears; `Stairs open` | Existing boss-defeated cue |
| Buy draught | Panel footer `Purchased: Healing draught` (cyan); HUD count and draught state update | Existing metal click if already wired; otherwise silent |
| Buy Vigor | Panel footer `Vigor purchased · Max HP +1` (cyan); heart row expands; spirit-cyan pulse; HUD count update; Vigor row absent | Existing heal/bell cue if already wired; otherwise silent |
| Blocked purchase (points) | Panel footer `Need N more skill point(s)` (ember); row state already shows the shortfall; no deduction | Low impact cue if already wired; otherwise silent |
| Blocked purchase (carrying) | Panel footer `You already carry a draught. Use Q first.` (ember); no deduction | Low impact cue if already wired; otherwise silent |
| Use draught | Floating `+2 HP` or `+1 HP` above the player; existing heal pulse; HUD draught becomes `Empty` | Existing heal cue |
| Use at full HP | Floating `Already at full HP` (muted/ember); no heal pulse; draught stays carried | None or low cue |
| Use with no draught | Floating `No draught` (muted); no heal pulse | None |
| Arena locked | Gate bars, lock glyph, `Arena sealed · N/3 at rest`; HUD `Arena sealed` | None |
| Arena unlocked | Gate bars sink; `Arena open`; cyan ring; centered `The arena opens`; HUD `Arena open` | Existing floor-purified cue |
| Summon | Existing ember ring/flash/roar; boss bar; centered `The Warden rises · the shop closes` (ember, 1.8 s); altar dark; HUD `Boss awakened`; shop sign closed | Existing boss-summoned cue |
| Shop closed near stall | Sign `CLOSED`; prompt `[E] Shop closed`; pressing E shows `The shop is closed.` | None |

- Resting a mob is the only source of 1 skill point, so the rest feedback
  carries the `+1`. A failed rite, conventional kill, or respawn keeps the
  existing feedback and shows no point text.
- Every message is text-first. Colour is an accent, not the only carrier.

### Floating text and banners

- Floating world text: 13 px `system-ui`, centred, dark pill background, 1 px
  border in the accent colour. It rises 16 px over 1.2 s and fades over the
  last 0.4 s. Under reduced motion it appears at its final position, holds for
  1.0 s, and fades over 0.2 s.
- Centered event banners: Grenze Gotisch 26 px, 600, on a dark backing, centred
  at `cssHeight × 0.28`. They hold for 1.6–1.8 s. Under reduced motion they
  appear and disappear without a rise or flash.
- HUD count highlight: 0.35 s cyan glow behind the count; under reduced motion,
  a static brighter colour for 0.35 s, no scale.
- Heart pulse: the existing spirit-cyan stroke rectangle; under reduced motion,
  a static outline for 0.35 s.
- Gate ring: 0 → 60 px over 0.5 s; under reduced motion, a static ring for
  0.2 s.
- Summon: the existing ember ring and 0.6 s screen-edge flash; under reduced
  motion, a static ember edge tint for 0.2 s instead of the expanding ring and
  flash. No screen shake and no rapid strobe.

### Audio

- No new audio files. Reuse existing cues where the audio manager already
  exposes them; a new event that cannot reuse a cue is silent. The visual
  feedback is complete without sound.
- Audio remains optional and mutable with `M`. No gameplay state, purchase,
  summon, or shop state depends on hearing a cue.

## 9. Controls

| Input | Action |
|---|---|
| `W`, `A`, `S`, `D` | Move (unchanged) |
| Mouse | Aim (unchanged) |
| Left mouse button | Light attack combo (unchanged) |
| `Space` | Dodge (unchanged) |
| `E` | Context interact: open the shop near the stall; summon the Warden near the altar |
| `Q` | Use the carried healing draught |
| `W`/`S` or `↑`/`↓` | Move the shop selection while the shop is open |
| `Enter` | Confirm the selected shop purchase |
| `Escape` | Close the shop while open; otherwise pause/resume as before |
| `M` | Mute/unmute (unchanged; remains global while the shop is open) |
| `R` | Restart after death (unchanged) |
| `Enter`/`Space`/click | Start from the title screen (unchanged) |

- `E` is the single context-sensitive interact key. The prompt always names the
  action (`Browse wares`, `Summon the Warden`, or `Shop closed`), so the same
  key cannot be ambiguous.
- All interaction keys are one-press; holding a key does not repeat.
- The shop is keyboard-only. The mouse does not hover or click panel rows.
- The control legend and README add the new keys. The README controls table
  should list `E`, `Q`, shop navigation, `Enter`, and the shop-aware `Escape`
  behaviour. The README gameplay loop should describe the six-room branch, the
  skill-point economy, the shop, and the explicit summon.
- The title screen controls line becomes
  `WASD move · Mouse aim · LMB combo · Space dodge · E interact · Q draught · Esc pause · M mute`.

## 10. Accessibility and readability

- **Keyboard-only shop:** open with `E`, navigate with `W`/`S` or arrows,
  confirm with `Enter`, close with `Escape`. No mouse action is required.
- **Contrast:** primary text and important state text use `#f2e9da`,
  `#bfe9ff`, or `#ff6a4d` on the dark panel or world. Secondary text is 0.70
  white; 0.50 is reserved for hints and disabled labels. World labels, prompts,
  and floating text use dark backings.
- **Non-colour-only cues:** state words (`Buy`, `Need N more`, `Carried`,
  `Empty`, `Arena sealed`, `Arena open`, `CLOSED`), filled/outline icons,
  selection chevrons, gate bars versus open arch, lock glyphs, and lit/unlit
  altar marks.
- **Audio-optional:** every required state has a visual cue; mute never hides a
  state; no gameplay depends on sound.
- **Reduced motion:** the new effects respect `prefers-reduced-motion: reduce`
  as described in §8. The existing combat effects keep their approved timing;
  this slice does not add screen shake or rapid strobe.
- **Resolution:** the HUD, two-line legend, 560 × 300 shop panel, four-heart
  row, gate/altar labels, and prompts are readable at 1024 × 640 and
  1440 × 810. The panel width shrinks to `viewportWidth − 64` on narrower
  viewports; the required test sizes are 1024 × 640 and 1440 × 810.
- **Screen readers:** the canvas HUD and panel are not announced by assistive
  technology in this slice. A DOM/ARIA shop overlay and live announcements are
  deferred, not claimed as implemented.

## 11. Assets and constraints

- **No new art, audio, or font files are required.** The design reuses:
  - DungeonTileset II floor variants and wall frames;
  - the existing player, melee, ranged, Warden, bomb, sword, and heart sprites;
  - the existing Grenze Gotisch display face and the system UI stack;
  - the existing CC0/synthesized audio cues.
- Procedural drawing supplies the shop stall, awning, sign, bottle/flask icons,
  gate bars, lock glyphs, altar rune, threshold line, panel, row icons, keycaps,
  floating text, banners, HUD diamond, and draught icon.
- There is no shopkeeper sprite. The stall, sign, and wares are the non-hostile
  shop presentation; reusing an enemy frame would be ambiguous.
- No new runtime dependency, UI framework, DOM overlay, external request, or
  asset pack is introduced.
- The shop and arena use the existing floor and wall tiles. The gate, altar,
  and stall are drawn over them; they do not change walkability except through
  the gate collision and the safe-room rule.

## 12. Deferred work

The following are explicitly deferred and are **not** approved by this
document:

- shopkeeper NPCs, dialogue, portraits, or animated shopkeepers;
- item art beyond procedural glyphs, item comparison, tooltips, or a catalog;
- inventory grids, equipment, artifacts, additional consumables, stock
  counters, shop refresh, or random shop inventory;
- post-death purchases, meta-progression, persistence, or a save system;
- randomized safe-room count/placement, quest rooms, rest rooms, or safe-room
  variety;
- a general dungeon graph/pathfinding generator, alternate routes, secrets,
  minimap, compass, or fog of war;
- difficulty scaling, new enemies, boss phases, multiple bosses, or floor
  themes;
- mobile/touch layout, remapping, settings menus, volume sliders, or
  localisation;
- a DOM/ARIA shop overlay, screen-reader announcements, or focus management;
- additional audio cues, music, voice, or an audio-dependent state;
- damage numbers, loot drops, chests, gold, score, or combo currency.

## 13. Assumptions and non-blocking decisions

- **Six-room count.** The task’s “six-room branch” counts the six rooms listed
  in §4.1. The junction is a hub, not a seventh room. This preserves the
  approved topology and the task’s own list of spaces.
- **Branch orientation.** The shop branch turns north then west; the arena
  branch continues east. “Left” and “right” are the two junction choices, not
  literal screen directions. The junction is unmarked and the player explores.
- **Mob order.** Melee, melee, ranged, preserving the existing composition.
  The ranged mob is in the arena branch.
- **Room variation.** Room sizes vary by ±1 tile and decoration varies by seed;
  anchors, roles, entrances, gate, altar, stall, and stairs are fixed.
- **Modal shop.** The canvas panel freezes the world, blocks movement/combat/
  draught use, and closes with `Escape` instead of pausing. `M` remains global.
- **Keyboard-only shop.** The mouse is ignored while the panel is open; this
  is simpler and satisfies the keyboard-operability requirement.
- **No summon confirmation dialog.** The altar prompt names the consequence
  (`Closes the shop for this floor`), and the walk to the altar is the
  deliberate action. A second dialog would add a mode for little benefit.
- **Full-HP draught use.** Blocked and not consumed; the draught stays carried.
  This confirms the programmer task default.
- **Vigor current HP.** Maximum and current HP both increase by 1, capped at
  the new maximum. This confirms the programmer task default.
- **Draught stock.** Unlimited while the player is not carrying one; no stock
  counter. This confirms the programmer task default.
- **Heart row.** `ceil(maxHp / 2)` hearts; one Vigor gives 7 maximum HP, shown
  as three full hearts and one half heart.
- **Closed shop.** The shop stays closed after the Warden is defeated until
  descent; the next floor reopens it. Vigor stays absent if purchased.
- **Selection.** The shop selection resets to the draught row each open and
  does not wrap.
- **Death summary.** The existing depth and mobs-purified summary is unchanged;
  skill-point and purchase totals are not added in this slice.
- **Reduced motion.** The new effects respect the preference; the existing
  combat effects keep their approved timing. A mid-run preference change is not
  required to apply live.
- **No new assets.** If implementation finds that a new asset is genuinely
  necessary, stop and return the need to the orchestrator for operator
  approval; do not add it silently.

## 14. Handoff

The programmer should implement this contract together with
`docs/tasks/0.7.0/001-programmer.md`. The QA agent should verify it against
`docs/tasks/0.7.0/001-qa.md`, including the states, copy, positions, and
accessibility behaviour above. No product scope change is introduced. There is
no blocking design question. If an implementation discovery contradicts an
approved product rule or this contract, return it to the orchestrator rather
than inventing a rule.
