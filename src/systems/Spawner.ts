import Phaser from 'phaser'
import CubeSkin from '../systems/CubeSkin'
import { enemyStyles, EnemyType } from '../config/enemyStyles'
import { WaveDescriptor, FormationId } from '../types/waves'
import { showTelegraph } from './Telegraph'
import LaneManager from './LaneManager'

export type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

export type PatternData =
  | { kind: 'lane'; anchorX: number; speedY: number }
  | { kind: 'sine'; anchorX: number; amplitude: number; angularVelocity: number; spawnTime: number; speedY: number }
  | { kind: 'weaver'; anchorX: number; amplitude: number; angularVelocity: number; spawnTime: number; speedY: number }
  | { kind: 'drift'; velocityX: number; speedY: number }
  | { kind: 'circle'; anchorX: number; anchorY: number; radius: number; angularVelocity: number }
  | { kind: 'spiral'; anchorX: number; anchorY: number; angularVelocity: number }
  | { kind: 'spiral_drop'; anchorX: number; anchorY: number; angularVelocity: number }
  | { kind: 'burst'; speedY: number }
  | { kind: 'lane_hopper'; laneA: number; laneB: number; hopEveryBeats?: number; speedY: number }
  | { kind: 'formation_dancer'; centerX: number; offsets: number[]; speedY: number }
  | { kind: 'mirrorer'; speedY: number }
  | { kind: 'teleporter'; laneIndex: number; speedY: number }
  | { kind: 'lane_flood'; laneIndex: number; width: number; height: number; speedY: number }
  | { kind: 'boss'; speedY: number }

type SpawnConfig = {
  type: EnemyType
  x: number
  y: number
  velocityX?: number
  velocityY?: number
  pattern?: PatternData
  scale?: number
  hpOverride?: number
  hpMultiplier?: number
  tint?: number
  isBoss?: boolean
  waveId?: string
}

export default class Spawner {
  private scene: Phaser.Scene
  private group: Phaser.Physics.Arcade.Group
  private scrollBase = 220
  private laneCount = 6
  private hpMultiplier = 1
  private bossHpMultiplier = 1
  private laneManager?: LaneManager
  private laneChangedHandler?: (snapshot: ReturnType<LaneManager['getSnapshot']>) => void

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.group = this.scene.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite })
  }

  setScrollBase(speed: number) {
    this.scrollBase = speed
  }

  setDifficulty(config: { hpMultiplier?: number; bossHpMultiplier?: number; laneCount?: number }) {
    if (typeof config.hpMultiplier === 'number' && config.hpMultiplier > 0) this.hpMultiplier = config.hpMultiplier
    if (typeof config.bossHpMultiplier === 'number' && config.bossHpMultiplier > 0) this.bossHpMultiplier = config.bossHpMultiplier
    if (!this.laneManager && typeof config.laneCount === 'number' && config.laneCount >= 3) {
      this.laneCount = Math.floor(config.laneCount)
    }
  }

  setLaneManager(manager: LaneManager | null) {
    if (this.laneManager && this.laneChangedHandler) {
      this.laneManager.off(LaneManager.EVT_CHANGED, this.laneChangedHandler, this)
    }
    this.laneManager = manager ?? undefined
    if (this.laneManager) {
      this.laneCount = this.laneManager.getCount()
      this.laneChangedHandler = (snapshot) => {
        this.laneCount = snapshot.count
      }
      this.laneManager.on(LaneManager.EVT_CHANGED, this.laneChangedHandler, this)
    } else {
      this.laneChangedHandler = undefined
    }
  }

  spawn(type: EnemyType, count = 1, options: { waveId?: string; hpMultiplier?: number } = {}): Enemy[] {
    const spawned: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomOffscreen()
      const angle = Phaser.Math.Angle.Between(x, y, this.scene.scale.width / 2, this.scene.scale.height / 2)
      const speedBase = type === 'swarm'
        ? 85
        : type === 'dasher'
          ? 110
          : type === 'exploder'
            ? 55
            : type === 'weaver'
              ? 90
              : type === 'mirrorer'
                ? 75
                : type === 'formation'
                  ? 70
                  : type === 'teleporter'
                    ? 100
                    : type === 'flooder'
                      ? 45
                      : 65
      const speed = speedBase * 0.25
      const enemy = this.createEnemy({
        type,
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        hpMultiplier: options.hpMultiplier,
        waveId: options.waveId
      })
      spawned.push(enemy)
    }
    return spawned
  }

  spawnVerticalLane(
    type: EnemyType,
    laneIndex: number,
    count = 1,
    speedMultiplier = 1,
    hpMultiplier?: number,
    waveId?: string
  ): Enemy[] {
    const spawned: Enemy[] = []
    const anchorX = this.getLaneCenterX(laneIndex)
    const margin = 60
    const speedY = this.scrollBase * speedMultiplier
    for (let i = 0; i < count; i++) {
      const enemy = this.createEnemy({
        type,
        x: anchorX,
        y: -margin - i * 48,
        velocityY: speedY,
        hpMultiplier,
        waveId,
        pattern: { kind: 'lane', anchorX, speedY }
      })
      spawned.push(enemy)
    }
    return spawned
  }

  spawnLaneHopper(
    type: EnemyType,
    laneA: number,
    laneB: number,
    speedMultiplier = 1,
    hopEveryBeats = 1,
    hpMultiplier?: number,
    waveId?: string
  ): Enemy[] {
    if (this.laneCount <= 0) return []
    const startLane = Phaser.Math.Clamp(laneA, 0, Math.max(0, this.laneCount - 1))
    const altLane = Phaser.Math.Clamp(laneB, 0, Math.max(0, this.laneCount - 1))
    const anchorX = this.getLaneCenterX(startLane)
    const margin = 60
    const speedY = this.scrollBase * speedMultiplier
    const enemy = this.createEnemy({
      type,
      x: anchorX,
      y: -margin,
      velocityY: speedY,
      hpMultiplier,
      waveId,
      pattern: { kind: 'lane_hopper', laneA: startLane, laneB: altLane, hopEveryBeats, speedY }
    })
    enemy.setData('laneHopCurrent', startLane)
    enemy.setData('laneHopBeatCount', 0)
    enemy.setData('laneHopTween', null)
    return [enemy]
  }

  spawnSineWave(
    type: EnemyType,
    count: number,
    amplitudePx: number,
    wavelengthPx: number,
    speedMultiplier = 1,
    hpMultiplier?: number,
    waveId?: string
  ): Enemy[] {
    const spawned: Enemy[] = []
    const { width } = this.scene.scale
    const margin = 70
    const speedY = this.scrollBase * speedMultiplier
    const angularVelocity = wavelengthPx > 0 ? ((2 * Math.PI) * speedY) / wavelengthPx : 0
    const spacing = width / (count + 1)
    const now = this.scene.time.now
    for (let i = 0; i < count; i++) {
      const anchorX = spacing * (i + 1)
      const enemy = this.createEnemy({
        type,
        x: anchorX,
        y: -margin - i * 36,
        velocityY: speedY,
        hpMultiplier,
        waveId,
        pattern: { kind: 'sine', anchorX, amplitude: amplitudePx, angularVelocity, spawnTime: now, speedY }
      })
      spawned.push(enemy)
    }
    return spawned
  }

  spawnVFormation(
    type: EnemyType,
    size: number,
    spreadPx: number,
    speedMultiplier = 1,
    hpMultiplier?: number,
    waveId?: string
  ): Enemy[] {
    const spawned: Enemy[] = []
    const centerX = this.scene.scale.width / 2
    const margin = 80
    const speedY = this.scrollBase * speedMultiplier
    for (let i = 0; i < size; i++) {
      const offsetIndex = i - (size - 1) / 2
      const offset = offsetIndex * spreadPx
      const velocityX = offsetIndex * 3
      const enemy = this.createEnemy({
        type,
        x: centerX + offset,
        y: -margin - Math.abs(offsetIndex) * 40,
        velocityX,
        velocityY: speedY,
        hpMultiplier,
        waveId,
        pattern: { kind: 'drift', velocityX, speedY }
      })
      spawned.push(enemy)
    }
    return spawned
  }

  spawnWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    options: { skipTelegraph?: boolean } = {}
  ): Enemy[] {
    const formation = descriptor.formation as FormationId
    const waveId = descriptor.id
    let enemies: Enemy[] = []
    switch (formation) {
      case 'lane':
        enemies = this.spawnLaneWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'lane_hopper':
        enemies = this.spawnLaneHopperDescriptor(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'sine':
        enemies = this.spawnSineWaveDescriptor(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'weaver':
        enemies = this.spawnWeaverWave(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'teleporter':
        enemies = this.spawnTeleporterWave(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'v':
        enemies = this.spawnVWaveDescriptor(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'swirl':
        enemies = this.spawnSwirlWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'circle':
        enemies = this.spawnCircleWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'spiral':
        enemies = this.spawnSpiralWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'spiral_drop':
        enemies = this.spawnSpiralDropWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'burst':
        enemies = this.spawnBurstWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'formation_dancer':
        enemies = this.spawnFormationDancerWave(descriptor, anchor, waveId, options.skipTelegraph === true)
        break
      case 'mirrorer':
        enemies = this.spawnMirrorerWave(descriptor, waveId, options.skipTelegraph === true)
        break
      case 'lane_flood':
        enemies = this.spawnLaneFloodWave(descriptor, waveId, options.skipTelegraph === true)
        break
      default:
        enemies = this.spawn(descriptor.enemyType, descriptor.count ?? 3, {
          waveId,
          hpMultiplier: descriptor.hpMultiplier
        })
    }
    return enemies
  }

  private spawnLaneWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const laneIndex = typeof params.laneIndex === 'number' ? params.laneIndex : Math.floor(this.laneCount / 2)
    const count = descriptor.count ?? 4
    const speedMul = descriptor.speedMultiplier ?? 1
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, { x: anchor.x, y: anchor.y }, { radius: params.radius ?? 140 })
    }
    const spawned = this.spawnVerticalLane(
      descriptor.enemyType,
      laneIndex,
      count,
      speedMul,
      descriptor.hpMultiplier,
      waveId
    )
    if (descriptor.enemyType === 'exploder') {
      const beats = typeof params.explodeBeats === 'number' ? Math.max(1, Math.round(params.explodeBeats)) : 3
      const radius = typeof params.radius === 'number' ? params.radius : 150
      spawned.forEach((enemy) => {
        enemy.setData('exploderCountdownBeats', beats)
        enemy.setData('exploderRadius', radius)
      })
    }
    if (descriptor.enemyType === 'teleporter') {
      spawned.forEach((enemy) => {
        enemy.setData('teleporterLane', laneIndex)
      })
    }
    return spawned
  }

  private spawnTeleporterWave(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const laneIndex = typeof params.laneIndex === 'number' ? params.laneIndex : Math.floor(this.laneCount / 2)
    const count = descriptor.count ?? 2
    const speedMul = descriptor.speedMultiplier ?? 0.78
    const speedY = this.scrollBase * speedMul
    const margin = 80
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const lane = Phaser.Math.Clamp(laneIndex + i - Math.floor((count - 1) / 2), 0, Math.max(0, this.laneCount - 1))
      const x = this.getLaneCenterX(lane)
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y: -margin - i * 42,
        velocityY: speedY,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'teleporter', laneIndex: lane, speedY }
      })
      enemy.setData('teleporterLane', lane)
      enemies.push(enemy)
    }
    if (!skipTelegraph && descriptor.telegraph) {
      const first = enemies[0]
      if (first) {
        showTelegraph(this.scene, descriptor.telegraph, { x: first.x, y: first.y }, { radius: 120 })
      }
    }
    return enemies
  }

  private getLaneWidth(index: number): number {
    if (this.laneManager) {
      const lanes = this.laneManager.getAll()
      if (lanes.length <= 1) return this.scene.scale.width
      const current = Phaser.Math.Clamp(index, 0, lanes.length - 1)
      const left = current === 0 ? lanes[current].centerX : lanes[current - 1].centerX
      const right = current === lanes.length - 1 ? lanes[current].centerX : lanes[current + 1].centerX
      return Math.abs(right - left) || this.scene.scale.width / lanes.length
    }
    return this.scene.scale.width / Math.max(1, this.laneCount)
  }

  private spawnLaneFloodWave(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const laneIndex = typeof params.laneIndex === 'number' ? Phaser.Math.Clamp(params.laneIndex, 0, Math.max(0, this.laneCount - 1)) : Math.floor(this.laneCount / 2)
    const width = params.width ?? this.getLaneWidth(laneIndex) * 0.85
    const height = params.height ?? 140
    const speedMul = descriptor.speedMultiplier ?? 0.5
    const speedY = this.scrollBase * speedMul
    const centerX = this.getLaneCenterX(laneIndex)
    const enemy = this.createEnemy({
      type: descriptor.enemyType,
      x: centerX,
      y: -height,
      velocityY: speedY,
      hpMultiplier: descriptor.hpMultiplier,
      waveId,
      pattern: { kind: 'lane_flood', laneIndex, width, height, speedY },
      scale: 1.6
    })
    const body = enemy.body as Phaser.Physics.Arcade.Body
    body.setSize(width, height, true)
    body.setOffset(enemy.width * 0.5 - width * 0.5, enemy.height * 0.5 - height * 0.5)
    body.updateFromGameObject()
    enemy.setData('flooderWidth', width)
    const floodRect = this.scene.add.rectangle(enemy.x, enemy.y, width, height, 0xff5d7a, 0.68)
      .setStrokeStyle(2, 0xff9fb2, 0.9)
      .setDepth(enemy.depth - 1)
    enemy.setData('flooderRect', floodRect)
    this.scene.tweens.add({
      targets: floodRect,
      alpha: { from: 0.68, to: 0.4 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, { x: centerX, y: -height }, { radius: width * 0.6 })
    }
    return [enemy]
  }

  private spawnLaneHopperDescriptor(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const laneA = typeof params.laneA === 'number' ? params.laneA : Math.floor(this.laneCount / 2)
    const laneB = typeof params.laneB === 'number' ? params.laneB : laneA + 1
    const hopEvery = params.hopEveryBeats ?? 1
    const speedMul = descriptor.speedMultiplier ?? 1
    if (!skipTelegraph && descriptor.telegraph) {
      const telegraphX = this.getLaneCenterX(Math.min(laneA, laneB))
      showTelegraph(this.scene, descriptor.telegraph, { x: telegraphX, y: -60 })
    }
    return this.spawnLaneHopper(
      descriptor.enemyType,
      laneA,
      laneB,
      speedMul,
      hopEvery,
      descriptor.hpMultiplier,
      waveId
    )
  }

  private spawnSineWaveDescriptor(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 4
    const amp = params.amplitude ?? 140
    const wavelength = params.wavelength ?? 360
    const speedMul = descriptor.speedMultiplier ?? 1
    const enemies = this.spawnSineWave(
      descriptor.enemyType,
      count,
      amp,
      wavelength,
      speedMul,
      descriptor.hpMultiplier,
      waveId
    )
    if (!skipTelegraph && descriptor.telegraph) {
      const first = enemies[0]
      if (first) {
        showTelegraph(this.scene, descriptor.telegraph, { x: first.x, y: first.y })
      }
    }
    return enemies
  }

  private spawnWeaverWave(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 4
    const amplitude = params.amplitude ?? 160
    const wavelength = params.wavelength ?? 420
    const speedMul = descriptor.speedMultiplier ?? 0.82
    const speedY = this.scrollBase * speedMul
    const angularVelocity = wavelength > 0 ? ((2 * Math.PI) * speedY) / wavelength : 0
    const margin = 70
    const width = this.scene.scale.width
    const spacing = width / (count + 1)
    const now = this.scene.time.now
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const anchorX = spacing * (i + 1)
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x: anchorX,
        y: -margin - i * 36,
        velocityY: speedY,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'weaver', anchorX, amplitude, angularVelocity, spawnTime: now, speedY }
      })
      enemy.setData('weaverBaseAmplitude', amplitude)
      enemy.setData('weaverBaseSpeedY', speedY)
      enemies.push(enemy)
    }
    if (!skipTelegraph && descriptor.telegraph) {
      const mid = enemies[Math.floor(enemies.length / 2)]
      if (mid) {
        showTelegraph(this.scene, descriptor.telegraph, { x: mid.x, y: mid.y }, { length: width * 0.6 })
      }
    }
    return enemies
  }

  private spawnVWaveDescriptor(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const size = descriptor.count ?? 5
    const spread = params.spread ?? 65
    const speedMul = descriptor.speedMultiplier ?? 1
    const enemies = this.spawnVFormation(
      descriptor.enemyType,
      size,
      spread,
      speedMul,
      descriptor.hpMultiplier,
      waveId
    )
    if (!skipTelegraph && descriptor.telegraph) {
      const center = enemies[Math.floor(enemies.length / 2)]
      if (center) {
        showTelegraph(this.scene, descriptor.telegraph, { x: center.x, y: center.y }, { length: spread * 4 })
      }
    }
    return enemies
  }

  private spawnFormationDancerWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = Phaser.Math.Clamp(descriptor.count ?? 4, 3, 5)
    const laneIndex = typeof params.laneIndex === 'number' ? params.laneIndex : Math.floor(this.laneCount / 2)
    const centerX = this.getLaneCenterX(laneIndex)
    const spacing = params.spacing ?? 80
    const speedMul = descriptor.speedMultiplier ?? 0.6
    const speedY = this.scrollBase * speedMul
    const offsets: number[] = []
    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2
      offsets[i] = offsetIndex * spacing
    }
    const enemies: Enemy[] = []
    const margin = 70
    const direction = typeof params.direction === 'number' && params.direction < 0 ? -1 : 1
    for (let i = 0; i < count; i++) {
      const x = centerX + offsets[i]
      const y = -margin - Math.abs(i - (count - 1) / 2) * 34
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y,
        velocityY: speedY,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'formation_dancer', centerX, offsets, speedY }
      })
      enemy.setData('formationIndex', i)
      enemy.setData('formationDirection', direction)
      enemies.push(enemy)
    }
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, { x: centerX, y: anchor.y }, { radius: spacing * count })
    }
    return enemies
  }

  private spawnMirrorerWave(
    descriptor: WaveDescriptor,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const laneIndex = typeof params.laneIndex === 'number' ? params.laneIndex : Math.floor(this.laneCount / 2)
    const centerX = this.getLaneCenterX(laneIndex)
    const count = descriptor.count ?? 3
    const spread = params.spread ?? 90
    const speedMul = descriptor.speedMultiplier ?? 0.72
    const speedY = this.scrollBase * speedMul
    const margin = 80
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x: centerX + offsetIndex * spread,
        y: -margin - Math.abs(offsetIndex) * 32,
        velocityY: speedY,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'mirrorer', speedY }
      })
      enemy.setData('mirrorerBaseSpeedY', speedY)
      enemies.push(enemy)
    }
    if (!skipTelegraph && descriptor.telegraph) {
      const left = centerX - spread * (count - 1) / 2
      showTelegraph(this.scene, descriptor.telegraph, { x: left, y: -60 }, { length: spread * (count - 1) })
    }
    return enemies
  }

  private spawnSwirlWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 6
    const radius = params.radius ?? 180
    const turns = params.turns ?? 2
    const duration = params.durationMs ?? 3600
    const omega = (Math.PI * 2 * turns) / Math.max(0.001, duration / 1000)
    const baseSpeed = this.scrollBase * (descriptor.speedMultiplier ?? 1) * 0.6
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, anchor, { radius })
    }
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1)
      const angle = t * Math.PI * 2 * turns
      const r = radius * t
      const x = anchor.x + Math.cos(angle) * r
      const y = anchor.y + Math.sin(angle) * r
      const tangential = omega * r
      const vx = -Math.sin(angle) * tangential
      const vy = Math.cos(angle) * tangential + baseSpeed
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y,
        velocityX: vx,
        velocityY: vy,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'spiral', anchorX: anchor.x, anchorY: anchor.y, angularVelocity: omega }
      })
      enemies.push(enemy)
    }
    return enemies
  }

  private spawnCircleWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 8
    const radius = params.radius ?? 200
    const spin = params.spinSpeed ?? 0.6
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, anchor, { radius })
    }
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const x = anchor.x + Math.cos(angle) * radius
      const y = anchor.y + Math.sin(angle) * radius
      const tangential = spin * radius
      const vx = -Math.sin(angle) * tangential
      const vy = Math.cos(angle) * tangential + this.scrollBase * (descriptor.speedMultiplier ?? 1) * 0.5
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y,
        velocityX: vx,
        velocityY: vy,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'circle', anchorX: anchor.x, anchorY: anchor.y, radius, angularVelocity: spin }
      })
      enemies.push(enemy)
    }
    return enemies
  }

  private spawnSpiralWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 6
    const radius = params.radius ?? 220
    const turns = params.turns ?? 3
    const duration = params.durationMs ?? 4200
    const omega = (Math.PI * 2 * turns) / Math.max(0.001, duration / 1000)
    const baseSpeed = this.scrollBase * (descriptor.speedMultiplier ?? 1) * 0.7
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, anchor, { radius })
    }
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1)
      const angle = t * Math.PI * 2 * turns
      const r = radius * t
      const x = anchor.x + Math.cos(angle) * r
      const y = anchor.y + Math.sin(angle) * r
      const vx = -Math.sin(angle) * omega * r
      const vy = Math.cos(angle) * omega * r + baseSpeed
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y,
        velocityX: vx,
        velocityY: vy,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'spiral', anchorX: anchor.x, anchorY: anchor.y, angularVelocity: omega }
      })
      enemies.push(enemy)
    }
    return enemies
  }

  private spawnSpiralDropWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const count = descriptor.count ?? 8
    const radius = params.radius ?? 240
    const turns = params.turns ?? 2.5
    const duration = params.durationMs ?? 4200
    const omega = (Math.PI * 2 * turns) / Math.max(0.001, duration / 1000)
    const dropSpeed = this.scrollBase * (descriptor.speedMultiplier ?? 1) * 0.9
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, anchor, { radius })
    }
    const enemies: Enemy[] = []
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1)
      const angle = t * Math.PI * 2 * turns
      const r = radius * (0.35 + 0.65 * t)
      const x = anchor.x + Math.cos(angle) * r
      const y = anchor.y + Math.sin(angle) * r - r * 0.4
      const vx = -Math.sin(angle) * omega * r
      const vy = Math.cos(angle) * omega * r + dropSpeed
      const enemy = this.createEnemy({
        type: descriptor.enemyType,
        x,
        y,
        velocityX: vx,
        velocityY: vy,
        hpMultiplier: descriptor.hpMultiplier,
        waveId,
        pattern: { kind: 'spiral_drop', anchorX: anchor.x, anchorY: anchor.y, angularVelocity: omega }
      })
      enemies.push(enemy)
    }
    return enemies
  }

  private spawnBurstWave(
    descriptor: WaveDescriptor,
    anchor: Phaser.Types.Math.Vector2Like,
    waveId: string,
    skipTelegraph: boolean
  ): Enemy[] {
    const params = descriptor.formationParams ?? {}
    const rings = params.ringCount ?? 1
    const coneDeg = params.coneDegrees ?? 180
    const cone = Phaser.Math.DegToRad(coneDeg)
    const count = descriptor.count ?? 6
    const baseSpeed = this.scrollBase * (descriptor.speedMultiplier ?? 1) * 0.75
    if (!skipTelegraph && descriptor.telegraph) {
      showTelegraph(this.scene, descriptor.telegraph, anchor, { radius: params.radius ?? 120 })
    }
    const enemies: Enemy[] = []
    for (let ring = 0; ring < rings; ring++) {
      const ringSpeed = baseSpeed * (1 + ring * 0.2)
      for (let i = 0; i < count; i++) {
        const angle = -cone / 2 + (cone / Math.max(1, count - 1)) * i
        const vx = Math.sin(angle) * ringSpeed
        const vy = Math.cos(angle) * ringSpeed
        const enemy = this.createEnemy({
          type: descriptor.enemyType,
          x: anchor.x,
          y: anchor.y,
          velocityX: vx,
          velocityY: vy,
          hpMultiplier: descriptor.hpMultiplier,
          waveId,
          pattern: { kind: 'burst', speedY: vy }
        })
        enemies.push(enemy)
      }
    }
    return enemies
  }

  spawnBoss(type: EnemyType = 'brute', options: { hp?: number; speedMultiplier?: number } = {}): Enemy {
    const { width } = this.scene.scale
    const speedY = this.scrollBase * (options.speedMultiplier ?? 0.6)
    return this.createEnemy({
      type,
      x: width / 2,
      y: -160,
      velocityY: speedY,
      pattern: { kind: 'boss', speedY },
      scale: 1.8,
      hpOverride: options.hp ?? 60,
      isBoss: true
    })
  }

  getGroup() {
    return this.group
  }

  getLaneCenterX(index: number): number {
    if (this.laneManager) {
      const clamped = Phaser.Math.Clamp(index, 0, this.laneManager.getCount() - 1)
      return this.laneManager.centerX(clamped)
    }
    const { width } = this.scene.scale
    const spacing = width / (this.laneCount + 1)
    const clamped = Phaser.Math.Clamp(index, 0, this.laneCount - 1)
    return spacing * (clamped + 1)
  }

  private createEnemy(config: SpawnConfig): Enemy {
    const placeholderFrame = this.getFrameForType(config.type)
    const sprite = this.group.get(config.x, config.y, 'gameplay', placeholderFrame) as Enemy
    sprite.setActive(true).setVisible(true)
    sprite.body.enable = true
    sprite.setData('etype', config.type)

    const healthBar = this.scene.add.graphics()
    sprite.setData('healthBar', healthBar)

    const balance = this.scene.registry.get('balance') as any
    const baseHpFromBalance = balance?.enemies?.[config.type]?.hp
    const fallbackBaseHp = config.type === 'brute'
      ? 6
      : config.type === 'dasher'
        ? 3
        : config.type === 'exploder'
          ? 3
          : config.type === 'weaver'
            ? 2
            : config.type === 'mirrorer'
              ? 4
              : config.type === 'formation'
                ? 5
                : config.type === 'teleporter'
                  ? 3
                  : config.type === 'flooder'
                    ? 6
                    : 1
    const baseHp = typeof baseHpFromBalance === 'number' && Number.isFinite(baseHpFromBalance)
      ? baseHpFromBalance
      : fallbackBaseHp
    let rawHp = typeof config.hpOverride === 'number' && Number.isFinite(config.hpOverride)
      ? config.hpOverride
      : baseHp
    if (config.type === 'dasher' && !config.isBoss) {
      rawHp = Math.max(1, Math.round(rawHp * 0.85))
    }
    const perWaveMul = typeof config.hpMultiplier === 'number' && Number.isFinite(config.hpMultiplier) ? config.hpMultiplier : 1
    const multiplier = (config.isBoss ? this.bossHpMultiplier : this.hpMultiplier) * perWaveMul
    const hp = Math.max(1, Math.round(rawHp * multiplier))
    sprite.setData('hp', hp)
    sprite.setData('maxHp', hp)

    const style = enemyStyles[config.type]
    const radius = style.bodyRadius
    const offsetX = (sprite.width - radius * 2) * 0.5
    const offsetY = (sprite.height - radius * 2) * 0.5
    sprite.body.setCircle(radius, offsetX, offsetY)
    sprite.setScale(config.scale ?? 1)

    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    const baseVyMul = config.type === 'exploder'
      ? 0.45
      : config.type === 'weaver'
        ? 0.7
        : config.type === 'mirrorer'
          ? 0.6
          : config.type === 'formation'
            ? 0.5
            : config.type === 'teleporter'
              ? 0.75
              : config.type === 'flooder'
                ? 0.35
                : 0.75
    const defaultVy = config.velocityY ?? this.scrollBase * baseVyMul
    body.setVelocity(config.velocityX ?? 0, defaultVy)
    if (config.type === 'exploder') {
      body.setDrag(36, 0)
    }

    const uid = Phaser.Utils.String.UUID()
    sprite.setData('eid', uid)
    const pattern = config.pattern ?? null
    sprite.setData('pattern', pattern)
    sprite.setData('isBoss', config.isBoss ?? false)
    sprite.setData('waveId', config.waveId ?? null)
    if (pattern && pattern.kind === 'lane_hopper') {
      sprite.setData('laneHopCurrent', pattern.laneA)
      sprite.setData('laneHopBeatCount', 0)
      sprite.setData('laneHopTween', null)
    }
    if (config.type === 'exploder') {
      sprite.setData('exploderCountdownBeats', 3)
      sprite.setData('exploderRadius', 150)
      sprite.setData('exploderArmed', true)
    }
    if (config.type === 'teleporter') {
      sprite.setData('teleporterLane', 0)
      sprite.setData('teleporterBlinking', false)
    }
    if (config.type === 'flooder') {
      sprite.setScale(1.2, 1.6)
      sprite.setData('flooderWidth', 120)
    }
    const skin = new CubeSkin(this.scene, sprite, style)
    sprite.setData('skin', skin)
    sprite.setData('pulseScale', style.pulseScale)
    if (config.tint !== undefined) sprite.setTint(config.tint)
    return sprite
  }

  private getFrameForType(type: EnemyType) {
    if (type === 'brute') return 'enemy_brute_0'
    if (type === 'dasher') return 'enemy_dasher_0'
    if (type === 'exploder') return 'enemy_brute_0'
    if (type === 'weaver') return 'enemy_dasher_0'
    if (type === 'formation') return 'enemy_brute_0'
    if (type === 'mirrorer') return 'enemy_dasher_0'
    return 'enemy_swarm_0'
  }

  private randomOffscreen() {
    const { width, height } = this.scene.scale
    const edge = Phaser.Math.Between(0, 3)
    const margin = 40
    if (edge === 0) return { x: Phaser.Math.Between(0, width), y: -margin }
    if (edge === 1) return { x: width + margin, y: Phaser.Math.Between(0, height) }
    if (edge === 2) return { x: Phaser.Math.Between(0, width), y: height + margin }
    return { x: -margin, y: Phaser.Math.Between(0, height) }
  }
}
