# Advanced Enemy System Plan

## Objectives
- Distinguish enemy archetypes with unique retrowave palettes, silhouettes, and sizes.
- Introduce beat-synced glow/scale pulses so enemies respond to the soundtrack.
- Keep the system extensible for future enemy variants and manageable in code.

## Current Snapshot
- `Spawner.spawn` instantiates enemies from the `gameplay` atlas and applies `CubeSkin` variants (`src/systems/Spawner.ts`).
- Enemy visuals are similar aside from slight size tweaks; no palette differentiation or beat reaction.
- `AudioAnalyzer` + `Conductor` already broadcast beat events (`GameScene` listens for spawns, not enemy FX).
- `cleanupEnemy` handles skin destruction; beat-driven tweaks must integrate cleanly.

## Design Directions
1. **Visual Identity per Type**
   - Define a style config object per archetype: base scale, body radius, primary/secondary neon colors, skin variant (solid/wire/plasma), optional glow sprite key.
   - Update `CubeSkin` (or create `EnemySkin`) to accept palette + size + optional orbiting elements; ensure additive glows and rotation speeds fit retrowave aesthetic.
   - Add retrowave compliant colors (cyan, magenta, violet, hot pink) contrasted with darker outlines.

2. **Beat Pulsing**
   - On low-beat events, trigger a short pulse: scale up 6–10%, boost glow alpha, maybe rotate slightly, then ease back.
   - Provide per-type pulse amplitude/decay to reflect archetype personality (brute heavy, swarm subtle).
   - Guard against tween stacking (use timeline with `overwrite: true` or call `skin.pulse()` that manages state).

## Implementation Steps
1. **Config + Types**
   - Create `EnemyStyles.ts` exporting map `<type, style>` with palette, size, glow intensity, pulse settings.
   - Include fallback/hook for future types.

2. **Skin Enhancements**
   - Extend `CubeSkin` to:
     - Tint geometry with supplied colors.
     - Spawn additive glow sprite (e.g., blurred circle) tinted to match.
     - Expose `pulse(amplitude)` that tweens scale/glow.
     - Support cleanup/destroy updates.

3. **Spawner Integration**
   - Load style config in `Spawner.spawn`: set sprite scale/body radius via style.
   - Pass style to `CubeSkin` constructor.
   - Record baseline scale and store `pulseAmplitude` on enemy data for quick access.

4. **Beat Controller**
   - In `GameScene`, hook analyzer low-beat event: iterate active enemies, call `skin.pulse()`.
   - Optionally scale pulse by proximity to player or randomness for variety.
   - Ensure fallback pulses when analyzer inactive (use fallback BPM timer already present).

5. **Glow/Pulse Implementation**
   - Use additive overlay sprite or `Graphics` glow; adjust alpha/scale in `pulse`.
   - Sync tween durations to 120–180ms for snappy effect.

6. **Cleanup and Safety**
   - Update `cleanupEnemy` to destroy new glow sprites, cancel tweens.
   - Reset physics body size and style on pooling reuse.

7. **QA Steps**
   - Verify pellet collisions align with new body sizes.
   - Confirm performance with dozens of pulsing enemies.
   - Test while music off (fallback pulses) and with multiple beat pulses stacking.
   - Ensure color contrast meets readability on neon grid background.

## Optional Enhancements
- Introduce idle micro-motions (slow rotation, sin-wave bob) driven by style config.
- Add HP-based visuals (dimmer glow when low HP).
- Integrate enemy-specific death explosions using style palette.

## Checklist
- [ ] Implement `EnemyStyles` config with neon palettes and pulse settings.
- [ ] Upgrade `CubeSkin` (or new class) to accept style info and manage glow/pulse.
- [ ] Update `Spawner` to apply styles and store references.
- [ ] Add beat listener in `GameScene` to pulse active enemies.
- [ ] Ensure cleanup covers new visuals and tweens.
- [ ] QA: visual differentiation, beat sync accuracy, performance.
