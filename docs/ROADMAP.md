# Beat Blaster Roadmap (March 2025)

## Product North Star
- Deliver a rhythm-driven vertical shooter that keeps the beat readable, rewards precision, and scales cleanly from onboarding to expert play.
- Maintain the omni arena legacy mode as an alternate ruleset without fragmenting core content or balance work.
- Ship a polished web build with fast loads (<2 s on mid-tier laptops), steady 60 FPS gameplay, and accessible options for motion, contrast, and latency.

## Current State
- Vertical mode is feature-complete for alpha: lane manager, beat-synced waves, announcer, bomb/powerup loop, and three track difficulties are implemented.
- Wave playlists cover the full enemy roster, though hard-mode boss phases and late-wave telegraph mixes still need tuning.
- Audio analyzer + BPM fallback are live with per-track offsets, but calibration UI and automated validation are pending.
- Presentation pass includes neon grid, telegraphs, cube skins, and reduced-motion handling; additional shader polish is deferred.

## 0-2 Week Focus (Sprint 7)
- Finish latency calibration workflow in Options (UI + persistence + preview track).
- Expand Easy/Hard playlists to introduce new archetypes earlier and stage hard-phase bosses.
- Add Vitest coverage for BeatWindow, Scoring combo decay, and LaneManager geometry helpers.
- Restore favicon/assets manifest and convert new audio to OGG/stream-friendly formats with updated hashes.
- Run performance profiling on mid-spec laptops; cap particle counts where spikes occur.

## 2-4 Week Focus (Sprint 8)
- Implement dynamic lane count transitions per stage (camera framing, telegraph resizing, lane snap UX).
- Integrate boss scripting tools (pattern timelines, announcer callouts, health phase thresholds).
- Build Playwright smoke suite for input methods (mouse, touch, gamepad) and menu flows.
- Finalise hard playlist, including bullet-hell and multi-phase boss patterns; lock scoring tables.
- Begin shader polish pass (bloom tuning, chromatic aberration toggle) gated behind options.

## 4-8 Week Focus (Content Lock Window)
- Onboard fourth track (experimental BPM) with analyzer tuning and fallback schedule.
- Add new powerup (e.g. Overdrive) and revisit drop tables for late-game balance.
- Implement online leaderboard stub with signature validation and anti-spam throttling.
- Produce marketing assets: trailer clips, screenshots, press kit copy.
- Accessibility sweep: high-contrast preset, color-blind palette, audio-only assist improvements.

## Post-Lock / Live Ops Goals
- Schedule seasonal content drops (new waves, cosmetics) without expanding core executable.
- Instrument telemetry for beat accuracy, session length, crash reporting, and drop-off reasons.
- Maintain monthly bug-triage cadence and balance patches informed by telemetry.

## Enabling Work & Tech Debt
- Improve analyzer fallback confidence with automated beat-alignment regression tests.
- Refactor Spawner pattern definitions to data-only to ease designer iteration.
- Optimize asset pipeline (texture atlases, audio compression, lazy loading) ahead of launch build.
- Document enemy pattern tuning guidelines and add ADRs for major systems (Conductor, LaneManager).

## Release Criteria Checklist
- CI: lint, type check, unit tests, smoke tests all green; bundle size alerts acknowledged.
- Performance: >=60 FPS on target hardware, consistent frame pacing, memory <250 MB after 15 min session.
- Content: Minimum three polished tracks, full roster coverage, calibrated scoring/balance across difficulties.
- Accessibility & Options: Reduced motion, high contrast, color presets, latency calibration, rebindable input toggles verified.
- QA: Manual regression suite executed for each release candidate; zero blocker bugs outstanding.

Keep this roadmap updated after each sprint review; archive delivered milestones in `docs/changelog` or the sprint checklist for traceability.
