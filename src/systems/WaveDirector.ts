import Phaser from 'phaser'
import Spawner from './Spawner'
import { WaveDescriptor, WavePlaylist } from '../types/waves'
import { DifficultyProfileId } from '../config/difficultyProfiles'

export type BeatBand = 'low' | 'mid' | 'high'

type ScheduledWave = {
  descriptor: WaveDescriptor
  spawnAt: number
}

type WaveDirectorOptions = {
  profileId: DifficultyProfileId
  playlist: WavePlaylist
  fallbackDescriptor?: WaveDescriptor
  anchorProvider?: () => Phaser.Types.Math.Vector2Like
  defaultDelayMs?: number
  fallbackCooldownMs?: number
}

export default class WaveDirector {
  private scene: Phaser.Scene
  private spawner: Spawner
  private queue: ScheduledWave[] = []
  private playlist: WaveDescriptor[]
  private cursor = 0
  private lastBeatAt = 0
  private lastFallbackAt = 0
  private readonly anchorProvider: () => Phaser.Types.Math.Vector2Like
  private readonly defaultDelay: number
  private readonly fallbackCooldown: number
  private readonly fallbackDescriptor: WaveDescriptor

  constructor(scene: Phaser.Scene, spawner: Spawner, options: WaveDirectorOptions) {
    this.scene = scene
    this.spawner = spawner
    this.playlist = options.playlist?.waves ?? []
    this.anchorProvider = options.anchorProvider ?? (() => ({ x: this.scene.scale.width / 2, y: -120 }))
    this.defaultDelay = options.defaultDelayMs ?? 320
    this.fallbackCooldown = options.fallbackCooldownMs ?? 4500
    this.fallbackDescriptor =
      options.fallbackDescriptor ??
      ({
        id: 'fallback_lane',
        formation: 'lane',
        enemyType: 'swarm',
        count: 3,
        speedMultiplier: 0.85,
        formationParams: {},
        telegraph: { type: 'zone', durationMs: 500 }
      } as WaveDescriptor)
  }

  enqueueBeat(band: BeatBand) {
    this.lastBeatAt = this.scene.time.now
    const descriptor = this.pickNextWave(band)
    if (!descriptor) return
    const spawnAt = this.scene.time.now + (descriptor.delayMs ?? this.defaultDelay)
    this.queue.push({ descriptor, spawnAt })
  }

  update() {
    const now = this.scene.time.now
    this.queue.sort((a, b) => a.spawnAt - b.spawnAt)
    while (this.queue.length && this.queue[0].spawnAt <= now) {
      const wave = this.queue.shift()!
      const anchor = this.anchorProvider()
      this.spawner.spawnWave(wave.descriptor, anchor)
    }

    const sinceBeat = now - this.lastBeatAt
    if (sinceBeat > this.fallbackCooldown && now - this.lastFallbackAt > this.fallbackCooldown) {
      const anchor = this.anchorProvider()
      this.spawner.spawnWave(this.fallbackDescriptor, anchor)
      this.lastFallbackAt = now
    }
  }

  private pickNextWave(_band: BeatBand): WaveDescriptor | null {
    if (this.playlist.length === 0) return null
    const descriptor = this.playlist[this.cursor % this.playlist.length]
    this.cursor += 1
    return descriptor
  }
}
