import {
  CLASS_BY_LEVEL,
  CLASS_CYCLE,
  EPITHETS,
  HABIT_MAX,
  HABIT_XP_BASE,
  HABIT_XP_SPREAD,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_DAY,
  XP_CURVE_SEGMENTS,
} from './constants'
import type { GameState, LevelInfo } from './types'

export function xpToNextLevel(level: number): number {
  let seg = XP_CURVE_SEGMENTS[0]
  for (const s of XP_CURVE_SEGMENTS) {
    if (level >= s.from) seg = s
  }
  return seg.base + (level - seg.from) * seg.step
}

export function baseClassFor(level: number): string {
  let name = CLASS_BY_LEVEL[0].name
  for (const row of CLASS_BY_LEVEL) {
    if (level >= row.minLevel) name = row.name
  }
  return name
}

export function classNameFor(level: number): string {
  if (level <= CLASS_CYCLE) return baseClassFor(level)
  const cycle = Math.floor((level - 1) / CLASS_CYCLE) - 1
  const core = baseClassFor(((level - 1) % CLASS_CYCLE) + 1)
  const epithet = EPITHETS[cycle % EPITHETS.length]
  return `${epithet} ${core}`
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1
  let rest = Math.max(0, Math.floor(totalXp))
  while (rest >= xpToNextLevel(level) && level < 999) {
    rest -= xpToNextLevel(level)
    level++
  }
  const xpToNext = xpToNextLevel(level)
  return {
    level,
    className: classNameFor(level),
    xpIntoLevel: rest,
    xpToNext,
    progress: rest / xpToNext,
  }
}

export function powerScore(state: GameState): number {
  const { strength, endurance, agility } = state.stats
  return strength + endurance + agility + Math.round(state.habit / 10)
}

/** Множник XP: серія (кап +20%) × звичка (0.8–1.0). */
export function xpMultiplierParts(streak: number, habit: number): {
  streak: number
  habit: number
  total: number
} {
  const s = 1 + Math.min(STREAK_BONUS_CAP, streak * STREAK_BONUS_PER_DAY)
  const h = HABIT_XP_BASE + HABIT_XP_SPREAD * (habit / HABIT_MAX)
  return { streak: s, habit: h, total: s * h }
}

/** Підсумковий множник XP за серію та звичку. */
export function xpMultiplier(streak: number, habit: number): number {
  return xpMultiplierParts(streak, habit).total
}