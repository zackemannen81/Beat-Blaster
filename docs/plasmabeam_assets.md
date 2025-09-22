# Pink Plasma Beam Asset Brief

## Core Projectile Animation (`bullet_plasma_0` → `bullet_plasma_5`)
- **Format**: Frames packed into `gameplay.atlas.png`/`.json` _or_ a dedicated spritesheet with JSON hash; 6–8 frames recommended.
- **Canvas size**: 64px wide × 128px tall (allows enough space for glow and twisting arcs without clipping). Keep transparent padding consistent across frames.
- **Shape & motion**:
  - Central white-hot core spanning roughly 40% of the width; elongate vertically to feel like a concentrated beam.
  - Mid-layer neon pink glow (#ff5db1) feathering into translucent magenta; animate subtle pulsating brightness synced with frames.
  - Two to three plasma filaments wrapping helically around the core. Offset their phase each frame to simulate rotation; exaggerate twist to read during fast movement.
  - Add faint outer corona in soft cyan (#7ef9ff) to contrast against purple backgrounds.
- **Rendering notes**:
  - Use additive/highlight edges; avoid hard outlines.
  - Include a few tiny spark particles flickering along the beam in alternating frames.
  - Ensure frames loop seamlessly when played at 18–22 FPS.

## Charge-up Animation (`bullet_plasma_charge_0` → `bullet_plasma_charge_4`)
- **Format**: Separate frame group; can share sheet with core beam.
- **Canvas size**: Match main projectile frames (64×128) for reuse of sprite pivot.
- **Motion beats**:
  - Start with compressed energy orb around muzzle (roughly 40×40px) with swirling filaments.
  - Expand vertically over frames, revealing the beam outline before firing.
  - Intensify glow and add radial shock rings in final frame to blend into the idle loop when the shot spawns.
- **Usage intent**: Optional pre-fire effect; frames can be played once at 24 FPS before switching to the looping beam animation.

## Impact Burst (`bullet_plasma_impact_0` → `bullet_plasma_impact_5`)
- **Format**: 6-frame burst for reuse in hit-spark system.
- **Canvas size**: 96×96 px (square) with transparent padding.
- **Visual direction**:
  - Central white flash with fractal pink/cyan arcs radiating outward.
  - Frame-by-frame tapering of the arcs into particle-friendly shapes.
  - Blend-friendly colors to stack with existing `Effects.hitSpark` particles.

## Optional Support Assets
1. **Lightning Overlay Strip (`pink_beam_arc.png`)**
   - Size: 16×96 px vertical strip; tileable top-to-bottom.
   - Contents: Single filament with alpha gradient. Designed for additive particle emitters following the projectile path.
2. **Glow Disc (`plasma_glow_disc.png`)**
   - Size: 80×80 px.
   - Use: Muzzle flash, charge-up halo, or screen-space UI pulses. Soft radial gradient (#ff5db1 center → transparent edge).
3. **Spark Particles (`particle_plasma_spark.png`, `particle_plasma_dot.png`)
   - Sizes: 8×8 px (spark), 6×6 px (dot).
   - Notes: Provide bright white core with pink falloff for reuse in particle systems.
4. **Trail Segment (`plasma_trail_0` → `plasma_trail_3`)
   - Size: 24×64 px frames.
   - Visual: Thin tapered streaks with alternating brightness, enabling `Effects` to spawn a short-lived afterimage trail.

## Naming & Export Guidelines
- Maintain lowercase snake_case to match existing atlas naming (`bullet_basic`).
- Document each frame name in accompanying JSON (e.g., `bullet_plasma_0`, `bullet_plasma_charge_3`).
- Align sprite pivots to center (`pivot: { x: 0.5, y: 0.5 }`).
- When updating the atlas, keep legacy frames (like `bullet_basic`) if backward compatibility is desired; otherwise, remove and update references.
- Deliver PNG assets with premultiplied alpha disabled (Phaser handles straight alpha best).

## Color Palette Reference
- Core white: `#ffffff`
- Primary pink: `#ff5db1`
- Accent magenta: `#d736ff`
- Electric cyan accent: `#7ef9ff`
- Deep shadow: `#1a0433` (used sparingly for interior contrast)

## Animation Timing Suggestions
- **Projectile idle**: 20 FPS loop (300 ms total).
- **Charge-up**: 24 FPS one-shot (≈200 ms), then transition into idle.
- **Impact burst**: 30 FPS one-shot (≈180 ms) to feel snappy.
- **Trail frames**: Randomized at spawn (no explicit animation) for variation.
