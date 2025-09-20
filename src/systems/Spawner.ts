import Phaser from 'phaser'
import CubeSkin from '../systems/CubeSkin'
import { enemyStyles, EnemyType } from '../config/enemyStyles'

export type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

export type PatternData =
  | { kind: 'lane'; anchorX: number; speedY: number }
  | { kind: 'sine'; anchorX: number; amplitude: number; angularVelocity: number; spawnTime: number; speedY: number }
  | { kind: 'drift'; velocityX: number; speedY: number }
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
  tint?: number
  isBoss?: boolean
}

export default class Spawner {
  private scene: Phaser.Scene
  private group: Phaser.Physics.Arcade.Group
  private scrollBase = 220
  private laneCount = 6
  private hpMultiplier = 1
  private bossHpMultiplier = 1

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
    if (typeof config.laneCount === 'number' && config.laneCount >= 3) this.laneCount = Math.floor(config.laneCount)
  }

  spawn(type: EnemyType, count = 1) {
    for (let i = 0; i < count; i++) {
      const { x, y } = this.randomOffscreen()
      const angle = Phaser.Math.Angle.Between(x, y, this.scene.scale.width / 2, this.scene.scale.height / 2)
      const speed = (type === 'swarm' ? 110 : type === 'dasher' ? 130 : 80) * 0.5
      this.createEnemy({
        type,
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed
      })
    }
  }

  spawnVerticalLane(type: EnemyType, laneIndex: number, count = 1, speedMultiplier = 1) {
    const { width } = this.scene.scale
    const spacing = width / (this.laneCount + 1)
    const anchorX = spacing * (laneIndex + 1)
    const margin = 60
    const speedY = this.scrollBase * speedMultiplier
    for (let i = 0; i < count; i++) {
      this.createEnemy({
        type,
        x: anchorX,
        y: -margin - i * 48,
        velocityY: speedY,
        pattern: { kind: 'lane', anchorX, speedY }
      })
    }
  }

  spawnSineWave(type: EnemyType, count: number, amplitudePx: number, wavelengthPx: number, speedMultiplier = 1) {
    const { width } = this.scene.scale
    const margin = 70
    const speedY = this.scrollBase * speedMultiplier
    const angularVelocity = wavelengthPx > 0 ? ((2 * Math.PI) * speedY) / wavelengthPx : 0
    const spacing = width / (count + 1)
    const now = this.scene.time.now
    for (let i = 0; i < count; i++) {
      const anchorX = spacing * (i + 1)
      this.createEnemy({
        type,
        x: anchorX,
        y: -margin - i * 36,
        velocityY: speedY,
        pattern: { kind: 'sine', anchorX, amplitude: amplitudePx, angularVelocity, spawnTime: now, speedY }
      })
    }
  }

  spawnVFormation(type: EnemyType, size: number, spreadPx: number, speedMultiplier = 1) {
    const centerX = this.scene.scale.width / 2
    const margin = 80
    const speedY = this.scrollBase * speedMultiplier
    for (let i = 0; i < size; i++) {
      const offsetIndex = i - (size - 1) / 2
      const offset = offsetIndex * spreadPx
      const velocityX = offsetIndex * 10
      this.createEnemy({
        type,
        x: centerX + offset,
        y: -margin - Math.abs(offsetIndex) * 40,
        velocityX,
        velocityY: speedY,
        pattern: { kind: 'drift', velocityX, speedY }
      })
    }
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

  private createEnemy(config: SpawnConfig): Enemy {
    const placeholderFrame = this.getFrameForType(config.type)
    const sprite = this.group.get(config.x, config.y, 'gameplay', placeholderFrame) as Enemy
    sprite.setActive(true).setVisible(true)
    sprite.body.enable = true
    sprite.setData('etype', config.type)

    const healthBar = this.scene.add.graphics()
    sprite.setData('healthBar', healthBar)

    const balance = this.scene.registry.get('balance') as any
    const baseHp = balance?.enemies?.[config.type]?.hp ?? (config.type === 'brute' ? 6 : config.type === 'dasher' ? 3 : 1)
    let rawHp = config.hpOverride ?? baseHp
    if (config.type === 'dasher' && !config.isBoss) rawHp = Math.max(1, Math.round(rawHp * 0.85))
    const multiplier = config.isBoss ? this.bossHpMultiplier : this.hpMultiplier
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
    body.setVelocity(config.velocityX ?? 0, config.velocityY ?? this.scrollBase * 0.75)

    const uid = Phaser.Utils.String.UUID()
    sprite.setData('eid', uid)
    sprite.setData('pattern', config.pattern ?? null)
    sprite.setData('isBoss', config.isBoss ?? false)
    const skin = new CubeSkin(this.scene, sprite, style)
    sprite.setData('skin', skin)
    sprite.setData('pulseScale', style.pulseScale)
    if (config.tint !== undefined) sprite.setTint(config.tint)
    return sprite
  }

  private getFrameForType(type: EnemyType) {
    if (type === 'brute') return 'enemy_brute_0'
    if (type === 'dasher') return 'enemy_dasher_0'
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
