# Beat Blaster – Curated Royalty‑Free Asset Candidates

Version: 1.0

Scope: Music tracks, SFX, sprites/atlases, shaders, fonts, backgrounds. All sources are royalty‑free with permissive licenses suitable for game distribution (CC0, MIT/ISC, OFL). Always re‑verify license terms on the source page before use.

---

## Audio – SFX (CC0 / Free)

- Kenney – Interface Sounds (CC0)
  - Page: https://kenney.nl/assets/interface-sounds
  - Use for: `ui_move.wav`, `ui_select.wav`, `ui_back.wav`, `pickup.wav`
  - Notes: Convert/trim to mono 44.1 kHz WAV where needed; normalize to −14 LUFS integrated where appropriate for UI.

- Kenney – Sci‑Fi Sounds (CC0)
  - Page: https://kenney.nl/assets/sci-fi-sounds
  - Use for: `shot.wav` (short, clicky), `bomb.wav` (charge + thump layers)
  - Notes: Keep shot 20–60 ms; prefer transient‑rich layers; export mono.

- Kenney – Impact Sounds (CC0)
  - Page: https://kenney.nl/assets/impact-sounds
  - Use for: `hit_enemy.wav`, `explode_big.wav`
  - Notes: Tame lows for clarity over music; keep explosion ≤600 ms.

- Mixkit – Metronome ticks (Free license)
  - Category: https://mixkit.co/free-sound-effects/metronome/
  - Use for: `metronome.wav`
  - Notes: Ensure final file is quiet and short (5–20 ms), mono.

Alternative SFX source (broad, large packs):
- Sonniss – GDC Game Audio Bundles (royalty‑free use; attribution not required, but verify per bundle) → https://sonniss.com/gameaudiogdc

Target paths:
- `src/assets/audio/sfx/shot.wav`
- `src/assets/audio/sfx/hit_enemy.wav`
- `src/assets/audio/sfx/explode_big.wav`
- `src/assets/audio/sfx/pickup.wav`
- `src/assets/audio/sfx/bomb.wav`
- `src/assets/audio/sfx/ui_move.wav`
- `src/assets/audio/sfx/ui_select.wav`
- `src/assets/audio/sfx/ui_back.wav`
- `src/assets/audio/sfx/metronome.wav`

Processing checklist:
- Convert to 44.1 kHz mono WAV (16‑bit or 24‑bit), trim silence (<10 ms pre/post), normalise peaks to −1 dBTP; loudness target around −18 to −16 LUFS short‑term for SFX.

---

## Audio – Music (CC0 / CC‑BY with attribution)

- FreePD – Electronic (Public Domain)
  - Page: https://freepd.com/electronic.php
  - Notes: Entire site is PD; choose 2–3 tracks in 120–140 BPM range; export OGG (primary) + MP3 (fallback).

- Pixabay Music – Synthwave (CC0‑like Pixabay License)
  - Search: https://pixabay.com/music/search/synthwave/
  - Notes: License allows commercial use without attribution; verify per track page.

Optional/Additional (verify license per track):
- Free Music Archive – Search CC0 synthwave (availability varies)
  - Site: https://freemusicarchive.org/

Target paths per track `track_0N`:
- `src/assets/audio/tracks/track_0N.ogg`
- `src/assets/audio/tracks/track_0N.mp3`
- Add entry in `src/config/tracks.json` with `id`, `name`, `artist`, `bpm?`, `lengthSec`, `fileOgg`, `fileMp3`, `difficultyProfileId`, `hash`.

Processing checklist:
- Loudness −14 LUFS integrated; peaks ≤ −1 dBTP; trim leading/trailing silence; compute SHA‑1/256 for `hash`.

---

## Sprites, UI, Particles (CC0)

- Kenney – Space Shooter (Redux)
  - Page: https://kenney.nl/assets/space-shooter-redux
  - Use for: player ship/orb, bullets, pickups, enemy shapes; base for `gameplay.atlas.*`.

- Kenney – Particle Pack
  - Page: https://kenney.nl/assets/particle-pack
  - Use for: `particles.atlas.*` frames (`particle_circle_small`, `particle_glow_small`, `trail_streak`, `star_small`).

- Kenney – UI Pack
  - Page: https://kenney.nl/assets/ui-pack
  - Use for: 9‑slice panels, buttons, cursors; base for `ui.atlas.*` (e.g., `btn_primary`, `btn_secondary`, `panel_9slice`, `cursor_crosshair`).

- Kenney – Background Elements (or Redux)
  - Pages: https://kenney.nl/assets/background-elements , https://kenney.nl/assets/background-elements-redux
  - Use for: simple backdrop elements; optional parallax layers.

- Kenney – Space Kit (supplemental)
  - Page: https://kenney.nl/assets/space-kit
  - Use for: additional space props/glows if needed.

Atlas export guidelines:
- Use TexturePacker (JSON Hash); Max 2048×2048; padding 4 px, extrude 2 px, trim on, rotation off; premultiplied alpha on export.
- Filenames:
  - `src/assets/sprites/gameplay.atlas.png` + `.json`
  - `src/assets/sprites/ui.atlas.png` + `.json`
  - `src/assets/sprites/particles.atlas.png` + `.json`
- Standalone sprite: `src/assets/sprites/standalone/glow_sprite_128.png` (for additive glows)

---

## Fonts (OFL)

- Orbitron (OFL 1.1) – HUD numerals
  - Page: https://fonts.google.com/specimen/Orbitron
  - Target: `src/assets/fonts/HudFont.woff2`

- Inter (OFL 1.1) – UI text
  - Page: https://fonts.google.com/specimen/Inter
  - Target: `src/assets/fonts/UiFont.woff2`

CSS snippet (ref):
```
@font-face { font-family: 'HudFont'; src: url('../assets/fonts/HudFont.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'UiFont';  src: url('../assets/fonts/UiFont.woff2')  format('woff2'); font-display: swap; }
```

---

## Icons (MIT/ISC)

- Phosphor Icons (MIT)
  - Site: https://phosphoricons.com
  - Use for: `icon_music`, `icon_sfx`, `icon_contrast`, `icon_shader`, `icon_metronome`, `icon_offset`, `icon_gamepad` (rasterize into UI atlas at needed sizes).

- Lucide (ISC)
  - Repo: https://github.com/lucide-icons/lucide
  - Use for: alternative style for UI icons if preferred.

---

## Backgrounds

- Procedural starfield (recommended)
  - Implement via shader/particles to reduce asset size; otherwise use a small tiling texture (256–512 px tile) and parallax layers.
  - Target: `src/assets/backgrounds/starfield.png` (if using static tile)

- Alternates (CC0)
  - Kenney Background Elements (see above) → simple backdrop sprites that can be composed.

Also include `src/assets/backgrounds/fft_bar_mask.png` (can be generated as a simple grayscale mask for visualizer effects).

---

## License & Attribution Tracking

- Kenney assets → CC0 (Public Domain). Credit optional; recommended: “Assets by Kenney.nl (CC0)”.
- FreePD music → Public Domain (PD). Credit optional; recommended.
- Pixabay music → Pixabay License; attribution optional; follow site terms per track.
- Mixkit SFX → Mixkit Free License; attribution not required; follow site terms.
- Fonts (Google Fonts) → SIL Open Font License 1.1.
- Icons → Phosphor (MIT), Lucide (ISC).

Create/update `LICENSES.md` with sources and specific attributions/links per chosen asset.

---

## Next Steps (Proposed)

1) Pick 2–3 candidate tracks from FreePD/Pixabay, export `.ogg` + `.mp3`, and add `src/config/tracks.json` entries.
2) Select SFX from Kenney packs, rename to target filenames, convert to mono WAV, normalize and trim.
3) Build sprites/particles/UI atlases using TexturePacker with the settings above; adhere to frame naming in `beat_blaster_assets_spec.md`.
4) Download and convert fonts to `.woff2`; add `src/styles/style.css` `@font-face` entries.
5) If static background is desired, create a seamless starfield tile and place at `src/assets/backgrounds/starfield.png`; otherwise implement a procedural starfield.

