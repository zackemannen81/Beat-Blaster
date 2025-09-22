import Phaser from 'phaser'
import LaneManager from './LaneManager'

/**
 * StickyLaneController – Enhanced
 *
 * Denna controller sköter lane‑baserad rörelse för en spelare.  Den tar
 * hänsyn till både piltangenter och alternativa tangenter (t.ex. WASD) och
 * fungerar med både vanliga sprites och Arcade Physics‑sprites.  Om en
 * fysik‑kropp finns används body.reset() för att flytta spelaren, annars
 * sätts X‑egenskapen direkt.  En dynamisk deadzone beräknas utifrån
 * lane‑spacing om ingen anges.
 */

export interface StickyLaneOptions {
  /** Dödzon i pixlar för snap. Om 0 beräknas 10 % av lane‑avståndet. */
  deadzone?: number
  /** Rörelsehastighet i pixlar per sekund vid fri input. */
  moveSpeed?: number
  /** Lerpfaktor [0..1] för mjuk snappning. */
  lerpFactor?: number
}

export default class StickyLaneController {
  private scene: Phaser.Scene
  private laneManager: LaneManager
  private player: any
  private deadzone: number
  private moveSpeed: number
  private lerpFactor: number
  private targetX: number | null = null

  constructor(
    scene: Phaser.Scene,
    laneManager: LaneManager,
    player: any,
    options: StickyLaneOptions = {}
  ) {
    this.scene = scene
    this.laneManager = laneManager
    this.player = player
    this.deadzone = options.deadzone ?? 0
    this.moveSpeed = options.moveSpeed ?? 800
    this.lerpFactor = options.lerpFactor ?? 0.25
  }

  /** Beräkna en dynamisk deadzone baserad på lane‑spacing. */
  private computeDeadzone() {
    if (this.deadzone === 0) {
      const bounds = this.laneManager.getBounds()
      // 10 % av lane‑steget eller minst 6 px
      this.deadzone = Math.max(6, bounds.step * 0.1)
    }
  }

  /**
   * Uppdatera lane‑rörelse.  `cursors` är resultatet av
   * `this.input.keyboard.createCursorKeys()`.  `keys` kan vara ett valfritt
   * objekt med egenskaper `A`, `D`, `LEFT`, `RIGHT` (som Phaser‑Key‑objekt)
   * för alternativa kontroller.  Om du inte skickar `keys` används endast
   * pil‑tangenterna.
   */
  update(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    keys: { [key: string]: Phaser.Input.Keyboard.Key } | undefined,
    delta: number
  ) {
    this.computeDeadzone()
    let dir = 0
    const leftDown = !!(cursors.left?.isDown || keys?.A?.isDown || keys?.LEFT?.isDown)
    const rightDown = !!(cursors.right?.isDown || keys?.D?.isDown || keys?.RIGHT?.isDown)
    if (leftDown) dir -= 1
    if (rightDown) dir += 1
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0); // stoppa glid
    if (dir !== 0) {
      const deltaX = dir * this.moveSpeed * (delta / 1000)
      const newX = this.player.x + deltaX
      // bestäm närmsta lane och tillämpa deadzone via snap
      const snapped = this.laneManager.snap(newX, this.deadzone)
      this.targetX = snapped
    }

    if (this.targetX != null) {
      const currentX = this.player.x
      const nextX = Phaser.Math.Linear(currentX, this.targetX, this.lerpFactor)
      const body = this.player.body
      if (body && typeof body.reset === 'function') {
        // Arcade Physics: flytta via reset så att kroppens hastighet inte påverkas
        body.reset(nextX, body.y)
      } else {
        this.player.x = nextX
      }
      if (Math.abs(nextX - this.targetX) < 1) {
        // Slutlig snap
        if (body && typeof body.reset === 'function') {
          body.reset(this.targetX, body.y)
        } else {
          this.player.x = this.targetX
        }
        this.targetX = null
      }
    }
  }
}