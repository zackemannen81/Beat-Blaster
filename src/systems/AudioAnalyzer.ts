import Phaser from 'phaser'

export type BeatBand = 'low' | 'mid' | 'high'

export default class AudioAnalyzer extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene
  private analyser!: AnalyserNode
  private freqData!: Float32Array
  private prevMag!: Float32Array
  private started = false
  private music?: Phaser.Sound.BaseSound

  // detections
  private noBeats = 0
  private historyLow: number[] = []
  private historyMid: number[] = []
  private historyHigh: number[] = []
  private readonly HIST = 30
  private lastBeat: Record<BeatBand, number> = { low: 0, mid: 0, high: 0 }
  private beatTimes: number[] = []
  private estPeriodMs = 500 // starta ~120 BPM

  constructor(scene: Phaser.Scene) {
    super()
    this.scene = scene
  }

  attachToAudio(music: Phaser.Sound.BaseSound): boolean {
    const sm = this.scene.sound as Phaser.Sound.WebAudioSoundManager
    const ctx = sm?.context
    if (!sm || !ctx) return false

    const wa = music as Phaser.Sound.WebAudioSound
    const any = wa as any
    // Phaser-versioner varierar: volumeNode/gainNode/source brukar finnas
    const tapNode: AudioNode | undefined =
      any.volumeNode ?? any.gainNode ?? any.source

    if (!tapNode) {
      console.warn('Kunde inte hitta node att tappa från.')
      return false
    }

    // Skapa analyser i PARALLELL (ingen disconnect!)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.5

    // Viktigt: koppla INTE analyzern till destination.
    try {
      tapNode.connect(this.analyser) // parallell “tap”
    } catch (e) {
      console.warn('Kunde inte connecta parallellt:', e)
      return false
    }

    this.freqData = new Float32Array(this.analyser.frequencyBinCount)
    this.prevMag = new Float32Array(this.analyser.frequencyBinCount)
    this.started = true
    this.music = music
    return true
  }

  update(): void {
    if (!this.started) return
    try {
      // Float ger bättre precision för flux
      this.analyser.getFloatFrequencyData(this.freqData)
      // Gör om till magnitud i linjär skala
      for (let i = 0; i < this.freqData.length; i++) {
        // dB -> lin
        this.freqData[i] = Math.pow(10, this.freqData[i] / 20)
      }

      // Spektral flux (endast positiva ökningar)
      let flux = 0
      for (let i = 0; i < this.freqData.length; i++) {
        const inc = this.freqData[i] - this.prevMag[i]
        if (inc > 0) flux += inc
        this.prevMag[i] = this.freqData[i]
      }

      const bands = this.computeBands(this.freqData)
      this.detectBeats(bands, flux)
    } catch (e) {
      console.error('Analyzer update error:', e)
      this.started = false
    }
  }

  private computeBands(spectrum: Float32Array): { low: number; mid: number; high: number } {
    const ctx = (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context
    const bins = spectrum.length
    const nyquist = ctx.sampleRate / 2
    const hzPerBin = nyquist / bins

    const bandAvg = (loHz: number, hiHz: number) => {
      const i0 = Math.max(0, Math.floor(loHz / hzPerBin))
      const i1 = Math.min(bins - 1, Math.ceil(hiHz / hzPerBin))
      let sum = 0
      for (let i = i0; i <= i1; i++) sum += spectrum[i]
      return sum / Math.max(1, i1 - i0 + 1)
    }

    // Tightare band minskar “sfx-bleed”
    return {
      low: bandAvg(50, 120),     // kick
      mid: bandAvg(180, 320),    // snare body
      high: bandAvg(2000, 5000)  // snap/hi-hat
    }
  }

  private detectBeats(bands: { low: number; mid: number; high: number }, flux: number): void {
    const now = this.scene.time.now

    const historyMap: Record<BeatBand, number[]> = {
      low: this.historyLow,
      mid: this.historyMid,
      high: this.historyHigh
    }

    // adaptiv tröskel via EMA + std
    const pushSmooth = (v: number, arr: number[]) => {
      const smoothed = arr.length ? arr[arr.length - 1] * 0.7 + v * 0.3 : v
      arr.push(smoothed)
      if (arr.length > this.HIST) arr.shift()
      return smoothed
    }

    const low = pushSmooth(bands.low, this.historyLow)
    const mid = pushSmooth(bands.mid, this.historyMid)
    const high = pushSmooth(bands.high, this.historyHigh)

    const isPeak = (band: BeatBand, level: number, k = 1.6) => {
      const hist = historyMap[band]
      if (hist.length < 5) return false
      const avg = hist.reduce((a, b) => a + b, 0) / hist.length
      const sd = Math.sqrt(hist.reduce((s, x) => s + (x - avg) ** 2, 0) / hist.length)
      // Kombinera band-peak med spektral flux för robusthet
      const adaptive = avg + k * sd
      return level > adaptive && flux > 0.02 // justera vid behov
    }

    // Refractory window ~ 45% av estimerad period
    const minGap = Math.max(60, this.estPeriodMs * 0.45)

    const tryBeat = (band: BeatBand, level: number) => {
      if (now - this.lastBeat[band] < minGap) return false
      if (!isPeak(band, level)) return false
      this.lastBeat[band] = now
      this.beatTimes.push(now)
      this.beatTimes = this.beatTimes.filter(t => now - t < 4000)
      this.updateEstimatedPeriod()
      this.emit(`beat:${band}`, level)
      return true
    }
if(++this.noBeats % 3 === 0){
    tryBeat('low', low)
    tryBeat('mid', mid)
    tryBeat('high', high)
    
}
/*   
tryBeat('low', low)
    tryBeat('mid', mid)
    tryBeat('high', high)
*/
  }

  private updateEstimatedPeriod() {
    if (this.beatTimes.length < 3) return
    const n = this.beatTimes.length
    const deltas: number[] = []
    for (let i = 1; i < n; i++) deltas.push(this.beatTimes[i] - this.beatTimes[i - 1])
    deltas.sort((a, b) => a - b)
    const median = deltas[Math.floor(deltas.length / 2)]
    if (isFinite(median) && median > 100 && median < 1500) this.estPeriodMs = median
  }

  nearestBeatDeltaMs(at: number = this.scene.time.now): number {
    if (this.beatTimes.length === 0) return Number.POSITIVE_INFINITY
    let best = Infinity
    for (let i = this.beatTimes.length - 1; i >= 0; i--) {
      const d = at - this.beatTimes[i]
      const ad = Math.abs(d)
      if (ad < best) best = ad
      if (d > 800) break
    }
    return best
  }

  getEstimatedPeriodMs(): number {
    return this.estPeriodMs
  }

  getEstimatedBpm(): number {
    return this.estPeriodMs > 0 ? 60000 / this.estPeriodMs : 0
  }
}
