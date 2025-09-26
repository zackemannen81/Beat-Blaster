import Phaser from 'phaser'
import LaneManager from './LaneManager'

/**
 * StickyLaneController – Free‑movement with snap
 *
 * Denna controller låter spelaren flytta fritt horisontellt när
 * piltangenter (eller alternativa tangenter som WASD) hålls ned. När
 * spelaren släpper tangenterna och X‑rörelsen blir minimal aktiveras
 * en magnet/snap‑funktion som lerpar spelaren mot mitten av närmaste
 * lane. Vertikal Y‑rörelse påverkas inte.  För Arcade‑physics sprites
 * används body.reset() för att flytta kroppen istället för att sätta
 * x‑koordinaten direkt.
 */

export interface StickyLaneOptions {
  /** Dödzon i pixlar för snap. Om 0 beräknas 10 % av lane‑avståndet. */
  deadzone?: number
  /** Rörelsehastighet i pixlar per sekund vid fri input. */
  moveSpeed?: number
  /** Lerpfaktor [0..1] för mjuk snappning. */
  lerpFactor?: number
  /** Minimal X‑förflyttning (i pixlar) som räknas som ”stilla”. */
  stopThreshold?: number
}

export default class StickyLaneController {
  private scene: Phaser.Scene
  private laneManager: LaneManager
  private player: any
  private deadzone: number
  private moveSpeed: number
  private lerpFactor: number
  private stopThreshold: number
  private targetX: number | null = null
  private lastX: number = 0

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
    this.lerpFactor = options.lerpFactor ?? 0.2
    // Default stopThreshold: 0.5px per frame; adjust to match moveSpeed
    this.stopThreshold = options.stopThreshold ?? 1
    this.lastX = player.x
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
   * objekt med egenskaper `A`, `D`, `LEFT`, `RIGHT` (Phaser‑Key‑objekt)
   * för alternativa kontroller.  Om du inte skickar `keys` används endast
   * pil‑tangenterna.  `delta` är tiden i ms sedan senaste uppdatering.
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

    // Spara nuvarande X för att mäta förflyttning mellan frames
    const currentX = this.player.x
    const currentY = this.player.y
   if (dir !== 0) {
      // Spelaren trycker aktivt vänster/höger: flytta fritt utan att snappa
     /* const deltaX = dir * this.moveSpeed * (delta / 1000)
      const newX = currentX + deltaX
      const deltaY = dir * this.moveSpeed * (delta / 1000)
      const newX = currentX + deltaX
      // Flytta kroppen/spriten direkt
      const body = this.player.body
      if (body && typeof body.reset === 'function') {
        body.reset(newX, currentY )
      } else {
        this.player.x = newX
      }*/
      // Avbryt eventuell magnetisering
      this.targetX = null
    } 
      
     
    else {
      // Ingen horisontell input: kolla om spelaren rört sig minimalt
      const moved = Math.abs(currentX - this.lastX)
      // Endast räkna som stopp om spelaren rört sig mindre än threshold
      if (moved <= this.stopThreshold) {
        // Om vi inte redan magnetiserar – bestäm nytt mål
        if (this.targetX == null) {
          const snapped = this.laneManager.snap(currentX, this.deadzone)
          // Endast magnetisera om vi inte redan är nära mitten
          if (Math.abs(snapped - currentX) > 1) {
            this.targetX = snapped
          }
        }
      } else {
        // Spelaren glider lite men utan input: fortsätt fri rörelse, bryt magnet
        this.targetX = null
      }
    }

    // Om ett mål finns, lerpa mot mitten
    if (this.targetX != null) {
      const x = this.player.x
      const nextX = Phaser.Math.Linear(x, this.targetX, this.lerpFactor)
      const body = this.player.body
      if (body && typeof body.reset === 'function') {
        body.reset(nextX, currentY )
      } else {
        this.player.x = nextX
      }
      // Om vi är tillräckligt nära, gör en sista snap
      if (Math.abs(nextX - this.targetX) < 2) {
        if (body && typeof body.reset === 'function') {
          body.reset(this.targetX, currentY )
        } else {
          this.player.x = this.targetX
        }
        this.targetX = null
      }
    }
    // Uppdatera senaste X för nästa frame
    this.lastX = this.player.x
  }
}