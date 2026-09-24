import type { AchievementDef } from './types'
import { lastNDays } from './dates'

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_step',
    title: 'Перший крок',
    description: 'Виконай свій перший квест',
    check: (s) => s.totalQuestsDone >= 1,
  },
  {
    id: 'streak_3',
    title: 'Караван не зупиняється',
    description: 'Серія 3 дні',
    check: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Тиждень воїна',
    description: 'Серія 7 днів',
    check: (s) => s.bestStreak >= 7,
  },
  {
    id: 'streak_14',
    title: 'Двічі по тижню',
    description: 'Серія 14 днів',
    check: (s) => s.bestStreak >= 14,
  },
  {
    id: 'streak_30',
    title: 'Місяць без пощади',
    description: 'Серія 30 днів',
    check: (s) => s.bestStreak >= 30,
  },
  {
    id: 'streak_66',
    title: 'Два місяці волі',
    description: 'Серія 66 днів',
    check: (s) => s.bestStreak >= 66,
  },
  {
    id: 'streak_100',
    title: 'Сотня',
    description: 'Серія 100 днів',
    check: (s) => s.bestStreak >= 100,
  },
  {
    id: 'habit_crafted',
    title: 'Сформована звичка',
    description: 'Досягни дисципліни 100 — звичка встоялась',
    check: (s) => s.bestHabit >= 100,
  },
  {
    id: 'level_5',
    title: 'Вище по щаблях',
    description: 'Досягни 5 рівня',
    check: (_s, l) => l >= 5,
  },
  {
    id: 'level_10',
    title: 'Пів-шляху до легенди',
    description: 'Досягни 10 рівня',
    check: (_s, l) => l >= 10,
  },
  {
    id: 'level_20',
    title: 'Вершина гори',
    description: 'Досягни 20 рівня',
    check: (_s, l) => l >= 20,
  },
  {
    id: 'level_30',
    title: 'Титан',
    description: 'Досягни 30 рівня',
    check: (_s, l) => l >= 30,
  },
  {
    id: 'level_50',
    title: 'Жива легенда',
    description: 'Досягни 50 рівня',
    check: (_s, l) => l >= 50,
  },
  {
    id: 'level_100',
    title: 'Міф у плоті',
    description: 'Досягни 100 рівня',
    check: (_s, l) => l >= 100,
  },
  {
    id: 'quests_25',
    title: 'Тренований',
    description: '25 виконаних квестів',
    check: (s) => s.totalQuestsDone >= 25,
  },
  {
    id: 'quests_100',
    title: 'Сотник',
    description: '100 виконаних квестів',
    check: (s) => s.totalQuestsDone >= 100,
  },
  {
    id: 'quests_500',
    title: 'Безперервний рух',
    description: '500 виконаних квестів',
    check: (s) => s.totalQuestsDone >= 500,
  },
  {
    id: 'quests_1000',
    title: 'Тисяча ударів',
    description: '1000 виконаних квестів',
    check: (s) => s.totalQuestsDone >= 1000,
  },
  {
    id: 'balanced',
    title: 'Рівновага сил',
    description: 'Прокачай кожну характеристику до 10',
    check: (s) =>
      s.stats.strength >= 10 &&
      s.stats.endurance >= 10 &&
      s.stats.agility >= 10,
  },
  {
    id: 'nights_watch',
    title: 'Страж спини',
    description: 'Виконай 10 квестів "перерва від сидіння"',
    check: (s) => s.perCategoryDone.break >= 10,
  },
  {
    id: 'boss_week',
    title: 'Переможець тижня',
    description: '7 ідеальних днів із 7 останніх — бос тижня переможений',
    check: (s) =>
      lastNDays(7, s.currentDate).every((d) => {
        const qs = s.questsByDate[d]
        return !!qs && qs.length > 0 && qs.every((q) => q.done)
      }),
  },
]

export function checkAchievements(state: import('./types').GameState, level: number): string[] {
  const newly: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (state.unlockedAchievements[a.id]) continue
    if (a.check(state, level)) newly.push(a.id)
  }
  return newly
}

export function getAchievementProgress(id: string, state: import('./types').GameState, level: number): string | null {
  if (state.unlockedAchievements[id]) return null
  switch (id) {
    case 'first_step':
      return `${Math.min(1, state.totalQuestsDone)}/1`
    case 'streak_3':
      return `${Math.min(3, state.bestStreak)}/3 дн.`
    case 'streak_7':
      return `${Math.min(7, state.bestStreak)}/7 дн.`
    case 'streak_14':
      return `${Math.min(14, state.bestStreak)}/14 дн.`
    case 'streak_30':
      return `${Math.min(30, state.bestStreak)}/30 дн.`
    case 'streak_66':
      return `${Math.min(66, state.bestStreak)}/66 дн.`
    case 'streak_100':
      return `${Math.min(100, state.bestStreak)}/100 дн.`
    case 'habit_crafted':
      return `${Math.min(100, Math.round(state.bestHabit))}/100`
    case 'level_5':
      return `${Math.min(5, level)}/5`
    case 'level_10':
      return `${Math.min(10, level)}/10`
    case 'level_20':
      return `${Math.min(20, level)}/20`
    case 'level_30':
      return `${Math.min(30, level)}/30`
    case 'level_50':
      return `${Math.min(50, level)}/50`
    case 'level_100':
      return `${Math.min(100, level)}/100`
    case 'quests_25':
      return `${Math.min(25, state.totalQuestsDone)}/25`
    case 'quests_100':
      return `${Math.min(100, state.totalQuestsDone)}/100`
    case 'quests_500':
      return `${Math.min(500, state.totalQuestsDone)}/500`
    case 'quests_1000':
      return `${Math.min(1000, state.totalQuestsDone)}/1000`
    case 'balanced': {
      const count = [
        state.stats.strength >= 10 ? 1 : 0,
        state.stats.endurance >= 10 ? 1 : 0,
        state.stats.agility >= 10 ? 1 : 0,
      ].reduce((a, b) => a + b, 0)
      return `${count}/3`
    }
    case 'nights_watch':
      return `${Math.min(10, state.perCategoryDone.break)}/10`
    case 'boss_week': {
      const last7 = lastNDays(7, state.currentDate)
      const completedCount = last7.filter((d) => {
        const q = state.questsByDate[d]
        return !!q && q.length > 0 && q.every((x) => x.done)
      }).length
      return `${completedCount}/7 днів`
    }
    default:
      return null
  }
}