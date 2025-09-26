import { describe, it, expect, beforeEach } from 'vitest'
import Conductor from '../src/systems/Conductor'

class MockScene {
  time = { now: 1000 }
}

describe('Conductor', () => {
  let scene: MockScene
  let conductor: Conductor

  beforeEach(() => {
    scene = new MockScene()
    conductor = new Conductor(scene as any)
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(conductor.getBeatLengthMs()).toBe(60000 / 120) // 500ms for 120 BPM
    })

    it('should set startedAtMs to current time', () => {
      expect(conductor['startedAtMs']).toBe(1000)
    })
  })

  describe('setBpm()', () => {
    it('should update BPM and barBeats', () => {
      conductor.setBpm(140, 8)
      expect(conductor['bpm']).toBe(140)
      expect(conductor['barBeats']).toBe(8)
      expect(conductor.getBeatLengthMs()).toBe(60000 / 140) // ~428.57ms
    })

    it('should use default barBeats of 4', () => {
      conductor.setBpm(160)
      expect(conductor['bpm']).toBe(160)
      expect(conductor['barBeats']).toBe(4)
      expect(conductor.getBeatLengthMs()).toBe(60000 / 160) // 375ms
    })

    it('should handle very low BPM', () => {
      conductor.setBpm(60)
      expect(conductor.getBeatLengthMs()).toBe(60000 / 60) // 1000ms
    })

    it('should handle very high BPM', () => {
      conductor.setBpm(300)
      expect(conductor.getBeatLengthMs()).toBe(60000 / 300) // 200ms
    })
  })

  describe('getBeatLengthMs()', () => {
    it('should return correct beat length for 120 BPM', () => {
      conductor.setBpm(120)
      expect(conductor.getBeatLengthMs()).toBe(500)
    })

    it('should return correct beat length for 140 BPM', () => {
      conductor.setBpm(140)
      expect(conductor.getBeatLengthMs()).toBeCloseTo(428.571, 3)
    })

    it('should handle edge case of 0 BPM', () => {
      conductor.setBpm(0)
      expect(conductor.getBeatLengthMs()).toBe(60000) // Max value fallback
    })

    it('should handle negative BPM', () => {
      conductor.setBpm(-100)
      expect(conductor.getBeatLengthMs()).toBe(60000) // Max value fallback
    })
  })

  describe('getBeatPhase()', () => {
    beforeEach(() => {
      conductor.setBpm(120) // 500ms per beat
    })

    it('should return 0 at start', () => {
      scene.time.now = 1000 // Same as startedAtMs
      expect(conductor.getBeatPhase()).toBe(0)
    })

    it('should return correct phase after half beat', () => {
      scene.time.now = 1000 + 250 // 250ms after start
      expect(conductor.getBeatPhase()).toBe(0.5) // Halfway through beat
    })

    it('should return correct phase after full beat', () => {
      scene.time.now = 1000 + 500 // 500ms after start
      expect(conductor.getBeatPhase()).toBe(0) // Back to start of next beat
    })

    it('should return correct phase after 1.5 beats', () => {
      scene.time.now = 1000 + 750 // 750ms after start
      expect(conductor.getBeatPhase()).toBe(0.5) // Halfway through second beat
    })

    it('should handle multiple beat cycles', () => {
      scene.time.now = 1000 + 1500 // 1500ms after start (3 full beats)
      expect(conductor.getBeatPhase()).toBe(0) // Back to start of fourth beat
    })

    it('should work with custom time provider', () => {
      let customTime = 1000
      conductor.setTimeProvider(() => customTime)

      customTime = 1250 // 250ms after start
      expect(conductor.getBeatPhase()).toBe(0.5)

      customTime = 2000 // 1000ms after start (2 full beats)
      expect(conductor.getBeatPhase()).toBe(0)
    })
  })

  describe('getBarPhase()', () => {
    beforeEach(() => {
      conductor.setBpm(120, 4) // 120 BPM, 4 beats per bar = 2000ms per bar
    })

    it('should return 0 at start', () => {
      scene.time.now = 1000
      expect(conductor.getBarPhase()).toBe(0)
    })

    it('should return correct phase after half bar', () => {
      scene.time.now = 1000 + 1000 // 1000ms after start
      expect(conductor.getBarPhase()).toBe(0.5) // Halfway through bar
    })

    it('should return correct phase after full bar', () => {
      scene.time.now = 1000 + 2000 // 2000ms after start
      expect(conductor.getBarPhase()).toBe(0) // Back to start of next bar
    })

    it('should return correct phase after 1.5 bars', () => {
      scene.time.now = 1000 + 3000 // 3000ms after start
      expect(conductor.getBarPhase()).toBe(0.5) // Halfway through second bar
    })

    it('should work with different barBeats', () => {
      conductor.setBpm(120, 8) // 120 BPM, 8 beats per bar = 4000ms per bar

      scene.time.now = 1000 + 2000 // 2000ms after start
      expect(conductor.getBarPhase()).toBe(0.5) // Halfway through bar
    })

    it('should use lastBarStartMs when set', () => {
      conductor.signalBarStart()
      expect(conductor['lastBarStartMs']).toBeGreaterThan(1000)

      scene.time.now = conductor['lastBarStartMs'] + 1000
      expect(conductor.getBarPhase()).toBe(0.5)
    })

    it('should work with custom time provider', () => {
      let customTime = 1000
      conductor.setTimeProvider(() => customTime)

      customTime = 2000 // 1000ms after start
      expect(conductor.getBarPhase()).toBe(0.5)

      customTime = 3000 // 2000ms after start (full bar)
      expect(conductor.getBarPhase()).toBe(0)
    })
  })

  describe('signalBarStart()', () => {
    it('should update lastBarStartMs', () => {
      const initialTime = scene.time.now
      conductor.signalBarStart()

      expect(conductor['lastBarStartMs']).toBeGreaterThanOrEqual(initialTime)
    })

    it('should emit bar:start event', () => {
      const mockEmit = jest.fn()
      conductor.on('bar:start', mockEmit)

      conductor.signalBarStart()

      expect(mockEmit).toHaveBeenCalled()
    })

    it('should work with custom time provider', () => {
      let customTime = 1000
      conductor.setTimeProvider(() => customTime)

      conductor.signalBarStart()
      expect(conductor['lastBarStartMs']).toBe(1000)
    })
  })

  describe('setTimeProvider()', () => {
    it('should use custom time provider when set', () => {
      let customTime = 2000
      conductor.setTimeProvider(() => customTime)

      expect(conductor.getBeatPhase()).toBe(0) // (2000 - 1000) % 500 / 500 = 0

      customTime = 2250 // 250ms after start
      expect(conductor.getBeatPhase()).toBe(0.5) // 250 / 500 = 0.5
    })

    it('should fall back to scene.time when time provider not set', () => {
      scene.time.now = 1250 // 250ms after start
      expect(conductor.getBeatPhase()).toBe(0.5)
    })

    it('should handle time provider returning different values', () => {
      conductor.setTimeProvider(() => 1500) // 500ms after start
      expect(conductor.getBeatPhase()).toBe(0) // Full beat passed

      conductor.setTimeProvider(() => 1750) // 750ms after start
      expect(conductor.getBeatPhase()).toBe(0.5) // Halfway through second beat
    })
  })

  describe('nowMs()', () => {
    it('should return scene time when no time provider', () => {
      scene.time.now = 1500
      expect(conductor['nowMs']()).toBe(1500)
    })

    it('should return custom time when time provider set', () => {
      conductor.setTimeProvider(() => 2500)
      expect(conductor['nowMs']()).toBe(2500)
    })
  })

  describe('integration with phase calculations', () => {
    it('should maintain consistency between beat and bar phases', () => {
      conductor.setBpm(120, 4) // 500ms per beat, 2000ms per bar

      scene.time.now = 1000 + 750 // 750ms after start

      const beatPhase = conductor.getBeatPhase() // 750 / 500 = 0.5
      const barPhase = conductor.getBarPhase()   // 750 / 2000 = 0.375

      expect(beatPhase).toBe(0.5)
      expect(barPhase).toBe(0.375)

      // Beat phase should be (barPhase * barBeats) % 1
      expect(beatPhase).toBe((barPhase * 4) % 1)
    })

    it('should handle bar start signaling correctly', () => {
      conductor.setBpm(120, 4)

      // Advance time by 1.5 beats
      scene.time.now = 1000 + 750

      // Signal bar start (should reset bar timing)
      conductor.signalBarStart()

      // Now bar phase should be relative to the new bar start
      const barPhase = conductor.getBarPhase()
      expect(barPhase).toBe(0) // Should be at start of new bar
    })
  })
})
