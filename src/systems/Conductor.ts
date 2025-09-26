import Phaser from 'phaser'

/**
 * Conductor – minimalt skelett med beat/bar-fas.
 * OBS: Detta använder scene.time som klocka. Har du audio-klocka,
 * koppla in via setTimeProvider() för exakt sync mot musiken.
 */
export default class Conductor extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene

  private bpm = 120
  private barBeats = 4
  private lastBarStartMs = 0
  private startedAtMs = 0

  // Valfri tidsgivare – låt den returnera ms sedan "start".
  private timeProvider?: () => number

  constructor(scene: Phaser.Scene) {
    super()
    this.scene = scene
    this.startedAtMs = this.scene.time.now
  }

  /** Ange extern klok källa (t.ex. WebAudio currentTime*1000). */
  setTimeProvider(fn: () => number) {
    this.timeProvider = fn
  }

  /** Hämta “nu” i ms – från timeProvider eller scene.time.now. */
  private nowMs(): number {
    return this.timeProvider ? this.timeProvider() : this.scene.time.now
  }

  /** Sätt BPM och eventuellt antal slag per takt. */
  setBpm(bpm: number, barBeats: number = 4) {
    this.bpm = bpm
    this.barBeats = barBeats
  }

  /** ms per beat (60k / BPM). */
  getBeatLengthMs(): number {
    return 60000 / Math.max(1, this.bpm)
  }

  /** Fas [0..1) inom nuvarande beat (time-baserad stub eller audio-klocka). */
  getBeatPhase(): number {
    const len = this.getBeatLengthMs()
    const now = this.nowMs()
    const t = (now - this.startedAtMs) % len
    return t / len
  }

  /** Fas [0..1) inom nuvarande takt (bar). */
  getBarPhase(): number {
    const barLen = this.getBeatLengthMs() * this.barBeats
    const now = this.nowMs()
    const anchor = this.lastBarStartMs || this.startedAtMs
    const t = (now - anchor) % barLen
    return t / barLen
  }

  /** Anropa när en ny takt startar (om du har bar-detektion från audio). */
  signalBarStart() {
    this.lastBarStartMs = this.nowMs()
    this.emit('bar:start')
  }
}
