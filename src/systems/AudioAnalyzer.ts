import Phaser from 'phaser'

export type BeatBand = 'low' | 'mid' | 'high'

export default class AudioAnalyzer extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene
  private analyser?: AnalyserNode
  private source?: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | MediaElementAudioSourceNode
  private freqData?: Uint8Array
  private smoothing = 0.8
  private fftSize = 2048
  private started = false

  // Rolling windows
  private historyLow: number[] = []
  private historyMid: number[] = []
  private historyHigh: number[] = []
  private readonly HIST = 43
  private readonly MIN_INTERVAL_MS = 120
  private lastBeat: Record<BeatBand, number> = { low: 0, mid: 0, high: 0 }
  private beatTimes: number[] = []

  constructor(scene: Phaser.Scene) {
    super()
    this.scene = scene
  }

  attachToAudio(): boolean {
    const mgr = this.scene.sound as Phaser.Sound.WebAudioSoundManager
    if (!mgr || !mgr.context) return false
    const ctx = mgr.context
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = this.fftSize
    this.analyser.smoothingTimeConstant = this.smoothing
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    // Tap the destination to include global mix
    // @ts-expect-error private
    if (mgr.masterGain) mgr.masterGain.connect(this.analyser)
    this.started = true
    return true
  }

  update() {
    if (!this.started || !this.analyser || !this.freqData) return
    this.analyser.getByteFrequencyData(this.freqData)
    const bands = this.computeBands(this.freqData)
    this.detectBeats(bands)
  }

  private computeBands(spectrum: Uint8Array) {
    // Frequency per bin approx: (sampleRate/2)/bins. Use context sampleRate if available
    const mgr = this.scene.sound as Phaser.Sound.WebAudioSoundManager
    const ctx = mgr.context
    const bins = spectrum.length
    const nyquist = ctx.sampleRate / 2
    const hzPerBin = nyquist / bins
    const band = (lo: number, hi: number) => {
      const i0 = Math.max(0, Math.floor(lo / hzPerBin))
      const i1 = Math.min(bins - 1, Math.ceil(hi / hzPerBin))
      let sum = 0
      for (let i = i0; i <= i1; i++) sum += spectrum[i]
      return sum / Math.max(1, i1 - i0 + 1)
    }
    return {
      low: band(30, 120),
      mid: band(120, 1500),
      high: band(5000, 12000)
    }
  }

  private detectBeats({ low, mid, high }: { low: number; mid: number; high: number }) {
    const now = performance.now()
    const beatIf = (band: BeatBand, val: number, hist: number[]) => {
      hist.push(val)
      if (hist.length > this.HIST) hist.shift()
      const avg = hist.reduce((a, b) => a + b, 0) / hist.length
      const variance = hist.reduce((a, b) => a + (b - avg) * (b - avg), 0) / hist.length
      const std = Math.sqrt(variance)
      const k = 2.2 // sensitivity
      if (val > avg + k * std && now - this.lastBeat[band] > this.MIN_INTERVAL_MS) {
        this.lastBeat[band] = now
        this.emit(`beat:${band}`, { value: val, avg, std, t: now })
        this.beatTimes.push(now)
        if (this.beatTimes.length > 512) this.beatTimes.shift()
      }
    }
    beatIf('low', low, this.historyLow)
    beatIf('mid', mid, this.historyMid)
    beatIf('high', high, this.historyHigh)
  }

  nearestBeatDeltaMs(at: number = performance.now()): number {
    if (this.beatTimes.length === 0) return Number.POSITIVE_INFINITY
    // Find nearest value in a sorted-ish array (not guaranteed sorted, but append-only chronological)
    let best = Infinity
    for (let i = this.beatTimes.length - 1; i >= 0; i--) {
      const d = at - this.beatTimes[i]
      const ad = Math.abs(d)
      if (ad < best) best = ad
      // early break if we're moving far in past
      if (d > 500) break
    }
    return best
  }
}
