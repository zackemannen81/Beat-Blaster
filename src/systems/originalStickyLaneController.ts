import Phaser from 'phaser'
import LaneManager from './LaneManager'

/**
 * StickyLaneController
 *
 * Handles horizontal movement for the player using a lane‑based system.  The
 * controller reads keyboard cursors (left/right) or gamepad axis and
 * computes a desired X coordinate.  It uses LaneManager.nearest() to find
 * the closest lane and LaneManager.snap(x, deadzone) to determine when
 * snapping should occur.  Movement towards the snap target is lerped to
 * avoid jitter.
 *
 * Typical integration in GameScene:
 *
 *   this.stickyLane = new StickyLaneController(this, this.laneManager, this.player)
 *   // in update():
 *   this.stickyLane.update(this.cursors, delta)
 *
 * The `deadzone` parameter defines how far the player must move away from
 * the lane centre before snapping back.  A small fraction of lane step
 * (e.g. 10% of spacing) is recommended.
 */
export default class StickyLaneController {
  private scene: Phaser.Scene
  private laneManager: LaneManager
  private player: Phaser.GameObjects.Sprite
  private deadzone: number
  // Target X coordinate the player lerps towards
  private targetX: number | null = null
  // Horizontal movement speed in pixels per second for free movement
  private moveSpeed = 800
  // Lerp factor for smoothing (0..1)
  private lerpFactor = 0.25

  constructor(
    scene: Phaser.Scene,
    laneManager: LaneManager,
    player: Phaser.GameObjects.Sprite,
    deadzonePixels?: number
  ) {
    this.scene = scene
    this.laneManager = laneManager
    this.player = player
    // Default deadzone = 10% of lane spacing, computed on first update
    this.deadzone = deadzonePixels ?? 0
  }

  /**
   * Call this every frame with the current cursors and delta time.  It will
   * update the player's X coordinate to follow left/right input and snap to
   * the nearest lane when appropriate.
   */
  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    delta: number
  ) {
    // compute dynamic deadzone if none was provided
    if (this.deadzone === 0) {
      const bounds = this.laneManager.getBounds()
      // 10% of lane spacing or min 6px
      this.deadzone = Math.max(6, bounds.step * 0.1)
    }
    let dir = 0
    if (cursors.left?.isDown) dir -= 1
    if (cursors.right?.isDown) dir += 1
    if (dir !== 0) {
      // compute tentative new X position
      const deltaX = dir * this.moveSpeed * (delta / 1000)
      const newX = this.player.x + deltaX
      // find nearest lane
      const lane = this.laneManager.nearest(newX)
      // compute snapped position using deadzone
      const snappedX = this.laneManager.snap(newX, this.deadzone)
      // set as target
      this.targetX = snappedX
    }
    // Lerp the player's X towards targetX if set
    if (this.targetX != null) {
      const current = this.player.x
      const next = Phaser.Math.Linear(current, this.targetX, this.lerpFactor)
      this.player.x = next
      // if we're very close to the target, snap directly
      if (Math.abs(this.player.x - this.targetX) < 1) {
        this.player.x = this.targetX
        this.targetX = null
      }
    }
  }
}