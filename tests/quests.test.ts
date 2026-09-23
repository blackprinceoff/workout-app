import { describe, expect, it } from 'vitest'
import {
  effectiveLoad,
  generateDailyQuests,
  repsFor,
  setsFor,
  swapFor,
  unlocksBetween,
  warmFactor,
} from '../src/game/quests'
import { QUEST_TEMPLATES } from '../src/game/quests'
import type { DailyQuest } from '../src/game/types'

// Дні тижня: 2026-09-20 Нд (recovery), 2026-09-21 Пн, 2026-09-22 Вт, 2026-09-23 Ср
const MONDAY = '2026-09-21'
const TUESDAY = '2026-09-22'
const SUNDAY = '2026-09-20'

function strengthOf(quests: DailyQuest[]) {
  return quests.filter((q) => q.category === 'strength')
}

function groupsOf(quests: DailyQuest[]): string[] {
  return strengthOf(quests)
    .map((q) => q.muscle ?? 'leg')
    .sort()
}

describe('warmFactor', () => {
  it('Множить 0.75 на 1–3 рівнях', () => {
    for (let l = 1; l <= 3; l++) expect(warmFactor(l)).toBe(0.75)
  })
  it('Множить 0.9 на 4–6 рівнях', () => {
    for (let l = 4; l <= 6; l++) expect(warmFactor(l)).toBe(0.9)
  })
  it('Повний вплив з 7 рівня', () => {
    for (let l = 7; l <= 12; l++) expect(warmFactor(l)).toBe(1)
  })
})

describe('setsFor', () => {
  it('1 підхід на 1–2 рівні, 2 на 3–5, 3 з 6, але не більше шаблона', () => {
    const pushups = QUEST_TEMPLATES.find((t) => t.id === 'pushups')! // sets: 3
    expect(setsFor(pushups, 1)).toBe(1)
    expect(setsFor(pushups, 3)).toBe(2)
    expect(setsFor(pushups, 6)).toBe(3)
    const burpees = QUEST_TEMPLATES.find((t) => t.id === 'burpees')! // sets: 1
    expect(setsFor(burpees, 25)).toBe(1)
  })
})

describe('effectiveLoad', () => {
  it('Клампує до [0.5, 1.6]', () => {
    const maxLoad = effectiveLoad('2026-10-06', 'intense') // Вт 1.2 × 1.35 = 1.62
    expect(maxLoad).toBe(1.6)
    const minLoad = effectiveLoad(SUNDAY, 'light', 1) // Нд 0.6 × 0.7 × 0.75
    expect(minLoad).toBe(0.5)
  })
  it('Враховує warm лише коли переданий рівень', () => {
    const heavy = effectiveLoad('2026-10-06', 'intense')
    const heavyWarmLevel1 = effectiveLoad('2026-10-06', 'intense', 1)
    expect(heavyWarmLevel1).toBeLessThan(heavy)
  })
})

describe('generateDailyQuests', () => {
  it('Дає 5 квестів у робочий день і 2 силові', () => {
    const day = generateDailyQuests(MONDAY, 1, 'normal')
    expect(day).toHaveLength(5)
    expect(strengthOf(day)).toHaveLength(2)
  })

  it('Силові квести — з різних груп м\u2019язів', () => {
    for (let i = 0; i < 30; i++) {
      const day = generateDailyQuests(TUESDAY, 5, 'normal', true)
      const groups = groupsOf(day)
      expect(groups[0]).not.toBe(groups[1])
    }
  })

  it('Кул-даун: сьогодні хоч одна група не з учора (перекриття ≤ 1)', () => {
    const pairs: [string, string][] = [
      ['2026-09-21', '2026-09-22'],
      ['2026-09-28', '2026-09-29'],
      ['2026-10-05', '2026-10-06'],
      ['2026-10-12', '2026-10-13'],
      ['2026-10-19', '2026-10-20'],
    ]
    for (const [a, b] of pairs) {
      const gA = new Set(groupsOf(generateDailyQuests(a, 5, 'normal')))
      const yStr = new Set(
        generateDailyQuests(a, 5, 'normal')
          .filter((q) => q.category === 'strength' && q.main)
          .map((q) => q.templateId),
      )
      const gB = new Set(groupsOf(generateDailyQuests(b, 5, 'normal', false, new Set(), yStr)))
      const overlap = [...gB].filter((g) => gA.has(g)).length
      expect(overlap).toBeLessThan(2)
    }
  })

  it('Неділя — день відновлення: 3 квести, основні лише з rest-сімей', () => {
    const day = generateDailyQuests(SUNDAY, 5, 'normal')
    expect(day).toHaveLength(3)
    expect(day.some((q) => q.main)).toBe(true)
    for (const q of day) {
      if (!q.main) continue
      const t = QUEST_TEMPLATES.find((x) => x.id === q.templateId)!
      expect(t.rest).toBe(true)
    }
  })

  it('Сore (болить push): жодної push-силової', () => {
    for (let i = 0; i < 40; i++) {
      const day = generateDailyQuests(MONDAY, 5, 'normal', true, new Set(['push']))
      for (const q of strengthOf(day)) expect(q.muscle).not.toBe('push')
    }
  })

  it('Болить усе: день у стилі відновлення, без силових', () => {
    for (let i = 0; i < 20; i++) {
      const day = generateDailyQuests(MONDAY, 5, 'normal', true, new Set(['push', 'leg', 'core']))
      expect(day.length).toBeLessThanOrEqual(3)
      expect(strengthOf(day)).toHaveLength(0)
    }
  })

  it('Детермінованість: той самий день = той самий набір', () => {
    const a = generateDailyQuests('2026-09-23', 4, 'normal')
    const b = generateDailyQuests('2026-09-23', 4, 'normal')
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
  })
})

describe('swapFor', () => {
  it('Заміна силового зберігає main і не додає дублів', () => {
    const day = generateDailyQuests(MONDAY, 5, 'normal', true)
    const target = strengthOf(day)[0]
    const others = new Set(day.filter((q) => q.id !== target.id).map((q) => q.templateId))
    const swapped = swapFor(target, 5, effectiveLoad(MONDAY, 'normal', 5), MONDAY, others)
    expect(swapped.main).toBe(true)
    expect(swapped.templateId).not.toBe(target.templateId)
    expect(others.has(swapped.templateId)).toBe(false)
  })

  it('Заміна не може повернути сам target (навіть за детермінованого seed)', () => {
    for (let i = 0; i < 40; i++) {
      const day = generateDailyQuests(MONDAY, 1, 'normal', true)
      const target = strengthOf(day)[0]
      const others = new Set(day.filter((q) => q.id !== target.id).map((q) => q.templateId))
      const swapped = swapFor(target, 1, effectiveLoad(MONDAY, 'normal', 1), MONDAY, others, i % 3)
      expect(swapped.templateId).not.toBe(target.templateId)
    }
  })

  it('Заміна не-основного дає інший не-основний квест', () => {
    const day = generateDailyQuests(MONDAY, 5, 'normal', true)
    const target = day.find((q) => !q.main)!
    const others = new Set(day.filter((q) => q.id !== target.id).map((q) => q.templateId))
    const swapped = swapFor(target, 5, effectiveLoad(MONDAY, 'normal', 5), MONDAY, others)
    expect(swapped.main).toBe(false)
    expect(others.has(swapped.templateId)).toBe(false)
  })

  it('Заміна силового віддає перевагу тій самій групі м\u2019язів', () => {
    const day = generateDailyQuests(MONDAY, 5, 'normal', true)
    const target = strengthOf(day).find((q) => q.muscle === 'push') ?? strengthOf(day)[0]
    const others = new Set(day.filter((q) => q.id !== target.id).map((q) => q.templateId))
    const swaps = Array.from({ length: 40 }, (_, i) =>
      swapFor(target, 5, effectiveLoad(MONDAY, 'normal', 5), MONDAY, others, i % 3),
    )
    expect(swaps.every((q) => q.muscle === target.muscle)).toBe(true)
  })

  it('Повертає той самий квест, якщо пул замін порожній', () => {
    const day = generateDailyQuests(MONDAY, 5, 'normal', true)
    const target = day[0]
    const all = new Set(QUEST_TEMPLATES.map((t) => t.id))
    const swapped = swapFor(target, 5, 1, MONDAY, all)
    expect(swapped.id).toBe(target.id)
  })

  it('Заміна не пропонує вправи, що ще не відкриті за рівнем', () => {
    const day = generateDailyQuests(MONDAY, 10, 'normal', true)
    const target = day.find((q) => q.main)!
    const swapped = swapFor(target, 10, 1, MONDAY, undefined, 1)
    const t = QUEST_TEMPLATES.find((x) => x.id === swapped.templateId)!
    expect((t.minLevel ?? 1)).toBeLessThanOrEqual(10)
  })
})

describe('Перерви-квести з backlog', () => {
  it('«Ходьба по сходах» у пулі як не-основний break-квест', () => {
    const stairs = QUEST_TEMPLATES.find((t) => t.id === 'stairs')
    expect(stairs).toBeDefined()
    expect(stairs!.main).toBe(false)
    expect(stairs!.category).toBe('break')
    expect(stairs!.minLevel ?? 1).toBe(1)
  })

  it('Сходи можуть потрапити в день як перерва', () => {
    let hit = false
    for (let i = 0; i < 80 && !hit; i++) {
      const day = generateDailyQuests('2026-10-19', 5, 'normal', true)
      hit = day.some((q) => q.templateId === 'stairs')
    }
    expect(hit).toBe(true)
  })
})

describe('Прогресія об\u2019єму за рівнем', () => {
  it('Кількість зростає з кожним рівнем і впертається в плато', () => {
    const pushups = QUEST_TEMPLATES.find((t) => t.id === 'pushups')!
    let prev = repsFor(pushups, 1)!
    for (let l = 2; l <= 120; l++) {
      const cur = repsFor(pushups, l, 1)!
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
    const at100 = repsFor(pushups, 100)!
    expect(at100).toBeGreaterThan(20)
    expect(at100).toBeLessThanOrEqual(pushups.cap!)
  })

  it('Помірно-складна вправа типу берпі не вибухає', () => {
    const burpees = QUEST_TEMPLATES.find((t) => t.id === 'burpees')!
    expect(repsFor(burpees, 1)).toBeLessThanOrEqual(8)
    expect(repsFor(burpees, 100)).toBeLessThanOrEqual(burpees.cap!)
  })

  it('Плато = межа cap, а не нескінченний ріст', () => {
    for (const t of QUEST_TEMPLATES) {
      if (t.unit !== 'reps' && t.unit !== 'secs') continue
      const far = repsFor(t, 500)!
      expect(far).toBeLessThanOrEqual(t.cap ?? Number.MAX_SAFE_INTEGER)
    }
  })
})

describe('Вибір варіанта вправи (прогресія форми)', () => {
  it('Рівень 1 — лише стартова форма', () => {
    let found = 0
    for (let i = 0; i < 40; i++) {
      const day = generateDailyQuests(MONDAY, 1, 'normal', true)
      const sq = day.find((q) => q.templateId === 'squats')
      if (!sq) continue
      found++
      expect(sq.variantId).toBe('l1')
    }
    expect(found).toBeGreaterThan(0)
  })

  it('На високому рівні складніші форми домінують (вага за minLevel)', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 800; i++) {
      const day = generateDailyQuests(MONDAY, 18, 'normal', true)
      const sq = day.find((q) => q.templateId === 'squats')
      if (sq) counts[sq.variantId] = (counts[sq.variantId] ?? 0) + 1
    }
    // ваги 1:3:6:12:18 для minLevel 1/3/6/12/18 — важкі форми мають сумарно домінувати
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    expect(top[0]).toBe('l18')
    const heavy = (counts['l18'] ?? 0) + (counts['l12'] ?? 0)
    const light = (counts['l1'] ?? 0) + (counts['l3'] ?? 0) + (counts['l6'] ?? 0)
    expect(heavy).toBeGreaterThan(light * 2)
  })

  it('Стартова форма на рівні 8 рідша за просунуті', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 800; i++) {
      const day = generateDailyQuests(MONDAY, 8, 'normal', true)
      const sq = day.find((q) => q.templateId === 'squats')
      if (sq) counts[sq.variantId] = (counts[sq.variantId] ?? 0) + 1
    }
    // ваги 1:3:6 → топ (l6) має траплятись найчастіше
    expect(counts['l6'] ?? 0).toBeGreaterThan(counts['l1'] ?? 0)
    expect(counts['l6'] ?? 0).toBeGreaterThan(counts['l3'] ?? 0)
  })
})

describe('Рівневі розблокування', () => {
  it('Пістолет з\u2019являється лише з рівня 18', () => {
    for (let l = 1; l <= 17; l++) {
      for (let i = 0; i < 25; i++) {
        const day = generateDailyQuests(MONDAY, l, 'normal', true)
        expect(day.some((q) => q.templateId === 'pistol')).toBe(false)
      }
    }
    const hit = Array.from({ length: 60 }, () =>
      generateDailyQuests(MONDAY, 18, 'normal', true).some((q) => q.templateId === 'pistol'),
    ).filter(Boolean)
    // на високому рівні пістолет має траплятись регулярно (з двох силових місць)
    expect(hit.length).toBeGreaterThan(0)
  })

  it('Колись чимало сімей не трапляється на перших рівнях', () => {
    const early = new Set(generateDailyQuests(MONDAY, 7, 'normal', true).map((q) => q.templateId))
    for (const id of ['pike_pushup', 'pistol', 'hollow_hold', 'wall_handstand', 'bear_crawl']) {
      expect(early.has(id)).toBe(false)
    }
  })

  it('unlocksBetween повертає сім\u2019ї, що відкрились на проміжку рівнів', () => {
    expect(unlocksBetween(9, 10).map((t) => t.id).sort()).toEqual(
      ['russian_twist', 'hip_opener'].sort(),
    )
    expect(unlocksBetween(23, 24).map((t) => t.id)).toEqual(['wall_handstand'])
    expect(unlocksBetween(24, 25)).toEqual([])
  })
})