import { describe, it, expect, beforeEach } from 'vitest'
import BeatJudge, { type BeatVerdict } from '../src/systems/BeatJudge'

describe('BeatJudge', () => {
  let mockGetBeatPhase: () => number
  let beatJudge: BeatJudge

  beforeEach(() => {
    mockGetBeatPhase = () => 0.5 // Default to middle of beat
    beatJudge = new BeatJudge(mockGetBeatPhase, {
      window: 0.12,
      offsetMs: 0,
      beatLengthMs: 500
    })
  })

  describe('constructor and options', () => {
    it('should use default options when none provided', () => {
      const defaultJudge = new BeatJudge(mockGetBeatPhase)
      expect(defaultJudge['opts'].window).toBe(0.12)
      expect(defaultJudge['opts'].offsetMs).toBe(0)
      expect(defaultJudge['opts'].beatLengthMs).toBe(0)
    })

    it('should use provided options', () => {
      const customJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.2,
        offsetMs: 50,
        beatLengthMs: 600
      })
      expect(customJudge['opts'].window).toBe(0.2)
      expect(customJudge['opts'].offsetMs).toBe(50)
      expect(customJudge['opts'].beatLengthMs).toBe(600)
    })
  })

  describe('judge()', () => {
    it('should return PERFECT when phase is within perfect window (0.06)', () => {
      mockGetBeatPhase = () => 0.06 // 6% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('PERFECT')
    })

    it('should return PERFECT when phase is within perfect window near beat end (0.94)', () => {
      mockGetBeatPhase = () => 0.94 // 94% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('PERFECT')
    })

    it('should return NORMAL when phase is within normal window but outside perfect (0.08)', () => {
      mockGetBeatPhase = () => 0.08 // 8% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('NORMAL')
    })

    it('should return NORMAL when phase is within normal window near beat end (0.92)', () => {
      mockGetBeatPhase = () => 0.92 // 92% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('NORMAL')
    })

    it('should return MISS when phase is outside window (0.2)', () => {
      mockGetBeatPhase = () => 0.2 // 20% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('MISS')
    })

    it('should return MISS when phase is outside window near beat end (0.8)', () => {
      mockGetBeatPhase = () => 0.8 // 80% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      const result = beatJudge.judge()
      expect(result).toBe('MISS')
    })
  })

  describe('offsetMs handling', () => {
    it('should apply positive offset correctly', () => {
      mockGetBeatPhase = () => 0.0 // Exactly at beat start
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.12,
        offsetMs: 60, // 60ms offset
        beatLengthMs: 500 // 500ms per beat
      })

      // With 60ms offset and 500ms beat, offset should be 60/500 = 0.12
      // So effective phase = 0.0 + 0.12 = 0.12, which should be NORMAL
      const result = beatJudge.judge()
      expect(result).toBe('NORMAL')
    })

    it('should apply negative offset correctly', () => {
      mockGetBeatPhase = () => 0.12 // 12% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.12,
        offsetMs: -60, // -60ms offset
        beatLengthMs: 500 // 500ms per beat
      })

      // With -60ms offset and 500ms beat, offset should be -60/500 = -0.12
      // So effective phase = 0.12 + (-0.12) = 0.0, which should be PERFECT
      const result = beatJudge.judge()
      expect(result).toBe('PERFECT')
    })

    it('should handle offset wraparound correctly', () => {
      mockGetBeatPhase = () => 0.95 // 95% into beat
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.12,
        offsetMs: 100, // 100ms offset
        beatLengthMs: 500 // 500ms per beat
      })

      // With 100ms offset and 500ms beat, offset should be 100/500 = 0.2
      // So effective phase = 0.95 + 0.2 = 1.15, which wraps to 0.15
      // 0.15 should be MISS (outside 0.12 window)
      const result = beatJudge.judge()
      expect(result).toBe('MISS')
    })
  })

  describe('edge cases', () => {
    it('should handle beatLengthMs = 0 gracefully', () => {
      mockGetBeatPhase = () => 0.0
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.12,
        offsetMs: 50,
        beatLengthMs: 0 // Invalid beat length
      })

      // When beatLengthMs is 0, offset should be ignored
      const result = beatJudge.judge()
      expect(result).toBe('PERFECT') // Should be at beat start
    })

    it('should handle very small window values', () => {
      mockGetBeatPhase = () => 0.01
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.005, // Very small window
        beatLengthMs: 500
      })

      const result = beatJudge.judge()
      expect(result).toBe('MISS') // 1% is outside 0.5% perfect window
    })

    it('should handle very large window values', () => {
      mockGetBeatPhase = () => 0.4
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.5, // Very large window
        beatLengthMs: 500
      })

      const result = beatJudge.judge()
      expect(result).toBe('NORMAL') // 40% should be within 50% window
    })

    it('should clamp window to valid range [0, 0.5]', () => {
      mockGetBeatPhase = () => 0.3
      beatJudge = new BeatJudge(mockGetBeatPhase, {
        window: 0.6, // Invalid window > 0.5
        beatLengthMs: 500
      })

      // Window should be clamped to 0.5
      const result = beatJudge.judge()
      expect(result).toBe('NORMAL') // 30% should be within 50% window
    })
  })

  describe('phase calculation accuracy', () => {
    it('should handle exact beat boundaries correctly', () => {
      // Test phase = 0.0 (exact beat start)
      mockGetBeatPhase = () => 0.0
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })
      expect(beatJudge.judge()).toBe('PERFECT')

      // Test phase = 1.0 (exact beat end) - should wrap to 0.0
      mockGetBeatPhase = () => 1.0
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })
      expect(beatJudge.judge()).toBe('PERFECT')
    })

    it('should handle phase = 0.5 (exact middle of beat)', () => {
      mockGetBeatPhase = () => 0.5
      beatJudge = new BeatJudge(mockGetBeatPhase, { window: 0.12, beatLengthMs: 500 })

      // Distance to nearest beat boundary is 0.5, which is > 0.12 window
      const result = beatJudge.judge()
      expect(result).toBe('MISS')
    })
  })
})
