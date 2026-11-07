# Design decisions — 0.5.0 portfolio release

Owner: `design` · Task `0.5.0/001` · Approved for implementation on
2026-11-07 under the operator's direction to produce a portfolio release.

## 1. Source and status

- Product context: `docs/about-the-project.md` §3.3, §4.1, §5.2, §7, §9, §11.
- Task: `docs/tasks/0.5.0/001-design.md`.
- Status: approved; no blocking operator design question remains.
- The operator approved the feature direction and supplied the `big_demon`,
  `bomb`, and CC0 audio assets. This document reuses the existing dark-dungeon
  visual language.

## 2. Design goals

- Give the spirit meter a visible payoff: a floor boss that feels like the
  reason the floor was purified.
- Make the bomb attack readable and dodgeable without a tutorial.
- Make the game feel finished before play starts and after the player dies.
- Keep the existing combat, purification, and dungeon readability unchanged.
- Let audio support weight and presence without becoming loud or required.

## 3. Boss summon and identity

- The boss is the **Floor Warden**. It uses the `big_demon` frames
  (`big_demon_idle_anim_f0..3`, `big_demon_run_anim_f0..3`) at their native
  32 × 36 size.
- When the last non-boss mob rests, the spirit meter reaches 100%, the HUD
  changes to **Boss awakened**, and the Warden appears at the final room's
  boss spawn with:
  - a 0.6 s ember-red screen-edge flash;
  - an expanding ember ring at the spawn point;
  - a deep roar;
  - a boss bar fading in over 0.3 s.
- The Warden has a slow-pulsing ember ring under its feet (radius 18 px,
  alpha 0.15–0.30, 2.5 s period) so it reads as heavier than a mob.
- The Warden is drawn at `-16, -36` relative to its feet. Its shadow is a
  12 × 4 ellipse, larger than the 6 × 2.5 mob shadow.
- The Warden does not carry spirit fragments. Its silhouette and bar are the
  boss cues; no fragment orbit is added.

## 4. Boss combat states

| State | Visual |
|---|---|
| Idle / chase | Idle frames at 6 fps, run frames at 10 fps; ember aura; faces the player. |
| Melee windup | 0.55 s; the Warden is tinted ember red and a red ring of `BOSS.attackRange` is drawn around it. |
| Melee active | 0.14 s; the ring fades; a short ember arc is drawn in the facing direction. |
| Bomb windup | 0.7 s; ember tint and a small crackling ember charge at the Warden's hands. |
| Hurt | White flash for 0.08 s, then a short ember-tinted recovery. No knockback. |
| Stagger | The finisher may briefly tint the Warden; it is not pushed. |
| Dying | The existing 0.25 s fade plus an ember burst; the stairs open immediately on reaching 0 HP. |

- The Warden does not rest, respawn, or drop spirit.
- The Warden's melee ring and bomb marker use shape and pulse in addition to
  color.

## 5. Bomb presentation

- A bomb is thrown toward the player's position at throw time. It arcs from
  the Warden to the landing point over 0.65 s with a 18 px visual height.
- During flight:
  - a dark shadow ellipse marks the landing point;
  - the `bomb_f0..2` sprite animates at 10 fps at the arcing position;
  - a thin ember trail follows the bomb.
- On landing:
  - the bomb sits at the landing point;
  - a red blast-radius ring (30 px) pulses at 0.25–0.5 alpha;
  - a fuse spark flickers above the bomb;
  - the ring pulses faster in the last 0.35 s of the 1.0 s fuse.
- On explosion:
  - an ember ring expands from 0 to 30 px over 0.25 s and fades;
  - a brief 0.08 s warm flash covers the blast area;
  - 8 short ember sparks fly outward;
  - no screen shake is added; the blast is readable from the ring and flash.
- The bomb is a threat only to the player. It does not damage mobs or the
  Warden.

## 6. HUD

The existing top-left hearts, spirit meter, top-right depth block, and bottom
control hint stay. Add or change:

- **Stairs state** in the top-right, below `Depth N`:
  - `Stairs sealed` in muted grey while the floor is not purified;
  - `Boss awakened` in ember red while the Warden is alive;
  - `Stairs open` in spirit cyan after the Warden falls.
- **Spirit meter**:
  - `Spirit: N%` in spirit cyan while filling;
  - `Boss awakened` in ember red while the Warden is alive;
  - `Floor purified` in spirit cyan after the Warden falls;
  - the bar keeps its current size and position and pulses slowly while the
    Warden is alive.
- **Boss bar**: top-centre, width `min(360, viewportWidth × 0.5)`, 10 px tall,
  with the name `Floor Warden` in 13 px above it. Dark track, ember fill,
  1 px ember border. Hidden unless `bossAwake` is true. It must not overlap
  the hearts or the top-right depth block.
- **Mute indicator**: add `M mute` to the bottom control hint. When muted,
  show `Muted (M)` in muted grey at the bottom-right. The HUD remains
  readable when muted.

## 7. Title, pause, and death

### Title

- The app opens on a full-screen overlay over the dimmed generated floor.
- Centred title `skill issue dg` in 56 px light text (`#f2e9da`), with a
  120 px spirit-cyan underline.
- Subtitle `A dark-fantasy action roguelike` in 16 px muted text.
- Controls block in 14 px:
  `WASD move · Mouse aim · LMB combo · Space dodge · Esc pause · M mute`.
- Prompt `Click to begin` in 18 px spirit cyan, pulsing between 0.6 and 1.0
  alpha on a 1.2 s cycle.
- Clicking the canvas or pressing Enter/Space starts the run. The HUD is
  hidden on the title screen. The world behind is the generated floor at the
  spawn, dimmed by a `rgba(11, 10, 15, 0.72)` overlay.

### Pause

- Escape toggles pause.
- Overlay `rgba(11, 10, 15, 0.6)`, `Paused` in 36 px, `Esc to resume` in
  16 px, `M to mute` in 14 px.
- The world and HUD stay visible but frozen.

### Death

- Existing dark overlay and `You died` title stay.
- Add, in 16 px muted text:
  - `Depth reached: N`;
  - `Mobs purified: N`.
- Keep `Press R to restart` in 18 px.
- `R` starts a fresh depth-1 run directly; it does not return to the title.

## 8. Audio feedback map

Audio unlocks on the first click or key press and the ambient loop starts
then. `M` toggles all audio. No gameplay cue depends on audio.

| Event | Cue |
|---|---|
| Title click / start | `metalClick.ogg` |
| Combo swing | `knifeSlice.ogg` / `knifeSlice2.ogg`, alternating; finisher pitched down |
| Sword hits enemy | `impactPunch_heavy_000..004`; finisher adds `impactSoft_heavy` |
| Player hurt | `impactSoft_heavy_000..004`, pitched down, plus a synth sub-thud |
| Dodge | `cloth1..4.ogg`, random |
| Ranged shot | Synth airy whoosh + crackle |
| Projectile hits wall | `impactGeneric_light_000..004`, low volume |
| Projectile hits player | `impactSoft_heavy_000..004` |
| Fragment break | `impactGlass_light_000..004`, pitched up, plus a synth shimmer |
| Enemy rests | Synth rising spirit chord + bell, quiet |
| Failed rite / enemy dies | `impactSoft_heavy` low thud + synth growl tail |
| Enemy respawns | Synth reverse whoosh |
| Floor purified | `impactBell_heavy_000..002`, pitched down, plus a synth chord |
| Boss summoned | `monster_roar.wav` pitched down + boss layers start |
| Boss melee windup | Synth low growl / breath |
| Boss bomb throw | `falling.mp3` pitched down |
| Bomb lands | `impactGeneric_light_000..004` |
| Bomb fuse | `fuse.ogg` looped until detonation |
| Bomb explodes | `explosion1..4.ogg`, random, slight pitch variation |
| Boss defeated | `monster_roar.wav` pitched down + `impactBell_heavy` + boss layers stop |
| Stairs unlock | `metalLatch.ogg` + `creak2.ogg` |
| Descent | `doorOpen_2.ogg` + `doorClose_3.ogg` + synth rumble |
| Heal on descent | Synth soft bell/chime, only when HP actually increases |
| Player dies | Low synth impact + short roar tail |
| Ambient | `caverns.ogg` loop at low volume |

Boss synth layers: a low distorted presence bed, furnace-like filtered-noise
breathing, a quiet fire roar, movement sub-thumps on heavy steps, an FM growl
for voice, and sparse high-passed crackle for magic. The bed is quiet by
design; roars and explosions are the loud peaks. The ambient loop ducks under
roars and explosions.

World sounds pan slightly by the source's horizontal offset from the player
and attenuate with distance. The boss bed and ambient are centred.

## 9. Heal on descent

- Descending restores 2 HP, capped at the maximum (6).
- When HP increases, a soft spirit-cyan pulse runs across the hearts and the
  synth heal cue plays. When HP is already full, no heal cue is shown.
- The existing depth banner and floor-entry flash still play.

## 10. Accessibility and readability

- Bomb danger uses a ring, a shadow, a fuse spark, and a faster pulse, not
  only color.
- The boss bar uses a name, a fill, and a border.
- The title and pause screens are text-first and readable at 1024 × 640.
- Audio is optional and mutable; no gameplay state depends on hearing it.
- No screen shake or motion that changes gameplay timing is added.
- The existing hurt flashes, telegraphs, and combo timings are unchanged.

## 11. Deferred work

Safe rooms, shops, currency, consumables, loot, artifacts, multiple bosses,
difficulty scaling, floor themes, enemy-pool variation, persistence,
meta-progression, a final floor, settings menus, volume sliders, remapping,
and additional accessibility options are deferred. A minimap, fog of war,
doors, keys, and room transitions remain out of scope.

## 12. Assumptions

- One boss per floor is the intended `0.5.0` pacing; difficulty scaling is
  deferred.
- The Warden does not carry fragments, so the purification ritual stays the
  mob mechanic and the boss fight stays readable.
- Bomb targeting the player's position at throw time is readable and fair;
  continuously tracked bombs would be harder to dodge.
- The supplied audio set is sufficient; missing cues are synthesized rather
  than sourced from new packs.
- The title screen's click is also the browser gesture that unlocks audio.
