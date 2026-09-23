import { generateDailyQuests } from '../game/quests'
import { dateKey, shiftDateKey } from '../game/dates'
import { levelInfo } from '../game/leveling'
import {
  HABIT_DAY_GAIN,
  HABIT_MAX,
  HABIT_MISS_PENALTY,
  HABIT_PARTIAL_GAIN,
  HABIT_START,
  SICK_DAYS_LIMIT,
  SICK_DAYS_WINDOW_DAYS,
  SICK_HABIT_PENALTY,
  STORAGE_KEY,
  STATE_VERSION,
} from '../game/constants'
import type { GameSettings, GameState, PlayerProfile, QuestCategory } from '../game/types'

const EMPTY_CATEGORY: Record<QuestCategory, number> = {
  strength: 0,
  core: 0,
  cardio: 0,
  mobility: 0,
  break: 0,
}

const HABIT_HISTORY_CAP = 90

export function initialProfile(): PlayerProfile {
  return { name: 'Новачок', age: 21, heightCm: 183, weightKg: 72 }
}

export function initialSettings(): GameSettings {
  return { sound: true }
}

export function createInitialState(): GameState {
  const today = dateKey()
  return {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    currentDate: today,
    profile: initialProfile(),
    settings: initialSettings(),
    dayIntensity: 'normal',
    totalXp: 0,
    stats: { strength: 0, endurance: 0, agility: 0 },
    habit: HABIT_START,
    bestHabit: 0,
    streak: 0,
    bestStreak: 0,
    daysCounted: 1,
    dayBonusClaimed: false,
    totalQuestsDone: 0,
    perCategoryDone: { ...EMPTY_CATEGORY },
    questsByDate: { [today]: generateDailyQuests(today, 1, 'normal') },
    unlockedAchievements: {},
    sickUsed: [],
    habitHistory: [],
    swapsUsed: 0,
    soreGroups: [],
    events: [],
  }
}

/**
 * Міграція старих збережень:
 *  v1 → v2: integrity → habit, без стата discipline;
 *  v2 → v3: sickUsed / habitHistory;
 *  v3 → v4: swapsUsed / soreGroups.
 */
function migrateRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const r = raw as Record<string, unknown>
  const version = typeof r.version === 'number' ? r.version : 1
  if (version >= STATE_VERSION) return raw

  const next: Record<string, unknown> = { ...r, version: STATE_VERSION }
  if (version < 2) {
    next.habit = HABIT_START
    next.bestHabit = 0
    next.dayIntensity = 'normal'
    delete next.integrity
    if (next.stats && typeof next.stats === 'object') {
      const { discipline: _drop, ...stats } = next.stats as Record<string, unknown>
      next.stats = stats
    }
  }
  if (version < 3) {
    next.sickUsed = []
    next.habitHistory = []
  }
  if (version < 4) {
    next.swapsUsed = 0
    next.soreGroups = []
  }
  return next
}

export function normalizeState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = migrateRaw(raw) as Partial<GameState>
  if (typeof r.totalXp !== 'number') return null
  const base = createInitialState()
  if (r.questsByDate && typeof r.questsByDate === 'object') {
    base.questsByDate = r.questsByDate as GameState['questsByDate']
  }
  return {
    ...base,
    ...r,
    stats: { ...base.stats, ...(r.stats ?? {}) },
    perCategoryDone: { ...base.perCategoryDone, ...(r.perCategoryDone ?? {}) },
    unlockedAchievements:
      typeof r.unlockedAchievements === 'object'
        ? (r.unlockedAchievements as GameState['unlockedAchievements'])
        : {},
    sickUsed: Array.isArray(r.sickUsed) ? (r.sickUsed as string[]) : [],
    habitHistory: Array.isArray(r.habitHistory) ? (r.habitHistory as GameState['habitHistory']) : [],
    swapsUsed: typeof r.swapsUsed === 'number' ? r.swapsUsed : 0,
    soreGroups: Array.isArray(r.soreGroups) ? (r.soreGroups as GameState['soreGroups']) : [],
    events: [],
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveState(state: GameState): void {
  try {
    const { events: _events, ...persisted } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // localStorage недоступний — ігноруємо
  }
}

export function exportState(state: GameState): void {
  const { events: _events, ...persisted } = state
  const blob = new Blob([JSON.stringify(persisted, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fitquest-${state.currentDate}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Скільки токенів «хворого дня» лишилось у ковзному вікні. */
export function sickTokensLeft(state: GameState): number {
  const windowStart = shiftDateKey(state.currentDate, -SICK_DAYS_WINDOW_DAYS)
  const used = state.sickUsed.filter((d) => d >= windowStart && d <= state.currentDate).length
  return Math.max(0, SICK_DAYS_LIMIT - used)
}

/** Чи позначений сьогоднішній день як «хворий» (токен зарезервовано). */
export function isSickDayMarked(state: GameState): boolean {
  return state.sickUsed.includes(state.currentDate)
}

// Застосовує перехід на новий день.
// Кредит/штраф дня обробляється за КОЖЕН пропущений день (чесна динаміка дисципліни),
// а не один раз за всю прогалину.
export function rollover(state: GameState, todayIso: string = dateKey()): GameState {
  const today = todayIso
  if (state.currentDate === today) return state

  let next: GameState = state
  let cursor = state.currentDate
  while (cursor < today) {
    const day = cursor
    const dayQuests = next.questsByDate[day] ?? []
    const didWorkout = dayQuests.some((q) => q.main && q.done)
    const didSomething = dayQuests.some((q) => q.done)
    const wasSickDay = next.sickUsed.includes(day)
    const sickUsed = next.sickUsed.filter((d) => d !== day)

    next = {
      ...next,
      currentDate: day,
      daysCounted: next.daysCounted + 1,
      sickUsed,
      swapsUsed: 0,
      soreGroups: [],
      dayBonusClaimed: false,
    }

    if (didWorkout) {
      const habit = Math.min(HABIT_MAX, next.habit + HABIT_DAY_GAIN)
      const streak = next.streak + 1
      const bestStreak = Math.max(next.bestStreak, streak)
      const events =
        streak > next.bestStreak
          ? [...next.events, { type: 'newRecord' as const, streak }]
          : next.events
      next = {
        ...next,
        habit,
        bestHabit: Math.max(next.bestHabit, habit),
        streak,
        bestStreak,
        events,
      }
    } else if (didSomething) {
      const habit = Math.min(HABIT_MAX, next.habit + HABIT_PARTIAL_GAIN)
      next = {
        ...next,
        habit,
        bestHabit: Math.max(next.bestHabit, habit),
        events: [...next.events, { type: 'dayPartial' as const }],
      }
    } else if (wasSickDay) {
      next = {
        ...next,
        habit: Math.max(0, next.habit - SICK_HABIT_PENALTY),
        events: [...next.events, { type: 'sickDay' as const }],
      }
    } else {
      next = {
        ...next,
        habit: Math.max(0, next.habit - HABIT_MISS_PENALTY),
        streak: 0,
      }
    }

    next = {
      ...next,
      habitHistory: [...next.habitHistory, { date: day, value: next.habit }].slice(
        -HABIT_HISTORY_CAP,
      ),
    }
    cursor = shiftDateKey(cursor, 1)
  }

  const level = levelOf(next)
  const lastStrengthIds = new Set(
    (next.questsByDate[next.currentDate] ?? [])
      .filter((q) => q.category === 'strength' && q.main && q.done)
      .map((q) => q.templateId),
  )
  next = {
    ...next,
    currentDate: today,
    questsByDate: {
      ...next.questsByDate,
      [today]: generateDailyQuests(today, level, next.dayIntensity, false, new Set(), lastStrengthIds),
    },
  }
  return next
}

export function levelOf(state: GameState): number {
  return levelInfo(state.totalXp).level
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}