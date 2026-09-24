import { describe, it, expect } from 'vitest'
import { getCompanionInfo } from '../src/game/companion'
import { createInitialState } from '../src/state/storage'
import type { DailyQuest } from '../src/game/types'

describe('Companion system', () => {
  it('gives sleepy mood for fresh low-habit state', () => {
    const state = createInitialState()
    const quests: DailyQuest[] = []
    const info = getCompanionInfo(state, quests)
    expect(info.mood).toBe('sleepy')
  })

  it('gives proud mood when all quests done', () => {
    const state = createInitialState()
    const quests: DailyQuest[] = [
      {
        id: '1',
        templateId: 't1',
        variantId: 'v1',
        title: 'Test',
        description: 'Test',
        category: 'strength',
        difficulty: 1,
        xp: 10,
        main: true,
        done: true,
        completedAt: null,
      },
    ]
    const info = getCompanionInfo(state, quests)
    expect(info.mood).toBe('proud')
    expect(info.quote).toContain('Усі квести')
  })

  it('gives happy mood when streak is high', () => {
    const state = { ...createInitialState(), streak: 5 }
    const quests: DailyQuest[] = [
      {
        id: '1',
        templateId: 't1',
        variantId: 'v1',
        title: 'Test',
        description: 'Test',
        category: 'strength',
        difficulty: 1,
        xp: 10,
        main: true,
        done: false,
        completedAt: null,
      },
    ]
    const info = getCompanionInfo(state, quests)
    expect(info.mood).toBe('happy')
  })
})
