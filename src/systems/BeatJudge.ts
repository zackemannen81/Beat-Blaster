/**
 * BeatJudge – fasbaserad timingbedömning för inputs/skott etc.
 * Exempel:
 *   const bj = new BeatJudge(() => conductor.getBeatPhase(), {
 *     window: 0.12,
 *     offsetMs: options.inputOffsetMs,
 *     beatLengthMs: conductor.getBeatLengthMs()
 *   })
 *   const verdict = bj.judge() // 'PERFECT' | 'NORMAL' | 'MISS'
 */

export type BeatVerdict = 'PERFECT' | 'NORMAL' | 'MISS'

export interface BeatJudgeOptions {
  /** Halvt fönster i fas-enheter [0..0.5], default 0.12 (±12%) */
  window?: number
  /** Latenskalibrering (ms) – appliceras på fasen */
  offsetMs?: number
  /** ms per beat (om du vill justera offset korrekt i fas) */
  beatLengthMs?: number
}

export default class BeatJudge {
  private getBeatPhase: () => number
  private opts: Required<BeatJudgeOptions>

  constructor(getBeatPhase: () => number, opts: BeatJudgeOptions = {}) {
    this.getBeatPhase = getBeatPhase
    this.opts = {
      window: opts.window ?? 0.12,
      offsetMs: opts.offsetMs ?? 0,
      beatLengthMs: opts.beatLengthMs ?? 0,
    }
  }

  /** Konvertera ms-offset → fas [0..1) om beatLengthMs finns. */
  private offsetPhase(): number {
    const { offsetMs, beatLengthMs } = this.opts
    if (!beatLengthMs || beatLengthMs <= 0) return 0
    const p = (offsetMs % beatLengthMs) / beatLengthMs
    return (p + 1) % 1
  }

  /** Faseffekt med offset och wrap [0..1). */
  private effectivePhase(): number {
    const raw = this.getBeatPhase()
    const off = this.offsetPhase()
    let p = raw + off
    p -= Math.floor(p)
    return p
  }

  /**
   * Bedömning: avstånd till närmaste beat-kant (0 eller 1).
   * PERFECT inom window/2, NORMAL inom window, annars MISS.
   */
  judge(): BeatVerdict {
    const w = Math.max(0, Math.min(0.5, this.opts.window))
    const p = this.effectivePhase()
    const d = Math.min(p, 1 - p)
    if (d <= w * 0.5) return 'PERFECT'
    if (d <= w) return 'NORMAL'
    return 'MISS'
  }
}
