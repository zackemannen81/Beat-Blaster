export type DifficultyProfileId = 'easy' | 'normal' | 'hard'

export type DifficultyProfile = {
  id: DifficultyProfileId
  label: string
  scrollMultiplier: number
  spawnRateMultiplier: number
  enemyHpMultiplier: number
  bossHpMultiplier: number
  enemyCap: number
  missPenalty: number
  bossMissPenalty: number
  laneCount?: number
  startingStage?: number
  description: string
  wavePlaylistId?: string
  maxQueuedWaves?: number
  fallbackDelayMs?: number
  stageSpawnMultipliers?: number[]
  stageHpMultipliers?: number[]
}

const profiles: Record<DifficultyProfileId, DifficultyProfile> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    scrollMultiplier: 0.88,
    spawnRateMultiplier: 0.6,
    enemyHpMultiplier: 0.85,
    bossHpMultiplier: 0.9,
    enemyCap: 12,
    missPenalty: 30,
    bossMissPenalty: 80,
    laneCount: 5,
    startingStage: 1,
    description: 'Lower scroll speed, fewer formations and softer penalties for new players.',
    wavePlaylistId: 'easy',
    maxQueuedWaves: 2,
    fallbackDelayMs: 6000,
    stageSpawnMultipliers: [1, 1.05, 1.12, 1.18],
    stageHpMultipliers: [1, 1.05, 1.1, 1.16]
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    scrollMultiplier: 1,
    spawnRateMultiplier: 0.85,
    enemyHpMultiplier: 1,
    bossHpMultiplier: 1,
    enemyCap: 18,
    missPenalty: 50,
    bossMissPenalty: 120,
    laneCount: 6,
    startingStage: 1,
    description: 'Baseline Beat-Blaster experience tuned for balanced challenge.',
    wavePlaylistId: 'normal',
    maxQueuedWaves: 3,
    fallbackDelayMs: 5500,
    stageSpawnMultipliers: [1, 1.1, 1.2, 1.3],
    stageHpMultipliers: [1, 1.08, 1.16, 1.25]
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    scrollMultiplier: 1.12,
    spawnRateMultiplier: 1.05,
    enemyHpMultiplier: 1.2,
    bossHpMultiplier: 1.35,
    enemyCap: 24,
    missPenalty: 65,
    bossMissPenalty: 160,
    laneCount: 6,
    startingStage: 1,
    description: 'Faster scroll, denser formations, heavier penalties for expert players.',
    wavePlaylistId: 'hard',
    maxQueuedWaves: 4,
    fallbackDelayMs: 5000,
    stageSpawnMultipliers: [1, 1.15, 1.3, 1.45],
    stageHpMultipliers: [1, 1.12, 1.25, 1.4]
  }
}

export function getDifficultyProfile(id: string | undefined | null): DifficultyProfile {
  if (!id) return profiles.normal
  const key = id.toLowerCase() as DifficultyProfileId
  return profiles[key] ?? profiles.normal
}

export function listDifficultyProfiles(): DifficultyProfile[] {
  return Object.values(profiles)
}
