import { EnemyType } from '../config/enemyStyles'

export type FormationId =
  | 'lane'
  | 'sine'
  | 'v'
  | 'swirl'
  | 'circle'
  | 'spiral'
  | 'burst'

export type TelegraphDescriptor = {
  type: 'zone' | 'line' | 'circle'
  durationMs: number
  intensity?: number
}

export type WaveDescriptor = {
  id: string
  formation: FormationId
  enemyType: EnemyType
  count?: number
  speedMultiplier?: number
  hpMultiplier?: number
  formationParams?: Record<string, number>
  telegraph?: TelegraphDescriptor
  audioCue?: string
  delayMs?: number
}

export type WavePlaylist = {
  waves: WaveDescriptor[]
}
