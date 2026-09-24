import { describe, expect, it } from 'vitest'
import { createInitialState, normalizeState, rollover, sickTokensLeft } from '../src/state/storage'
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

  it('Повний прогул кидає подію miss (тост «серія згоріла»)', () => {
    const next = rollover(base({ streak: 5, questsByDate: {} }), '2020-01-02')
    expect(next.events.filter((e) => e.type === 'miss')).toHaveLength(1)
    expect(next.streak).toBe(0)
  })

  it('Прогалина фіксує звичку в історії за кожен день', () => {
    const next = rollover(base({ questsByDate: {} }), '2020-01-03')
    const days = next.habitHistory.map((p) => p.date)
    expect(days).toEqual(['2020-01-01', '2020-01-02'])
    expect(next.habitHistory[next.habitHistory.length - 1].value).toBe(20)
  })
})

describe('rollover — «хворий день» у багатоденній прогалині', () => {
  it('Прогалина 3 дні з «хворим» посередині: −10, −5, −10; серія обнуляється лише на прогулах', () => {
    const next = rollover(
      base({ habit: 40, streak: 7, sickUsed: ['2020-01-02'], questsByDate: {} }),
      '2020-01-04',
    )
    // 01-01: прогул −10 → 30 · 01-02: хворий −5 → 25 · 01-03: прогул −10 → 15
    expect(next.habit).toBe(15)
    expect(next.streak).toBe(0)
    expect(next.sickUsed).toEqual([])
    expect(next.events.filter((e) => e.type === 'sickDay')).toHaveLength(1)
  })

  it('Два хворих дні поспіль без тренувань: −5 за кожен, серія заморожена', () => {
    const next = rollover(
      base({ habit: 40, streak: 3, sickUsed: ['2020-01-01', '2020-01-02'], questsByDate: {} }),
      '2020-01-03',
    )
    expect(next.habit).toBe(30)
    expect(next.streak).toBe(3)
    expect(next.bestStreak).toBe(7) // рекорд не змінюється
    expect(next.sickUsed).toEqual([])
  })

  it('Два хворих дні + один прогул: −25 сумарно, серія падає лише на прогулі', () => {
    const next = rollover(
      base({ habit: 40, streak: 3, sickUsed: ['2020-01-01', '2020-01-02'], questsByDate: {} }),
      '2020-01-04',
    )
    // 01-01 хворий −5 · 01-02 хворий −5 · 01-03 прогул −10
    expect(next.habit).toBe(20)
    expect(next.streak).toBe(0)
  })
})

describe('sickTokensLeft — ковзне вікно 30 днів', () => {
  it('Ліміт 3: після трьох використаних у вікні токенів не лишається', () => {
    const s = base({ currentDate: '2020-02-10', sickUsed: ['2020-01-15', '2020-01-20', '2020-02-01'] })
    expect(sickTokensLeft(s)).toBe(0)
  })

  it('Токени поза вікном (>30 днів) не рахуються', () => {
    const s = base({ currentDate: '2020-02-10', sickUsed: ['2020-01-01', '2020-01-20'] })
    // вікно відкривається 2020-01-11; 2020-01-01 — поза ним
    expect(sickTokensLeft(s)).toBe(2)
  })

  it('На межі ліміту з багатоденними прогулами: спожиті токени згоряють у rollover', () => {
    const s = base({
      currentDate: '2020-02-01',
      sickUsed: ['2020-01-25', '2020-01-28', '2020-02-01'],
      questsByDate: {},
    })
    expect(sickTokensLeft(s)).toBe(0)
    const next = rollover(s, '2020-02-05')
    // 02-01 споживається в rollover; лишились два токени у вікні
    expect(sickTokensLeft(next)).toBe(1)
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
    expect(s.version).toBe(7)
    expect(s.habit).toBe(0)
    expect('discipline' in s.stats).toBe(false)
    expect(Object.keys(s.stats)).toEqual(['strength', 'endurance', 'agility'])
  })

  it('v2 → v7: додано sickUsed/habitHistory/swapsUsed/soreGroups/weightHistory/onboardingDone/notifications', () => {
    const raw = { version: 2, totalXp: 100 }
    const s = normalizeState(raw)!
    expect(s.sickUsed).toEqual([])
    expect(s.habitHistory).toEqual([])
    expect(s.swapsUsed).toBe(0)
    expect(s.soreGroups).toEqual([])
    expect(s.weightHistory).toEqual([])
    expect(s.onboardingDone).toBe(false)
    expect(s.settings.notifications).toBe(false)
  })

  it('v3 → v7: додано swapsUsed/soreGroups/weightHistory/onboardingDone/notifications', () => {
    const raw = {
      version: 3,
      totalXp: 100,
      sickUsed: ['2020-01-01'],
      habitHistory: [{ date: '2020-01-01', value: 40 }],
    }
    const s = normalizeState(raw)!
    expect(s.version).toBe(7)
    expect(s.swapsUsed).toBe(0)
    expect(s.soreGroups).toEqual([])
    expect(s.weightHistory).toEqual([])
    expect(s.sickUsed).toEqual(['2020-01-01'])
    expect(s.settings.notifications).toBe(false)
  })

  it('v4 → v7: додано weightHistory/onboardingDone/notifications, лишає swaps/sore', () => {
    const s = normalizeState({ version: 4, totalXp: 100, swapsUsed: 2, soreGroups: ['push'] })!
    expect(s.version).toBe(7)
    expect(s.swapsUsed).toBe(2)
    expect(s.soreGroups).toEqual(['push'])
    expect(s.weightHistory).toEqual([])
    expect(s.onboardingDone).toBe(false)
    expect(s.settings.notifications).toBe(false)
  })

  it('v5 → v7: додано onboardingDone/notifications, лишає weightHistory', () => {
    const s = normalizeState({ version: 5, totalXp: 100, weightHistory: [{ date: '2026-01-01', valueKg: 80 }] })!
    expect(s.version).toBe(7)
    expect(s.onboardingDone).toBe(false)
    expect(s.weightHistory).toEqual([{ date: '2026-01-01', valueKg: 80 }])
    expect(s.settings.notifications).toBe(false)
  })

  it('v6 → v7: додано settings.notifications', () => {
    const s = normalizeState({ version: 6, totalXp: 100, onboardingDone: true, settings: { sound: false } })!
    expect(s.version).toBe(7)
    expect(s.settings.sound).toBe(false)
    expect(s.settings.notifications).toBe(false)
  })

  it('v7 лишається без змін', () => {
    const s = normalizeState({
      version: 7,
      totalXp: 100,
      onboardingDone: true,
      settings: { sound: true, notifications: true },
      weightHistory: [{ date: '2026-01-01', valueKg: 80 }],
    })!
    expect(s.version).toBe(7)
    expect(s.onboardingDone).toBe(true)
    expect(s.settings.notifications).toBe(true)
    expect(s.weightHistory).toEqual([{ date: '2026-01-01', valueKg: 80 }])
  })
})

describe('normalizeState — стійкість до керованого JSON (імпорт)', () => {
  it('Відхиляє вхід без числа totalXp / з NaN / від’ємним', () => {
    expect(normalizeState({ version: 4, totalXp: '100' })).toBeNull()
    expect(normalizeState({ version: 4, totalXp: NaN })).toBeNull()
    expect(normalizeState({ version: 4, totalXp: -5 })).toBeNull()
  })

  it('Викидає дні з не-масивом чи зламаними елементами questsByDate, зберігає цілі', () => {
    const ok = quest('plank', true, true)
    const raw = {
      version: 4,
      totalXp: 100,
      questsByDate: {
        '2020-01-01': { foo: 1 },
        '2020-01-02': [ok, null as unknown as DailyQuest, { id: 1 } as unknown as DailyQuest],
        '2020-01-03': [ok],
      },
    }
    const s = normalizeState(raw)!
    expect(s.questsByDate['2020-01-01']).toBeUndefined()
    expect(s.questsByDate['2020-01-02']).toBeUndefined()
    expect(s.questsByDate['2020-01-03']).toEqual([ok])
  })

  it('Очищає стати: рядки/NaN/від’ємні → 0, невідомі ключі не протікають', () => {
    const s = normalizeState({
      version: 4,
      totalXp: 100,
      stats: { strength: '5', endurance: NaN, agility: -3, extra: 9 },
    })!
    expect(s.stats.strength).toBe(0)
    expect(s.stats.endurance).toBe(0)
    expect(s.stats.agility).toBe(0)
    expect(s.stats.extra).toBeUndefined()
  })

  it('Відкидає не-розбірливу дату currentDate і мотлох у звичці/серії', () => {
    const s = normalizeState({
      version: 4,
      totalXp: 50,
      currentDate: 'вчора',
      habit: -10,
      streak: NaN,
      bestStreak: '7',
      dayIntensity: 'занадто',
    })!
    expect(typeof s.currentDate).toBe('string')
    expect(/^\d{4}-\d{2}-\d{2}$/.test(s.currentDate)).toBe(true)
    expect(s.habit).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(0)
    expect(s.dayIntensity).toBe('normal')
  })

  it('Профіль і налаштування відновлюються з базових значень при мотлоху', () => {
    const s = normalizeState({
      version: 4,
      totalXp: 10,
      profile: { name: 5, age: '21', heightCm: -180, weightKg: NaN },
      settings: { sound: 'так' },
    })!
    expect(s.profile.name).toBe('Новачок')
    expect(s.profile.age).toBe(21)
    expect(s.profile.heightCm).toBe(183)
    expect(s.profile.weightKg).toBe(72)
    expect(s.settings.sound).toBe(true)
  })

  it('sickUsed/soreGroups — лише рядки; habitHistory — лише валідні записи', () => {
    const s = normalizeState({
      version: 4,
      totalXp: 10,
      sickUsed: ['2020-01-01', 7 as unknown as string, null as unknown as string],
      soreGroups: ['push', { x: 1 } as unknown as string],
      habitHistory: [
        { date: '2020-01-01', value: 40 },
        null,
        { date: 5, value: 'x' },
        { date: '2020-01-02', value: NaN },
      ],
    })!
    expect(s.sickUsed).toEqual(['2020-01-01'])
    expect(s.soreGroups).toEqual(['push'])
    expect(s.habitHistory).toEqual([{ date: '2020-01-01', value: 40 }])
  })

  it('weightHistory — лише валідні записи {date, valueKg}', () => {
    const s = normalizeState({
      version: 5,
      totalXp: 10,
      weightHistory: [
        { date: '2026-01-05', valueKg: 80.4 },
        null as unknown as { date: string; valueKg: number },
        { date: 'вчора', valueKg: 81 },
        { date: '2026-01-12', valueKg: -3 },
        { date: '2026-01-19', valueKg: NaN },
      ],
    })!
    expect(s.weightHistory).toEqual([{ date: '2026-01-05', valueKg: 80.4 }])
  })
})