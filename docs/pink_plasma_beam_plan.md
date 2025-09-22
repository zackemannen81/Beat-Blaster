# Pink Plasma Beam Bullet Plan

## Goal
- Replace the existing `bullet_basic` sprite with a stylised pink plasma beam that feels high-energy and musical.
- Integrate a full FX suite: looping projectile animation, charge burst, impact flash, and optional additive trail.

## Current Implementation Snapshot
- Bullets are spawned via `GameScene.fireBullet()` and retrieved from `this.bullets` using the `gameplay` atlas frame `bullet_basic` (`src/scenes/GameScene.ts:511`).
- Power-up split shots reuse the same frame (`src/scenes/GameScene.ts:543-563`).
- `BootScene` preloads the `gameplay` atlas but defines no projectile-specific animations.
- Effects system already exposes muzzle flash and hit-spark helpers in `src/systems/Effects.ts`.

## Assets
- Procedurally generated PNG frames live in `src/assets/sprites/plasmabeam/`:
  - Core loop: `bullet_plasma_0.png` → `bullet_plasma_5.png` (64×128).
  - Charge-up: `bullet_plasma_charge_0.png` → `bullet_plasma_charge_4.png` (64×128).
  - Impact burst: `bullet_plasma_impact_0.png` → `bullet_plasma_impact_5.png` (96×96).
  - Support textures: `pink_beam_arc.png`, `plasma_glow_disc.png`, `particle_plasma_spark.png`, `particle_plasma_dot.png`, `plasma_trail_0.png` → `plasma_trail_3.png`.

## Code Touchpoints & Changes
1. **Asset Loading** (`src/scenes/BootScene.ts`)
   - Add explicit `this.load.image` calls for each frame (or loop across filenames).
   - Optionally package helper arrays in a const to reuse when registering animations.

2. **Animation Registration** (`BootScene.create()` or dedicated helper)
   - Create global animations:
     - `bullet_plasma_idle`: uses `bullet_plasma_*` frames @ 20 FPS, repeat -1.
     - `bullet_plasma_charge`: uses charge frames @ 24 FPS, repeat 0, hide on complete.
     - `bullet_plasma_impact`: uses impact frames @ 30 FPS, repeat 0, destroy on complete.
     - `plasma_trail_cycle`: uses `plasma_trail_*` @ ~18 FPS for optional afterimage.

3. **Bullet Pool Update** (`src/scenes/GameScene.ts`)
   - Configure `this.bullets` to spawn with texture `bullet_plasma_0` (or create custom factory).
   - On activation, play `bullet_plasma_idle`, set `setBlendMode(Phaser.BlendModes.ADD)`, adjust scale/size (`setSize`, `setOffset` or `setCircle`).
   - Ensure split-shot bullets reuse the same setup (extract helper to avoid duplication).
   - Update TTL cleanup to stop animations before disabling (call `stop` and `setFrame`).

4. **Effects Enhancements** (`src/systems/Effects.ts`)
   - Add `plasmaCharge(x, y, rotation)` that spawns the charge sprite, plays once, destroys on complete.
   - Add `plasmaImpact(x, y)` using the impact animation (replaces or supplements `hitSpark`).
   - Add `attachPlasmaTrail(bullet)` that creates a particle emitter (using `pink_beam_arc`, `particle_plasma_*`) following the bullet; ensure emitter cleans up when bullet disables.
   - Update `muzzleFlash` to optionally use `plasma_glow_disc` for richer flash.

5. **Game Scene Integration**
   - Invoke `this.effects.plasmaCharge(...)` slightly ahead of projectile spawn (same tick) for visual continuity.
   - On bullet spawn, call `this.effects.attachPlasmaTrail(b)`.
   - On hit, trigger `plasmaImpact` alongside existing scoring logic; decide whether to keep or replace `hitSpark`.
   - Verify split-shot and power-ups call the same helpers.

6. **Cleanup & Pooling**
   - Ensure trail emitters destroy when bullet disables (`bullet.once('destroy'...)` or override `this.bullets` callbacks).
   - Remove listeners in `fireBullet` to avoid multiple `worldbounds` registrations.

## Implementation Checklist
- [x] Generate/import plasma assets.
- [x] Load all plasma textures in `BootScene`.
- [x] Register idle, charge, impact, and trail animations.
- [x] Update bullet spawning to use plasma animation, additive blend, and new collision sizing.
- [x] Integrate charge, impact, and trail effects via `Effects` methods.
- [ ] Confirm split-shot / pooling compatibility and clean emitter teardown.
- [ ] Playtest: verify visuals, performance, and collision accuracy.

## Testing & QA Notes
- Run the game (`npm run dev`) to confirm animations loop correctly and nothing leaks when bullets despawn.
- Stress test sustained fire (including split power-up) to check emitter cleanup and performance.
- Validate charge animation alignment with muzzle and rotation.
- Confirm impact effect fires once per enemy hit and does not linger when enemies die off-screen.

## Open Decisions
- Keep `hitSpark` alongside `plasmaImpact` or fully replace? (Implement both and adjust blend if too bright.)
- Should charge effect only appear for non-rapid-fire mode? (Currently instant to keep pace with gameplay.)
- Future: consider parameterising colors for skin swaps or different weapon upgrades.

## Enemy Hit / Destruction FX Plan
- **Assets**
  - Generate `enemy_hit_plasma_0` → `_5` (96×96) for on-hit sparks with neon rings and directional streaks.
  - Generate `enemy_explode_plasma_0` → `_7` (160×160) featuring core flash, expanding shockwave, debris rays, and dissipating glow.
  - Optional: `enemy_shard_0` → `_3` (24×24) shards for particle debris.
- **Loading & Animations**
  - Preload new textures in `BootScene` alongside plasma bullets.
  - Register animations: `enemy_hit_plasma`, `enemy_explode_plasma`, `enemy_shard_spin` (if shards animated).
- **Effects Layer**
  - Extend `Effects` with `enemyHitFx(x, y, direction?)` for hit responses and `enemyExplodeFx(x, y)` for final kills; spawn sprites, play animations, and chain supporting particles (sparks, shards, radial glow).
  - Reuse/add particle emitters for shards, smoke, and shock rings with appropriate cleanup.
- **Game Integration**
  - Call `enemyHitFx` in the bullet/enemy overlap prior to HP check to ensure feedback on every connection.
  - Trigger `enemyExplodeFx` when HP ≤ 0, after scoring and cleanup scheduling; ensure no duplicate triggers for pooled enemies.
- **Testing**
  - Verify effects with single hits, rapid fire, and simultaneous kills; ensure emitters and sprites destroy correctly.
  - Confirm performance remains stable with multiple concurrent explosions.
