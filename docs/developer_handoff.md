# Beat Blaster - Handoff Brief (March 2025)

## Snapshot
- Vertical scroller is now the primary experience; omni arena mode remains accessible through Options or `?mode=omni`.
- Enemy roster (brute, dasher, exploder, weaver, mirrorer, teleporter, flooder, formation, boss shells) is live with lane-aware telegraphs and HP scaling tied to difficulty profiles. A scripted 16-beat lane pattern now guarantees every archetype appears each cycle regardless of difficulty playlist RNG.
- Audio pipeline ships with the Web Audio analyzer, Conductor event bus, BPM fallback scheduling, announcer hooks, and per-track input offsets. Announcer voices now ship in three flavours (default, Bee, and the new Cyborg AI profile) with runtime voice selection.
- WaveDirector orchestrates scripted playlists per difficulty, coordinating Spawner patterns, LaneManager snapshots, and EnemyLifecycle bookkeeping.
- Presentation pass includes NeonGrid backdrop with beat-driven lane border runway lights and lane-width-matched grid spacing, Starfield layers, cube enemy skins, telegraphs, and reduced-motion toggles. Recent crash on tweening destroyed circles was fixed (Effects tweens defer destroy). Enemy CubeSkin palettes were refreshed to better differentiate archetypes.

## Build & Tooling
- Node.js >=18 (tested on 20.x). Install via `npm install`.
- Development: `npm run dev` (Vite + hot reload).
- Production build: `npm run build`.
- Tests: `npm run test` (Vitest) - suite exists but is currently sparse; no automated coverage for beat timing or lane math yet.
- Engine: Phaser 3.90.0 (matching dev server console output). Types are aligned with TypeScript 5.6.x in `tsconfig.json`.
- Assets live under `src/assets`; audio tracks now provided as WAV/MP3 (`track_00.wav`, `track_01.wav`, `track_03.mp3`). OGG mirrors still missing.
- Voice synthesis pipeline lives under `tools/voices/`: create a venv (`python3 -m venv tools/voices/.venv`), install `pip install -r tools/voices/requirements.txt`, then run `python3 tools/voices/cyborg/generate_clips.py` (add `--force` to regenerate) to refresh the Cyborg announcer assets.

## Implemented Systems
- **Audio & Rhythm** - `AudioAnalyzer` computes band energy, emits `beat:low/mid/high`, `bar`, and feeds `Conductor`; analyzer gracefully drops to BPM fallback when unavailable.
- **Wave & Spawn Layer** - `WaveDirector` reads difficulty playlists, enforces heavy cadence and cooldowns, and schedules descriptors for `Spawner`, which handles formation math, telegraphs, enemy pooling, and HP scaling (incl. boss multipliers and overrides).
- **Rhythm Lane Pattern** - `LanePatternController` runs a deterministic 16-beat script that drives lane count transitions (3→5→7→3), spawns per beat, and issues lane pulse events. It falls back to playlist-driven waves if disabled.
- **Player & Controls** - `LaneManager` maintains vertical lanes with sticky snap logic and mid-lane magnet points; GameScene supports mouse/keyboard, gamepad (deadzone + sensitivity), and touch (lane drags + double-tap bomb). Options persist crosshair modes, reduced-motion, safety band, aim unlock, etc.
- **Combat & Scoring** - `BeatWindow` grades shots (Perfect/Great/Good), `Scoring` applies combo logic and penalties, bullets carry judgement metadata, and bombs charge on perfect streaks. Powerups (`Powerups.ts`) implement shield, rapid, split, slowmo, with HUD timers.
- **Enemy Behaviours** - Lane hoppers, weavers, mirrorers, teleporters, flooders, dasher modifiers, exploder telegraphs, and boss shells all integrated with beat hooks and telegraph graphics.
- **UI & Meta** - `HUD` exposes BPM, lane count, combo, accuracy, bomb charge; OptionsScene persists settings; ResultScene writes to `localLeaderboard`. Announcer VO cues, reduced-motion adjustments, and metronome toggle wired in.
- **Presentation** - `Effects` handles perfect shot bursts, teleporter blinks, plasma hits, etc.; `NeonGrid` renders beat-driven lane border lights and lane-aligned grid cells that rescale with lane count, while `Starfield`, `BackgroundScroller`, and `CubeSkin` coordinate parallax and enemy skins.

## Content & Data Status
- `src/config/tracks.json` currently maps three tracks: easy (Neon Crusader), normal (Neon Heartbeat), hard (Neon Reverie). Hashes in config must be kept in sync with audio replacements; be mindful of new WAV sources.
- Difficulty profiles (`src/config/difficultyProfiles.ts`) define lane counts (4/6/7), spawn multipliers, HP scaling, heavy cadence controls, and stage ramps. Refer to `docs/difficulty-system.md` for authoring and tuning guidance.
- Wave playlists (see `src/systems/WaveLibrary.ts` and `docs/brainstorming.md`) contain lane-hopper, formation, flooder, and teleporter sets across all difficulties. Hard playlist still needs more late-stage boss compositions. Note that the lane pattern now injects deterministic waves on `beat:low`; playlist weights show up primarily in fallback windows.
- Balance data lives in registry `balance.enemies` at runtime; fallback HP logic ensures defaults for missing config.
- Assets: Favicon missing (404 seen in dev); add under `public` and reference in Vite if desired. Announcer VO lives in `src/assets/audio/sfx/voices/` (default/Bee/Cyborg WAV+MP3 mirrors) – new voices can be dropped in and BootScene will load them automatically.

## QA & Operations
- Manual smoke (vertical mode, audio analyzer, scripted lane cycle) passes; recent playtest exposed the `Arc.radius` tween crash, now resolved.
- TypeScript strict mode surfaces no errors after recent fixes (e.g., `rawHp` undefined guard, Effects tween destroy guard).
- No automated regression suite for beat timings, spawner cadence, or input handling. Lane snap rounding fix (and the new between-lane magnet anchors) rely on Arcade body's alignment—capture a regression test once input harness exists.
- Performance: No recent profiling data; ensure 60 FPS target holds after new VFX. Reduced-motion path disables heavy tweens and particles.
- Build artifacts in `dist/` via Vite are stable; chunk size warning persists (>500 kB) and should be tracked when adding assets.

## Risks & Open Items
1. **Analyzer Fallback Coverage** - Need automated verification that BPM fallback stays in sync when analyzer fails or on mobile browsers.
2. **Dynamic Lane Counts** - Planned feature (stage-based lane expansion) still pending; requires camera, telegraph, and wave support.
3. **Asset Parity** - MP3/WAV variants exist, but OGG mirrors and hashed filenames absent; impacts web delivery size and caching.
4. **Wave Playlist Drift** - With the lane pattern forcing spawns, playlists mostly serve fallback slots; we still need authored boss/mini-boss encounters in higher stages.
5. **Testing Debt** - Lack of Vitest/Playwright coverage for timing, options persistence, or leaderboard flows.
6. **Accessibility Surfacing** - Latency calibration UI and color presets still not exposed in Options despite plumbing existing for offsets/reduced motion.

## Immediate Next Steps
- Wire up latency calibration controls in Options and surface per-track offset values.
- Audit `WaveLibrary` to add Easy/H/Hard variants for new enemy archetypes, including boss/bullet patterns.
- Add Playwright or in-engine integration harness for beat windows and lane snapping regression.
- Compress/convert audio to OGG + update hashes; restore favicon to eliminate dev server 404 noise.
- Profile performance on mid-tier hardware with new WAV assets; adjust particle caps if needed.
- Consider exposing a toggle to disable the scripted lane cycle for designer-driven testing, plus document the interaction between playlists and the controller.

## Handoff Checklist
- [ ] `npm run dev` -> verify audio analyzer handshake, reduced-motion toggle, track selection, and that announcer voices (default/Bee/Cyborg) load without CORS issues.
- [ ] Confirm Difficulty profile linking (`tracks.json` <-> `difficultyProfiles.ts`) and wave playlists (`WaveLibrary`) for each track.
- [ ] Run `npm run build` -> watch for asset path errors or bundle growth.
- [ ] Validate local leaderboard persistence and reset between sessions.
- [ ] Document outstanding QA tasks in `docs/sprint1_checklist.md` or create Sprint 2 checklist before next handover.

---
Maintain this brief after each sprint or major content drop so incoming developers have a single source of truth.
