import Phaser from 'phaser'
import Spawner, { Enemy } from './Spawner'
import { showTelegraph } from './Telegraph'
import { WaveDescriptor, WavePlaylist, WaveCategory } from '../types/waves'
import { DifficultyProfileId } from '../config/difficultyProfiles'

export type BeatBand = 'low' | 'mid' | 'high'

const CATEGORY_WEIGHTS: Record<WaveCategory, number> = {
  light: 3,
  standard: 2,
  heavy: 1,
  boss: 0.35
}

const DEFAULT_CATEGORY_COOLDOWNS: Record<WaveCategory, number> = {
  light: 0,
  standard: 850,
  heavy: 2600,
  boss: 4800
}

type ScheduledWave = {
  descriptor: WaveDescriptor
  spawnAt: number
  telegraphAt: number | null
  telegraphTriggered: boolean
  anchor: Phaser.Types.Math.Vector2Like
  instanceId: string
  isFallback: boolean
}

type WaveInstance = {
  id: string
  descriptor: WaveDescriptor
  spawnedAt: number
  anchor: Phaser.Types.Math.Vector2Like
  isFallback: boolean
  enemyIds: Set<string>
}

type WaveDirectorOptions = {
  profileId: DifficultyProfileId
  playlist: WavePlaylist
  fallbackDescriptor?: WaveDescriptor
  anchorProvider?: () => Phaser.Types.Math.Vector2Like
  stageProvider?: () => number
  defaultDelayMs?: number
  fallbackCooldownMs?: number
  maxQueuedWaves?: number
  heavyCooldownMs?: number
  heavyWindowMs?: number
  maxHeavyInWindow?: number
  maxSimultaneousHeavy?: number
  categoryCooldowns?: Partial<Record<WaveCategory, number>>
  waveRepeatCooldownMs?: number
  allowImmediateRepeat?: boolean
  logEvents?: boolean
  onWaveSpawn?: (instanceId: string, enemies: Enemy[], descriptor: WaveDescriptor) => void
  enableFallback?: boolean
}

export default class WaveDirector {
  private scene: Phaser.Scene
  private spawner: Spawner
  private queue: ScheduledWave[] = []
  private playlist: WaveDescriptor[]
  private lastBeatAt = 0
  private lastFallbackAt = 0
  private readonly anchorProvider: () => Phaser.Types.Math.Vector2Like
  private readonly stageProvider: () => number
  private readonly defaultDelay: number
  private readonly fallbackCooldown: number
  private maxQueuedWaves: number
  private heavyCooldownMs: number
  private heavyWindowMs: number
  private maxHeavyInWindow: number
  private maxSimultaneousHeavy: number
  private categoryCooldowns: Record<WaveCategory, number>
  private waveRepeatCooldownMs: number
  private readonly allowImmediateRepeat: boolean
  private readonly logEvents: boolean
  private readonly fallbackDescriptor: WaveDescriptor
  private readonly onWaveSpawn?: (instanceId: string, enemies: Enemy[], descriptor: WaveDescriptor) => void
  private fallbackEnabled: boolean

  private waveInstanceCounter = 0
  private lastScheduledWaveId: string | null = null
  private pendingById = new Map<string, number>()
  private pendingHeavy = 0
  private activeHeavy = 0
  private recentHeavySpawnTimes: number[] = []
  private lastSpawnById = new Map<string, number>()
  private lastSpawnByCategory = new Map<WaveCategory, number>()
  private activeWaves = new Map<string, WaveInstance>()
  private enemyToWave = new Map<string, string>()

  constructor(scene: Phaser.Scene, spawner: Spawner, options: WaveDirectorOptions) {
    this.scene = scene
    this.spawner = spawner
    this.playlist = options.playlist?.waves ?? []
    this.anchorProvider = options.anchorProvider ?? (() => ({ x: this.scene.scale.width / 2, y: -140 }))
    this.stageProvider = options.stageProvider ?? (() => 1)
    this.defaultDelay = options.defaultDelayMs ?? 360
    this.fallbackCooldown = options.fallbackCooldownMs ?? 5000
    this.maxQueuedWaves = options.maxQueuedWaves ?? 3
    this.heavyCooldownMs = options.heavyCooldownMs ?? 4200
    this.heavyWindowMs = options.heavyWindowMs ?? 12000
    this.maxHeavyInWindow = options.maxHeavyInWindow ?? 2
    this.maxSimultaneousHeavy = Math.max(1, options.maxSimultaneousHeavy ?? 2)
    this.categoryCooldowns = {
      ...DEFAULT_CATEGORY_COOLDOWNS,
      ...(options.categoryCooldowns ?? {})
    }
    this.waveRepeatCooldownMs = options.waveRepeatCooldownMs ?? 1800
    this.allowImmediateRepeat = options.allowImmediateRepeat ?? false
    this.logEvents = options.logEvents ?? false
    this.onWaveSpawn = options.onWaveSpawn
    this.fallbackEnabled = options.enableFallback !== false

    const fallbacks = this.playlist.filter((w) => w.fallbackEligible)
    this.fallbackDescriptor = options.fallbackDescriptor ?? fallbacks[0] ?? {
      id: 'fallback_lane',
      formation: 'lane',
      enemyType: 'swarm',
      count: 3,
      speedMultiplier: 0.8,
      telegraph: { type: 'zone', durationMs: 450 },
      category: 'light',
      fallbackEligible: true
    }
  }

  enqueueBeat(band: BeatBand) {
    const now = this.scene.time.now
    if (this.queue.length >= this.maxQueuedWaves) return
    this.lastBeatAt = now
    const scheduled = this.scheduleWave(now, band, false)
    if (scheduled) {
      this.registerPending(scheduled.descriptor)
      this.queue.push(scheduled)
      this.sortQueue()
      this.emitEvent('wave:scheduled', {
        descriptorId: scheduled.descriptor.id,
        spawnAt: scheduled.spawnAt,
        telegraphAt: scheduled.telegraphAt,
        band,
        fallback: false
      })
    }
  }

  update() {
    const now = this.scene.time.now

    for (const entry of this.queue) {
      if (!entry.telegraphTriggered && entry.telegraphAt !== null && entry.telegraphAt <= now) {
        this.triggerTelegraph(entry)
      }
    }

    this.sortQueue()
    while (this.queue.length && this.queue[0].spawnAt <= now) {
      const wave = this.queue.shift()!
      this.unregisterPending(wave.descriptor)
      this.spawnScheduledWave(wave, now)
    }

    this.trimHeavyWindow(now)
    this.maybeTriggerFallback(now)
  }

  notifyEnemyDestroyed(enemyId: string | null) {
    if (!enemyId) return
    const waveId = this.enemyToWave.get(enemyId)
    if (!waveId) return
    const instance = this.activeWaves.get(waveId)
    if (!instance) return
    instance.enemyIds.delete(enemyId)
    this.enemyToWave.delete(enemyId)
    if (instance.enemyIds.size === 0) {
      this.completeWave(instance)
    }
  }

  getActiveWaveCount() {
    return this.activeWaves.size
  }

  getQueueSnapshot() {
    return this.queue.map((entry) => ({
      id: entry.descriptor.id,
      spawnAt: entry.spawnAt,
      telegraphAt: entry.telegraphAt,
      fallback: entry.isFallback
    }))
  }

  private scheduleWave(now: number, band: BeatBand, isFallback: boolean): ScheduledWave | null {
    const descriptor = this.pickWaveDescriptor(now, band, isFallback)
    if (!descriptor) return null
    const delay = Math.max(0, descriptor.delayMs ?? this.defaultDelay)
    const telegraphLead = Math.max(0, descriptor.telegraphDelayMs ?? 0)
    const anchor = this.anchorProvider()
    const spawnAt = now + delay
    const telegraphAt = telegraphLead > 0 ? Math.max(now, spawnAt - telegraphLead) : null
    const instanceId = `${descriptor.id}#${++this.waveInstanceCounter}`

    this.lastScheduledWaveId = descriptor.id

    return {
      descriptor,
      spawnAt,
      telegraphAt,
      telegraphTriggered: false,
      anchor,
      instanceId,
      isFallback
    }
  }

  scheduleDescriptor(
    descriptor: WaveDescriptor,
    options: {
      delayMs?: number
      telegraphDelayMs?: number | null
      anchor?: Phaser.Types.Math.Vector2Like
      force?: boolean
      respectAvailability?: boolean
      markFallback?: boolean
    } = {}
  ): boolean {
    if (!descriptor) return false
    const now = this.scene.time.now
    if (!options.force && this.queue.length >= this.maxQueuedWaves) return false

    if (options.respectAvailability !== false) {
      const stage = Math.max(1, this.stageProvider())
      const passes = this.isWaveAvailable(descriptor, now, stage, options.markFallback === true)
      if (!passes) return false
    }

    const delay = Math.max(0, options.delayMs ?? descriptor.delayMs ?? this.defaultDelay)
    const leadRaw = options.telegraphDelayMs === null
      ? null
      : options.telegraphDelayMs !== undefined
        ? Math.max(0, options.telegraphDelayMs)
        : Math.max(0, descriptor.telegraphDelayMs ?? 0)
    const spawnAt = now + delay
    const telegraphAt = leadRaw === null
      ? null
      : leadRaw > 0
        ? Math.max(now, spawnAt - leadRaw)
        : (descriptor.telegraph ? now : null)
    const anchor = options.anchor ?? this.anchorProvider()
    const instanceId = `${descriptor.id}#${++this.waveInstanceCounter}`

    const scheduled: ScheduledWave = {
      descriptor,
      spawnAt,
      telegraphAt,
      telegraphTriggered: telegraphAt === null || telegraphAt <= now,
      anchor,
      instanceId,
      isFallback: options.markFallback === true
    }

    if (scheduled.telegraphTriggered && descriptor.telegraph && telegraphAt !== null && telegraphAt <= now) {
      // Telegrapher will be picked up during update loop; ensure we don't double trigger
      scheduled.telegraphTriggered = false
    }

    this.lastScheduledWaveId = descriptor.id
    this.registerPending(descriptor)
    this.queue.push(scheduled)
    this.sortQueue()

    const eventName = options.markFallback === true ? 'wave:fallback' : 'wave:scheduled'
    this.emitEvent(eventName, {
      descriptorId: descriptor.id,
      spawnAt: scheduled.spawnAt,
      telegraphAt: scheduled.telegraphAt,
      fallback: options.markFallback === true
    })

    return true
  }

  private pickWaveDescriptor(now: number, band: BeatBand, isFallback: boolean): WaveDescriptor | null {
    const stage = Math.max(1, this.stageProvider())
    const candidates = this.collectCandidates(now, stage, isFallback)
    if (candidates.length === 0) return isFallback ? this.fallbackDescriptor : null

    const weighted = candidates.map((descriptor) => ({ descriptor, weight: this.computeWeight(descriptor, band, stage) }))
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
    if (total <= 0) return weighted[0]?.descriptor ?? null
    const roll = Phaser.Math.FloatBetween(0, total)
    let agg = 0
    for (const entry of weighted) {
      agg += entry.weight
      if (roll <= agg) return entry.descriptor
    }
    return weighted[weighted.length - 1]?.descriptor ?? null
  }

  private collectCandidates(now: number, stage: number, isFallback: boolean): WaveDescriptor[] {
    const pool = isFallback ? this.playlist.filter((w) => w.fallbackEligible) : this.playlist
    const filtered = pool.filter((descriptor) => this.isWaveAvailable(descriptor, now, stage, isFallback))
    if (filtered.length > 0) return filtered

    if (!isFallback) {
      const softened = pool.filter((descriptor) => this.isWaveAvailable(descriptor, now, stage, isFallback, true))
      if (softened.length > 0) return softened
    }

    return []
  }

  private isWaveAvailable(
    descriptor: WaveDescriptor,
    now: number,
    stage: number,
    isFallback: boolean,
    softenRules = false
  ): boolean {
    if (!descriptor) return false

    if (typeof descriptor.minimumStage === 'number' && stage < descriptor.minimumStage) return false
    if (typeof descriptor.maximumStage === 'number' && stage > descriptor.maximumStage) return false

    if (!this.allowImmediateRepeat && !softenRules && descriptor.id === this.lastScheduledWaveId) return false

    const pending = this.pendingById.get(descriptor.id) ?? 0
    if (pending > 0 && !softenRules) return false

    const lastSpawnAt = this.lastSpawnById.get(descriptor.id) ?? 0
    const cooldown = Math.max(this.waveRepeatCooldownMs, descriptor.cooldownMs ?? 0)
    if (!softenRules && now - lastSpawnAt < cooldown) return false

    const category = descriptor.category ?? 'standard'
    const lastCategorySpawn = this.lastSpawnByCategory.get(category) ?? 0
    const categoryCooldown = this.categoryCooldowns[category] ?? 0
    if (!softenRules && categoryCooldown > 0 && now - lastCategorySpawn < categoryCooldown) return false

    const isHeavy = category === 'heavy' || category === 'boss'
    if (isHeavy) {
      if (!softenRules && (this.pendingHeavy + this.activeHeavy) >= this.maxSimultaneousHeavy) return false
      if (!softenRules && now - this.lastHeavySpawnTime() < this.heavyCooldownMs) return false
      if (!softenRules) {
        const windowCount = this.recentHeavySpawnTimes.filter((stamp) => now - stamp <= this.heavyWindowMs).length
        if (windowCount >= this.maxHeavyInWindow) return false
      }
    }

    if (isFallback && !descriptor.fallbackEligible) return false

    return true
  }

  private computeWeight(descriptor: WaveDescriptor, band: BeatBand, stage: number): number {
    const category = descriptor.category ?? 'standard'
    const base = CATEGORY_WEIGHTS[category] ?? 1
    const stageBoost = descriptor.tier ? Math.max(0.6, 1 + (descriptor.tier - stage) * 0.1) : 1
    const bandFactor = band === 'high' ? 1.2 : band === 'low' ? 0.85 : 1
    const introBoost = descriptor.tags?.includes('intro') && stage <= 1 ? 1.5 : 1
    const fallbackBoost = descriptor.fallbackEligible ? 1.1 : 1
    return Math.max(0.1, base * stageBoost * bandFactor * introBoost * fallbackBoost)
  }

  private triggerTelegraph(entry: ScheduledWave) {
    const descriptor = entry.descriptor
    if (!descriptor.telegraph) {
      entry.telegraphTriggered = true
      return
    }
    const params = descriptor.formationParams ?? {}
    const options: { radius?: number; length?: number; angle?: number } = {}
    if (descriptor.telegraph.type === 'circle' || descriptor.telegraph.type === 'zone') {
      options.radius = params.radius ?? 180
    } else if (descriptor.telegraph.type === 'line') {
      options.length = params.wavelength ?? 420
      options.angle = params.angle ?? -Math.PI / 2
    }
    showTelegraph(this.scene, descriptor.telegraph, entry.anchor, options)
    entry.telegraphTriggered = true
    this.emitEvent('wave:telegraph', {
      descriptorId: descriptor.id,
      instanceId: entry.instanceId,
      spawnAt: entry.spawnAt,
      fallback: entry.isFallback
    })
  }

  private spawnScheduledWave(entry: ScheduledWave, now: number) {
    const descriptor = entry.descriptor
    const enemies = this.spawner.spawnWave(descriptor, entry.anchor, {
      skipTelegraph: entry.telegraphTriggered
    })
    const instance: WaveInstance = {
      id: entry.instanceId,
      descriptor,
      spawnedAt: now,
      anchor: entry.anchor,
      isFallback: entry.isFallback,
      enemyIds: new Set()
    }

    const category = descriptor.category ?? 'standard'
    const isHeavy = category === 'heavy' || category === 'boss'
    if (isHeavy) {
      this.activeHeavy += 1
      this.recentHeavySpawnTimes.push(now)
    }

    this.lastSpawnById.set(descriptor.id, now)
    this.lastSpawnByCategory.set(category, now)

    for (const enemy of enemies) {
      const id = enemy?.getData('eid')
      if (id) {
        instance.enemyIds.add(id)
        this.enemyToWave.set(id, instance.id)
      }
    }

    this.activeWaves.set(instance.id, instance)

    if (enemies.length > 0) {
      this.onWaveSpawn?.(instance.id, enemies, descriptor)
    }

    if (instance.enemyIds.size === 0) {
      this.completeWave(instance)
    }

    this.emitEvent('wave:spawned', {
      descriptorId: descriptor.id,
      instanceId: instance.id,
      enemyCount: instance.enemyIds.size,
      fallback: entry.isFallback
    })
  }

  private completeWave(instance: WaveInstance) {
    this.activeWaves.delete(instance.id)
    const category = instance.descriptor.category ?? 'standard'
    if (category === 'heavy' || category === 'boss') {
      this.activeHeavy = Math.max(0, this.activeHeavy - 1)
    }
    for (const enemyId of instance.enemyIds) {
      this.enemyToWave.delete(enemyId)
    }

    this.emitEvent('wave:completed', {
      descriptorId: instance.descriptor.id,
      instanceId: instance.id,
      fallback: instance.isFallback
    })
  }

  private maybeTriggerFallback(now: number) {
    if (!this.fallbackEnabled) return
    if (now - this.lastBeatAt < this.fallbackCooldown) return
    if (now - this.lastFallbackAt < this.fallbackCooldown * 0.6) return
    if (this.queue.length >= this.maxQueuedWaves) return

    const scheduled = this.scheduleWave(now, 'low', true)
    if (!scheduled) return

    this.registerPending(scheduled.descriptor)
    this.queue.push(scheduled)
    this.sortQueue()
    this.lastFallbackAt = now
    this.lastBeatAt = now
    this.emitEvent('wave:fallback', {
      descriptorId: scheduled.descriptor.id,
      spawnAt: scheduled.spawnAt
    })
  }

  private lastHeavySpawnTime(): number {
    return this.recentHeavySpawnTimes.length
      ? this.recentHeavySpawnTimes[this.recentHeavySpawnTimes.length - 1]
      : 0
  }

  private trimHeavyWindow(now: number) {
    this.recentHeavySpawnTimes = this.recentHeavySpawnTimes.filter((stamp) => now - stamp <= this.heavyWindowMs)
  }

  private registerPending(descriptor: WaveDescriptor) {
    const count = this.pendingById.get(descriptor.id) ?? 0
    this.pendingById.set(descriptor.id, count + 1)
    if ((descriptor.category ?? 'standard') === 'heavy' || (descriptor.category ?? 'standard') === 'boss') {
      this.pendingHeavy += 1
    }
  }

  private unregisterPending(descriptor: WaveDescriptor) {
    const count = this.pendingById.get(descriptor.id) ?? 0
    if (count <= 1) this.pendingById.delete(descriptor.id)
    else this.pendingById.set(descriptor.id, count - 1)
    if ((descriptor.category ?? 'standard') === 'heavy' || (descriptor.category ?? 'standard') === 'boss') {
      this.pendingHeavy = Math.max(0, this.pendingHeavy - 1)
    }
  }

  private sortQueue() {
    this.queue.sort((a, b) => a.spawnAt - b.spawnAt)
  }

  private emitEvent(event: string, payload: Record<string, unknown>) {
    this.scene.events.emit(event, payload)
    if (this.logEvents) {
      console.debug(`[WaveDirector] ${event}`, payload)
    }
  }

  applyStageSettings(settings: {
    maxQueuedWaves?: number
    heavyControls?: Partial<{ cooldownMs: number; windowMs: number; maxInWindow: number; maxSimultaneous: number }>
    categoryCooldowns?: Partial<Record<WaveCategory, number>>
    waveRepeatCooldownMs?: number
  }) {
    if (settings.maxQueuedWaves !== undefined) {
      this.maxQueuedWaves = Math.max(1, Math.floor(settings.maxQueuedWaves))
    }

    if (settings.heavyControls) {
      if (settings.heavyControls.cooldownMs !== undefined) {
        this.heavyCooldownMs = Math.max(0, settings.heavyControls.cooldownMs)
      }
      if (settings.heavyControls.windowMs !== undefined) {
        this.heavyWindowMs = Math.max(0, settings.heavyControls.windowMs)
      }
      if (settings.heavyControls.maxInWindow !== undefined) {
        this.maxHeavyInWindow = Math.max(1, Math.floor(settings.heavyControls.maxInWindow))
      }
      if (settings.heavyControls.maxSimultaneous !== undefined) {
        this.maxSimultaneousHeavy = Math.max(1, Math.floor(settings.heavyControls.maxSimultaneous))
      }
    }

    if (settings.categoryCooldowns) {
      this.categoryCooldowns = {
        ...this.categoryCooldowns,
        ...settings.categoryCooldowns
      }
    }

    if (settings.waveRepeatCooldownMs !== undefined) {
      this.waveRepeatCooldownMs = Math.max(400, settings.waveRepeatCooldownMs)
    }
  }

  setFallbackEnabled(flag: boolean) {
    this.fallbackEnabled = flag
  }
}
