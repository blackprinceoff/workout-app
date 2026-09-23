import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../src/game/quests'
import { generateDailyQuests } from '../src/game/quests'
import { shiftDateKey } from '../src/game/dates'
import { HABIT_MAX } from '../src/game/constants'
import type { DailyQuest, Intensity } from '../src/game/types'
import { levelInfo, xpMultiplier, xpToNextLevel } from '../src/game/leveling'

const start = '2026-01-05' // Понеділок
const TARGET_LEVEL = 100

interface Profile {
  /** ймовірність: усі квести дня */
  allProb: number
  /** інакше — всі основні (main) */
  mainsProb: number
  /** інакше — один основний */
  singleMainProb: number
  /** інакше — пропуск */
}

const PROFILES = {
  casual: { allProb: 0, mainsProb: 0.65, singleMainProb: 0.25, missProb: 0.1 },
  discipline: { allProb: 0.85, mainsProb: 0.1, singleMainProb: 0.03, missProb: 0.02 },
} satisfies Record<string, Profile & { missProb: number }>

function multOf(streak: number, habit: number): number {
  return xpMultiplier(streak, habit)
}

function marchToLevel(profile: Profile): number {
  const rnd = mulberry32(20260921)
  let date = start
  let totalXp = 0
  let h = 0
  let streak = 0

  for (let day = 1; day <= 1500; day++) {
    const level = levelInfo(totalXp).level
    const quests: DailyQuest[] = generateDailyQuests(date, level, 'normal' as Intensity)
    const mains = quests.filter((q) => q.main)

    const r = rnd()
    let done: DailyQuest[]
    if (r < profile.allProb) done = quests
    else if (r < profile.allProb + profile.mainsProb) done = mains
    else if (r < profile.allProb + profile.mainsProb + profile.singleMainProb) {
      done = mains.length > 0 ? [mains[0]] : []
    } else done = []

    const mult = multOf(streak, h)
    const gain = done.reduce((sum, q) => sum + Math.max(1, Math.round(q.xp * mult)), 0)
    const bonus = done.length === quests.length && quests.length > 0 ? 40 : 0
    totalXp += gain + bonus

    if (levelInfo(totalXp).level >= TARGET_LEVEL) return day

    // Модель rollover: звичка/серія/пропуск
    if (done.some((q) => q.main)) {
      h = Math.min(HABIT_MAX, h + 5)
      streak += 1
    } else if (done.length > 0) {
      h = Math.min(HABIT_MAX, h + 2)
    } else {
      h = Math.max(0, h - 10)
      streak = 0
    }
    date = shiftDateKey(date, 1)
  }
  return 1500
}

function milestoneDays(profile: Profile): { level: number; day: number }[] {
  const rnd = mulberry32(20260921)
  let date = start
  let totalXp = 0
  let h = 0
  let streak = 0
  const milestones = [5, 10, 20, 30, 50, 70, 90, 100]
  const out: { level: number; day: number }[] = []

  for (let day = 1; day <= 1500; day++) {
    const level = levelInfo(totalXp).level
    const prevLevel = level
    const quests: DailyQuest[] = generateDailyQuests(date, level, 'normal' as Intensity)
    const mains = quests.filter((q) => q.main)

    const r = rnd()
    let done: DailyQuest[]
    if (r < profile.allProb) done = quests
    else if (r < profile.allProb + profile.mainsProb) done = mains
    else if (r < profile.allProb + profile.mainsProb + profile.singleMainProb)
      done = mains.length > 0 ? [mains[0]] : []
    else done = []

    const mult = multOf(streak, h)
    const gain = done.reduce((sum, q) => sum + Math.max(1, Math.round(q.xp * mult)), 0)
    const bonus = done.length === quests.length && quests.length > 0 ? 40 : 0
    totalXp += gain + bonus

    const nowLevel = levelInfo(totalXp).level
    if (nowLevel > prevLevel) {
      for (const m of milestones) {
        if (m > prevLevel && m <= nowLevel) {
          out.push({ level: m, day })
        }
      }
    }

    if (done.some((q) => q.main)) {
      h = Math.min(HABIT_MAX, h + 5)
      streak += 1
    } else if (done.length > 0) {
      h = Math.min(HABIT_MAX, h + 2)
    } else {
      h = Math.max(0, h - 10)
      streak = 0
    }
    date = shiftDateKey(date, 1)
    if (nowLevel >= TARGET_LEVEL) break
  }
  return out
}

describe.skip('Каталог для калібрування (друк таблиці)', () => {
  it('Друкує таблицю прогресу обох профілів', () => {
    const rows = []
    const refs: Record<string, { level: number; day: number }[]> = {}
    for (const [name, p] of Object.entries(PROFILES)) {
      const d = milestoneDays(p)
      refs[name] = d
      rows.push(name.padEnd(12) + d.map((x) => `${x.level}:${x.day}d`).join(' · '))
    }
    const casual100 = refs.casual.find((x) => x.level === 100)?.day ?? -1
    const disc100 = refs.discipline.find((x) => x.level === 100)?.day ?? -1
    process.stderr.write(
      `\n[калібрування] casual до 100: ${casual100}d | discipline до 100: ${disc100}d\n` +
        rows.join('\n') +
        `\n[калібрування] xpToNext(31)=${xpToNextLevel(31)}, xpToNext(61)=${xpToNextLevel(
          61,
        )}, xpToNext(100)=${xpToNextLevel(100)}\n`,
    )
    expect(true).toBe(true)
  })
})

describe('Множник XP', () => {
  it('Старт (серія 0, звичка 0) = 0.8 — звичка зрізає до −20%', () => {
    expect(xpMultiplier(0, 0)).toBeCloseTo(0.8)
  })

  it('Повна звичка без серії = 1.0; з повною серією = 1.2 (кап +20%)', () => {
    expect(xpMultiplier(0, HABIT_MAX)).toBeCloseTo(1.0)
    expect(xpMultiplier(10, HABIT_MAX)).toBeCloseTo(1.2)
    expect(xpMultiplier(30, HABIT_MAX)).toBeCloseTo(1.2)
  })

  it('Серія капується на +20% незалежно від довжини', () => {
    expect(xpMultiplier(10, 40)).toBeCloseTo(xpMultiplier(50, 40))
    expect(xpMultiplier(50, 40)).toBeCloseTo((1 + 0.2) * (0.8 + 0.2 * 0.4))
  })
})

describe('Економіка: ~2 роки до рівня 100 «1–3 основні»', () => {
  it('Casual-профіль доходить до 100 за ~2 роки (660–800 днів)', () => {
    const days = marchToLevel(PROFILES.casual)
    expect(days).toBeGreaterThanOrEqual(660)
    expect(days).toBeLessThanOrEqual(800)
  })

  it('Дисциплінований профіль суттєво швидший (~1 рік)', () => {
    const days = marchToLevel(PROFILES.discipline)
    expect(days).toBeGreaterThanOrEqual(320)
    expect(days).toBeLessThanOrEqual(460)
  })

  it('Крива: кінцеві рівні коштують у ~8–12 разів більше стартових', () => {
    const cheap = xpToNextLevel(1)
    const mid = xpToNextLevel(60)
    const end = xpToNextLevel(100)
    expect(end).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(cheap)
    expect(end / cheap).toBeGreaterThan(8)
  })
})