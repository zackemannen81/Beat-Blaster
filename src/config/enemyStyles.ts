import { CubeSkinOptions } from '../systems/CubeSkin'

export type EnemyType = 'brute' | 'dasher' | 'swarm'

export interface EnemyStyle extends CubeSkinOptions {
  /** Collision radius for physics body */
  bodyRadius: number
  /** Pulse amplitude multiplier */
  pulseScale: number
}

export const enemyStyles: Record<EnemyType, EnemyStyle> = {
  brute: {
    variant: 'solid',
    size: 42,
    bodyRadius: 26,
    primaryColor: 0xff4d9d,
    secondaryColor: 0x21052d,
    glowColor: 0xff80ea,
    pulseScale: 0.14,
    pulseDuration: 200,
    rotationDuration: 5200
  },
  dasher: {
    variant: 'wire',
    size: 32,
    bodyRadius: 20,
    primaryColor: 0x63f7ff,
    secondaryColor: 0x0b1a3d,
    glowColor: 0x1ac8ff,
    pulseScale: 0.1,
    pulseDuration: 160,
    rotationDuration: 3200
  },
  swarm: {
    variant: 'plasma',
    size: 26,
    bodyRadius: 16,
    primaryColor: 0xa880ff,
    secondaryColor: 0x1b0733,
    glowColor: 0xb57aff,
    pulseScale: 0.08,
    pulseDuration: 140,
    rotationDuration: 4000
  }
}
