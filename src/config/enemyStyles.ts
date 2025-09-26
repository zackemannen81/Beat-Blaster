import { CubeSkinOptions } from '../systems/CubeSkin'

export type EnemyType =
  | 'brute'
  | 'dasher'
  | 'swarm'
  | 'exploder'
  | 'weaver'
  | 'formation'
  | 'mirrorer'
  | 'teleporter'
  | 'flooder'

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
    rotationDuration: 5200,
    design: 'cube'
  },
  dasher: {
    variant: 'wire',
    size: 32,
    bodyRadius: 24,
    primaryColor: 0x63f7ff,
    secondaryColor: 0x0b1a3d,
    glowColor: 0x1ac8ff,
    pulseScale: 0.1,
    pulseDuration: 160,
    rotationDuration: 3200,
    design: 'diamond'
  },
  swarm: {
    variant: 'plasma',
    size: 26,
    bodyRadius: 20,
    primaryColor: 0xa880ff,
    secondaryColor: 0x1b0733,
    glowColor: 0xb57aff,
    pulseScale: 0.08,
    pulseDuration: 140,
    rotationDuration: 4000,
    design: 'triangle'
  },
  exploder: {
    variant: 'solid',
    size: 48,
    bodyRadius: 30,
    primaryColor: 0xffc857,
    secondaryColor: 0x2b0d0d,
    glowColor: 0xff9248,
    pulseScale: 0.18,
    pulseDuration: 320,
    rotationDuration: 2800,
    design: 'hex'
  },
  weaver: {
    variant: 'wire',
    size: 34,
    bodyRadius: 24,
    primaryColor: 0x5ad1ff,
    secondaryColor: 0x07233c,
    glowColor: 0xb4f0ff,
    pulseScale: 0.12,
    pulseDuration: 220,
    rotationDuration: 3600,
    design: 'triangle'
  },
  formation: {
    variant: 'solid',
    size: 36,
    bodyRadius: 24,
    primaryColor: 0xff7cbb,
    secondaryColor: 0x2a0d36,
    glowColor: 0xffb0e9,
    pulseScale: 0.1,
    pulseDuration: 260,
    rotationDuration: 3000,
    design: 'hex'
  },
  mirrorer: {
    variant: 'wire',
    size: 30,
    bodyRadius: 22,
    primaryColor: 0x9bf855,
    secondaryColor: 0x14310a,
    glowColor: 0xccff8f,
    pulseScale: 0.14,
    pulseDuration: 200,
    rotationDuration: 3400,
    design: 'diamond'
  },
  teleporter: {
    variant: 'plasma',
    size: 32,
    bodyRadius: 20,
    primaryColor: 0x7a8bff,
    secondaryColor: 0x0d133b,
    glowColor: 0xc7d2ff,
    pulseScale: 0.2,
    pulseDuration: 180,
    rotationDuration: 2600,
    design: 'ring'
  },
  flooder: {
    variant: 'solid',
    size: 80,
    bodyRadius: 36,
    primaryColor: 0xff5d7a,
    secondaryColor: 0x2f0810,
    glowColor: 0xff9fb2,
    pulseScale: 0.12,
    pulseDuration: 300,
    rotationDuration: 0,
    design: 'bar'
  }
}
