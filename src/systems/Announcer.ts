import Phaser from 'phaser'
import { PowerupType } from './Powerups'

export default class Announcer {
  private scene: Phaser.Scene
  private getVolume: () => number
  private enabled = true
  private current?: Phaser.Sound.BaseSound
  private currentPriority = 0
  private cooldownUntil = 0
  private currentCleanup?: () => void

  private powerupTypes: Record<PowerupType, string> = {
    shield: 'announcer_shield',
    rapid: 'announcer_rapid_fire',
    split: 'announcer_split_shot',
    slowmo: 'announcer_slowmo'
  }

  constructor(scene: Phaser.Scene, getVolume: () => number, enabled = true) {
    this.scene = scene
    this.getVolume = getVolume
    this.enabled = enabled
  }

  setEnabled(flag: boolean) {
    this.enabled = flag
    if (!flag) this.stop()
  }

  stop() {
    if (this.currentCleanup) {
      this.currentCleanup()
      this.currentCleanup = undefined
    }
  }

  destroy() {
    this.stop()
  }

  playPowerup(type: PowerupType) {
    const typeKey = this.powerupTypes[type]
    if (!typeKey) return
    this.playSound('announcer_powerup', 2, () => {
      this.playSound(typeKey, 1)
    })
  }

  playBombReady() {
    this.playSound('announcer_bomb_ready', 3)
  }

  playCombo(combo: number) {
    if (combo <= 0 || combo % 10 !== 0) return
    this.playSound('announcer_combo', 1)
  }

  playEvent(event: 'new_game' | 'warning' | 'enemies') {
    const key = event === 'new_game' ? 'announcer_new_game'
      : event === 'warning' ? 'announcer_warning'
      : 'announcer_enemies_approching'
    this.playSound(key, 0)
  }

  private playSound(key: string, priority: number, onComplete?: () => void) {
    if (!this.enabled) return
    const volume = this.getVolume()
    if (volume <= 0) return
    const now = this.scene.time.now
    if (now < this.cooldownUntil && priority < this.currentPriority) return

    if (this.current) {
      if (priority < this.currentPriority) return
      this.currentCleanup?.()
      this.currentCleanup = undefined
    }

    const sound = this.scene.sound.add(key)
    if (!sound) return

    let cleaned = false
    const cleanup = (fromEvent = false) => {
      if (cleaned) return
      cleaned = true
      sound.off(Phaser.Sound.Events.COMPLETE, handleComplete)
      sound.off(Phaser.Sound.Events.STOP, handleStop)
      if (!fromEvent && sound.isPlaying) sound.stop()
      sound.destroy()
      if (this.current === sound) {
        this.current = undefined
        this.currentPriority = 0
      }
      this.currentCleanup = undefined
    }
    const handleComplete = () => {
      cleanup(true)
      if (onComplete) onComplete()
    }
    const handleStop = () => {
      cleanup(true)
    }

    sound.once(Phaser.Sound.Events.COMPLETE, handleComplete)
    sound.once(Phaser.Sound.Events.STOP, handleStop)
    this.currentCleanup = () => cleanup()
    sound.play({ volume })
    this.current = sound
    this.currentPriority = priority
    this.cooldownUntil = now + 400
  }
}
