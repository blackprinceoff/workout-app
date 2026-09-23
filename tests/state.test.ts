import { describe, expect, it } from 'vitest'
import { reducer } from '../src/state/GameContext'
import { createInitialState } from '../src/state/storage'
import { generateDailyQuests } from '../src/game/quests'
import type { GameState, MuscleGroup } from '../src/game/types'

const MONDAY = '2026-09-21'

function stateFor(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), currentDate: MONDAY, ...patch }
}

describe('reducer — SET_INTENSITY', () => {
  it('Зберігає позначені «болячі» групи при зміні інтенсивності', () => {
    const sore: MuscleGroup[] = ['push']
    const s = stateFor({
      soreGroups: sore,
      dayIntensity: 'normal',
      questsByDate: {
        [MONDAY]: generateDailyQuests(MONDAY, 1, 'normal', false, new Set(sore)),
      },
    })
    const next = reducer(s, { type: 'SET_INTENSITY', intensity: 'light' })
    expect(next.dayIntensity).toBe('light')
    expect(next.soreGroups).toEqual(sore)
    for (const q of next.questsByDate[MONDAY]) {
      if (q.category === 'strength') expect(q.muscle).not.toBe('push')
    }
  })

  it('Зміна інтенсивності скидає лічильник замін (як чек-ін болю)', () => {
    const s = stateFor({
      dayIntensity: 'normal',
      swapsUsed: 2,
      questsByDate: { [MONDAY]: generateDailyQuests(MONDAY, 4, 'normal') },
    })
    const next = reducer(s, { type: 'SET_INTENSITY', intensity: 'intense' })
    expect(next.swapsUsed).toBe(0)
  })

  it('Ігнорує зміну, якщо квест дня вже виконано', () => {
    const quests = generateDailyQuests(MONDAY, 1, 'normal', false)
    quests[0] = { ...quests[0], done: true, completedAt: new Date().toISOString() }
    const s = stateFor({ dayIntensity: 'normal', questsByDate: { [MONDAY]: quests } })
    const next = reducer(s, { type: 'SET_INTENSITY', intensity: 'intense' })
    expect(next.dayIntensity).toBe('normal')
    expect(next.questsByDate[MONDAY]).toEqual(quests)
  })

  it('Зміна інтенсивності змінює набір дня (детерміновано від інтенсивності)', () => {
    const s = stateFor({
      dayIntensity: 'normal',
      questsByDate: { [MONDAY]: generateDailyQuests(MONDAY, 4, 'normal') },
    })
    const next = reducer(s, { type: 'SET_INTENSITY', intensity: 'intense' } as const)
    expect(next.questsByDate[MONDAY].map((q) => q.id)).not.toEqual(s.questsByDate[MONDAY].map((q) => q.id))
    const again = reducer(next, { type: 'SET_INTENSITY', intensity: 'normal' } as const)
    expect(again.dayIntensity).toBe('normal')
  })
})

describe('reducer — MARK_SICK_DAY', () => {
  it('Позначає день «хворим» і скасовує за повторного виклику', () => {
    const s = stateFor({ sickUsed: [], questsByDate: { [MONDAY]: generateDailyQuests(MONDAY, 1, 'normal') } })
    const marked = reducer(s, { type: 'MARK_SICK_DAY' })
    expect(marked.sickUsed).toContain(MONDAY)
    const unmarked = reducer(marked, { type: 'MARK_SICK_DAY' })
    expect(unmarked.sickUsed).toEqual([])
  })

  it('Не дозволяє позначити, якщо сьогодні вже є виконаний квест', () => {
    const quests = generateDailyQuests(MONDAY, 1, 'normal', false)
    quests[0] = { ...quests[0], done: true, completedAt: new Date().toISOString() }
    const s = stateFor({ sickUsed: [], questsByDate: { [MONDAY]: quests } })
    const next = reducer(s, { type: 'MARK_SICK_DAY' })
    expect(next.sickUsed).toEqual([])
  })
})

describe('reducer — SWAP_QUEST', () => {
  it('Заміна витрачає лічильник і не чіпає виконані квести', () => {
    const quests = generateDailyQuests(MONDAY, 5, 'normal', true)
    const s = stateFor({ swapsUsed: 0, questsByDate: { [MONDAY]: quests } })
    const target = quests[0]
    const next = reducer(s, { type: 'SWAP_QUEST', questId: target.id })
    expect(next.swapsUsed).toBe(1)
    expect(next.questsByDate[MONDAY].some((q) => q.id === target.id)).toBe(false)
  })

  it('Ігнорує заміну вже виконаного квеста', () => {
    const quests = generateDailyQuests(MONDAY, 5, 'normal', true)
    const done = { ...quests[2], done: true, completedAt: new Date().toISOString() }
    quests[2] = done
    const s = stateFor({ swapsUsed: 0, questsByDate: { [MONDAY]: quests } })
    const next = reducer(s, { type: 'SWAP_QUEST', questId: done.id })
    expect(next.swapsUsed).toBe(0)
    expect(next.questsByDate[MONDAY].some((q) => q.id === done.id)).toBe(true)
  })

  it('Ігнорує заміну, коли ліміт замін на день вичерпано', () => {
    const quests = generateDailyQuests(MONDAY, 5, 'normal', true)
    const s = stateFor({ swapsUsed: 3, questsByDate: { [MONDAY]: quests } })
    const next = reducer(s, { type: 'SWAP_QUEST', questId: quests[0].id })
    expect(next.swapsUsed).toBe(3)
    expect(next.questsByDate[MONDAY].map((q) => q.id)).toEqual(quests.map((q) => q.id))
  })
})