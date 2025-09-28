# About Beat Blaster (March 2025)

Beat Blaster is a rhythm-driven vertical shooter built with Phaser 3 and TypeScript. The project now blends a lane-based shmup ruleset with the legacy omni arena mode, syncing enemy behaviour, scoring, and presentation to the soundtrack.

## Implemented Features
- **Dual Game Modes**: Vertical scroller (default) with lane snapping, mid-lane magnet anchors, and safety band; omni arena mode still selectable for legacy play.
- **Rhythm-Conducted Gameplay**: Web Audio analyzer detects low/mid/high beats, backed by BPM fallback scheduling. Conductor broadcasts timing events to spawners, announcer, and FX.
- **Enemy Roster & Patterns**: Brutes, dashers, weavers, lane hoppers, mirrorers, teleporters, lane flooders, formation dancers, exploders, and boss shells. Behaviours react to beat events, lane layout, and difficulty tuning. A scripted 16-beat lane cycle ensures every archetype appears each bar, independent of playlist RNG.
- **Wave & Spawn Pipeline**: WaveDirector orchestrates playlists per difficulty, while a new `LanePatternController` drives deterministic beat-by-beat spawns, lane expansions (3→5→7→3), and telegraph pulses. Spawner instantiates patterns with telegraphs, HP scaling, pooled sprites, and the lane-aware boss entry fix. Telegraph system renders zone/line/circle warnings with reduced-motion handling.
- **Player Combat Loop**: BeatWindow grading (Perfect/Great/Good) feeds Scoring and combo multipliers. Semi-auto fire with quantised fallback, bomb charge meter, powerups (shield, rapid, split, slowmo), and damage/iframes.
- **UI & HUD**: Live BPM, lane count, combo, bomb meter, accuracy, and shot feedback. Options scene with reduced motion, crosshair mode, aim unlock, vertical safety band, volume sliders, and persistent storage. Result scene writes to local leaderboard.
- **Presentation & FX**: NeonGrid with beat-synced lane border runway lights, starfield, background scroller, refreshed CubeSkin colour palettes per archetype, particle bursts, teleporter blinks, perfect-shot rings, announcer VO integration (default, Bee, Cyborg voice banks), and reduced-motion pathways.
- **Data & Config**: Difficulty profiles (easy/normal/hard) define lane counts, spawn envelopes, HP multipliers, heavy cadence. Tracks config maps audio assets, hash, per-track offsets. Registry-driven balance overrides guard missing data. See `docs/difficulty-system.md` for the full tuning workflow.

## Key Implemented Modules
- `src/systems/AudioAnalyzer.ts`: FFT-based beat detection, smoothing, and event emission.
- `src/systems/Conductor.ts`: Central dispatcher translating analyzer output into quantised beat/bar events for listeners.
- `src/systems/Spawner.ts`: Core factory handling enemy pooling, telegraphs, formation math, HP scaling, and boss modifiers.
- `src/systems/WaveDirector.ts`: Playlist scheduler, heavy wave throttling, and fallback injection when analyzer stalls.
- `src/systems/LaneManager.ts`: Lane geometry, snapping (including between-lane magnets), resize handling, debug overlays, and integer-aligned lane centres for jitter-free snaps.
- `src/systems/LanePatternController.ts`: Rhythm script that schedules waves per beat, manages lane-count transitions, and issues pulse events.
- `src/systems/BeatWindow.ts`: Timing window calculations for shot grading and quantisation helpers.
- `src/systems/Scoring.ts`: Combo management, score multipliers, penalty application, and perfect streak tracking.
- `src/systems/Powerups.ts`: Lifecycle for rapid, split, shield, and slowmo buffs, including timescale adjustments.
- `src/systems/Effects.ts`: Particle and tween effects for kills, perfect shots, teleports, plasma hits, and bomb events.
- `src/ui/HUD.ts`: HUD layout, text/graphics updates, meter drawing, and reduced-motion adjustments.
- `src/scenes/GameScene.ts`: Integrates systems (analyzer, conductor, spawner, powerups, HUD), handles input for mouse, keyboard, gamepad, and touch, manages player state, bullets, collisions, and wave triggers.
- `src/systems/NeonGrid.ts`: Neon grid backdrop with beat-pulsed lane border lights and lane-aware alignment.

## Planned Features
- **Latency Calibration UI**: Interactive slider/test sound inside Options to fine-tune per-track offsets with visual/audio feedback.
- **Dynamic Lane Counts**: Stage-based lane expansions/contractions with camera, telegraph, and wave support.
- **Boss Pattern Authoring**: Designer-friendly timeline for phase attacks, bullet scripting, and announcer cues.
- **Online Leaderboards**: Optional API-backed leaderboard with validation, rate limiting, and secure submissions.
- **Additional Tracks & Modes**: Fourth track with experimental BPM, challenge modifiers (no powerups, hardcore damage), and seasonal event playlists.
- **Expanded Accessibility**: High-contrast palette, color-blind presets, audio-only assist refinements, and fully configurable controls.
- **Automation & QA**: Playwright smoke suite for menus/inputs, Vitest regression tests for beat timing, lane snapping, and scoring, plus build-size monitoring.

## Planned Modules & Enhancements
- `OptionsLatencyPanel`: UI module for calibration workflow, preview playback, and persistence hooks.
- `LaneTransitionController`: Handles staged lane count changes, camera easing, telegraph scaling, and player re-snap logic.
- `BossPatternTimeline`: Data-driven pattern runner integrating bullet scripts, telegraphs, announcer, and HP gates.
- `OnlineLeaderboardService`: API client with signature verification, retry/backoff, and offline fallbacks.
- `WaveAuthoringTools`: JSON schema and editor helpers to externalise pattern definitions for designers.
- `TelemetryService`: Instrumentation for beat accuracy, session data, and error reporting (with privacy guardrails).

This document should be refreshed alongside roadmap updates or major milestone reviews so new contributors can quickly understand what is live versus still planned.
