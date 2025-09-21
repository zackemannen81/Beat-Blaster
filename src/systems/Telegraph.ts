import Phaser from 'phaser'
import { TelegraphDescriptor } from '../types/waves'

type TelegraphHandle = {
  destroy: () => void
}

const TELEGRAPH_COLORS: Record<TelegraphDescriptor['type'], number> = {
  zone: 0x3cf2ff,
  line: 0xff5db1,
  circle: 0x8cff6d
}

export function showTelegraph(
  scene: Phaser.Scene,
  descriptor: TelegraphDescriptor,
  position: Phaser.Types.Math.Vector2Like,
  options: { radius?: number; angle?: number; length?: number } = {}
): TelegraphHandle {
  const graphics = scene.add.graphics({ x: 0, y: 0 }).setDepth(500)
  const color = TELEGRAPH_COLORS[descriptor.type]
  const duration = descriptor.durationMs
  const alpha = descriptor.intensity ?? 0.35

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

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    ease: 'Sine.easeInOut',
    duration,
    onComplete: () => graphics.destroy()
  })

  return {
    destroy: () => graphics.destroy()
  }
}
