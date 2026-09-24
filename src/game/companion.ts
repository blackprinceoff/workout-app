import type { DailyQuest, GameState } from './types'

export type CompanionMood = 'proud' | 'happy' | 'sleepy' | 'worried' | 'neutral'

export interface CompanionInfo {
  name: string
  mood: CompanionMood
  quote: string
  badge: string
}

export function getCompanionInfo(state: GameState, todayQuests: DailyQuest[]): CompanionInfo {
  const allDone = todayQuests.length > 0 && todayQuests.every((q) => q.done)
  const anyDone = todayQuests.some((q) => q.done)

  let mood: CompanionMood = 'neutral'
  let quote = 'Готовий до нових звершень? Обирай квест нижче.'

  if (allDone) {
    mood = 'proud'
    quote = 'Усі квести дня підкорені! Легендарно.'
  } else if (state.streak >= 3 || state.habit >= 60) {
    mood = 'happy'
    quote = 'Темп чудовий! М\'язи міцнішають із кожним днем.'
  } else if (state.habit < 30 && state.streak === 0 && !anyDone) {
    mood = 'sleepy'
    quote = 'Час розім\'ятись! Навіть легкий старт краще за диван.'
  } else if (state.habit < 40 && !anyDone) {
    mood = 'worried'
    quote = 'Звичка падає... Зроби хоча б один квест сьогодні!'
  } else if (anyDone) {
    mood = 'happy'
    quote = 'Чудовий старт дня! Продовжуємо в тому ж дусі.'
  }

  const name = 'Фіт-Бот Спаркі'
  const badge =
    mood === 'proud'
      ? 'Тріумф'
      : mood === 'happy'
        ? 'У формі'
        : mood === 'sleepy'
          ? 'Дрімає'
          : mood === 'worried'
            ? 'Тривога'
            : 'Готовий'

  return { name, mood, quote, badge }
}
