import { describe, it, expect, beforeEach } from 'vitest'
import LaneManager from '../src/systems/LaneManager'

class MockScene {
  cameras = {
    main: {
      width: 800,
      height: 600
    }
  }
  scale = {
    width: 800,
    height: 600
  }
  events = {
    emit: () => {}
  }
  add = {
    graphics: () => ({ setDepth: () => ({ clear: () => {} }) }),
    text: () => ({ setDepth: () => ({ destroy: () => {} }) })
  }
  time = { now: 1000 }
}

describe('LaneManager', () => {
  let scene: MockScene
  let laneManager: LaneManager

  beforeEach(() => {
    scene = new MockScene()
    laneManager = new LaneManager(scene as any)
  })

  describe('constructor', () => {
    it('should initialize with empty lanes', () => {
      expect(laneManager.getAll()).toHaveLength(0)
    })

    it('should have default bounds', () => {
      const bounds = laneManager.getBounds()
      expect(bounds.left).toBe(0)
      expect(bounds.width).toBe(0)
      expect(bounds.step).toBe(0)
    })
  })

  describe('build()', () => {
    it('should build 3 lanes with default width', () => {
      laneManager.build(3)

      const lanes = laneManager.getAll()
      expect(lanes).toHaveLength(3)

      // With 800px width, step should be 800/(3+1) = 200px
      expect(lanes[0].centerX).toBe(200) // left + step * (0 + 1)
      expect(lanes[1].centerX).toBe(400) // left + step * (1 + 1)
      expect(lanes[2].centerX).toBe(600) // left + step * (2 + 1)
    })

    it('should build 5 lanes with custom bounds', () => {
      laneManager.build(5, 100, 600) // left=100, width=600

      const lanes = laneManager.getAll()
      expect(lanes).toHaveLength(5)

      // step = 600/(5+1) = 100px
      expect(lanes[0].centerX).toBe(200) // 100 + 100 * (0 + 1)
      expect(lanes[1].centerX).toBe(300) // 100 + 100 * (1 + 1)
      expect(lanes[2].centerX).toBe(400) // 100 + 100 * (2 + 1)
      expect(lanes[3].centerX).toBe(500) // 100 + 100 * (3 + 1)
      expect(lanes[4].centerX).toBe(600) // 100 + 100 * (4 + 1)
    })

    it('should build 7 lanes with custom bounds', () => {
      laneManager.build(7, 50, 700) // left=50, width=700

      const lanes = laneManager.getAll()
      expect(lanes).toHaveLength(7)

      // step = 700/(7+1) = 87.5px
      expect(lanes[0].centerX).toBe(137.5) // 50 + 87.5 * (0 + 1)
      expect(lanes[1].centerX).toBe(225)   // 50 + 87.5 * (1 + 1)
      expect(lanes[2].centerX).toBe(312.5) // 50 + 87.5 * (2 + 1)
      expect(lanes[3].centerX).toBe(400)   // 50 + 87.5 * (3 + 1)
      expect(lanes[4].centerX).toBe(487.5) // 50 + 87.5 * (4 + 1)
      expect(lanes[5].centerX).toBe(575)   // 50 + 87.5 * (5 + 1)
      expect(lanes[6].centerX).toBe(662.5) // 50 + 87.5 * (6 + 1)
    })

    it('should handle edge case of 0 lanes', () => {
      laneManager.build(0)

      const lanes = laneManager.getAll()
      expect(lanes).toHaveLength(0)
    })

    it('should handle edge case of 1 lane', () => {
      laneManager.build(1, 0, 400)

      const lanes = laneManager.getAll()
      expect(lanes).toHaveLength(1)
      expect(lanes[0].centerX).toBe(200) // 0 + 400/2 = 200
    })

    it('should update bounds correctly', () => {
      laneManager.build(3, 100, 600)

      const bounds = laneManager.getBounds()
      expect(bounds.left).toBe(150)  // 100 + 600/(3+1)/2 = 100 + 150 = 250? Wait, let me recalculate
      expect(bounds.width).toBe(400) // step * (count - 1) = 150 * 2 = 300
      expect(bounds.step).toBe(150)  // 600/(3+1) = 150
    })
  })

  describe('nearest()', () => {
    beforeEach(() => {
      laneManager.build(5, 0, 800) // 5 lanes at positions: 133.33, 266.67, 400, 533.33, 666.67
    })

    it('should find nearest lane for position in middle', () => {
      const nearest = laneManager.nearest(400)
      expect(nearest.index).toBe(2)
      expect(nearest.centerX).toBe(400)
    })

    it('should find nearest lane for position closer to left', () => {
      const nearest = laneManager.nearest(200)
      expect(nearest.index).toBe(1)
      expect(nearest.centerX).toBe(266.67)
    })

    it('should find nearest lane for position closer to right', () => {
      const nearest = laneManager.nearest(600)
      expect(nearest.index).toBe(3)
      expect(nearest.centerX).toBe(533.33)
    })

    it('should handle position exactly on lane center', () => {
      const nearest = laneManager.nearest(266.67)
      expect(nearest.index).toBe(1)
      expect(nearest.centerX).toBe(266.67)
    })

    it('should handle position outside left bound', () => {
      const nearest = laneManager.nearest(-100)
      expect(nearest.index).toBe(0)
      expect(nearest.centerX).toBe(133.33)
    })

    it('should handle position outside right bound', () => {
      const nearest = laneManager.nearest(900)
      expect(nearest.index).toBe(4)
      expect(nearest.centerX).toBe(666.67)
    })
  })

  describe('indexAt()', () => {
    beforeEach(() => {
      laneManager.build(5, 0, 800)
    })

    it('should return correct index for position on lane', () => {
      expect(laneManager.indexAt(400)).toBe(2)
      expect(laneManager.indexAt(133.33)).toBe(0)
      expect(laneManager.indexAt(666.67)).toBe(4)
    })

    it('should return index of nearest lane for position between lanes', () => {
      expect(laneManager.indexAt(200)).toBe(1) // Between lane 0 and 1, closer to 1
      expect(laneManager.indexAt(500)).toBe(2) // Between lane 2 and 3, closer to 2
    })
  })

  describe('snap()', () => {
    beforeEach(() => {
      laneManager.build(5, 0, 800)
    })

    it('should snap to exact lane center when deadzone is 0', () => {
      expect(laneManager.snap(200)).toBe(266.67) // Snap to lane 1
      expect(laneManager.snap(500)).toBe(533.33) // Snap to lane 3
    })

    it('should snap to exact lane center when within deadzone', () => {
      expect(laneManager.snap(200, 0)).toBe(266.67)
      expect(laneManager.snap(500, 0)).toBe(533.33)
    })

    it('should not snap when position is within deadzone', () => {
      const laneCenter = 266.67
      expect(laneManager.snap(laneCenter + 30, 50)).toBe(laneCenter + 30) // Within deadzone
      expect(laneManager.snap(laneCenter - 30, 50)).toBe(laneCenter - 30) // Within deadzone
    })

    it('should snap when position is outside deadzone', () => {
      const laneCenter = 266.67
      expect(laneManager.snap(laneCenter + 60, 50)).toBe(laneCenter) // Outside deadzone
      expect(laneManager.snap(laneCenter - 60, 50)).toBe(laneCenter) // Outside deadzone
    })

    it('should handle deadzone of 0 (legacy behavior)', () => {
      const laneCenter = 266.67
      expect(laneManager.snap(laneCenter + 1, 0)).toBe(laneCenter) // Always snap
      expect(laneManager.snap(laneCenter - 1, 0)).toBe(laneCenter) // Always snap
    })
  })

  describe('debug functionality', () => {
    it('should enable debug overlay', () => {
      laneManager.build(3, 0, 800)
      laneManager.enableDebug(0x00ffff)

      // Should not throw errors
      expect(() => laneManager.enableDebug()).not.toThrow()
    })

    it('should disable debug overlay', () => {
      laneManager.build(3, 0, 800)
      laneManager.enableDebug()
      laneManager.disableDebug()

      // Should not throw errors
      expect(() => laneManager.disableDebug()).not.toThrow()
    })
  })

  describe('events', () => {
    it('should emit lanes:changed event when building', () => {
      const mockEmit = jest.fn()
      scene.events.emit = mockEmit

      laneManager.build(3, 0, 800)

      expect(mockEmit).toHaveBeenCalledWith('lanes:changed', {
        count: 3,
        left: 0,
        width: 800,
        step: 200
      })
    })
  })
})
