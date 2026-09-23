import { describe, expect, it } from 'vitest'
import { classNameFor, levelInfo, powerScore, xpToNextLevel } from '../src/game/leveling'
import type { GameState } from '../src/game/types'
import { createInitialState } from '../src/state/storage'

function stateFor(patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...patch }
}

describe('leveling — levelInfo', () => {
  it('Рівень 1 на старті (0 XP), ціль до рівня 2 = 70 XP', () => {
    const info = levelInfo(0)
    expect(info.level).toBe(1)
    expect(info.xpIntoLevel).toBe(0)
    expect(info.xpToNext).toBe(70)
    expect(info.progress).toBe(0)
  })

  it('Точна межа переходу на рівень 3: 190 XP = рівень 3, 0 у поточному', () => {
    // сума 70 + 120 = 190
    const info = levelInfo(190)
    expect(info.level).toBe(3)
    expect(info.xpIntoLevel).toBe(0)
    expect(info.xpToNext).toBe(170)
  })

  it('Всередині сегмента 61–80: крок зростає (700 + 13/lvl)', () => {
    expect(xpToNextLevel(61)).toBe(700)
    expect(xpToNextLevel(70)).toBe(700 + 9 * 13)
  })

  it('Правий край: рівень 100 існує', () => {
    const info = levelInfo(100_000_000)
    expect(info.level).toBe(999) // кап захисту від нескінченного циклу
  })
})

describe('leveling — classNameFor', () => {
  it('Класи 1–30 без епітетів', () => {
    expect(classNameFor(1)).toBe('Новобранець')
    expect(classNameFor(3)).toBe('Страж')
    expect(classNameFor(12)).toBe('Ветеран')
    expect(classNameFor(30)).toBe('Титан')
  })

  it('31+ рівень: епітет + циклічний клас', () => {
    expect(classNameFor(31)).toBe('Загартований Новобранець')
    expect(classNameFor(60)).toBe('Загартований Титан')
  })

  it('Епітети циклічно повторюються кожні 30 рівнів', () => {
    expect(classNameFor(61)).toBe('Сяючий Новобранець')
    expect(classNameFor(91)).toBe('Грозовий Новобранець')
    expect(classNameFor(121)).toBe('Крижаний Новобранець')
  })
})

describe('leveling — powerScore', () => {
  it('Сума статів + habit/10 округлено', () => {
    const s = stateFor({ stats: { strength: 5, endurance: 6, agility: 7 }, habit: 20 })
    expect(powerScore(s)).toBe(5 + 6 + 7 + 2)
  })

  it('Нульовий профіль = 0', () => {
    const s = stateFor({ stats: { strength: 0, endurance: 0, agility: 0 }, habit: 0 })
    expect(powerScore(s)).toBe(0)
  })
})