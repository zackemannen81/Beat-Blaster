# Beat Blaster – Development Plan Markup

Version: 1.0  
Target: Web (Desktop‑first)  
Engine: Phaser 3.x  
Language: TypeScript  
Source Spec: beat_blaster_full_game_specification.md

---

## 1) Key Additions and Gaps Filled
- Audio unlock & latency: Gate audio on first user gesture; per‑track input offset (ms) with `localStorage` persistence.
- Fallbacks: Analyzer‑unsupported → BPM‑driven spawns from config; shader‑off and reduced particles modes for low‑end devices.
- Pooling & atlases: Pools for bullets/enemies/particles; consolidate sprites into atlases to minimize draw calls.
- Calibration & debug: Beat‑grading overlay, spectrum/beat debug panel, FPS/object counters, deterministic seed logging.
- Options & persistence: Sliders (music/SFX), high‑contrast, metronome click, shader toggle, input offset, gamepad sensitivity; persist in `localStorage`.
- Pause/focus: Pause/resume world and audio on `visibilitychange`; pause menu UI.
- Device support: Gamepad detection with deadzones; pointer‑lock option; resolution scaling Fit/Zoom.
- Error handling: Asset load error UI with retry/back; JSON schema validation for configs.
- Content pipeline: Sprite padding/margins for atlases; audio loudness normalized (−14 LUFS, −1 dBTP); stable naming/versioning.
- Leaderboard security: Input validation, optional HMAC signature, CORS allowlist, paging and caps.
- Build/deploy polish: Favicons/meta, `robots.txt`, CSP recommendation for shaders, Vite chunking, cache headers.

---

## 2) Step‑by‑Step Development Plan

### A. Project Setup
1. Initialize Vite + TypeScript + Phaser project with strict TS, ESLint, Prettier.
2. Create folder structure (see section 4) and placeholder assets for initial boot.
3. Add `index.html` with canvas container and base CSS; wire `main.ts` to boot scenes.
4. Implement runtime guards to load/validate `src/config/tracks.json` and `src/config/balance.json` (schema checks, error UI).

### B. Boot & Menu
5. BootScene: Preload atlases/audio/shaders/fonts; show progress; implement browser audio unlock; navigate to MenuScene.
6. MenuScene: Track selection with BPM/length; Options panel (music/SFX volumes, high‑contrast, metronome, shaders, input offset, gamepad sensitivity); Credits; show RNG seed; persist options.

### C. Audio System
7. AudioAnalyzer: Wrap `AnalyserNode` (FFT 2048, smoothing 0.8); compute rolling energy per band; threshold via mean+stddev; lockouts; emit `beat:low/mid/high`, `bar:start`.
8. Latency calibration: Apply input offset to grading; add UI in Options to nudge ±ms while previewing track; persist per track.
9. Metronome click (optional): Quiet tick on beats; duck under music by 1–2 dB on heavy moments.
10. BPM fallback: If analyzer unavailable, synthesize beat times from BPM and use for spawns and grading windows.

### D. Core Gameplay
11. GameScene scaffolding: World layers (background, gameplay, VFX, UI); Arcade Physics config; camera.
12. Player: WASD/LS movement with accel/friction; mouse/RS aim; bounds clamp; brief invulnerability blink on hit; bomb meter stub.
13. Weapon/Bullets: Semi‑auto fire; cooldown; damage; projectile pool; TTL and offscreen culling; muzzle flash.
14. Enemies: Brute/Dasher/Swarm classes (HP/speed/behavior from `balance.json`); Elite with telegraph and pattern; hurt/kill responses.
15. Spawner + Conductor: Listen to beat events; pattern selection per bar and RNG seed; difficulty ramp with time; spawn at safe off‑screen rings.
16. Collisions: Bullet↔Enemy, Player↔Enemy, Player↔Pickup; post‑collision effects, damage/iframes.
17. Scoring: Kill values; on‑beat grading (Perfect ±60 ms, Good ±120 ms); combo multiplier +0.1 per Perfect up to x8; decay/drop rules.
18. Powerups: Shield, Rapid, Split‑shot, Magnet, Slow‑mo; UI icons/timers; stacking/refresh rules; drop tables.

### E. Juice & VFX
19. Particles: Pooled bursts for kills, hit sparks, muzzle flashes, trails; enforce performance caps.
20. Camera/Screen feedback: Mild screenshake on major events; small hit‑stop; beat‑pulse on HUD/backdrop brightness/scale.
21. Glow pipeline: Custom post‑processing pipeline with toggle; pulse intensity on kick; optional subtle chromatic aberration.
22. Beat indicator: Ring around player; flash color per band on beat.

### F. HUD & UI
23. HUD: Score, multiplier, hearts (health), bomb meter, accuracy %, beat pulse marker; 9‑slice panels.
24. Pause menu: Resume, restart, options, quit to menu; gamepad navigation.
25. Results Scene: Score breakdown, accuracy chart over time, max combo; name entry; save local score; optional online submit.

### G. Leaderboard
26. Local leaderboard: CRUD via `localStorage`, per‑track boards; store seed and `songHash`.
27. Online (optional): Express + SQLite microservice; `POST /scores`, `GET /scores/top`; CORS allowlist; payload validation; basic rate limit; optional HMAC.

### H. Accessibility & Options
28. High‑contrast mode: Alternate palette; default shaders off in this mode.
29. Audio‑only assist: Metronome + clear spatial SFX; toggle.
30. Color‑blind friendly: Palette preset; redundant enemy shape coding by frequency band.

### I. Performance & QA
31. Pool all entities: Bullets, enemies, pickups, particles; reuse objects.
32. Texture atlases: Consolidate sprites into few atlases; verify draw calls <150.
33. Debug overlays: Toggleable overlay with beat windows, FPS, object counts.
34. Automated checks: Unit‑style tests for timing windows, persistence IO; manual checklist runs across Chromium/Firefox/Safari.

### J. Build & Deploy
35. Optimize build: Hashed filenames, code‑splitting, rollup visualizer pass.
36. Meta & PWA basics: `favicon.ico`, `site.webmanifest`, social tags, `robots.txt`.
37. Deploy: Netlify/Vercel static for frontend; backend on Render/Fly/Supabase; set CORS and env vars.

### K. Documentation
38. README: Run/build instructions, controls, options.
39. Tuning notes: `balance.json` guide and track profile tips.
40. Privacy/EULA: Stub pages and links in menu.

Milestones mapping: M1 (steps 11–16 + 7 minimal), M2 (17–25 + 19–22), M3 (14–18 + 26–30 + second track), M4 (31–40 + deploy).

---

## 3) Asset List, Formats, Layouts, and Filepaths

### Audio – Music (`src/assets/audio/tracks/`)
- track_01.ogg / track_01.mp3: 2–4 min; 44.1 kHz stereo; normalized −14 LUFS, peak ≤ −1 dBTP; hash stored in `tracks.json`.
- track_02.ogg / track_02.mp3: Same spec.
- Optional loop points: Store loopStart/loopEnd (sec) in `tracks.json` if used.

### Audio – SFX (`src/assets/audio/sfx/`)
- shot.wav: 20–60 ms, mono, clicky; low latency.
- hit_enemy.wav: 80–200 ms impact.
- explode_big.wav: 300–600 ms layered.
- pickup.wav: 100–200 ms bright blip.
- bomb.wav: 600–900 ms whoosh + thump.
- ui_move.wav, ui_select.wav, ui_back.wav: 50–150 ms each.
- metronome.wav: soft, short tick used when assist enabled.

Prefer WAV for latency; optionally include OGG mirrors if size matters.

### Texture Atlases (PNG + JSON Hash) (`src/assets/sprites/`)
- gameplay.atlas.png + gameplay.atlas.json
  - Frames: player_idle, player_thruster_0..3, bullet_basic, bullet_split, enemy_brute_0..3, enemy_dasher_0..3, enemy_swarm_0..1, elite_body, elite_telegraph, pickup_shield, pickup_rapid, pickup_split, pickup_magnet, pickup_slowmo, hit_spark_0..3, explosion_0..7
  - Max size: 2048×2048; power‑of‑two; 2–4 px padding; premultiplied alpha.
- ui.atlas.png + ui.atlas.json
  - Frames: heart_full, heart_empty, bomb_meter_bg, bomb_meter_fill, multiplier_icon, accuracy_ring_0..3, btn_primary, btn_secondary, panel_9slice, cursor_crosshair, icon_music, icon_sfx, icon_contrast, icon_shader, icon_metronome, icon_offset, icon_gamepad
  - Include 9‑slice metadata for panels/buttons.
- particles.atlas.png + particles.atlas.json
  - Frames: particle_circle_small, particle_glow_small, trail_streak, star_small

### Standalone Sprites (`src/assets/sprites/standalone/`)
- glow_sprite_128.png: Large additive glow as needed by pipelines.

### Shaders (`src/assets/shaders/`)
- glow.frag / glow.vert: Additive bloom with intensity uniform.
- vignette.frag: Subtle edge darkening; toggle.
- chromatic.frag: Subtle RGB split; toggle.

### Fonts (`src/assets/fonts/`)
- HudFont.woff2: Bold numeric HUD font; include CSS `@font-face`.
- UiFont.woff2: UI labels; provide fallback stack.

### Backgrounds (`src/assets/backgrounds/`)
- starfield.png: Tiled parallax layer (optional if procedural).
- fft_bar_mask.png: Mask for music visualizer styling.

### Data/Config (`src/config/`)
- tracks.json: Array of track metadata with hashes and offsets.
- balance.json: Player/bullets/enemies/powerups/scoring and difficulty ramp.
- graphics.json: Shader toggles, particle caps, camera settings, accessibility defaults.
- leaderboard.json: Backend URL, limits, HMAC toggle (do not commit secrets).

### UI/HTML/CSS
- src/index.html: Canvas container, meta, preload hints.
- src/styles/style.css: Body reset, canvas sizing, high‑contrast overrides.
- public/: favicon.ico, site.webmanifest, robots.txt.

### Net/Backend (optional separate `server/`)
- server/index.ts: Express app, endpoints.
- server/db.sqlite (gitignored), migrations.
- server/.env (gitignored): CORS origins, rate limits, HMAC key.

---

## 4) File Paths To Create
- src/index.html
- src/main.ts
- src/styles/style.css
- src/assets/audio/tracks/track_01.ogg
- src/assets/audio/sfx/shot.wav
- src/assets/sprites/gameplay.atlas.png
- src/assets/sprites/gameplay.atlas.json
- src/assets/sprites/ui.atlas.png
- src/assets/sprites/ui.atlas.json
- src/assets/sprites/particles.atlas.png
- src/assets/sprites/particles.atlas.json
- src/assets/shaders/glow.frag
- src/assets/shaders/glow.vert
- src/assets/fonts/HudFont.woff2
- src/assets/fonts/UiFont.woff2
- src/assets/backgrounds/starfield.png
- src/assets/backgrounds/fft_bar_mask.png
- src/config/tracks.json
- src/config/balance.json
- src/config/graphics.json
- src/scenes/BootScene.ts
- src/scenes/MenuScene.ts
- src/scenes/GameScene.ts
- src/scenes/ResultScene.ts
- src/systems/AudioAnalyzer.ts
- src/systems/Conductor.ts
- src/systems/Spawner.ts
- src/systems/Scoring.ts
- src/systems/Powerups.ts
- src/systems/Effects.ts
- src/ui/HUD.ts
- src/net/api.ts
- vite.config.ts
- package.json
- public/favicon.ico
- public/site.webmanifest
- public/robots.txt

---

## 5) Config Schemas and Key Fields

### tracks.json (example entry)
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
  "hash": "<sha1-hex-of-file>"
}

### balance.json (key sections)
- player: speed, accel, friction, hp
- bullets: speed, cooldown, damage, ttl
- enemies: brute/dasher/swarm/elite → hp, speed, damage, score
- spawn: baseDensity, eliteEveryNBars
- scoring: perfectMs=60, goodMs=120, comboStep=0.1, comboMax=8
- powerups: dropRates, durations, stackRules
- difficultyRamp: perMinuteHpPct, spawnRatePct, patternVariety

### graphics.json (key sections)
- shaders: enabled (bool), glowIntensity (0..1)
- particles: maxActiveAvg, maxActivePeak
- camera: shakeIntensity, hitStopScale
- accessibility: highContrastDefault, colorBlindPaletteId

---

## 6) QA, Performance, and Acceptance
- Timing: Input grading accuracy verified within ±60/±120 ms windows using overlay.
- Performance: 60 FPS at 1080p on mid‑range laptop; draw calls <150; particles under caps.
- Audio: No clipping; analyzer stable across Chromium/Firefox/Safari; input offsets persist.
- Gameplay: Spawns perceptibly align to beats; RNG seed determinism across runs.
- Persistence: Options, high scores, last track saved; schema stable and backward‑compatible.
- Fallbacks: Analyzer‑off mode works with BPM; shaders‑off visuals remain readable with high contrast.

---

## 7) Milestones and Deliverables
- M1 – Core Prototype (1–2 days): Movement/shooting; music + simple beat; enemies spawn on beat; collisions; local score counter.
- M2 – Juice & Scoring (1–2 days): On‑beat grading + multiplier; particles; glow pulse; HUD; results screen.
- M3 – Content & Leaderboard (2–3 days): 3 enemy types + elite; 2 tracks + configs; local + optional online leaderboard; options menu.
- M4 – Polish & Deploy (1–2 days): Pooling/atlases; accessibility and debug tools; latency calibration; build optimize; deploy.

---

## 8) Notes and Risks
- Browser audio policies vary; ensure robust unlock handling and clear prompts.
- Analyzer thresholds may need per‑track tuning; expose tuning values in a hidden debug menu.
- Online leaderboard security is lightweight by design; avoid storing PII; rate‑limit and cap payload sizes.

