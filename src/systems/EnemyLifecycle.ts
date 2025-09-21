import Phaser from 'phaser'
import Spawner, { Enemy } from './Spawner'
import WaveDirector from './WaveDirector'
import { GameplayMode } from './Options'

type EnemyLifecycleOptions = {
  scene: Phaser.Scene
  spawner: Spawner
  waveDirector: WaveDirector
  boundsProvider: () => { width: number; height: number; gameplayMode: GameplayMode }
  onExpire: (enemy: Enemy, cause: 'miss' | 'timeout' | 'cull') => void
  timeoutMs?: number
}

export default class EnemyLifecycle {
  private scene: Phaser.Scene
  private spawner: Spawner
  private waveDirector: WaveDirector
  private boundsProvider: EnemyLifecycleOptions['boundsProvider']
  private onExpire: EnemyLifecycleOptions['onExpire']
  private timeoutMs: number
  private activeEnemies = new Map<string, Enemy>()
  private spawnTimes = new Map<string, number>()

  constructor(options: EnemyLifecycleOptions) {
    this.scene = options.scene
    this.spawner = options.spawner
    this.waveDirector = options.waveDirector
    this.boundsProvider = options.boundsProvider
    this.onExpire = options.onExpire
    this.timeoutMs = options.timeoutMs ?? 20000
  }

  registerSpawn(enemies: Enemy[]) {
    const now = this.scene.time.now
    for (const enemy of enemies) {
      if (!enemy) continue
      const id = (enemy.getData('eid') as string) ?? Phaser.Utils.String.UUID()
      enemy.setData('eid', id)
      this.activeEnemies.set(id, enemy)
      this.spawnTimes.set(id, now)
    }
  }

  notifyRemoved(enemy: Enemy) {
    const id = enemy.getData('eid') as string | undefined
    if (!id) return
    this.activeEnemies.delete(id)
    this.spawnTimes.delete(id)
  }

  update(now: number) {
    if (this.activeEnemies.size === 0) return
    const { width, height, gameplayMode } = this.boundsProvider()
    const margin = 140

    for (const [id, enemy] of Array.from(this.activeEnemies.entries())) {
      if (!enemy.active) {
        this.activeEnemies.delete(id)
        this.spawnTimes.delete(id)
        continue
      }

      const body = enemy.body as Phaser.Physics.Arcade.Body | null
      if (!body) continue

      const spawnAt = this.spawnTimes.get(id) ?? now
      if (now - spawnAt > this.timeoutMs) {
        this.expire(enemy, 'timeout')
        continue
      }

      const outOfBounds = this.isOutOfBounds(enemy, gameplayMode, width, height, margin)
      if (outOfBounds) {
        this.expire(enemy, outOfBounds)
      }
    }

    const actualActive = this.spawner.getGroup().countActive(true)
    if (actualActive !== this.activeEnemies.size) {
      this.resyncActiveSet()
    }
  }

  private expire(enemy: Enemy, cause: 'miss' | 'timeout' | 'cull') {
    this.notifyRemoved(enemy)
    this.onExpire(enemy, cause)
  }

  private isOutOfBounds(
    enemy: Enemy,
    mode: GameplayMode,
    width: number,
    height: number,
    margin: number
  ): false | 'miss' | 'cull' {
    const x = enemy.x
    const y = enemy.y

    if (mode === 'vertical') {
      if (y > height + margin) return 'miss'
      if (y < -margin) return 'cull'
      if (x < -margin || x > width + margin) return 'cull'
      return false
    }

    if (x < -margin || x > width + margin || y < -margin || y > height + margin) {
      return 'cull'
    }

    return false
  }

  private resyncActiveSet() {
    this.activeEnemies.clear()
    const now = this.scene.time.now
    this.spawner
      .getGroup()
      .children.each((obj: Phaser.GameObjects.GameObject) => {
        const enemy = obj as Enemy
        if (!enemy.active) return true
        const id = (enemy.getData('eid') as string) ?? Phaser.Utils.String.UUID()
        enemy.setData('eid', id)
        this.activeEnemies.set(id, enemy)
        if (!this.spawnTimes.has(id)) this.spawnTimes.set(id, now)
        return true
      })
  }
}
