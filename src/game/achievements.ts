import type { AchievementDef } from './types'

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
]

export function checkAchievements(state: import('./types').GameState, level: number): string[] {
  const newly: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (state.unlockedAchievements[a.id]) continue
    if (a.check(state, level)) newly.push(a.id)
  }
  return newly
}