import { describe, expect, it } from 'vitest'
import { reducer } from '../src/state/GameContext'
import { createInitialState } from '../src/state/storage'
import { generateDailyQuests } from '../src/game/quests'
import { lastNDays } from '../src/game/dates'
import { checkAchievements } from '../src/game/achievements'
import type { GameState } from '../src/game/types'

const MONDAY = '2026-09-21'

function questsDone(date: string, count = 4): GameState['questsByDate'][string] {
  return generateDailyQuests(date, count, 'normal', false).map((q) => ({ ...q, done: true }))
}

function stateWithWeek(except?: { missing?: string; partial?: string }): GameState {
  const questsByDate: GameState['questsByDate'] = {}
  for (const d of lastNDays(7, MONDAY)) {
    if (except?.missing === d) continue
    questsByDate[d] =
      except?.partial === d
        ? questsDone(d, 4).map((q, i) => (i === 0 ? { ...q, done: false } : q))
        : questsDone(d)
  }
  return { ...createInitialState(), currentDate: MONDAY, questsByDate }
}

describe('achievement boss_week', () => {
  it('Видає досягнення, коли всі 7 останніх днів ідеальні', () => {
    const s = stateWithWeek()
    expect(checkAchievements(s, 1)).toContain('boss_week')
  })

  it('Не видає, якщо один день тижня відсутній', () => {
    const s = stateWithWeek({ missing: lastNDays(7, MONDAY)[2] })
    expect(checkAchievements(s, 1)).not.toContain('boss_week')
  })

  it('Не видає, якщо один день виконаний не повністю', () => {
    const s = stateWithWeek({ partial: MONDAY })
    expect(checkAchievements(s, 1)).not.toContain('boss_week')
  })

  it('Розблоковується редуктором у момент завершення останнього квесту 7-го дня', () => {
    const s = stateWithWeek({ partial: MONDAY })
    const today = [...s.questsByDate[MONDAY]]
    const lastUndone = today.find((q) => !q.done)
    if (!lastUndone) throw new Error('expect one undone quest')
    const next = reducer(s, { type: 'COMPLETE_QUEST', questId: lastUndone.id })
    expect(next.unlockedAchievements.boss_week).toBe(MONDAY)
    expect(next.events.some((e) => e.type === 'achievement' && e.achievementId === 'boss_week')).toBe(
      true,
    )
  })

  it('Не розблоковується, поки на 7-му дні лишається невиконаний квест', () => {
    const s = stateWithWeek({ partial: MONDAY })
    const doneOnes = s.questsByDate[MONDAY].filter((q) => q.done)
    const next = reducer(s, { type: 'COMPLETE_QUEST', questId: doneOnes[0].id })
    expect(next.unlockedAchievements.boss_week).toBeUndefined()
  })

  it('Скасування квесту після перемоги не забирає досягнення', () => {
    const s = stateWithWeek({ partial: MONDAY })
    const today = [...s.questsByDate[MONDAY]]
    const lastUndone = today.find((q) => !q.done)
    if (!lastUndone) throw new Error('expect one undone quest')
    const won = reducer(s, { type: 'COMPLETE_QUEST', questId: lastUndone.id })
    const revoked = reducer(won, { type: 'UNCOMPLETE_QUEST', questId: lastUndone.id })
    expect(revoked.unlockedAchievements.boss_week).toBe(MONDAY)
  })
})