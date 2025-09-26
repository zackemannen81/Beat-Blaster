# Beat Blaster – Assets Markup

Version: 1.0  
Omfång: Ljud, sprites/atlases, shaders, fonter, bakgrunder, config/metadata  
Mål: Minimera draw calls, låg latency, enkel pipeline, tydlig licensspårning

---

## 1) Mappstruktur
- `src/assets/audio/tracks/` – Musikspår (`.ogg` + `.mp3`)
- `src/assets/audio/sfx/` – Ljud­effekter (WAV, ev. OGG‑spegel)
- `src/assets/sprites/` – Texture atlases (`.png` + `.json`)
- `src/assets/sprites/standalone/` – Fristående sprites (t.ex. stor glow)
- `src/assets/shaders/` – Shaderfiler (`.frag`, `.vert`)
- `src/assets/fonts/` – Webfonts (`.woff2`)
- `src/assets/backgrounds/` – Bakgrundsgrafik
- `src/config/` – Datafiler (`tracks.json`, `balance.json`, `graphics.json`)

Namngivning: `lower_snake_case`; varianter suffixas (`_idle`, `_0..n`, `_hd`); inga mellanslag.  
Bildformat: PNG (RGBA, förmultipl. alfa rekommenderas).  
Atlas‑JSON: TexturePacker "JSON Hash" (Phaser‑kompatibelt).

---

## 2) Ljud

### 2.1 Musik (`src/assets/audio/tracks/`)
- Format: `.ogg` (primärt) + `.mp3` (fallback), 44.1 kHz stereo.
- Loudness: −14 LUFS integrerat, topp ≤ −1 dBTP. Trima tystnad i början/slut (<10 ms).
- Filnamn: `track_01.ogg`, `track_01.mp3`, `track_02.*`, …
- Metadata i `src/config/tracks.json` (exempelpost):
```json
{
  "id": "track_01",
  "name": "Neon Surge",
  "artist": "YourName",
  "bpm": 128,
  "inputOffsetMs": 0,
  "lengthSec": 180,
  "fileOgg": "src/assets/audio/tracks/track_01.ogg",
  "fileMp3": "src/assets/audio/tracks/track_01.mp3",
  "difficultyProfileId": "normal",
  "hash": "<sha1-hex>"
}
```
- Loop‑punkter (valfritt): lägg `loopStart`/`loopEnd` (sekunder) i posten.
- Hash: beräknas på OGG‑filen; används för seed/score‑integritet.

### 2.2 SFX (`src/assets/audio/sfx/`)
- Format: `.wav` 44.1 kHz mono (låg latency). OGG‑spegel om storlek måste ner.
- Filer:
  - `shot.wav` – 20–60 ms klickig skjuteffekt.
  - `hit_enemy.wav` – 80–200 ms träff.
  - `explode_big.wav` – 300–600 ms explosion.
  - `pickup.wav` – 100–200 ms bright blip.
  - `bomb.wav` – 600–900 ms laddning + thump.
  - `ui_move.wav`, `ui_select.wav`, `ui_back.wav` – 50–150 ms UI.
  - `metronome.wav` – låg volym tick (assist).
- Mix: undvik clipping; korta tails; stereo onödigt (mono räcker).

---

## 3) Sprites & Atlases (`src/assets/sprites/`)

### 3.1 TexturePacker‑inställningar (rekommendation)
- Max size: 2048×2048, power‑of‑two.
- Padding: 4 px; Extrude: 2 px; Trim: på; Rotation: av.
- Förmultipl. Alfa: på (export), "JSON Hash" format.
- Naming: frames får unika idn; animationsindex `name_0..n`.

### 3.2 Atlases och ramar

- `gameplay.atlas.png` + `gameplay.atlas.json`
  - Frames: `player_idle`, `player_thruster_0..3`, `bullet_basic`, `bullet_split`,
    `enemy_brute_0..3`, `enemy_dasher_0..3`, `enemy_swarm_0..1`,
    `elite_body`, `elite_telegraph`,
    `pickup_shield`, `pickup_rapid`, `pickup_split`, `pickup_magnet`, `pickup_slowmo`,
    `hit_spark_0..3`, `explosion_0..7`
  - Pixel density: bas 1× (designa för 1080p; skala i engine vid behov).

- `ui.atlas.png` + `ui.atlas.json`
  - Frames: `heart_full`, `heart_empty`, `bomb_meter_bg`, `bomb_meter_fill`,
    `multiplier_icon`, `accuracy_ring_0..3`, `btn_primary`, `btn_secondary`,
    `panel_9slice`, `cursor_crosshair`,
    `icon_music`, `icon_sfx`, `icon_contrast`, `icon_shader`, `icon_metronome`, `icon_offset`, `icon_gamepad`
  - 9‑slice: definiera `panel_9slice` cap‑insets (ex. 12 px).

- `particles.atlas.png` + `particles.atlas.json`
  - Frames: `particle_circle_small`, `particle_glow_small`, `trail_streak`, `star_small`

### 3.3 Exempel på atlas‑JSON (utdrag)
```json
{
  "frames": {
    "player_thruster_0": {"frame": {"x": 0, "y": 0, "w": 16, "h": 16}},
    "player_thruster_1": {"frame": {"x": 16, "y": 0, "w": 16, "h": 16}},
    "bullet_basic": {"frame": {"x": 0, "y": 32, "w": 8, "h": 16}}
  },
  "meta": {"app": "TexturePacker", "scale": "1"}
}
```

### 3.4 Designriktlinjer
- Hög kontrast mot mörk bakgrund; undvik tunna 1‑px linjer utan stöd‑glow.
- Lägg 2–4 px transparens runt sprites (motverkar bleeding).
- Använd additivt glow som separat sprite vid behov (`standalone/glow_sprite_128.png`).

---

## 4) Shaders (`src/assets/shaders/`)
- `glow.frag` / `glow.vert` – additiv bloom; uniforms: `u_time`, `u_intensity`, `u_resolution`.
- `vignette.frag` – svag kantmörkning; uniform: `u_strength`.
- `chromatic.frag` – subtil RGB‑split; uniform: `u_amount`.
- Kodstil: GLSL ES 1.00 kompatibelt (WebGL1). Kommentarer i engelska.

---

## 5) Fonter (`src/assets/fonts/`)
- `HudFont.woff2` – HUD‑siffror (fet, tydlig).
- `UiFont.woff2` – Meny/UI‑texter.
- Exempel‑CSS (`src/styles/style.css`):
```css
@font-face { font-family: 'HudFont'; src: url('../assets/fonts/HudFont.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'UiFont';  src: url('../assets/fonts/UiFont.woff2')  format('woff2'); font-display: swap; }
```
- Licenser: endast fria/egna; inkludera attribution i README vid krav.

---

## 6) Bakgrunder (`src/assets/backgrounds/`)
- `starfield.png` – sömlös kakelbakgrund, 256–512 px tile.
- `fft_bar_mask.png` – mask för musikvisualisering.
- Alternativ: Procedural stjärnfält (minskar asset‑storlek).

---

## 7) Konfig & metadata (`src/config/`)

### 7.1 `tracks.json` schema (informellt)
- `id`: sträng (unik)
- `name`, `artist`: strängar
- `bpm?`: tal (om känd BPM)
- `inputOffsetMs`: tal (ms, default 0)
- `lengthSec`: tal
- `fileOgg`, `fileMp3`: sökvägar
- `difficultyProfileId`: `normal|hard|...`
- `hash`: sha1/sha256 (hex)

### 7.2 `balance.json` (nycklar)
- `player`: speed, accel, friction, hp
- `bullets`: speed, cooldown, damage, ttl
- `enemies`: brute/dasher/swarm/elite → hp, speed, damage, score
- `spawn`: baseDensity, eliteEveryNBars
- `scoring`: perfectMs, goodMs, comboStep, comboMax
- `powerups`: dropRates, durations, stackRules
- `difficultyRamp`: perMinuteHpPct, spawnRatePct, patternVariety

### 7.3 `graphics.json`
- `shaders`: enabled, glowIntensity
- `particles`: maxActiveAvg, maxActivePeak
- `camera`: shakeIntensity, hitStopScale
- `accessibility`: highContrastDefault, colorBlindPaletteId

---

## 8) Licens & attribution
- Musik/SFX: verifiera licens (CC‑BY, CC0 eller egen). Spara licensnot i `LICENSES.md`.
- Fonter: följ licens (OFL, SIL etc.).
- Tredjepartsikoner/grafik: inkludera källa/URL.

---

## 9) Kvalitetschecklista (QA)
- [ ] Inga synliga sömmar/bleed i atlases (padding/extrude korrekt).
- [ ] Sprites läsbara i 75% skalning och 125% skalning.
- [ ] Alla SFX normaliserade, utan klipp, rimlig längd.
- [ ] Musik trimmad och startar utan hörbar latens/tystnad.
- [ ] Shaders fungerar med WebGL1; togglebar fallback finns.
- [ ] `tracks.json` och övriga config validerar i runtime (felmeddelande i UI).

---

## 10) Leveransspec
- Bildfiler: PNG, 8‑bitars färg + alfa (premultiplied), <= 2048×2048/atlas.
- Ljud: Musik OGG+MP3; SFX WAV (mono).  
- Totala assetstorleken (målsättning): < 20 MB i prod‑build (utan onlinecache).
- Strikt sökvägs‑layout enligt struktur ovan; inga tomma kataloger i repo.

---

## 11) Att skapa (sammanfattning av filer)
- `src/assets/audio/tracks/track_01.ogg`, `track_01.mp3`, `track_02.*`
- `src/assets/audio/sfx/shot.wav`, `hit_enemy.wav`, `explode_big.wav`, `pickup.wav`, `bomb.wav`, `ui_move.wav`, `ui_select.wav`, `ui_back.wav`, `metronome.wav`
- `src/assets/sprites/gameplay.atlas.png` + `.json`
- `src/assets/sprites/ui.atlas.png` + `.json`
- `src/assets/sprites/particles.atlas.png` + `.json`
- `src/assets/sprites/standalone/glow_sprite_128.png`
- `src/assets/shaders/glow.frag`, `glow.vert`, `vignette.frag`, `chromatic.frag`
- `src/assets/fonts/HudFont.woff2`, `UiFont.woff2`
- `src/assets/backgrounds/starfield.png`, `fft_bar_mask.png`
- `src/config/tracks.json`, `balance.json`, `graphics.json`

---

## 12) Exempel: minimal `balance.json`
```json
{
  "player": {"speed": 250, "accel": 1800, "friction": 0.9, "hp": 3},
  "bullets": {"speed": 800, "cooldown": 120, "damage": 1, "ttl": 900},
  "enemies": {
    "brute": {"hp": 6, "speed": 90, "damage": 1, "score": 100},
    "dasher": {"hp": 3, "speed": 180, "damage": 1, "score": 75},
    "swarm": {"hp": 1, "speed": 140, "damage": 1, "score": 25},
    "elite": {"hp": 20, "speed": 110, "damage": 2, "score": 500}
  },
  "spawn": {"baseDensity": 1.0, "eliteEveryNBars": 8},
  "scoring": {"perfectMs": 60, "goodMs": 120, "comboStep": 0.1, "comboMax": 8},
  "powerups": {"dropRates": {"shield": 0.05, "rapid": 0.05, "split": 0.05, "magnet": 0.05, "slowmo": 0.03}, "durations": {"shield": 5000, "rapid": 8000, "split": 8000, "magnet": 6000, "slowmo": 3000}},
  "difficultyRamp": {"perMinuteHpPct": 10, "spawnRatePct": 12, "patternVariety": 1}
}
```

---

## 13) Noteringar
- Håll antalet aktiva partiklar inom `graphics.json` gränser.
- Testa i Chromium/Firefox/Safari – ljudlatens skiljer sig.
- Om analyzer saknas: BPM‑spawn via `tracks.json` fungerar som fallback.

