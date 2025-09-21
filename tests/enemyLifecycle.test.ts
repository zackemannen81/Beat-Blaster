import { describe, it, expect } from 'vitest'
import EnemyLifecycle from '../src/systems/EnemyLifecycle'
import type Spawner from '../src/systems/Spawner'
import type WaveDirector from '../src/systems/WaveDirector'

function createStubEnemy(x: number, y: number) {
  const data = new Map<string, unknown>()
  return {
    x,
    y,
    active: true,
    body: {
      velocity: { x: 0, y: 0 }
    },
    getData(key: string) {
      return data.get(key)
    },
    setData(key: string, value: unknown) {
      data.set(key, value)
      return this
    }
  } as any
}

describe('EnemyLifecycle', () => {
  it('expires enemies that leave the screen', () => {
    const scene: any = { time: { now: 0 }, scale: { width: 800, height: 600 } }
    const spawner = { getGroup: () => ({ countActive: () => 1, children: { each: () => {} } }) } as unknown as Spawner
    const waveDirector = {} as WaveDirector

    const expired: Array<{ cause: string }> = []
    const lifecycle = new EnemyLifecycle({
      scene,
      spawner,
      waveDirector,
      boundsProvider: () => ({ width: 800, height: 600, gameplayMode: 'vertical' }),
      onExpire: (_enemy, cause) => {
        expired.push({ cause })
      }
    })

    const enemy = createStubEnemy(400, 900)
    lifecycle.registerSpawn([enemy])
    scene.time.now = 1000
    lifecycle.update(scene.time.now)

    expect(expired.length).toBe(1)
    expect(expired[0].cause).toBe('miss')
  })
})
