import { EnemyType } from '../config/enemyStyles'

export type FormationId =
  | 'lane'
  | 'lane_hopper'
  | 'sine'
  | 'v'
  | 'swirl'
  | 'circle'
  | 'spiral'
  | 'spiral_drop'
  | 'burst'

export type TelegraphDescriptor = {
  type: 'zone' | 'line' | 'circle'
  durationMs: number
  intensity?: number
}

export type WaveCategory = 'light' | 'standard' | 'heavy' | 'boss'

export type WaveTag = 'dasher' | 'swarm' | 'brute' | 'powerup' | 'boss' | 'intro'

export type WaveDescriptor = {
  id: string
  formation: FormationId
  enemyType: EnemyType
  count?: number
  speedMultiplier?: number
  hpMultiplier?: number
  formationParams?: Record<string, number>
  telegraph?: TelegraphDescriptor
  telegraphDelayMs?: number
  audioCue?: string
  delayMs?: number
  category?: WaveCategory
  tags?: WaveTag[]
  tier?: number
  minimumStage?: number
  maximumStage?: number
  cooldownMs?: number
  fallbackEligible?: boolean
}

export type WavePlaylist = {
  id: string
  waves: WaveDescriptor[]
}
