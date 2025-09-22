import Phaser from 'phaser'
import LaneManager from './LaneManager'

/**
 * integrateLaneManager
 *
 * This helper wires a LaneManager instance into a Phaser scene.  It builds
 * the lanes when the scene is created, rebuilds them on resize events,
 * and re‑snaps the player and any active enemies when the lane layout
 * changes.  Drop this into your GameScene and call it during
 * `create()` once you know how many lanes you need.  It exposes the
 * LaneManager instance on `scene.laneManager` for later use.
 *
 * Example usage in GameScene.create():
 *
 *   import integrateLaneManager from '../systems/LaneIntegration'
 *   ...
 *   this.verticalLaneCount = this.difficultyProfile.laneCount
 *   integrateLaneManager(this, this.verticalLaneCount)
 *
 * NOTE: This helper assumes your scene defines `player` and
 * `enemyLifecycle` properties.  Modify the resnap logic if your
 * project uses different property names.
 */
export default function integrateLaneManager(
  scene: Phaser.Scene & { player?: any; enemyLifecycle?: any },
  laneCount: number,
  left?: number,
  width?: number
) {
  const laneManager = new LaneManager(scene)
  // initial build
  laneManager.build(laneCount, left, width)

  // expose laneManager on the scene for later use
  ;(scene as any).laneManager = laneManager

  // rebuild lanes on resize
  scene.scale.on(Phaser.Scale.Events.RESIZE, () => {
    laneManager.build(laneCount, left, width)
  })

  // re‑snap player and enemies when lanes change
  scene.events.on('lanes:changed', () => {
    // resnap the player
    if (scene.player && scene.player.x != null) {
      const px = scene.player.x
      scene.player.x = laneManager.snap(px)
    }
    // resnap all active enemies if an enemyLifecycle is present
    const el = scene.enemyLifecycle as any
    if (el && typeof el.getActiveEnemies === 'function') {
      const enemies: any[] = el.getActiveEnemies()
      enemies?.forEach((enemy) => {
        if (enemy && enemy.x != null) {
          enemy.x = laneManager.snap(enemy.x)
        }
      })
    }
  })

  return laneManager
}