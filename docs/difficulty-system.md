# Beat Blaster Difficulty System Guide

This guide explains how Beat Blaster turns difficulty profiles into moment-to-moment gameplay, and how to add a new profile or fine-tune the existing `easy`, `normal`, and `hard` configurations.

## Runtime Overview
- **GameScene** (`src/scenes/GameScene.ts`) loads the active track, resolves the linked `difficultyProfileId`, and hydrates systems with profile data.
- **WaveDirector** (`src/systems/WaveDirector.ts`) schedules wave descriptors using rate limits from the profile and the currently active stage.
- **LanePatternController** (`src/systems/LanePatternController.ts`) runs the deterministic 16-beat script in vertical mode. It injects lane count changes and enemy descriptors, scaling counts/speeds from the difficulty profile and stage multipliers.
- **Spawner** (`src/systems/Spawner.ts`) applies HP multipliers, telegraphs, and spawn geometry specified by wave descriptors.
- **EnemyLifecycle** keeps enemy counts within the caps defined by stage tuning and reports misses for scoring penalties.

The diagram below shows the high-level flow:

```
Track (tracks.json) ──► DifficultyProfile ──► GameScene
                                     │
                                     ├─► WaveDirector ◄─ LanePatternController
                                     │               \
                                     │                └─► Spawner ─► Enemies
                                     └─► HUD / Scoring / Penalties
```

## Difficulty Profile Anatomy
All difficulty configuration lives in `src/config/difficultyProfiles.ts`. The `DifficultyProfile` shape is:

```ts
export type DifficultyProfile = {
  id: 'easy' | 'normal' | 'hard'
  label: string
  description: string
  baseScrollSpeed: number
  baseSpawnRate: number
  baseEnemyHpMultiplier: number
  baseBossHpMultiplier: number
  waveDelayMs: number
  waveRepeatCooldownMs: number
  fallbackCooldownMs: number
  wavePlaylistId: string
  laneCount: number
  missPenalty: number
  bossMissPenalty: number
  categoryCooldowns: Partial<Record<WaveCategory, number>>
  heavyControls: {
    cooldownMs: number
    windowMs: number
    maxInWindow: number
    maxSimultaneous: number
  }
  stageTuning: StageTuning[]
}
```

Key field behaviour:
- **baseScrollSpeed**: Sets the parallax and bullet travel baseline in vertical mode. GameScene multiplies by BPM-derived factors per stage (`GameScene.ts:2201`).
- **baseSpawnRate**: Currently used as metadata for designers; actual enqueue cadence comes from `waveDelayMs`, stage `spawnMultiplier`, and the lane pattern.
- **HP multipliers**: `baseEnemyHpMultiplier` and `baseBossHpMultiplier` are multiplied by each stage entry to drive `Spawner.setDifficulty` (`GameScene.ts:1648`).
- **waveDelayMs**: Default delay between scheduled waves. Lower values increase spawn density.
- **waveRepeatCooldownMs**: Minimum time before the same wave descriptor may repeat; stage spawn multipliers can shorten this (`GameScene.ts:1654`).
- **fallbackCooldownMs**: Minimum interval between automatic fallback waves when playlists dry up (`WaveDirector.ts:170`).
- **wavePlaylistId**: Id used by `WaveLibrary` to load `src/config/waves/{id}.json`.
- **laneCount**: Base number of vertical lanes. The 16-beat pattern requests 3/5/7 lanes dynamically and clamps to the profile base when pattern is disabled.
- **Penalties**: `missPenalty` and `bossMissPenalty` applied by scoring when enemies escape.
- **categoryCooldowns**: Per wave category throttles layered on top of `DEFAULT_CATEGORY_COOLDOWNS` in WaveDirector. Use this to bias light/standard/heavy/boss density.
- **heavyControls**: Global heavy wave gate. `cooldownMs` enforces a minimum gap, `windowMs` with `maxInWindow` controls burst frequency, `maxSimultaneous` caps concurrent heavy instances.

## Stage Tuning
Each entry in `stageTuning` represents a difficulty ramp as the run progresses. Stage progression is triggered by GameScene logic (score/time). Fields:
- `scrollMultiplier`: Scales `baseScrollSpeed` and lane pattern speed multiplier.
- `spawnMultiplier`: Scales lane pattern enemy counts and shortens `waveRepeatCooldownMs`.
- `enemyHpMultiplier` / `bossHpMultiplier`: Applied on top of the base multipliers.
- `enemyCap`: Sent to `EnemyLifecycle` to clamp concurrent enemies.
- `maxQueuedWaves`: Caps queued wave descriptors in `WaveDirector`.
- `maxSimultaneousHeavy`: Optional stage override for maximum concurrent heavy waves.
- `heavyCooldownMs`: Optional stage override for the heavy cooldown.

If a stage lacks overrides, GameScene falls back to profile-wide values. Stages are addressed by `stage` integer; requesting a missing stage uses the closest defined entry (`GameScene.ts:1609`).

## Relationship With Other Configs
- **Tracks → Profiles**: Each entry in `src/config/tracks.json` specifies `difficultyProfileId`. Adding a new profile requires pointing at it here (or setting `selectedTrackId` at runtime).
- **Wave Playlists**: `src/systems/WaveLibrary.ts` loads `src/config/waves/{profileId}.json`. These playlists provide the fallback/ambient waves when the lane pattern is idle or disabled. Mark `fallbackEligible` descriptors to allow emergency spawns when the queue runs dry.
- **Lane Pattern Scaling**: `LanePatternController` has difficulty-specific multipliers for spawn count and speed (`DIFFICULTY_COUNT`, `DIFFICULTY_SPEED`) and will need updates if you introduce a new profile id.
- **Enemy Registry**: Runtime balance data (HP overrides, behaviours) is fetched via `registry.get('balance.enemies')`; profiles primarily change counts and cadence.

## Creating a New Difficulty Profile
1. **Define the profile** in `src/config/difficultyProfiles.ts`:
   - Duplicate an existing block, provide a new `DifficultyProfileId`, update label/description.
   - Set base values, heavy controls, penalties, and stage tuning to match the desired difficulty curve.
2. **Expose the profile id**:
   - Update `DifficultyProfileId` union, `profiles` map, and any helper exports if adding beyond easy/normal/hard.
   - Extend `LanePatternController` constants (`DIFFICULTY_COUNT`, `DIFFICULTY_SPEED`) and `buildPattern` switch to support the new id, or provide a bespoke pattern if the beat loop should differ.
3. **Provide a wave playlist**:
   - Add `src/config/waves/<newId>.json` with curated descriptors.
   - Register import/export in `src/systems/WaveLibrary.ts` (mirroring existing imports).
4. **Link tracks or UI**:
   - Point an entry in `src/config/tracks.json` at the new `difficultyProfileId`, or surface a mode selection in the Options UI.
5. **Adjust presentation**:
   - Update any HUD text or menu copy if new labels or descriptions should be surfaced.
6. **Validate** (`npm run dev`):
   - Confirm lane pattern scales counts/speed as expected.
   - Inspect `WaveDirector` logs (enabled in dev) to check heavy cooldowns, queue size, and fallback usage.
   - Play through stage transitions to ensure stage tuning kicks in and doesn’t overrun `enemyCap`.

## Fine-Tuning Existing Profiles
Use these levers to achieve specific balance goals:
- **Density tuning**:
  - Lower `waveDelayMs` or `waveRepeatCooldownMs` for more frequent waves. Remember stage `spawnMultiplier` further shortens repeat cooldowns.
  - Increase `maxQueuedWaves` in early stages to prevent empty beats if the player clears enemies too fast.
- **Heavy wave pacing**:
  - Tighten `heavyControls.cooldownMs` or raise `maxInWindow` for more aggressive bursts.
  - Use stage-specific `heavyCooldownMs` / `maxSimultaneousHeavy` to spike difficulty late in the run without overwhelming Stage 1.
- **HP feel**:
  - Adjust `baseEnemyHpMultiplier` for overall bullet spongeiness.
  - Nudge per-stage `enemyHpMultiplier` values to create gradual ramps or plateaus.
- **Fallback management**:
  - Shorten `fallbackCooldownMs` if you observe gaps when playlists exhaust.
  - Audit playlists so enough entries are marked `fallbackEligible` for each category.
- **Lane pressure**:
  - `laneCount` influences player movement space. Consider aligning lane expansion beats with enemy density to avoid unavoidable walls.
  - The lane pattern applies difficulty count multipliers; small adjustments to `DIFFICULTY_COUNT` or stage `spawnMultiplier` can soften spikes without touching every spawn entry.
- **Penalty economy**:
  - Increase `missPenalty` / `bossMissPenalty` to reward precision. Ensure HUD copy and scoring tables remain aligned.

After tweaks, replay the track using several controller types (mouse, gamepad, touch) and watch for:
- Queue saturation warnings in the dev console (`wave:scheduled`, `wave:fallback` events).
- Heavy wave streaks violating intended spacing.
- Enemies exceeding `enemyCap` or starving the player of targets.
- Beat alignment issues when `baseScrollSpeed` changes (keep the lane pattern readable).

## Troubleshooting & Tips
- If heavy waves never spawn, verify `categoryCooldowns.heavy` and `heavyControls.maxInWindow` aren’t too restrictive, and that playlists contain `category: "heavy"` descriptors.
- Lane pattern spawns bypass some availability checks (`respectAvailability: false`), so rely on stage `enemyCap` and heavy controls to throttle chaos.
- Stage configs fall back to the last defined stage when you exceed the array. Define explicit later stages if you need a climax beyond Stage 4.
- When altering lane counts, test reduced-motion mode; telegraph timings are tied to profile delays and need to remain readable.

Keep this document updated as you add new profiles, modify the lane pattern, or introduce systemic changes to waves.
