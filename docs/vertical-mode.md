# Beat-Blaster Vertical Mode

This document captures the gameplay rules, configuration knobs, and QA checklist for the new vertical-scrolling mode. The mode can run alongside the original omni-directional layout and is controlled by feature flags, difficulty profiles, and per-track metadata.

## Overview
- The player occupies the lower 35% of the screen and shoots upward while the world scrolls down.
- Background layers and starfields scroll at a BPM-driven rate that is scaled per difficulty profile.
- Enemy spawns are orchestrated as lanes, sine-wave swarms, V-formations, and periodic bosses that telegraph their arrival via conductor bar counts.
- Stage progression is boss-driven: clearing a boss advances the stage, incrementally raising spawn density and enemy HP multipliers.

## Control Summary
### Desktop / Keyboard & Mouse
- Movement: Arrow keys eller WASD ger fri thrust i både X- och Y-led; lane-snapping kickar in mot närmaste lane när du släpper vänster/höger.
- Fire: Vänster musknapp (click/hold). Skott tidsbedöms via BeatWindow.
- Aim: Låst framåt som standard. Aktivera `Mouse Aim Unlock` i OptionsScene för fritt mus-sikte.
- Bomb: Space när bomb-mätaren når 100%.
- Options: `O` öppnar OptionsScene för runtime-tuning.

### Gamepad
- Movement: Vänster spak med justerbar deadzone/sensitivitet; lane-snapping gäller när spaken returnerar till neutral.
- Fire: Face-knappar (A/B eller X/Square beroende på layout) fungerar som hold-to-fire.
- Bomb: Höger shoulder/trigger (RB/R1 eller RT/R2) när laddad.
- Difficulty / Reduced Motion / Mouse Aim Unlock togglas via OptionsScene.

### Touch / Mobile
- Left half of the screen provides a horizontal slide pad to steer the ship.
- Right half acts as a hold-to-fire surface; triple tapping anywhere triggers a bomb.

## Difficulty Profiles
Difficulty is selected through `difficultyProfileId` inside `src/config/tracks.json`. The profile contributes multipliers that feed GameScene and Spawner.

| Profile | Scroll × | Spawn × | Enemy HP × | Boss HP × | Enemy Cap | Miss Penalty | Description |
| ------- | -------- | ------- | ---------- | --------- | --------- | ------------ | ----------- |
| Easy    | 0.88     | 0.75    | 0.85       | 0.90      | 18        | 30 / 80 (boss)| Relaxed scroll, fewer formations, lighter punishment. |
| Normal  | 1.00     | 1.00    | 1.00       | 1.00      | 25        | 50 / 120     | Baseline tuning matching the original Beat-Blaster experience. |
| Hard    | 1.12     | 1.30    | 1.20       | 1.35      | 32        | 65 / 160     | Faster scroll, denser spawns, tougher bosses and penalties. |

Runtime stage progression applies an additional 12% spawn-density ramp and 8% HP ramp per cleared boss, capped at 60% above the base profile.

## Stage & Boss Flow
- Conductor bar counts are tracked per track; a boss attempt is queued every 8 bars when the active enemy pool is below 45% of the current cap.
- Bosses inherit difficulty multipliers and expose a HUD bar. Defeating a boss increments the stage number, re-evaluates difficulty ramps, and resets vertical spawn cycles.
- If a boss escapes off-screen or the player collides with it, a large miss penalty is applied and the HUD flashes a warning.

## Reduced Motion Support
- Users can toggle `Reduced Motion` in OptionsScene. When enabled, camera shakes, particle-heavy explosions, combo popups, and plasma trails are replaced with lightweight flashes.
- HUD feedback still surfaces key information (combo text, miss warnings) but without animations.

## Testing Checklist
1. `npm run build` (baseline check).
2. Desktop smoke test:
   - Boot in vertical mode (`?mode=vertical`) with an easy track and verify stage/boss HUD, reduced motion toggle, and bomb flow.
   - Swap to a hard-profile track and confirm increased spawn density and boss HP.
3. Mobile/touch smoke test via responsive dev tools; confirm left/right halves behave per spec.
4. Gamepad sweep: adjust deadzone/sensitivity in OptionsScene and confirm they persist after resume.
5. Reduced Motion pass: enable the toggle, defeat a boss, and ensure screen shake/particle effects are suppressed.
6. Regression: switch back to omni mode (`?mode=omni`) and confirm original spawn routines still execute.

Document last revised: 2025-09-26.
