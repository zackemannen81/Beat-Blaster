import Phaser from 'phaser'

export type BeatJudgement = 'perfect' | 'normal'

export default class BeatWindow {
  private bpm = 120
  private windowRatio = 0.15

  setBpm(bpm: number) {
    const clamped = Phaser.Math.Clamp(bpm, 30, 300)
    this.bpm = clamped
  }

  setWindow(ratio: number) {
    const clamped = Phaser.Math.Clamp(ratio, 0.01, 0.5)
    this.windowRatio = clamped
  }

  classify(deltaMs: number | null | undefined): BeatJudgement {
    if (typeof deltaMs !== 'number' || !Number.isFinite(deltaMs)) return 'normal'
    const threshold = this.windowMs()
    return Math.abs(deltaMs) <= threshold ? 'perfect' : 'normal'
  }

  windowMs() {
    const period = 60000 / this.bpm
    return period * this.windowRatio
  }
}
