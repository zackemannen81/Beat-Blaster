# Power-Up Experience Upgrade Plan

## Goals
- Deliver iconic, animated pickup icons that immediately communicate power-up type.
- Show a snappy "+POWERUP" text burst on collection for positive feedback.
- Surface active power-up status in the HUD with timers for remaining duration.
- (Optional) Layer unique audio cues per power-up type for instant recognition.

## Current Snapshot
- Power-ups spawn via `GameScene.maybeDropPickup` using static atlas frames (`pickup_*`).
- Power-up effects handled in `Powerups.apply(...)`, no UI feedback beyond gameplay changes.
- HUD currently tracks score, combo, HP, bomb charge; no power-up indicators.
- Audio: single `hit_enemy`/`shot` etc., no distinct power-up SFX.

## Asset & Animation Work
1. **Pickup Icons**
   - Create 4 animated sprite loops (shield, rapid, split, slowmo): 48×48 px, 6–8 frames each.
   - Design language: shared silhouette with color-coded motifs and subtle motion (e.g., orbiting particles, pulsing rings).
   - Export as `powerup_{type}_0..n` PNGs or add to atlas.
2. **Pickup Burst Text**
   - Font assets already exist (`UiFont`, `AnnouncerFont`). Plan to render text dynamically; optional custom sprite if stronger style needed.
3. **HUD Badge Art**
   - Create small badge icons (32×32) matching animated pickup aesthetic for HUD display.

## Code Touchpoints
1. **BootScene**
   - Preload new pickup animations, HUD badge textures, optional SFX.
   - Register animations: `powerup_pickup_{type}` (loop for world items) and optional one-shot `powerup_icon_flash` used on spawn.
2. **GameScene**
   - Update pickup spawn to use animated sprites with `play(...)` and additive highlights.
   - On collision, trigger `Effects.powerupText(x, y, type)` to show `+RAPID FIRE!` etc.
   - Emit event to HUD for countdown start; consider centralizing in `Powerups.apply`.
3. **Powerups System**
   - Extend `apply` to emit structured data: `{ type, durationMs, remainingMs }`.
   - Track timers to compute remaining duration for HUD updates; expose `getRemaining(type)` helpers.
4. **HUD Module**
   - Add power-up panel (e.g., top-right) with slots for active types.
   - Each slot: badge icon + radial or bar timer. Update per frame using `Powerups` getters.
   - Hide slots when timer expires.
5. **Effects System**
   - New method `powerupPickupText(type, x, y)` creating floating text (color-coded) with tweened fade/scale.
   - Optional screen flash or spark ring for rare power-ups.
6. **Audio** (Optional)
   - Load new SFX (`powerup_shield`, `powerup_rapid`, etc.) in `BootScene`.
   - Play in `Powerups.apply` or effect handler.

## UI Timer Concepts
- **Radial Dial**: mask-driven arc shrinking over duration.
- **Horizontal Bar**: simple width tween based on `remaining / total`.
- Consider using `Graphics` object per active power-up to avoid texture bloat.

## Event Flow
1. GameScene spawns animated pickup.
2. Player overlap:
   - Remove pickup from world.
   - `Powerups.apply(type, duration)` updates internal timers and emits event.
   - HUD listens, spawns/refreshes slot timer.
   - Effects: `powerupPickupText`, optional particle burst, play SFX.
3. Each update tick, HUD queries `Powerups` to refresh timers; when remaining <= 0, slot fades out.

## Implementation Checklist
- [ ] Design and export animated pickup icons + HUD badges.
- [ ] Preload assets & register animations in `BootScene`.
- [ ] Update pickup spawn logic in `GameScene` to use new animations and hit areas.
- [ ] Add power-up text effect method in `Effects` + hook into `GameScene` overlap.
- [ ] Enhance `Powerups` to emit duration events and provide remaining time getters.
- [ ] Extend HUD with active power-up panel (icon + countdown visualization).
- [ ] (Optional) Source/load per-type SFX and trigger on pickup.
- [ ] QA: verify multiple active power-ups stack, timers refresh, HUD cleans up.

## Risks & Considerations
- Animated pickups increase draw calls; ensure texture atlasing or reuse to avoid perf hits.
- HUD timers must remain legible on various resolutions; plan responsive layout.
- Ensure slowmo reset logic handles overlapping pickups correctly when durations extend.
- Audio variations should respect `opts.sfxVolume` and not overlap harshly; consider cool-down.

## Follow-up Ideas
- Fade-in indicator when power-up about to expire (<2s).
- Combo bonuses for chain pickups with dedicated feedback.
- Cosmetic aura around player when certain power-ups active.
