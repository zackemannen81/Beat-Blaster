# Beat Blaster – Full Game Specification (Phaser + Windsurf + AI-assisted)

**Version:** 1.0  
**Target:** Web (Desktop-first, works in Chromium/Firefox/Safari)  
**Engine:** Phaser 3.x  
**Language:** JavaScript/TypeScript (TS preferred)  
**IDE:** Windsurf  
**AI Assist:** OpenAI (code generation & refactor prompts included)

---

## 1. High Concept
A fast-paced, music-synchronized twin‑stick/one‑stick shooter where enemy spawns, VFX, and scoring multipliers are driven by real‑time audio analysis. Players chase highscores and compete on a global leaderboard.

**Core Loop:**
1) Survive waves that align with the current track’s beats and frequency bands.  
2) Hit shots on-beat to build a multiplier.  
3) Cash in combos, collect power-ups, and push a run-highscore.

**Session Length:** 2–5 minutes per track (song‑based stages).  
**Difficulty:** Easy to learn, hard to master (accuracy vs beat = mastery).

---

## 2. Pillars
- **Musikstyrt gameplay:** Beat & spectrum driver för spawns, VFX och multipliers.
- **Juicy feel:** Responsiva kontroller, snappy SFX, screenshake (måttlig), hit‑pauser (tiny time‑scale dips), glow & partiklar.
- **Tävlingsdrivet:** Highscore (lokalt + online), seedad RNG per låt, dagliga utmaningar (v2).

---

## 3. Game Modes
- **Arcade – Single Track:** Välj en låt, spela till låten tar slut. Score = summan av vågor + accuracy‑bonusar.  
- **Endless (v2):** Loopar utvalda segment, ökar svårighet över tid.  
- **Daily Track (v2):** Förutbestämd låt/seed per dag. Global leaderboard reset varje 24h.

---

## 4. Controls
- **Keyboard + Mouse (default):**  
  - WASD/Arrow = rörelse.  
  - Mouse = sikte, LMB = skjut.  
  - Space = bomb/ultimate (om laddad).  
  - P/Esc = paus.
- **Gamepad:**  
  - LS = rörelse, RS = sikte, RT/R2 = skjut, A/X = bomb, Menu = paus.
- **Mobile (v2):** Virtual sticks + auto‑fire on beat.

---

## 5. Visual Style & VFX
- **Aesthetic:** Neon/retrowave, high‑contrast, dark background, colored glows.  
- **Key elements:**  
  - Player: luminescent ship/orb med tydlig outline & thruster trail.  
  - Enemies: geometriska former per frekvensband (kick = square brute, snare = triangle dashers, hats = small swarms).  
  - Bullets: streaks med additive blending.  
  - Explosions: particle bursts + bloom.  
  - Background: subtle starfield + music waveform/FFT bars.
- **Post-processing:**  
  - Glow/bloom shader (Phaser pipeline).  
  - Chromatic aberration (very subtle).  
  - Beat‑pulse scale/brightness tween på HUD/backdrop.

**Performance Budget (1080p desktop):**  
- Draw calls: < 150/frame.  
- Active particles: < 800 avg, < 1500 peak.  
- CPU: < 8 ms/frame; GPU: < 8 ms/frame på medelklass laptop.

---

## 6. Audio System
- **Music:** 44.1 kHz stereo, OGG/MP3 (licensklara spår).  
- **SFX:** Short wav/ogg, layered (shot, hit, explode, pickup, bomb).
- **Analysis:** Web Audio API via Phaser.Sound + custom AnalyserNode.
  - FFTSize: 2048; smoothingTimeConstant: 0.8 (tunable).  
  - Frequency bands:
    - **Low (Kick):** 30–120 Hz  
    - **Mid (Snare):** 120–1500 Hz  
    - **High (Hats):** 5–12 kHz
  - **Beat Detection:**
    - Rolling energy per band (moving average N=43 frames).  
    - Beat if current > (avg + k * stddev) & min interval > 120 ms.  
    - Exponera event bus: `onBeatLow`, `onBeatMid`, `onBeatHigh`.
- **Sync:**
  - Maintain a `songTime` from audioContext currentTime.  
  - Spawn windows for on‑beat shots: if shot timestamp within ±60 ms → **Perfect**, ±120 ms → **Good**, else **Offbeat**.
- **Dynamic Mixing:**
  - Duck SFX by 1–2 dB on heavy music moments.  
  - Sidechain‑like pulse on explosions synced till kick (v2 polish).

---

## 7. Gameplay Systems
### 7.1 Player
- HP: 3 hits (or 100 health, tunable).  
- Speed: 250 px/s; friction 0.9; acceleration 1800 px/s².  
- Weapon: semi‑auto bullets; fire‑rate scales with on‑beat accuracy bonus.  
- Bomb: charge by kills/accuracy; clears bullets, stuns enemies ~1s.

### 7.2 Enemies
- **Brute (Kick):** Slow chasers, high HP, spawn on low‑band beats.  
- **Dasher (Snare):** Fast lungers, medium HP, spawn on mid‑band beats.  
- **Swarm (Hats):** Small fragile multiples, high count on high‑band beats.  
- **Elite (Every 8 bars):** Patterns + bullet spreads (warning telegraph).

**Spawn Logic:**  
- Global `Conductor` listens to beat events; emits `spawnPattern` per bar.  
- Difficulty curve grows per minute: +enemy HP, +rate, pattern variance.

### 7.3 Scoring
- **Kill Score:** base per enemy type (Brute 100, Dasher 75, Swarm 25).  
- **On‑Beat Bonus:** Perfect x2, Good x1.25, Offbeat x1.0.  
- **Combo Multiplier:** +0.1 per Perfect (max x8), drop on hit/miss chain > 2s.  
- **End Bonus:** Accuracy %, No‑hit bonus, Max combo.

### 7.4 Power-ups
- **Shield (5s), Rapid (20% faster fire), Split‑shot (2 extra bullets), Magnet (pickup radius), Slow‑mo (0.8x world for 3s).**  
- Spawn chance on elites and streak milestones.

### 7.5 Difficulty & Progression
- Per‑track difficulty profile (JSON): tempo, base density, elite period.  
- Dynamic assist (optional): slight HP regen if accuracy < 40% for 30s.

---

## 8. UI/UX
- **Main Menu:** Play (choose track), Leaderboard, Options, Credits.  
- **HUD:** Score (left), Multiplier (center pulse), Health (hearts), Bomb meter, Accuracy %.  
- **Beat Indicator:** small metronome ring around player; flashes on detected beats.  
- **Results Screen:** Total score, Accuracy, Max combo, Chart of accuracy over time, Retry/Change Track.
- **Accessibility:**  
  - High-contrast mode (toggle).  
  - Audio‑only assist: metronome click on beats (toggle), spatial SFX panning.  
  - Color‑blind friendly palette preset.

---

## 9. Data & Content
### 9.1 Asset List
- **Audio:** 2–3 music tracks (loopable or full length), 6–10 SFX layers.  
- **Sprites:** player (64×64), enemy shapes (32–64), bullets (8×16), pickups (32×32), UI icons, particle textures (small circles, glow sprites).  
- **Shaders:** Bloom/glow pipeline, vignette (very subtle), CRT scanline (optional toggle).

### 9.2 File Structure (TS flavor)
```
src/
  index.html
  main.ts
  assets/
    audio/ (music.ogg, shot.wav, explode.wav, pickup.wav, ui.ogg)
    sprites/ (player.png, enemies.png, bullet.png, pickups.png, particles.png)
    shaders/ (glow.frag, glow.vert)
  scenes/
    BootScene.ts
    MenuScene.ts
    GameScene.ts
    ResultScene.ts
  systems/
    AudioAnalyzer.ts
    Conductor.ts
    Spawner.ts
    Scoring.ts
    Leaderboard.ts
    Powerups.ts
    Effects.ts
  ui/
    HUD.ts
  net/
    api.ts (leaderboard REST client)
  config/
    tracks.json (per‑track metadata)
    balance.json (enemy HP, rates, scores)
  styles/
    style.css
vite.config.ts
package.json
```

---

## 10. Technical Design
### 10.1 Scenes
- **BootScene:** Preload assets, init audio context, read `tracks.json`.  
- **MenuScene:** Track selection, difficulty preview (BPM, length), settings.  
- **GameScene:** Core loop; own update cycle uses `Conductor` & `Spawner`.  
- **ResultScene:** Show stats and allow submission to leaderboard.

### 10.2 Systems (APIs)
- **AudioAnalyzer**
  - `constructor(scene, audioKey)`  
  - `start()` / `pause()` / `resume()` / `stop()`  
  - `getSpectrum()` returns Float32Array  
  - Emits: `beat:low`, `beat:mid`, `beat:high`, `bar:start`
- **Conductor**
  - Input: beat events + `tracks.json` (BPM optional; can auto‑estimate).  
  - Emits pattern cues: `spawn:swarm`, `spawn:brute`, `spawn:elite`.
- **Spawner**
  - `spawn(type, pos, count, params)`; manages enemy pools.  
  - Collision hooks with player & bullets.
- **Scoring**
  - `registerShot(time, accuracyLevel)`; `addKill(type)`; `finalize()` → breakdown.  
  - Exposes `multiplier`, `combo`, `accuracy%`.
- **Powerups**
  - `drop(type, pos)`; `apply(type)`; timers and stacking rules.  
- **Effects**
  - Particle emitters; camera shakes; bloom pulses; hit‑stop.
- **Leaderboard**
  - Local: `localStorage` CRUD.  
  - Online (optional backend): REST `POST /scores` with `{name, trackId, score, acc, date, seed}`; `GET /scores/top?trackId=...`.

### 10.3 Timing & Sync
- Maintain `songStartTime` and compute `now = audioCtx.currentTime - songStartTime`.  
- For shot grading: compare `inputTime` to nearest beat time using BPM or detected peaks array.  
- Network scores include `seed` and `songHash` to reduce spoofing (not secure, just lightweight deterrent).

---

## 11. Leaderboard Backend (v1 Minimal)
- **Stack:** Node.js + Express + SQLite (or Supabase if preferred).  
- **Endpoints:**  
  - `POST /scores` → validate length & ranges; rate‑limit by IP.  
  - `GET /scores/top?trackId=...&limit=100`  
  - `GET /health`
- **Schema:** `scores(id INTEGER PK, name TEXT, trackId TEXT, score INT, accuracy REAL, date INT, seed TEXT, songHash TEXT)`
- **Security (basic):** CORS allow‑list, payload size limits, naive signature (HMAC with shared key) optional.

---

## 12. Build & Tooling
- **Bundler:** Vite (fast HMR).  
- **Lint/Format:** ESLint + Prettier.  
- **Type Safety:** TypeScript strict mode.  
- **Dev Scripts:** `dev`, `build`, `preview`.  
- **Perf:** Webpack Bundle Analyzer alternative (rollup-plugin-visualizer).

**package.json (sketch):**
```json
{
  "name": "beat-blaster",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "vite": "^5.4.0",
    "@types/phaser": "^3.60.0"
  }
}
```

---

## 13. Prompts for AI (Codex‑friendly)
- **Audio Analyzer:**  
  *“Generate a Phaser 3 TypeScript class AudioAnalyzer that wraps Web Audio AnalyserNode, exposes getSpectrum(), and emits custom events beat:low/mid/high using rolling energy thresholding.”*
- **Conductor + Spawner:**  
  *“Create a Conductor that listens to beat events and emits spawn cues every bar. Implement a Spawner that pools enemies (Brute/Dasher/Swarm) with Arcade physics.”*
- **Scoring:**  
  *“Implement a Scoring system that grades shots as Perfect/Good/Offbeat within ±60/±120 ms around nearest beat and maintains a combo‑based multiplier up to x8.”*
- **VFX:**  
  *“Add a glow shader pipeline to Phaser and pulse intensity on kick beats. Provide a particle burst function for explosions.”*
- **Leaderboard:**  
  *“Implement LocalStorage leaderboard + a small Express/SQLite server with POST /scores and GET /scores/top.”*

---

## 14. Milestones
**M1 – Core Prototype (1–2 days)**  
- Player movement + shooting.  
- Music playback + analyzer + simple beat event.  
- Enemies spawn on beat; basic collisions.  
- Local score counter.

**M2 – Juice & Scoring (1–2 days)**  
- On‑beat grading + multiplier.  
- Particles, camera shake, glow pulse.  
- HUD (score, health, multiplier, accuracy).  
- Results screen.

**M3 – Content & Leaderboard (2–3 days)**  
- 3 enemy types + elite.  
- 2 tracks + per‑track config.  
- Local + online leaderboard.  
- Options (volume, contrast, metronome toggle).

---

## 15. QA & Testing Checklist
- **Timing:** Inputs graded korrekt vid ±60/±120 ms windows (log to overlay).  
- **Performance:** Stable 60 FPS på 1080p.  
- **Audio:** No clipping; SFX ducking fungerar under tunga partier.  
- **Collisions:** No tunneling; bullet/enemy pools recycle.  
- **Persistence:** Highscore sparas/lastas korrekt, dataformat stabilt.  
- **Fallbacks:** Om analyser ej stöds → default BPM‑spawn via config.

---

## 16. Legal & Licensing
- Använd fria/egna musikspår eller licensierade med skriftligt tillstånd.  
- Ange attribution för öppna assets.  
- Online leaderboard: spara inte PII (endast alias).  
- Visa EULA/Privacy-länk (stub).

---

## 17. Deployment
- **Local:** `vite preview` eller `npx http-server dist`.  
- **Static hosting:** Netlify/Vercel/GitHub Pages.  
- **Backend:** Render/Fly/Supabase (ifall SQLite/PG).  
- **Cache:** Cache‑Control headers för assets, service worker (v2).

---

## 18. Future Work (v2+)
- Custom song import med on‑device analysis och beat map export.  
- Difficulty modifiers (No‑hit, Iron Mode, Double‑time).  
- Replays (input + RNG seed).  
- Cosmetics (trails, skins) låsta bakom uppdrag.

---

## 19. Acceptance Criteria (Prototype)
- Starta spel → välj låt → spela full session med synkade spawns.  
- On‑beat träffar ökar multiplikator och påverkar score tydligt.  
- Stabil FPS, läsbar HUD, kompetent VFX (glow, partiklar, pulse).  
- Result screen med sparat highscore lokalt; frivillig online submit fungerar.

