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
import type {
  GameSettings,
  GameState,
  MuscleGroup,
  PlayerProfile,
  QuestCategory,
} from '../game/types'

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
  return { sound: true, notifications: false }
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
    weightHistory: [],
    swapsUsed: 0,
    soreGroups: [],
    onboardingDone: false,
    events: [],
  }
}

/**
 * Міграція старих збережень:
 *  v1 → v2: integrity → habit, без стата discipline;
 *  v2 → v3: sickUsed / habitHistory;
 *  v3 → v4: swapsUsed / soreGroups;
 *  v4 → v5: weightHistory;
 *  v5 → v6: onboardingDone;
 *  v6 → v7: settings.notifications.
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
  if (version < 5) {
    next.weightHistory = []
  }
  if (version < 6) {
    next.onboardingDone = false
  }
  if (version < 7) {
    const s = (next.settings ?? {}) as Record<string, unknown>
    if (typeof s.notifications !== 'boolean') {
      s.notifications = false
    }
    next.settings = s
  }
  return next
}

export function normalizeState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = migrateRaw(raw) as Partial<GameState>
  if (typeof r.totalXp !== 'number' || !Number.isFinite(r.totalXp) || r.totalXp < 0) return null
  const base = createInitialState()
  const questsByDate = Object.fromEntries(
    Object.entries(r.questsByDate ?? {}).filter(([, v]) => isQuestList(v)),
  )
  return {
    ...base,
    ...r,
    currentDate: isDateKey(r.currentDate) ? r.currentDate : base.currentDate,
    stats: { ...base.stats, ...pickNonNeg(r.stats, ['strength', 'endurance', 'agility']) },
    perCategoryDone: { ...base.perCategoryDone, ...pickNonNeg(r.perCategoryDone, Object.keys(EMPTY_CATEGORY)) },
    habit: toNonNeg(r.habit),
    bestHabit: toNonNeg(r.bestHabit),
    streak: toNonNeg(r.streak),
    bestStreak: toNonNeg(r.bestStreak),
    dayBonusClaimed: r.dayBonusClaimed === true,
    totalQuestsDone: toNonNeg(r.totalQuestsDone),
    totalXp: r.totalXp,
    dayIntensity: isIntensity(r.dayIntensity) ? r.dayIntensity : 'normal',
    profile: {
      name: typeof r.profile?.name === 'string' ? r.profile.name : base.profile.name,
      age: toNonNeg(r.profile?.age, base.profile.age),
      heightCm: toNonNeg(r.profile?.heightCm, base.profile.heightCm),
      weightKg: toNonNeg(r.profile?.weightKg, base.profile.weightKg),
    },
    settings: {
      sound: typeof r.settings?.sound === 'boolean' ? r.settings.sound : base.settings.sound,
      notifications:
        typeof r.settings?.notifications === 'boolean'
          ? r.settings.notifications
          : base.settings.notifications,
    },
    questsByDate,
    unlockedAchievements:
      typeof r.unlockedAchievements === 'object' && r.unlockedAchievements !== null
        ? (r.unlockedAchievements as GameState['unlockedAchievements'])
        : {},
    sickUsed: Array.isArray(r.sickUsed) ? r.sickUsed.filter((d): d is string => typeof d === 'string') : [],
    habitHistory: Array.isArray(r.habitHistory)
      ? r.habitHistory.filter(
          (h): h is GameState['habitHistory'][number] =>
            !!h && typeof h === 'object' && isDateKey((h as { date?: unknown }).date) &&
            typeof (h as { value?: unknown }).value === 'number' &&
            Number.isFinite((h as { value?: unknown }).value),
        )
      : [],
    weightHistory: Array.isArray(r.weightHistory)
      ? r.weightHistory.filter((w): w is GameState['weightHistory'][number] => {
          if (!w || typeof w !== 'object') return false
          const rec = w as { date?: unknown; valueKg?: unknown }
          return (
            isDateKey(rec.date) &&
            typeof rec.valueKg === 'number' &&
            Number.isFinite(rec.valueKg) &&
            rec.valueKg >= 0
          )
        })
      : [],
    swapsUsed: typeof r.swapsUsed === 'number' && Number.isFinite(r.swapsUsed) ? r.swapsUsed : 0,
    soreGroups: Array.isArray(r.soreGroups)
      ? r.soreGroups.filter((g): g is MuscleGroup => typeof g === 'string')
      : [],
    onboardingDone: r.onboardingDone === true,
    events: [],
  }
}

function toNonNeg(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback
}

function pickNonNeg(v: unknown, allow: readonly string[]): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(v)) {
    if (allow.includes(k) && typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      out[k] = val
    }
  }
  return out
}

function isDateKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isIntensity(v: unknown): v is GameState['dayIntensity'] {
  return v === 'light' || v === 'normal' || v === 'intense'
}

function isQuestList(v: unknown): v is GameState['questsByDate'][string] {
  return (
    Array.isArray(v) &&
    v.every(
      (q) =>
        !!q &&
        typeof q === 'object' &&
        typeof (q as { id?: unknown }).id === 'string' &&
        typeof (q as { done?: unknown }).done === 'boolean',
    )
  )
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
        events: [...next.events, { type: 'miss' as const }],
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