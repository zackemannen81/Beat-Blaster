import { describe, it, expect, vi } from 'vitest'
import WaveDirector from '../src/systems/WaveDirector'
import type { WavePlaylist, WaveDescriptor } from '../src/types/waves'

class StubScene {
  time = { now: 0 }
  scale = { width: 800, height: 600 }
  sound = { play: vi.fn() }
  events = { emit: vi.fn() }
}

describe('WaveDirector', () => {
  it('schedules waves on beats and triggers fallback when silent', () => {
    const scene = new StubScene()
    const spawnWave = vi.fn(() => [])
    const spawner = { spawnWave } as any

    const playlist: WavePlaylist = {
      id: 'test',
      waves: [
        { id: 'w1', formation: 'lane', enemyType: 'swarm' } as WaveDescriptor
      ]
    }

    const fallback: WaveDescriptor = {
      id: 'fallback_test',
      formation: 'lane',
      enemyType: 'swarm'
    }

    const director = new WaveDirector(scene as any, spawner, {
      profileId: 'normal',
      playlist,
      fallbackDescriptor: fallback,
      defaultDelayMs: 0,
      fallbackCooldownMs: 500,
      maxQueuedWaves: 2,
      logEvents: false
    })

    director.enqueueBeat('mid')
    director.update()
    expect(spawnWave).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1' }), expect.any(Object), expect.any(Object))
    spawnWave.mockClear()

    scene.time.now = 600
    director.update()
    expect(spawnWave).toHaveBeenCalledWith(expect.objectContaining({ id: 'fallback_test' }), expect.any(Object), expect.any(Object))
  })
})
