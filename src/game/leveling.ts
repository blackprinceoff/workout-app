import { CLASS_BY_LEVEL, CLASS_CYCLE, EPITHETS, XP_CURVE_SEGMENTS } from './constants'
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