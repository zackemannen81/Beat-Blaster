# Beat-Blaster Spawn & Movement Rework Plan

## Context & Objectives
- **Problem Statement:** Current beat-triggered spawning can flood the screen, enemy stats escalate unpredictably, and limited player movement blocks powerup pickups. Visibility/telegraphing gaps erode the music-synced feel.
- **Primary Goals:**
  1. Restore reliable, beat-coherent pacing with deterministic wave control.
  2. Expand formation variety (e.g., swirl/circular) without overwhelming players.
  3. Let the player traverse the full playfield and choose crosshair behaviour, ensuring powerups remain collectible and visible.
  4. Surface all tuning knobs in data so designers can balance without code changes.

## Current Issues Recap
- Spawn cadence ties directly to analyzer beats; silence = no waves, noisy = floods. Fallback logic misestimates active counts due to despawn bugs.
- Difficulty scaling multiplies *speed × HP × count*, making dashers nearly unkillable.
- Formation selection ignores recent history, allowing back-to-back heavy waves.
- Player movement clamped to bottom band; powerups drift off-screen. Reduced visibility and lack of audio/visual telegraphs.
- Cleanup relies on destruction events; off-screen enemies can stall new waves.

## Design Pillars
1. **Tempo Alignment:** Waves lock to beat grids but can degrade gracefully to “light groove” mode when analyzer is uncertain.
2. **Data-First:** Wave templates, formations, and difficulty ramps live in JSON/TS config, hot-swappable at runtime.
3. **Player Agency:** Full-screen movement, snappy yet readable enemy speed, and strong telegraph cues.
4. **Accessibility:** Reduced-motion paths for telegraphs/trails; adjustable crosshair behaviour.
5. **Observability:** Instrument spawn director for QA—log wave start/end, enemy counts, and fallback activations.

## Mandatory Milestones
1. **Wave Data Schema & Formation Library**
   - Define `WaveDescriptor` (enemy type, formation, count, speed, hpMult, telegraph, audio cue).
   - Create data files per difficulty (e.g., `config/waves/easy.json`).
   - Implement formation builders in `Spawner`: lane, sine, V, swirl, circle, spiral drop, burst.
   - Add telegraph helpers (zone highlight + announcer clip, reduced-motion fallback using color flashes).

2. **WaveDirector & Scheduling**
   - Build `WaveDirector` system: consumes beat events, queues wave descriptors, enforces cooldowns and stage progression.
   - Add deterministic fallback loop: after N silent beats, queue lightweight waves without escalating difficulty.
   - Ensure wave completion tracked via enemy lifetime; integrate with scoring miss logic.

3. **Difficulty Profile Overhaul**
   - Redefine profiles with explicit wave playlists, speed caps, and max concurrent waves.
   - Move HP/speed ramp to stage-index tables (no multiplicative surprises).
   - Add designer-facing docs for editing profiles+

4. **Player Movement & Crosshair Rework**
   - Remove vertical clamp; implement optional “safety band” setting in Options.
   - Tune acceleration/drag so travel bottom-to-top ≤ 1.5s.
   - Add `crosshairMode` option (`fixed`, `pointer`, `pad-relative`) and update HUD/camera accordingly.
   - Rebalance touch/gamepad steering curves & Reduced Motion cues.

5. **Powerup Visibility & Drift**
   - Introduce slow downward drift with collision forgiveness; add brighter pulses/glow.
   - Update magnet behaviour to respect full-screen movement.
   - Expire powerups gracefully after X seconds beyond bounds.

6. **Cleanup & Safety Nets**
   - Centralize enemy despawn (`EnemyLifecycle`): off-screen culling, soft lock timers, health-bar GC.
   - Active-count watcher ensures `WaveDirector` receives accurate population figures.
   - Add automated tests covering spawn/despawn, fallback triggers, and stage ramps.

7. **HUD & UX Enhancements**
   - Display upcoming wave icon + countdown.
   - Stage/boss panel includes enemy type, telegraph text, and crosshair mode indicator.
   - Hook announcer SFX per wave/telegraph (respecting reduced-motion/audio toggles).

## Optional Milestones
1. **Adaptive Difficulty** — Use performance metrics (hit rate, misses) to dynamically skip or downgrade waves mid-run.
2. **Practice Mode** — Designer/debug overlay to spawn specific waves on demand and visualize hitboxes.
3. **Seeded Wave Generation** — Deterministic wave sequences per track seed for leaderboard fairness.
4. **Replay Telemetry** — Record wave events to replay or export for balancing analytics.

## Implementation Notes & Sequencing
1. **Bootstrap data** (stage 0), stub out new formation maths with debug visualisation.
2. **Integrate WaveDirector** while leaving old spawn hooks behind a flag for regression.
3. **Switch profiles** to new format, run tuning passes per difficulty.
4. **Refactor movement/crosshair** once wave pacing stabilizes; adjust bullet origin offsets accordingly.
5. **Upgrade powerups** and HUD telegraphs.
6. **Tear out legacy fallback/clamp logic**, ensure despawn timers validated.
7. **QA sweep**: automated tests, desktop/touch/gamepad matrix, reduced-motion verification, beat analyzer failure scenario.
8. **Docs & changelog** updates (README, vertical-mode doc, balancing notes).

## Risks & Mitigations
- **Analyzer noise** → keep conservative fallback waves, add manual “metronome” trigger for testing.
- **Increased CPU from new formations** → precompute paths, pool swirl anchors.
- **Player overwhelm** → telemetry-driven tuning; ensure optional “Chill” density slider in Options.
- **Regression in omni mode** → WaveDirector can emit omni-specific waves; maintain parity tests across both modes.

## Deliverables
- Updated configs (`difficultyProfiles`, `waves` data) and refactored `Spawner`/`WaveDirector`.
- Movement & crosshair option implementation + tuning.
- Enhanced powerup visuals/drift.
- HUD/telegraph/announcer integration.
- Revised docs (`docs/vertical-mode.md`), QA checklist, changelog entries.

## QA Checklist (Excerpt)
- Build passes `npm run build`.
- Wave cadence verified on easy/normal/hard for tracks w/ strong & weak beats.
- Fallback mode tested by muting audio mid-run.
- Crosshair modes validated (desktop, touch, gamepad).
- Powerup pickup reachable across full screen; magnet, Reduced Motion, telegraphs working.
- Regression run for omni mode ensures legacy gameplay unaffected.
- Automated checks cover stage tuning data, wave fallback scheduling, and enemy lifecycle culling.

*Plan owner: Codex. Last updated: 2025-09-20.*
