Tools and scripts
=================

SFX conversion
--------------
- `tools/sfx_convert.sh`: Converts all files in `src/assets/audio/sfx` to 44.1 kHz mono WAV, trims leading/trailing near‑silence, and peak‑limits to ~‑1 dBTP.
- Requires `ffmpeg` in PATH.
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`
- macOS fallback: `tools/sfx_convert_mac.sh` uses `afconvert` (no trimming/normalization, WAV/AIF/MP3 only).

Sprite atlases (Kenney packs)
-----------------------------
Already downloaded into `vendor/kenney/zips/` and extracted to `vendor/kenney/extract/`:
- Space Shooter (Redux), Particle Pack, UI Pack, Background Elements (Redux)

Prep & pack atlases
-------------------
1) Prepare curated sources mapped to required frame names:
   - `bash tools/prepare_atlas_sources.sh`
   - Output in `tools/atlas_src/{gameplay,ui,particles}`
2) Use TexturePacker (JSON Hash) to export:
  - `src/assets/sprites/gameplay.atlas.png/.json`
  - `src/assets/sprites/ui.atlas.png/.json`
  - `src/assets/sprites/particles.atlas.png/.json`
- Settings: Max 2048, padding 4, extrude 2, trim on, rotation off, premultiplied alpha.
3) If you have TexturePacker CLI installed, run:
   - `bash tools/pack_atlases.sh`

Source suggestions from extracted packs:
- Gameplay: `vendor/kenney/extract/PNG (Transparent)` (stars, flares, muzzle flashes), `PNG/Enemies`, `PNG/Lasers`, `PNG/Power-ups`
- UI: `vendor/kenney/extract/PNG/UI` and `Vendor/kenney/extract/PNG/Default`
- Particles: `vendor/kenney/extract/PNG (Transparent)` (circle_, light_, spark_, star_)

Placeholders
------------
This repo contains 1×1 transparent PNG placeholders and JSON with frame names. Replace with real atlases once assets are prepared.
