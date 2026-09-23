import { describe, expect, it } from 'vitest'
import { createInitialState, normalizeState, rollover } from '../src/state/storage'
import { shiftDateKey } from '../src/game/dates'
import type { DailyQuest, GameState } from '../src/game/types'

const PAST = '2020-01-01'
// Фіксуємо «сьогодні» у тестах як наступний день після PAST — один пропущений день,
// щоб rollover не тягнув за собою всю прогалину до реальної поточної дати.
const NEXT_DAY = shiftDateKey(PAST, 1)

function rollNext(state: GameState): GameState {
  return rollover(state, NEXT_DAY)
}

function quest(templateId: string, main: boolean, done: boolean): DailyQuest {
  return {
    id: `${templateId}-1`,
    templateId,
    variantId: 'l1',
    title: templateId,
    description: '',
    category: main ? 'core' : 'break',
    difficulty: 1,
    xp: 50,
    main,
    done,
    completedAt: done ? '2020-01-01T10:00:00Z' : null,
  }
}

function base(patch: Partial<GameState> = {}): GameState {
  const s = createInitialState()
  return {
    ...s,
    currentDate: PAST,
    habit: 40,
    bestHabit: 40,
    streak: 7,
    bestStreak: 7,
    ...patch,
  }
}

describe('rollover — кредит дня', () => {
  it('Повний день: +5 і серія +1', () => {
    const next = rollNext(base({ questsByDate: { [PAST]: [quest('plank', true, true)] } }))
    expect(next.habit).toBe(45)
    expect(next.streak).toBe(8)
    expect(next.bestHabit).toBe(45)
    expect(next.bestStreak).toBe(8)
  })

  it('Частковий день (лише не-основні): +2, серія заморожена, подія dayPartial', () => {
    const next = rollNext(base({ questsByDate: { [PAST]: [quest('stretch_back', false, true)] } }))
    expect(next.habit).toBe(42)
    expect(next.streak).toBe(7)
    expect(next.bestHabit).toBe(42)
    expect(next.events.some((e) => e.type === 'dayPartial')).toBe(true)
  })

  it('Повний прогул: −10 і серія обнуляється', () => {
    const next = rollNext(base({ questsByDate: { [PAST]: [quest('plank', true, false)] } }))
    expect(next.habit).toBe(30)
    expect(next.streak).toBe(0)
  })

  it('Хворий день: −5, серія заморожена, токен витрачено', () => {
    const next = rollNext(
      base({ sickUsed: [PAST], questsByDate: { [PAST]: [quest('plank', true, false)] } }),
    )
    expect(next.habit).toBe(35)
    expect(next.streak).toBe(7)
    expect(next.sickUsed).not.toContain(PAST)
    expect(next.events.some((e) => e.type === 'sickDay')).toBe(true)
  })

  it('Хворий день + все ж потренувався: повний кредит (+5), токен не витрачається', () => {
    const next = rollNext(
      base({ sickUsed: [PAST], questsByDate: { [PAST]: [quest('plank', true, true)] } }),
    )
    expect(next.habit).toBe(45)
    expect(next.streak).toBe(8)
    expect(next.sickUsed).not.toContain(PAST)
  })

  it('Хворий день + легкі квести: частковий кредит має перевагу (−5 не застосовується)', () => {
    const next = rollNext(
      base({ sickUsed: [PAST], habit: 10, questsByDate: { [PAST]: [quest('stretch_back', false, true)] } }),
    )
    expect(next.habit).toBe(12)
    expect(next.streak).toBe(7)
  })

  it('Звичка не падає нижче нуля', () => {
    const next = rollNext(base({ habit: 0, questsByDate: { [PAST]: [quest('plank', true, false)] } }))
    expect(next.habit).toBe(0)
    expect(next.streak).toBe(0)
  })
})

describe('rollover — скидання й історія', () => {
  it('Скидає swapsUsed, soreGroups і dayBonusClaimed, повертається новий день', () => {
    const next = rollNext(
      base({
        swapsUsed: 3,
        soreGroups: ['push', 'leg'],
        dayBonusClaimed: true,
        habitHistory: [{ date: PAST, value: 40 }],
        questsByDate: { [PAST]: [quest('plank', true, false)] },
      }),
    )
    expect(next.swapsUsed).toBe(0)
    expect(next.soreGroups).toEqual([])
    expect(next.dayBonusClaimed).toBe(false)
    expect(next.currentDate).not.toBe(PAST)
  })

  it('Додає точку історії на кожному переході, кап 90', () => {
    const history = Array.from({ length: 90 }, (_, i) => ({
      date: `2019-${String((i % 12) + 1).padStart(2, '0')}-01`,
      value: i,
    }))
    const next = rollNext(
      base({ habitHistory: history, questsByDate: { [PAST]: [quest('plank', true, false)] } }),
    )
    expect(next.habitHistory).toHaveLength(90)
    expect(next.habitHistory[next.habitHistory.length - 1].value).toBe(next.habit)
  })

  it('Новий день має згенеровані квести', () => {
    const next = rollNext(base({ questsByDate: {} }))
    expect(next.questsByDate[next.currentDate].length).toBeGreaterThan(0)
  })

  it('Прогалина в кілька днів: штраф за КОЖЕН пропущений день', () => {
    const next = rollover(base({ questsByDate: {} }), '2020-01-04')
    // 2020-01-01, 02, 03 — три повних прогули
    expect(next.habit).toBe(10) // 40 − 3×10
    expect(next.streak).toBe(0)
    expect(next.daysCounted).toBe(4) // 1 базовий + 3 прогуляні
    expect(next.currentDate).toBe('2020-01-04')
  })

  it('Прогалина фіксує звичку в історії за кожен день', () => {
    const next = rollover(base({ questsByDate: {} }), '2020-01-03')
    const days = next.habitHistory.map((p) => p.date)
    expect(days).toEqual(['2020-01-01', '2020-01-02'])
    expect(next.habitHistory[next.habitHistory.length - 1].value).toBe(20)
  })
})

describe('normalizeState — міграції', () => {
  it('v1 (integrity) → current: habit=0, без discipline, тільки 3 стати', () => {
    const raw = {
      version: 1,
      totalXp: 120,
      integrity: 55,
      stats: { strength: 2, endurance: 1, agility: 1, discipline: 4 },
    }
    const s = normalizeState(raw)!
    expect(s.version).toBe(4)
    expect(s.habit).toBe(0)
    expect('discipline' in s.stats).toBe(false)
    expect(Object.keys(s.stats)).toEqual(['strength', 'endurance', 'agility'])
  })

  it('v2 → v4: додано sickUsed/habitHistory/swapsUsed/soreGroups', () => {
    const raw = { version: 2, totalXp: 100 }
    const s = normalizeState(raw)!
    expect(s.sickUsed).toEqual([])
    expect(s.habitHistory).toEqual([])
    expect(s.swapsUsed).toBe(0)
    expect(s.soreGroups).toEqual([])
  })

  it('v3 → v4: додано swapsUsed/soreGroups', () => {
    const raw = {
      version: 3,
      totalXp: 100,
      sickUsed: ['2020-01-01'],
      habitHistory: [{ date: '2020-01-01', value: 40 }],
    }
    const s = normalizeState(raw)!
    expect(s.version).toBe(4)
    expect(s.swapsUsed).toBe(0)
    expect(s.soreGroups).toEqual([])
    expect(s.sickUsed).toEqual(['2020-01-01'])
  })

  it('v4 лишається без змін', () => {
    const s = normalizeState({ version: 4, totalXp: 100, swapsUsed: 2, soreGroups: ['push'] })!
    expect(s.swapsUsed).toBe(2)
    expect(s.soreGroups).toEqual(['push'])
  })
})