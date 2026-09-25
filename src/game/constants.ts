import type { DayKind, Intensity, QuestCategory, StatKey } from './types'

export const STORAGE_KEY = 'fitquest-state-v2'

export const STATE_VERSION = 9

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Сила',
  endurance: 'Витривалість',
  agility: 'Швидкість',
}

export const CATEGORY_LABELS: Record<QuestCategory, string> = {
  strength: 'Силові',
  core: 'Кор',
  cardio: 'Кардіо',
  mobility: 'Розтяжка',
  break: 'Перерва від сидіння',
}

export const CLASS_BY_LEVEL: { minLevel: number; name: string }[] = [
  { minLevel: 1, name: 'Новобранець' },
  { minLevel: 3, name: 'Страж' },
  { minLevel: 5, name: 'Воїн' },
  { minLevel: 8, name: 'Лицар' },
  { minLevel: 12, name: 'Ветеран' },
  { minLevel: 16, name: 'Майстер' },
  { minLevel: 20, name: 'Легенда' },
  { minLevel: 25, name: 'Міф' },
  { minLevel: 30, name: 'Титан' },
]

export const CLASS_CYCLE = 30

export const EPITHETS: string[] = [
  'Загартований',
  'Сяючий',
  'Грозовий',
  'Крижаний',
  'Полум’яний',
  'Місячний',
  'Зірковий',
  'Королівський',
  'Нескорений',
  'Вічний',
]

export const XP_DIFFICULTY: Record<1 | 2 | 3, number> = {
  1: 30,
  2: 50,
  3: 80,
}

export const DAILY_COMPLETE_BONUS = 40

export const STREAK_BONUS_PER_DAY = 0.02
export const STREAK_BONUS_CAP = 0.2

// Крива рівнів: швидкий старт → помірний плато → фінал, що зростає.
// Ціль: ~2 роки до 100-го рівня при темпі «1–3 основні квести/день».
export interface XpSegment {
  from: number
  base: number
  step: number
}
export const XP_CURVE_SEGMENTS: XpSegment[] = [
  { from: 1, base: 70, step: 50 }, // 1–12: швидкий старт
  { from: 13, base: 550, step: 0 }, // 13–30: сталий темп
  { from: 31, base: 650, step: 10 }, // 31–60: плавне зростання
  { from: 61, base: 700, step: 13 }, // 61–80: ~1–1.5 тижня на рівень
  { from: 81, base: 1050, step: 45 }, // 81–100: фінальний марафон (~2 тижні)
]

// Дисципліна — звичка 0–100 (формується ~21 день).
export const HABIT_START = 0
export const HABIT_MAX = 100
export const HABIT_DAY_GAIN = 5
export const HABIT_MISS_PENALTY = 10
export const HABIT_XP_BASE = 0.8
export const HABIT_XP_SPREAD = 0.2

// Інтенсивність дня (ручний вибір).
export const INTENSITY_FACTOR: Record<Intensity, number> = {
  light: 0.7,
  normal: 1.0,
  intense: 1.35,
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  light: 'Легкий',
  normal: 'Звичайний',
  intense: 'Інтенсивний',
}

// Денний цикл: навантаження за днем тижня (getDay(): 0=Нд … 6=Сб).
export const DAY_LOAD: Record<number, number> = {
  0: 0.6,
  1: 1.0,
  2: 1.2,
  3: 0.8,
  4: 1.0,
  5: 1.2,
  6: 0.8,
}

export const DAY_KIND_BY_WEEKDAY: Record<number, DayKind> = {
  0: 'recovery',
  1: 'normal',
  2: 'hard',
  3: 'light',
  4: 'normal',
  5: 'hard',
  6: 'light',
}

export const DAY_KIND_LABEL: Record<DayKind, string> = {
  recovery: 'Відновлення',
  light: 'Легкий день',
  normal: 'Звичайний день',
  hard: 'Тяжкий день',
}

export const LOAD_MIN = 0.5
export const LOAD_MAX = 1.6

// Розігрів: перші рівні м'якші — множник на навантаження дня.
export const WARM_BY_LEVEL: { minLevel: number; factor: number }[] = [
  { minLevel: 1, factor: 0.75 },
  { minLevel: 4, factor: 0.9 },
  { minLevel: 7, factor: 1.0 },
]

// Прогресивні підходи: 1 → 2 → 3 у міру рівнів.
export const SETS_MID_LEVEL = 3
export const SETS_FULL_LEVEL = 6

// Токен «хворого дня»: заморожує серію, звичка штрафується м'якше.
export const SICK_DAYS_LIMIT = 3
export const SICK_DAYS_WINDOW_DAYS = 30
export const SICK_HABIT_PENALTY = 5

// Поріг звички для підказки «навіть 1 легкий квест».
export const NUDGE_HABIT_BELOW = 30

// «Система самодогляду»: гнучкість без експлуатації.
export const SWAPS_PER_DAY = 3
export const HABIT_PARTIAL_GAIN = 2