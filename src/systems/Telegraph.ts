import Phaser from 'phaser'
import { TelegraphDescriptor } from '../types/waves'
import type LaneManager from './LaneManager'

type TelegraphHandle = {
  destroy: () => void
}

type LaneSnapshot = ReturnType<LaneManager['getSnapshot']>

const TELEGRAPH_COLORS: Record<TelegraphDescriptor['type'], number> = {
  zone: 0x3cf2ff,
  line: 0xff5db1,
  circle: 0x8cff6d
}

type RunwayNode = {
  intensity: number
  leftCore: Phaser.GameObjects.Image
  rightCore: Phaser.GameObjects.Image
  leftGlow: Phaser.GameObjects.Image
  rightGlow: Phaser.GameObjects.Image
}

type LaneRunway = {
  laneIndex: number
  nodes: RunwayNode[]
  activeIndex: number
}

function getLaneSnapshot(scene: Phaser.Scene): LaneSnapshot | undefined {
  const snapshot = scene.registry?.get?.('laneSnapshot') as LaneSnapshot | undefined
  if (!snapshot || !Array.isArray(snapshot.lanes) || snapshot.lanes.length === 0) return undefined
  return snapshot
}

function computeBorderPositions(snapshot: LaneSnapshot): number[] {
  const { lanes, left, width } = snapshot
  if (lanes.length === 0) return []
  const centers = lanes.map((lane) => lane.centerX)
  const step = centers.length > 1 ? centers[1] - centers[0] : width / Math.max(snapshot.count, 1)
  const estimateStep = step || width / Math.max(snapshot.count + 1, 1)
  const firstCenter = centers[0]
  const lastCenter = centers[centers.length - 1]
  const leftEdge = firstCenter - estimateStep * 0.5
  const rightEdge = lastCenter + estimateStep * 0.5

  const positions: number[] = [leftEdge]
  for (let i = 0; i < centers.length - 1; i++) {
    positions.push((centers[i] + centers[i + 1]) * 0.5)
  }
  positions.push(rightEdge)

  return positions.map((pos) => Phaser.Math.Clamp(pos, left, left + width))
}

function resolveLaneIndex(snapshot: LaneSnapshot, x: number): number | null {
  let best: { index: number; distance: number } | null = null
  for (const lane of snapshot.lanes) {
    const distance = Math.abs(lane.centerX - x)
    if (!best || distance < best.distance) {
      best = { index: lane.index, distance }
    }
  }
  return best ? best.index : null
}

function dedupeLaneIndices(indices: number[]): number[] {
  const seen = new Set<number>()
  const ordered: number[] = []
  for (const idx of indices) {
    if (!seen.has(idx)) {
      seen.add(idx)
      ordered.push(idx)
    }
  }
  return ordered
}

class LaneRunwayEffect {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private lanes: LaneRunway[] = []
  private readonly baseAlpha = 0.14
  private readonly highlightAlpha = 0.92
  private readonly baseScale = 0.38
  private readonly highlightScale = 0.9
  private readonly glowScaleMultiplier = 1.9
  private readonly tailIntensity = 0.35
  private readonly rng = new Phaser.Math.RandomDataGenerator([Date.now().toString()])

  private beatHandler: () => void = () => {}
  private updateHandler: (time: number, delta: number) => void = () => {}
  private fadeTimer?: Phaser.Time.TimerEvent
  private destroyTimer?: Phaser.Time.TimerEvent
  private fadeTween?: Phaser.Tweens.Tween
  private destroyed = false

  constructor(
    scene: Phaser.Scene,
    snapshot: LaneSnapshot,
    laneIndices: number[],
    duration: number
  ) {
    this.scene = scene
    this.container = scene.add.container(0, 0)
      .setDepth(520)
      .setScrollFactor(0)
      .setAlpha(0)

    this.buildLanes(snapshot, laneIndices)

    if (this.lanes.length === 0) {
      this.container.destroy()
      this.destroyed = true
      return
    }

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 140,
      ease: 'Sine.easeOut'
    })

    this.beatHandler = () => this.advance()
    this.updateHandler = (_time: number, delta: number) => this.update(delta)

    this.scene.events.on('beat:low', this.beatHandler)
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateHandler)

    if (duration > 0) {
      const fadeDelay = Math.max(0, duration - 200)
      this.fadeTimer = this.scene.time.delayedCall(fadeDelay, () => this.fadeOut(220))
      const cleanupDelay = duration + 320
      this.destroyTimer = this.scene.time.delayedCall(cleanupDelay, () => this.destroy())
    }
  }

  isAlive(): boolean {
    return !this.destroyed
  }

  private buildLanes(snapshot: LaneSnapshot, laneIndices: number[]) {
    const borders = computeBorderPositions(snapshot)
    const height = Math.max(1, this.scene.scale.height)
    const targetCount = Phaser.Math.Clamp(Math.round(height / 36), 18, 32)
    const nodeCount = Math.max(4, targetCount)
    const denom = Math.max(1, nodeCount - 1)

    for (const rawIndex of laneIndices) {
      const lane = snapshot.lanes.find((l) => l.index === rawIndex)
      if (!lane) continue
      const leftX = borders[rawIndex] ?? lane.centerX - this.estimateHalfWidth(snapshot)
      const rightX = borders[rawIndex + 1] ?? lane.centerX + this.estimateHalfWidth(snapshot)
      const nodes: RunwayNode[] = []
      for (let i = 0; i < nodeCount; i++) {
        const y = nodeCount === 1 ? height * 0.5 : (i / denom) * height
        const node = this.createNode(leftX, rightX, y)
        nodes.push(node)
      }
      this.lanes.push({ laneIndex: rawIndex, nodes, activeIndex: this.rng.between(0, nodeCount - 1) })
    }
  }

  private estimateHalfWidth(snapshot: LaneSnapshot): number {
    if (snapshot.lanes.length <= 1) return snapshot.width / 4
    const centers = snapshot.lanes.map((lane) => lane.centerX)
    const diffs = centers.slice(1).map((c, i) => Math.abs(c - centers[i]))
    const avg = diffs.reduce((sum, val) => sum + val, 0) / Math.max(diffs.length, 1)
    return avg * 0.5
  }

  private createNode(leftX: number, rightX: number, y: number): RunwayNode {
    const leftGlow = this.scene.add.image(leftX, y, 'particles', 'particle_glow_small')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
    const leftCore = this.scene.add.image(leftX, y, 'particles', 'particle_circle_small')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
    const rightGlow = this.scene.add.image(rightX, y, 'particles', 'particle_glow_small')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
    const rightCore = this.scene.add.image(rightX, y, 'particles', 'particle_circle_small')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)

    this.container.add([leftGlow, leftCore, rightGlow, rightCore])

    const node: RunwayNode = {
      intensity: this.rng.realInRange(0.02, 0.18),
      leftCore,
      rightCore,
      leftGlow,
      rightGlow
    }
    this.applyNode(node)
    return node
  }

  private advance() {
    for (const lane of this.lanes) {
      if (lane.nodes.length === 0) continue
      lane.activeIndex = Phaser.Math.Wrap(lane.activeIndex + 1, 0, lane.nodes.length)
      const active = lane.nodes[lane.activeIndex]
      active.intensity = 1
      this.applyNode(active)
      if (lane.nodes.length > 1) {
        const prevIndex = Phaser.Math.Wrap(lane.activeIndex - 1, 0, lane.nodes.length)
        const prev = lane.nodes[prevIndex]
        prev.intensity = Math.max(prev.intensity, this.tailIntensity)
        this.applyNode(prev)
      }
    }
  }

  private update(delta: number) {
    const decay = Math.min(delta / 260, 1)
    for (const lane of this.lanes) {
      for (const node of lane.nodes) {
        const before = node.intensity
        if (before <= 0) continue
        node.intensity = Phaser.Math.Linear(node.intensity, 0, decay)
        if (Math.abs(before - node.intensity) > 0.0001) {
          this.applyNode(node)
        }
      }
    }
  }

  private applyNode(node: RunwayNode) {
    const clamped = Phaser.Math.Clamp(node.intensity, 0, 1)
    const alpha = Phaser.Math.Linear(this.baseAlpha, this.highlightAlpha, clamped)
    const scale = Phaser.Math.Linear(this.baseScale, this.highlightScale, clamped)
    const glowScale = scale * this.glowScaleMultiplier

    node.leftCore.setAlpha(alpha).setScale(scale)
    node.rightCore.setAlpha(alpha).setScale(scale)
    node.leftGlow.setAlpha(alpha * 0.6).setScale(glowScale)
    node.rightGlow.setAlpha(alpha * 0.6).setScale(glowScale)
  }

  fadeOut(duration = 200) {
    if (this.destroyed) return
    this.fadeTween?.remove()
    this.fadeTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      ease: 'Sine.easeInOut',
      duration
    })
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.scene.events.off('beat:low', this.beatHandler)
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.updateHandler)
    this.fadeTimer?.remove(false)
    this.destroyTimer?.remove(false)
    this.fadeTween?.remove()
    this.container.destroy(true)
  }
}

function createLaneRunway(
  scene: Phaser.Scene,
  descriptor: TelegraphDescriptor,
  position: Phaser.Types.Math.Vector2Like,
  options: { laneIndices?: number[]; radius?: number }
): LaneRunwayEffect | null {
  const snapshot = getLaneSnapshot(scene)
  if (!snapshot) return null
  const laneIndices = options.laneIndices && options.laneIndices.length > 0
    ? dedupeLaneIndices(options.laneIndices)
    : inferLaneIndices(snapshot, position, options.radius)
  if (laneIndices.length === 0) return null
  const effect = new LaneRunwayEffect(scene, snapshot, laneIndices, descriptor.durationMs)
  return effect.isAlive() ? effect : null
}

function inferLaneIndices(
  snapshot: LaneSnapshot,
  position: Phaser.Types.Math.Vector2Like,
  radius?: number
): number[] {
  if (typeof radius === 'number' && radius > 1) {
    const hits = snapshot.lanes
      .filter((lane) => Math.abs(lane.centerX - position.x) <= radius)
      .map((lane) => lane.index)
    if (hits.length > 0) return hits
  }
  const idx = resolveLaneIndex(snapshot, position.x)
  return idx === null ? [] : [idx]
}

export function showTelegraph(
  scene: Phaser.Scene,
  descriptor: TelegraphDescriptor,
  position: Phaser.Types.Math.Vector2Like,
  options: { radius?: number; angle?: number; length?: number; laneIndices?: number[] } = {}
): TelegraphHandle {
  const graphics = scene.add.graphics({ x: 0, y: 0 }).setDepth(500)
  graphics.setScrollFactor(0)
  const color = TELEGRAPH_COLORS[descriptor.type]
  const duration = descriptor.durationMs
  const alpha = descriptor.intensity ?? 0.35
  const reducedMotion = scene.registry?.get?.('reducedMotion') === true

  graphics.lineStyle(2, color, alpha * 1.5)
  graphics.fillStyle(color, alpha * 0.4)

  switch (descriptor.type) {
    case 'zone': {
      const radius = options.radius ?? 160
      graphics.fillCircle(position.x, position.y, radius)
      graphics.strokeCircle(position.x, position.y, radius)
      break
    }
    case 'circle': {
      const radius = options.radius ?? 180
      graphics.strokeCircle(position.x, position.y, radius)
      break
    }
    case 'line': {
      const angle = options.angle ?? -Math.PI / 2
      const length = options.length ?? 480
      const half = length / 2
      const x1 = position.x - Math.cos(angle) * half
      const y1 = position.y - Math.sin(angle) * half
      const x2 = position.x + Math.cos(angle) * half
      const y2 = position.y + Math.sin(angle) * half
      graphics.lineBetween(x1, y1, x2, y2)
      break
    }
    default:
      break
  }

  const inferredRadius = options.radius ?? (typeof options.length === 'number' ? Math.abs(options.length) * 0.25 : undefined)
  const runway = reducedMotion
    ? null
    : createLaneRunway(scene, descriptor, position, { laneIndices: options.laneIndices, radius: inferredRadius })

  if (reducedMotion) {
    graphics.setAlpha(Math.min(1, alpha + 0.15))
    scene.time.delayedCall(duration, () => graphics.destroy())
  } else {
    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      ease: 'Sine.easeInOut',
      duration,
      onComplete: () => graphics.destroy()
    })
  }

  return {
    destroy: () => {
      graphics.destroy()
      runway?.destroy()
    }
  }
}
