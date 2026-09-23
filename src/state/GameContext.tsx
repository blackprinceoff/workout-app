import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  clearSave,
  createInitialState,
  exportState,
  isSickDayMarked,
  levelOf,
  loadState,
  normalizeState,
  rollover,
  saveState,
  sickTokensLeft,
} from './storage'
import { checkAchievements } from '../game/achievements'
import { shiftDateKey } from '../game/dates'
import { classNameFor, levelInfo, xpMultiplier } from '../game/leveling'
import { effectiveLoad, generateDailyQuests, swapFor, unlocksBetween } from '../game/quests'
import { DAILY_COMPLETE_BONUS, SWAPS_PER_DAY } from '../game/constants'
import type {
  DailyQuest,
  GameEvent,
  GameState,
  Intensity,
  MuscleGroup,
  StatKey,
} from '../game/types'
import { playAchievement, playLevelUp, playQuest } from '../utils/sound'

type Action =
  | { type: 'COMPLETE_QUEST'; questId: string }
  | { type: 'UNCOMPLETE_QUEST'; questId: string }
  | { type: 'SET_INTENSITY'; intensity: Intensity }
  | { type: 'MARK_SICK_DAY' }
  | { type: 'SWAP_QUEST'; questId: string }
  | { type: 'SET_SORE_GROUPS'; groups: MuscleGroup[] }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'UPDATE_PROFILE'; age: number; heightCm: number; weightKg: number }
  | { type: 'ADD_WEIGHT'; valueKg: number }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'IMPORT_STATE'; state: GameState }
  | { type: 'RESET' }
  | { type: 'ROLLOVER' }

function unlockAchievements(
  state: GameState,
  level: number,
  eventBuilder: (id: string) => GameEvent,
): GameState {
  const newly = checkAchievements(state, level)
  if (newly.length === 0) return state
  const unlockedAchievements = { ...state.unlockedAchievements }
  const events = [...state.events]
  for (const id of newly) {
    unlockedAchievements[id] = state.currentDate
    events.push(eventBuilder(id))
  }
  return { ...state, unlockedAchievements, events }
}

function completeOne(state: GameState, questId: string, done: boolean): GameState {
  const day = state.currentDate
  const quests = state.questsByDate[day]
  if (!quests) return state
  const idx = quests.findIndex((q) => q.id === questId)
  if (idx === -1) return state
  const q = quests[idx]
  if (q.done === done) return state

  const wasAllDone = quests.every((u) => u.done)
  const updated = [...quests]
  updated[idx] = {
    ...q,
    done,
    completedAt: done ? new Date().toISOString() : null,
  }
  const isAllDone = updated.every((u) => u.done)

  let next: GameState = {
    ...state,
    questsByDate: { ...state.questsByDate, [day]: updated },
  }

  if (done) {
    const gain = Math.max(1, Math.round(q.xp * xpMultiplier(state.streak, state.habit)))
    const stats = { ...next.stats }
    if (q.stat) stats[q.stat] += 1
    next = {
      ...next,
      totalXp: next.totalXp + gain,
      stats,
      totalQuestsDone: next.totalQuestsDone + 1,
      perCategoryDone: {
        ...next.perCategoryDone,
        [q.category]: next.perCategoryDone[q.category] + 1,
      },
    }

    const oldLevel = levelOf(state)
    const newLevel = levelOf(next)
    let events: GameEvent[] = [...next.events]
    if (newLevel > oldLevel) {
      events.push({ type: 'levelup', level: newLevel, className: classNameFor(newLevel) })
      const newItems = unlocksBetween(oldLevel, newLevel)
      if (newItems.length > 0) {
        events.push({
          type: 'unlock',
          items: newItems.map((t) => ({
            templateId: t.id,
            title: t.title,
            minLevel: t.minLevel ?? 1,
          })),
        })
      }
    }
    next = { ...next, events }

    next = unlockAchievements(next, newLevel, (id) => ({ type: 'achievement', achievementId: id }))

    // Бонус за ідеальний день нараховується ОДИН раз (анти-ферма) — лише на переході
    // «не повний → повний», і знімається при скасуванні повноти дня.
    if (isAllDone && !wasAllDone && !state.dayBonusClaimed) {
      next = {
        ...next,
        totalXp: next.totalXp + DAILY_COMPLETE_BONUS,
        dayBonusClaimed: true,
        events: [...next.events, { type: 'dayComplete' }],
      }
      next = unlockAchievements(next, levelOf(next), (id) => ({ type: 'achievement', achievementId: id }))
    }
  } else {
    // Рефанд повертає реально виграний XP (з множником серії/звички), а не сиру базу.
    const refund = Math.max(1, Math.round(q.xp * xpMultiplier(state.streak, state.habit)))
    const stats = { ...next.stats }
    if (q.stat) stats[q.stat] = Math.max(0, stats[q.stat] - 1)
    next = {
      ...next,
      totalXp: Math.max(0, next.totalXp - refund),
      stats,
      totalQuestsDone: Math.max(0, next.totalQuestsDone - 1),
      perCategoryDone: {
        ...next.perCategoryDone,
        [q.category]: Math.max(0, next.perCategoryDone[q.category] - 1),
      },
    }

    if (wasAllDone && !isAllDone && state.dayBonusClaimed) {
      next = {
        ...next,
        totalXp: Math.max(0, next.totalXp - DAILY_COMPLETE_BONUS),
        dayBonusClaimed: false,
      }
    }
  }

  return next
}

// oxlint-disable-next-line react/only-export-components
export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'COMPLETE_QUEST':
      return completeOne(state, action.questId, true)
    case 'UNCOMPLETE_QUEST':
      return completeOne(state, action.questId, false)
    case 'SET_INTENSITY': {
      if (action.intensity === state.dayIntensity) return state
      const today = state.currentDate
      const todayQuests = state.questsByDate[today] ?? []
      if (todayQuests.some((q) => q.done)) return state
      const level = levelOf(state)
      const yesterdayQuests = state.questsByDate[shiftDateKey(today, -1)] ?? []
      const lastStrengthIds = new Set(
        yesterdayQuests
          .filter((q) => q.category === 'strength' && q.main && q.done)
          .map((q) => q.templateId),
      )
      return {
        ...state,
        dayIntensity: action.intensity,
        swapsUsed: 0,
        questsByDate: {
          ...state.questsByDate,
          [today]: generateDailyQuests(
            today,
            level,
            action.intensity,
            false,
            new Set(state.soreGroups),
            lastStrengthIds,
          ),
        },
      }
    }
    case 'MARK_SICK_DAY': {
      const today = state.currentDate
      const todayQuests = state.questsByDate[today] ?? []
      if (state.sickUsed.includes(today)) {
        return { ...state, sickUsed: state.sickUsed.filter((d) => d !== today) }
      }
      if (todayQuests.some((q) => q.done)) return state
      if (sickTokensLeft(state) <= 0) return state
      return { ...state, sickUsed: [...state.sickUsed, today] }
    }
    case 'SWAP_QUEST': {
      const today = state.currentDate
      const quests = state.questsByDate[today] ?? []
      const idx = quests.findIndex((q) => q.id === action.questId)
      if (idx === -1) return state
      const target = quests[idx]
      if (target.done) return state
      if (state.swapsUsed >= SWAPS_PER_DAY) return state
      const level = levelOf(state)
      const eff = effectiveLoad(today, state.dayIntensity, level)
      const others = new Set(quests.filter((x) => x.id !== target.id).map((x) => x.templateId))
      const replacement = swapFor(target, level, eff, today, others, state.swapsUsed)
      if (replacement.id === target.id) return state
      const updated = [...quests]
      updated[idx] = replacement
      return {
        ...state,
        swapsUsed: state.swapsUsed + 1,
        questsByDate: { ...state.questsByDate, [today]: updated },
      }
    }
    case 'SET_SORE_GROUPS': {
      const today = state.currentDate
      const todayQuests = state.questsByDate[today] ?? []
      if (todayQuests.some((q) => q.done)) return state
      const level = levelOf(state)
      const sore = new Set(action.groups)
      const yesterdayQuests = state.questsByDate[shiftDateKey(today, -1)] ?? []
      const lastStrengthIds = new Set(
        yesterdayQuests
          .filter((q) => q.category === 'strength' && q.main && q.done)
          .map((q) => q.templateId),
      )
      return {
        ...state,
        soreGroups: action.groups,
        swapsUsed: 0,
        questsByDate: {
          ...state.questsByDate,
          [today]: generateDailyQuests(today, level, state.dayIntensity, false, sore, lastStrengthIds),
        },
      }
    }
    case 'CLEAR_EVENTS':
      return { ...state, events: [] }
    case 'SET_NAME':
      return { ...state, profile: { ...state.profile, name: action.name } }
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: { ...state.profile, ...action },
      }
    case 'ADD_WEIGHT': {
      const { valueKg } = action
      if (!Number.isFinite(valueKg) || valueKg <= 0 || valueKg > 500) return state
      const rest = state.weightHistory.filter((w) => w.date !== state.currentDate)
      const next = [...rest, { date: state.currentDate, valueKg }].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      )
      return { ...state, weightHistory: next.slice(-520) }
    }
    case 'TOGGLE_SOUND':
      return { ...state, settings: { ...state.settings, sound: !state.settings.sound } }
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingDone: true }
    case 'IMPORT_STATE':
      return { ...action.state, events: [] }
    case 'RESET': {
      clearSave()
      return createInitialState()
    }
    case 'ROLLOVER':
      return rollover(state)
    default:
      return state
  }
}

function init(): GameState {
  const loaded = loadState()
  if (!loaded) return createInitialState()
  return rollover(normalizeState(loaded) ?? createInitialState())
}

interface GameContextValue {
  state: GameState
  todayQuests: DailyQuest[]
  level: ReturnType<typeof levelInfo>
  statsList: { key: StatKey; value: number }[]
  completeQuest: (questId: string) => void
  undoQuest: (questId: string) => void
  setIntensity: (intensity: Intensity) => void
  markSickDay: () => void
  sickTokensLeft: number
  sickDayMarked: boolean
  swapQuest: (questId: string) => void
  setSoreGroups: (groups: MuscleGroup[]) => void
  swapsLeft: number
  setName: (name: string) => void
  updateProfile: (age: number, heightCm: number, weightKg: number) => void
  addWeight: (valueKg: number) => void
  completeOnboarding: () => void
  toggleSound: () => void
  importState: (json: string) => boolean
  resetGame: () => void
  doExport: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: 'ROLLOVER' }), 30_000)
    return () => clearInterval(timer)
  }, [])

  const todayQuests = useMemo(
    () => state.questsByDate[state.currentDate] ?? [],
    [state.questsByDate, state.currentDate],
  )
  const level = useMemo(() => levelInfo(state.totalXp), [state.totalXp])

  const statsList: { key: StatKey; value: number }[] = useMemo(
    () => (Object.keys(state.stats) as StatKey[]).map((k) => ({ key: k, value: state.stats[k] })),
    [state.stats],
  )

  useEffect(() => {
    if (state.events.length === 0) return
    playSoundsForEvents(state.events, state.settings.sound)
    const t = setTimeout(() => dispatch({ type: 'CLEAR_EVENTS' }), 6000)
    return () => clearTimeout(t)
  }, [state.events, state.settings.sound])

  const value: GameContextValue = useMemo(
    () => ({
      state,
      todayQuests,
      level,
      statsList,
      completeQuest: (questId) => dispatch({ type: 'COMPLETE_QUEST', questId }),
      undoQuest: (questId) => dispatch({ type: 'UNCOMPLETE_QUEST', questId }),
      setIntensity: (intensity) => dispatch({ type: 'SET_INTENSITY', intensity }),
      markSickDay: () => dispatch({ type: 'MARK_SICK_DAY' }),
      sickTokensLeft: sickTokensLeft(state),
      sickDayMarked: isSickDayMarked(state),
      swapQuest: (questId) => dispatch({ type: 'SWAP_QUEST', questId }),
      setSoreGroups: (groups) => dispatch({ type: 'SET_SORE_GROUPS', groups }),
      swapsLeft: Math.max(0, SWAPS_PER_DAY - state.swapsUsed),
      setName: (name) => dispatch({ type: 'SET_NAME', name }),
      updateProfile: (age, heightCm, weightKg) =>
        dispatch({ type: 'UPDATE_PROFILE', age, heightCm, weightKg }),
      addWeight: (valueKg) => dispatch({ type: 'ADD_WEIGHT', valueKg }),
      completeOnboarding: () => dispatch({ type: 'COMPLETE_ONBOARDING' }),
      toggleSound: () => dispatch({ type: 'TOGGLE_SOUND' }),
      importState: (json) => {
        try {
          const parsed = normalizeState(JSON.parse(json))
          if (!parsed) return false
          dispatch({ type: 'IMPORT_STATE', state: rollover(parsed) })
          return true
        } catch {
          return false
        }
      },
      resetGame: () => dispatch({ type: 'RESET' }),
      doExport: () => exportState(state),
    }),
    [state, level, statsList, todayQuests],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

function playSoundsForEvents(events: GameEvent[], enabled: boolean) {
  if (!enabled) return
  const hasLevelUp = events.some((e) => e.type === 'levelup')
  const hasAchievement = events.some((e) => e.type === 'achievement')
  if (hasLevelUp) void playLevelUp()
  else if (hasAchievement) void playAchievement()
  else if (events.some((e) => e.type === 'dayComplete')) void playQuest()
}