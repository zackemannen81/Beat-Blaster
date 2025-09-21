import { describe, it, expect } from 'vitest'
import { getDifficultyProfile } from '../src/config/difficultyProfiles'

describe('difficulty profiles', () => {
  it('provides ascending stage tuning for normal profile', () => {
    const profile = getDifficultyProfile('normal')
    expect(profile.stageTuning.length).toBeGreaterThan(0)

    const stages = profile.stageTuning.map((cfg) => cfg.stage)
    const sorted = [...stages].sort((a, b) => a - b)
    expect(stages).toEqual(sorted)
  })

  it('scales enemy caps across stages', () => {
    const profile = getDifficultyProfile('hard')
    const first = profile.stageTuning[0]
    const last = profile.stageTuning[profile.stageTuning.length - 1]
    expect(last.enemyCap).toBeGreaterThan(first.enemyCap)
    expect(last.scrollMultiplier).toBeGreaterThanOrEqual(first.scrollMultiplier)
  })
})
