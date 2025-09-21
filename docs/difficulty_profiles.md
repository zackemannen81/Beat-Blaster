# Difficulty Profiles Overview

Difficulty profiles drive pacing, health scaling, and spawn density for Beat-Blaster. They live in `src/config/difficultyProfiles.ts` and are consumed at runtime without a rebuild.

## Profile Structure

Each profile exports the following top-level fields:

- `baseScrollSpeed` – Scroll speed (in px/s) when the track BPM is 120 at stage multiplier `1`.
- `baseSpawnRate` – Baseline spawn density multiplier that stage configs layer on top of.
- `baseEnemyHpMultiplier` / `baseBossHpMultiplier` – Starting HP multipliers for regular enemies and bosses.
- `waveDelayMs` – Default delay (in ms) between a beat signal and the actual spawn.
- `waveRepeatCooldownMs` – Global minimum delay before the same wave descriptor may be scheduled again.
- `fallbackCooldownMs` – How long the `WaveDirector` waits before injecting a fallback wave when no beats arrive.
- `categoryCooldowns` – Optional per-category cooldown overrides (`light | standard | heavy | boss`).
- `heavyControls` – Default heavy-wave cadence limits:
  - `cooldownMs`
  - `windowMs`
  - `maxInWindow`
  - `maxSimultaneous`
- `laneCount` – Number of vertical lanes the spawner exposes on that difficulty.
- `missPenalty` / `bossMissPenalty` – Score penalties for misses.
- `stageTuning` – Ordered list describing how the profile evolves as stages advance.

## Stage Tuning

Each `stageTuning` entry has:

- `stage` – 1-based stage index.
- `scrollMultiplier` – Multiplies `baseScrollSpeed` before BPM adjustments.
- `spawnMultiplier` – Heavier values reduce the repeat cooldown and permit more concurrent waves.
- `enemyHpMultiplier` / `bossHpMultiplier` – Stage-specific multipliers applied on top of the base health multipliers.
- `enemyCap` – Maximum number of active enemies allowed before the director throttles new spawns.
- `maxQueuedWaves` – Maximum number of waves the director may queue at once.
- `maxSimultaneousHeavy` *(optional)* – Override for the number of heavy/boss waves that may be active or pending simultaneously.
- `heavyCooldownMs` *(optional)* – Stage-specific override for heavy-wave cooldown.

If a run progresses beyond the last entry we reuse the final tuning block.

## Editing Tips

1. **Add stages in order.** The director uses the first matching `stage` entry; keep values contiguous so you do not skip scaling thresholds.
2. **Balance heavies** using `maxSimultaneousHeavy` and `heavyCooldownMs`. If a profile feels oppressive, raise the cooldown or drop the simultaneous limit.
3. **Sync with waves.** Ensure the profile references the intended wave playlist via `wavePlaylistId`. New wave JSON descriptors live under `src/config/waves/`.
4. **Test fallback pacing.** After adjusting cooldowns, mute the track to confirm fallback waves maintain flow without escalating difficulty.
5. **Fast iteration.** Profiles are plain TypeScript objects – tweak numbers, hit save, and reload the game to try the new tuning instantly.

For a deeper description of the spawn and movement overhaul, see `docs/spawn_and_movement_rework_plan.md`.
