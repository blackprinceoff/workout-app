import type { DailyQuest, Intensity, MuscleGroup, QuestTemplate, QuestVariant } from './types'
import {
  DAY_KIND_BY_WEEKDAY,
  DAY_LOAD,
  INTENSITY_FACTOR,
  LOAD_MAX,
  LOAD_MIN,
  SETS_FULL_LEVEL,
  SETS_MID_LEVEL,
  WARM_BY_LEVEL,
} from './constants'

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ─────────────── Силові ───────────────
  {
    id: 'pushups',
    title: 'Віджимання',
    category: 'strength',
    muscle: 'push',
    difficulty: 3,
    stat: 'strength',
    baseXp: 80,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 6,
    grow: 0.5,
    cap: 60,
    variants: [
      { minLevel: 1, title: 'від колін', note: 'легша форма для старту' },
      { minLevel: 3, title: 'класичні', note: 'повна амплітуда' },
      { minLevel: 6, title: 'з вузьким хватом', note: 'долоні вже за плечі' },
      { minLevel: 12, title: 'діамантові', note: 'великий і вказівний пальці' },
      { minLevel: 18, title: 'з ногами на стільці', note: 'ноги вище за плечі' },
      { minLevel: 26, title: 'на кулаках', note: 'повна амплітуда' },
      { minLevel: 45, title: 'лучник', note: 'одна рука витягнута вбік' },
      { minLevel: 70, title: 'на одній руці', note: 'спина рівна, повільний темп' },
    ],
  },
  {
    id: 'squats',
    title: 'Присідання',
    category: 'strength',
    muscle: 'leg',
    difficulty: 2,
    stat: 'strength',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 10,
    grow: 0.6,
    cap: 70,
    variants: [
      { minLevel: 1, title: 'з опорою на стіл/стілець', note: 'руки на опорі для балансу' },
      { minLevel: 3, title: 'класичні', note: 'ноги на ширині плечей' },
      { minLevel: 6, title: 'з паузою внизу', note: '3 сек у нижній точці' },
      { minLevel: 12, title: 'з вистрибуванням', note: 'підйом зі стрибком' },
      { minLevel: 18, title: 'сумо', note: 'широка постановка ніг' },
      { minLevel: 26, title: 'на одній нозі', note: 'з опорою на стіну' },
    ],
  },
  {
    id: 'lunges',
    title: 'Випади',
    category: 'strength',
    muscle: 'leg',
    difficulty: 2,
    stat: 'agility',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 8,
    grow: 0.5,
    cap: 60,
    variants: [
      { minLevel: 1, title: 'вперед', note: 'на кожну ногу' },
      { minLevel: 6, title: 'назад', note: 'на кожну ногу' },
      { minLevel: 12, title: 'болгарські', note: 'задня нога на стільці' },
      { minLevel: 18, title: 'з вистрибуванням', note: 'зміна ніг у стрибку' },
      { minLevel: 26, title: 'ходьба випадами', note: 'крок + випад у русі' },
    ],
  },
  {
    id: 'burpees',
    title: 'Берпі',
    category: 'strength',
    muscle: 'leg',
    difficulty: 3,
    stat: 'agility',
    baseXp: 80,
    main: true,
    unit: 'reps',
    sets: 1,
    base: 5,
    grow: 0.25,
    cap: 30,
    variants: [
      { minLevel: 1, title: 'класичні', note: 'у своєму темпі' },
      { minLevel: 8, title: 'з віджиманням', note: 'віджимання в нижній точці' },
      { minLevel: 16, title: 'з прискоренням', note: 'роби максимально швидко' },
      { minLevel: 24, title: 'з вертикальним стрибком', note: 'стрибок у висоту після підйому' },
    ],
  },
  {
    id: 'wall_sit',
    title: 'Стінка-присідання',
    category: 'strength',
    muscle: 'leg',
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'secs',
    sets: 1,
    base: 25,
    grow: 1,
    cap: 120,
    variants: [
      { minLevel: 1, title: 'класична стінка', note: 'спина притиснута до стіни' },
      { minLevel: 9, title: 'з піднятими руками', note: 'руки вперед паралельно підлозі' },
      { minLevel: 17, title: 'пульс', note: 'підйом на носки у стійці' },
      { minLevel: 25, title: 'на одній нозі', note: 'інша нога витягнута вперед' },
    ],
  },
  {
    id: 'tricep_dips',
    title: 'Віджимання від стільця',
    category: 'strength',
    muscle: 'push',
    difficulty: 2,
    stat: 'strength',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 8,
    grow: 0.5,
    cap: 50,
    variants: [
      { minLevel: 1, title: 'від стільця', note: 'руки позаду, лікті вниз' },
      { minLevel: 10, title: 'з паузою внизу', note: '3 сек у нижній точці' },
      { minLevel: 18, title: 'з піднятими ногами', note: 'ноги на другому стільці' },
    ],
  },
  {
    id: 'crunch',
    title: 'Скручування',
    category: 'strength',
    muscle: 'core',
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 8,
    grow: 0.5,
    cap: 50,
    variants: [
      { minLevel: 1, title: 'класичні', note: 'лежачи, руки за головою' },
      { minLevel: 8, title: 'з крос-скручуванням', note: 'лікоть до протилежного коліна' },
      { minLevel: 16, title: 'велосипед', note: 'повільний поперемінний темп' },
    ],
  },
  {
    id: 'russian_twist',
    title: 'Російські скручування',
    category: 'strength',
    muscle: 'core',
    minLevel: 10,
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 12,
    grow: 0.5,
    cap: 50,
    variants: [
      { minLevel: 1, title: 'класичні', note: 'руки в замку, стопи над підлогою' },
      { minLevel: 8, title: 'з витягнутими ногами', note: 'ноги прямі, без опори' },
      { minLevel: 16, title: 'повільні з паузою', note: '3 сек у кожному боці' },
    ],
  },
  {
    id: 'tuck_jump',
    title: 'Стрибок з підтягуванням колін',
    category: 'strength',
    muscle: 'leg',
    minLevel: 12,
    difficulty: 2,
    stat: 'agility',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 1,
    base: 8,
    grow: 0.4,
    cap: 35,
    variants: [
      { minLevel: 1, title: 'класичний', note: 'коліна до грудей у стрибку' },
      { minLevel: 9, title: 'подвійний', note: 'два швидкі стрибки поспіль' },
      { minLevel: 17, title: 'з віддачею вгору', note: 'максимальна висота' },
    ],
  },
  {
    id: 'pike_pushup',
    title: 'Кутова віджимання (пайк)',
    category: 'strength',
    muscle: 'push',
    minLevel: 14,
    difficulty: 3,
    stat: 'strength',
    baseXp: 80,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 5,
    grow: 0.3,
    cap: 30,
    variants: [
      { minLevel: 1, title: 'кутова', note: 'таз вгору, тіло складені' },
      { minLevel: 9, title: 'з ширшою постановкою рук', note: 'навантаження на плечі' },
      { minLevel: 18, title: 'повільна', note: '3 сек вниз / 3 сек вгору' },
    ],
  },
  {
    id: 'pistol',
    title: 'Пістолет',
    category: 'strength',
    muscle: 'leg',
    minLevel: 18,
    difficulty: 3,
    stat: 'strength',
    baseXp: 80,
    main: true,
    unit: 'reps',
    sets: 2,
    base: 4,
    grow: 0.2,
    cap: 20,
    variants: [
      { minLevel: 1, title: 'з опорою', note: 'вільна рука на стільці' },
      { minLevel: 12, title: 'без опори', note: 'руки вперед' },
      { minLevel: 22, title: 'з паузою внизу', note: '3 сек у нижній точці' },
    ],
  },
  {
    id: 'hollow_hold',
    title: 'Човник (hollow hold)',
    category: 'strength',
    muscle: 'core',
    minLevel: 20,
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'secs',
    sets: 3,
    base: 20,
    grow: 1.5,
    cap: 90,
    variants: [
      { minLevel: 1, title: 'човник', note: 'руки і ноги над підлогою' },
      { minLevel: 10, title: 'з розведеними кінцівками', note: 'ширша опора-зірка' },
      { minLevel: 18, title: 'з перекатами', note: 'гойдання корпуса вперед-назад' },
    ],
  },
  {
    id: 'wall_handstand',
    title: 'Стійка на руках біля стіни',
    category: 'strength',
    muscle: 'push',
    minLevel: 24,
    difficulty: 3,
    stat: 'agility',
    baseXp: 80,
    main: true,
    unit: 'secs',
    sets: 3,
    base: 15,
    grow: 2,
    cap: 90,
    variants: [
      { minLevel: 1, title: 'стійка', note: 'ноги на стіні, руки прямі' },
      { minLevel: 10, title: 'з піднятою ногою', note: 'чергуй ноги по підходу' },
      { minLevel: 18, title: 'куточок у стійці', note: 'тіло зігнуте на 90°' },
    ],
  },

  // ─────────────── Кор / кардіо ───────────────
  {
    id: 'plank',
    title: 'Планка',
    category: 'core',
    muscle: 'core',
    rest: true,
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'secs',
    sets: 3,
    base: 20,
    grow: 1,
    cap: 120,
    variants: [
      { minLevel: 1, title: 'класична', note: 'тримай корпус рівним' },
      { minLevel: 8, title: 'з піднятою ногою', note: 'чергуй ноги по підходу' },
      { minLevel: 16, title: 'зі знятою рукою', note: 'витягуй руку по черзі' },
      { minLevel: 24, title: 'з поворотами тазу', note: 'торкайся тазом підлоги по черзі' },
    ],
  },
  {
    id: 'legraises',
    title: 'Підйом ніг',
    category: 'core',
    muscle: 'core',
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 8,
    grow: 0.4,
    cap: 45,
    variants: [
      { minLevel: 1, title: 'класичні', note: 'лежачи, на прес' },
      { minLevel: 8, title: 'із затримкою', note: '2 сек унизу' },
      { minLevel: 16, title: 'ножиці', note: 'перехресні махи ногами' },
      { minLevel: 24, title: 'велосипед', note: 'лікоть до протилежного коліна' },
    ],
  },
  {
    id: 'superman',
    title: 'Супермен',
    category: 'core',
    muscle: 'core',
    rest: true,
    difficulty: 1,
    stat: 'endurance',
    baseXp: 30,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 10,
    grow: 0.5,
    cap: 55,
    variants: [
      { minLevel: 1, title: 'класичний', note: 'підйом рук і ніг лежачи' },
      { minLevel: 9, title: 'із затримкою', note: '3 сек у верхній точці' },
      { minLevel: 17, title: 'хрест', note: 'руки та ноги навхрест по діагоналі' },
    ],
  },
  {
    id: 'sideplank',
    title: 'Бічна планка',
    category: 'core',
    muscle: 'core',
    rest: true,
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'secs',
    sets: 1,
    base: 15,
    grow: 0.75,
    cap: 80,
    variants: [
      { minLevel: 1, title: 'класична', note: 'на кожен бік' },
      { minLevel: 9, title: 'з піднятою ногою', note: 'на кожен бік' },
      { minLevel: 18, title: 'зірка', note: 'рука і нога вгору, на кожен бік' },
    ],
  },
  {
    id: 'glute_bridge',
    title: 'Місток',
    category: 'core',
    muscle: 'leg',
    difficulty: 1,
    stat: 'strength',
    baseXp: 30,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 12,
    grow: 0.5,
    cap: 55,
    variants: [
      { minLevel: 1, title: 'класичний', note: 'підйом тазу лежачи' },
      { minLevel: 8, title: 'на одній нозі', note: 'друга нога піднята' },
      { minLevel: 16, title: 'з паузою вгорі', note: '3 сек у верхній точці' },
      { minLevel: 24, title: 'пульс', note: 'дрібні пульсуючі підйоми вгорі' },
    ],
  },
  {
    id: 'walk',
    title: 'Прогулянка на свіжому повітрі',
    category: 'cardio',
    rest: true,
    difficulty: 2,
    stat: 'agility',
    baseXp: 50,
    main: true,
    unit: 'min',
    variants: [
      { minLevel: 1, title: 'розмірена', range: [15, 25], note: 'можна з плейлістом' },
      { minLevel: 10, title: 'енергійна', range: [25, 35], note: 'у швидкому темпі' },
      { minLevel: 18, title: 'з прискореннями', range: [30, 40], note: '2 хв швидко / 2 хв спокійно' },
    ],
  },
  {
    id: 'jumping_jacks',
    title: 'Джампін-джек',
    category: 'cardio',
    difficulty: 1,
    stat: 'agility',
    baseXp: 30,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 15,
    grow: 0.6,
    cap: 70,
    variants: [
      { minLevel: 1, title: 'класичні', note: 'стрибки з махом рук' },
      { minLevel: 8, title: 'з підняттям колін', note: 'коліно до живота' },
      { minLevel: 16, title: 'хрест', note: 'руки та ноги навхрест' },
    ],
  },
  {
    id: 'mountain_climbers',
    title: 'Скелелаз',
    category: 'cardio',
    difficulty: 2,
    stat: 'agility',
    baseXp: 50,
    main: true,
    unit: 'reps',
    sets: 1,
    base: 10,
    grow: 0.6,
    cap: 70,
    variants: [
      { minLevel: 1, title: 'у плані', note: 'коліна до грудей, на кожну ногу' },
      { minLevel: 9, title: 'швидкі', note: 'максимальний темп' },
      { minLevel: 17, title: 'діагональні', note: 'коліно до протилежного ліктя' },
      { minLevel: 25, title: 'з віджиманням', note: 'віджимання кожні 10 кроків' },
    ],
  },
  {
    id: 'inchworm',
    title: 'Гусениця',
    category: 'core',
    muscle: 'core',
    minLevel: 8,
    difficulty: 1,
    stat: 'agility',
    baseXp: 30,
    main: true,
    unit: 'reps',
    sets: 3,
    base: 6,
    grow: 0.3,
    cap: 30,
    variants: [
      { minLevel: 1, title: 'класична', note: 'крок руками вперед і назад' },
      { minLevel: 8, title: 'з кроком убік', note: 'додатковий крок боком' },
      { minLevel: 16, title: 'повільна', note: 'напружуй прес весь час' },
    ],
  },
  {
    id: 'bear_crawl',
    title: 'Хода ведмедя',
    category: 'core',
    muscle: 'core',
    minLevel: 26,
    difficulty: 2,
    stat: 'endurance',
    baseXp: 50,
    main: true,
    unit: 'secs',
    sets: 3,
    base: 20,
    grow: 1,
    cap: 90,
    variants: [
      { minLevel: 1, title: 'уперед', note: 'коліна під тазом, спина рівна' },
      { minLevel: 10, title: 'назад', note: 'ходи у зворотному напрямку' },
      { minLevel: 18, title: 'з віджиманням', note: 'віджимання кожні кілька кроків' },
    ],
  },

  // ─────────────── Перерви / розтяжка (не основні) ───────────────
  {
    id: 'desk_push',
    title: 'Віджимання від столу',
    category: 'break',
    difficulty: 1,
    baseXp: 15,
    main: false,
    unit: 'reps',
    sets: 2,
    base: 10,
    grow: 0.4,
    cap: 50,
    variants: [{ minLevel: 1, title: 'від столу', note: 'на паузі' }],
  },
  {
    id: 'stretch_back',
    title: 'Розтяжка спини',
    category: 'mobility',
    difficulty: 1,
    baseXp: 20,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'котяча спина + скручування, 2 хв за столом' }],
  },
  {
    id: 'stretch_legs',
    title: 'Розтяжка ніг',
    category: 'mobility',
    difficulty: 1,
    baseXp: 20,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'випади-стрейч + складання, 2 хв' }],
  },
  {
    id: 'eyes_20',
    title: '20-20-20 для очей',
    category: 'break',
    difficulty: 1,
    baseXp: 15,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'відірвись від монітора: 20 сек дивитися вдалину' }],
  },
  {
    id: 'stand_walk',
    title: 'Встати і пройтись',
    category: 'break',
    difficulty: 1,
    baseXp: 15,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: '5 хв по кімнаті · постав таймер' }],
  },
  {
    id: 'stairs',
    title: 'Ходьба по сходах',
    category: 'break',
    difficulty: 1,
    baseXp: 20,
    main: false,
    unit: 'fixed',
    variants: [
      { minLevel: 1, title: '5 хв підйом-спуск замість ліфта' },
      { minLevel: 12, title: '2–3 прольоти бігом, обережно на спуску' },
    ],
  },
  {
    id: 'posture',
    title: 'Постава-чек',
    category: 'break',
    difficulty: 1,
    baseXp: 15,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'вирівняй спину, плечі назад, 1 хв глибокого дихання' }],
  },
  {
    id: 'stretch_neck',
    title: 'Розтяжка шиї',
    category: 'mobility',
    difficulty: 1,
    baseXp: 20,
    main: false,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'нахили шиї у 4 боки, по 20 сек' }],
  },
  {
    id: 'wrist_stretch',
    title: 'Розминка зап\u2019ясть',
    category: 'break',
    main: false,
    difficulty: 1,
    baseXp: 15,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'кругові по 10 разів у кожен бік + потягування пальців' }],
  },
  {
    id: 'breath_pause',
    title: 'Дихальна пауза',
    category: 'break',
    main: false,
    difficulty: 1,
    baseXp: 15,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: '5 глибоких вдихів-видихів, плечі опущені' }],
  },
  {
    id: 'calf_stretch',
    title: 'Розтяжка литок',
    category: 'mobility',
    main: false,
    difficulty: 1,
    baseXp: 20,
    unit: 'fixed',
    variants: [{ minLevel: 1, title: 'випад до стіни, 30 сек на кожну ногу' }],
  },
  {
    id: 'hip_opener',
    title: 'Розкриття стегон',
    category: 'mobility',
    minLevel: 10,
    main: false,
    difficulty: 1,
    baseXp: 20,
    unit: 'fixed',
    variants: [
      { minLevel: 1, title: 'голуб: 30 сек на кожен бік' },
      { minLevel: 12, title: 'глибокий випад-стендер, 30 сек на кожен бік' },
    ],
  },
]

function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function dayKindOf(key: string): import('./types').DayKind {
  return DAY_KIND_BY_WEEKDAY[weekdayOf(key)]
}

/** Розігрів: множник на навантаження дня для перших рівнів. */
export function warmFactor(level: number): number {
  let f = 1
  for (const band of WARM_BY_LEVEL) if (level >= band.minLevel) f = band.factor
  return f
}

/**
 * Спільне навантаження: день тижня × інтенсивність × розігрів(level).
 * Без level повертає номінальне (без розігріву).
 */
export function effectiveLoad(day: string, intensity: Intensity, level?: number): number {
  const raw = DAY_LOAD[weekdayOf(day)] * INTENSITY_FACTOR[intensity]
  const warmed = level === undefined ? raw : raw * warmFactor(level)
  return Math.min(LOAD_MAX, Math.max(LOAD_MIN, warmed))
}

/** Прогресивні підходи: 1 → 2 → 3 (не більше ніж закладено в сім'ї). */
export function setsFor(t: QuestTemplate, level: number): number {
  const maxSets = t.sets ?? 1
  const prog = level >= SETS_FULL_LEVEL ? 3 : level >= SETS_MID_LEVEL ? 2 : 1
  return Math.min(maxSets, prog)
}

export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(
  rnd: () => number,
  pool: QuestTemplate[],
  excluded: Set<string>,
): QuestTemplate {
  const candidates = pool.filter((t) => !excluded.has(t.id))
  if (candidates.length === 0) return pool[0]
  return candidates[Math.floor(rnd() * candidates.length)]
}

function pickVariant(t: QuestTemplate, level: number, rnd: () => number): QuestVariant {
  const unlocked = t.variants.filter((v) => v.minLevel <= level)
  const pool = unlocked.length > 0 ? unlocked : t.variants
  return pool[Math.floor(rnd() * pool.length)]
}

/**
 * Шаблони, доступні на даному рівні (рівневі розблокування).
 */
export function unlockedTemplates(level: number): QuestTemplate[] {
  return QUEST_TEMPLATES.filter((t) => (t.minLevel ?? 1) <= level)
}

/**
 * Нові сім'ї вправ, що відкриваються між рівнями (prevLevel, newLevel].
 */
export function unlocksBetween(prevLevel: number, newLevel: number): QuestTemplate[] {
  const unlocked = new Set(unlockedTemplates(newLevel).map((t) => t.id))
  for (const t of unlockedTemplates(prevLevel)) unlocked.delete(t.id)
  const byLevel = QUEST_TEMPLATES.filter((t) => unlocked.has(t.id)).sort(
    (a, b) => (a.minLevel ?? 1) - (b.minLevel ?? 1),
  )
  return byLevel
}

/**
 * Обирає дві силові вправи з РІЗНИХ груп м'язів
 * (щоб не було двох однакових патернів на день) з урахуванням виключень.
 *  — avoidGroups: групи, яких бажано уникнути (вчорашній тренінг) — кул-даун.
 *  — soreGroups: «болячі» групи — виключаються повністю.
 */
function pickStrength(
  rnd: () => number,
  level: number,
  excludedIds: ReadonlySet<string>,
  opts: { avoidGroups?: ReadonlySet<string>; soreGroups?: ReadonlySet<string> } = {},
): [string, string] {
  const strength = unlockedTemplates(level).filter((t) => t.main && t.category === 'strength')
  const buckets = new Map<MuscleGroup, QuestTemplate[]>()
  for (const t of strength) {
    const key: MuscleGroup = t.muscle ?? 'leg'
    const arr = buckets.get(key) ?? []
    arr.push(t)
    buckets.set(key, arr)
  }
  const avoid = opts.avoidGroups ?? new Set<string>()
  const sore = opts.soreGroups ?? new Set<string>()
  const keys = ([...buckets.keys()] as MuscleGroup[]).filter((k) => !sore.has(k))

  const preferred = keys.filter((k) => !avoid.has(k))
  const k1pool = preferred.length > 0 ? preferred : keys
  const k1 = k1pool[Math.floor(rnd() * k1pool.length)]

  const rest = keys.filter((k) => k !== k1)
  const restPreferred = rest.filter((k) => !avoid.has(k))
  const k2pool = restPreferred.length > 0 ? restPreferred : rest
  const k2 = k2pool.length > 0 ? k2pool[Math.floor(rnd() * k2pool.length)] : k1

  const take = (key: MuscleGroup, excluding: ReadonlySet<string>): string => {
    const full = buckets.get(key)!
    const pool = full.filter((t) => !excluding.has(t.id))
    return (pool.length > 0 ? pool : full)[Math.floor(rnd() * (pool.length > 0 ? pool.length : full.length))].id
  }

  const a1 = take(k1, excludedIds)
  const a2 = take(k2, new Set([...excludedIds, a1]))
  return [a1, a2]
}

function computeAmount(
  t: QuestTemplate,
  level: number,
  eff: number,
  v: QuestVariant,
  rnd: () => number,
): number {
  switch (t.unit) {
    case 'reps':
    case 'secs': {
      const base = t.base ?? 1
      const grow = t.grow ?? 0.5
      const cap = t.cap ?? Number.MAX_SAFE_INTEGER
      const scaled = base + (level - 1) * grow
      const raw = Math.min(cap, scaled) * eff
      return Math.max(Math.round(base * 0.6), Math.round(raw))
    }
    case 'min': {
      const [lo, hi] = v.range ?? [15, 25]
      const raw = (lo + rnd() * (hi - lo)) * eff
      return Math.max(Math.round(lo * 0.6), Math.round(raw))
    }
    default:
      return 0
  }
}

/**
 * Кількість повторів/секунд для шаблона на рівні (у номінальному навантаженні).
 * Для тестів і прогнозу напруженості. Повертає null для `min`/`fixed`.
 */
export function repsFor(t: QuestTemplate, level: number, eff = 1): number | null {
  if (t.unit !== 'reps' && t.unit !== 'secs') return null
  return computeAmount(t, level, eff, t.variants[0], () => 0)
}

function describeQuest(
  t: QuestTemplate,
  amount: number,
  v: QuestVariant,
  sets: number,
): string {
  const style = v.title
  const extra = v.note ? ` · ${v.note}` : ''
  switch (t.unit) {
    case 'reps': {
      return sets > 1
        ? `${sets} підх. × ${amount} · ${style}${extra}`
        : `${amount} разів · ${style}${extra}`
    }
    case 'secs': {
      return sets > 1
        ? `${amount} сек × ${sets} · ${style}${extra}`
        : `${amount} сек · ${style}${extra}`
    }
    case 'min':
      return `${amount} хв ходьби · ${style}${extra}`
    default:
      return style
  }
}

function toQuest(
  t: QuestTemplate,
  level: number,
  eff: number,
  rnd: () => number,
  date: string,
  index: number,
): DailyQuest {
  const variant = pickVariant(t, level, rnd)
  const amount = computeAmount(t, level, eff, variant, rnd)
  const sets = setsFor(t, level)
  return {
    id: `${date}-${t.id}-${variant.minLevel}-${index}`,
    templateId: t.id,
    variantId: `l${variant.minLevel}`,
    title: t.title,
    description: describeQuest(t, amount, variant, sets),
    category: t.category,
    muscle: t.muscle,
    difficulty: t.difficulty,
    stat: t.stat,
    xp: Math.max(1, Math.round(t.baseXp * eff)),
    main: t.main,
    done: false,
    completedAt: null,
  }
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Силові вправи вчора будуть приходити з реального стану (виконані), а не з сирого seed. */
const EMPTY_SORE: ReadonlySet<MuscleGroup> = new Set()
const EMPTY_IDS: ReadonlySet<string> = new Set()

/**
 * Генерує набір квестів на день.
 * Детерміновано від дати + рівня + інтенсивності (той самий день = той самий набір).
 * Правила:
 *  — 2 силові з різних груп м'язів, без повтору силової з учора (lastStrengthIds) і без кул-дауну груп;
 *  — 1 основний несиловий;
 *  — 2 легкі перерви.
 *  — Неділя (відновлення): 3 квести лише з легких сімей (rest).
 *  — sore (чек-ін «що болить»): позначені групи виключаються з силових;
 *    якщо лишилась одна група — день стає легшим (4 квести),
 *    якщо жодної — день у стилі відновлення (3 квести).
 */
export function generateDailyQuests(
  date: string,
  level: number,
  intensity: Intensity = 'normal',
  forceRandom: boolean = false,
  sore: ReadonlySet<MuscleGroup> = EMPTY_SORE,
  lastStrengthIds: ReadonlySet<string> = EMPTY_IDS,
): DailyQuest[] {
  const kind = dayKindOf(date)
  const eff = effectiveLoad(date, intensity, level)
  const seed = hashSeed(`${date}-${level}-${intensity}-${kind}`)
  const rnd = forceRandom ? () => Math.random() : mulberry32(seed)

  const available = unlockedTemplates(level)
  const nonStrengthMain = available.filter((t) => t.main && t.category !== 'strength')
  const restMain = available.filter((t) => t.main && t.rest)
  const side = available.filter((t) => !t.main)

  const selected: QuestTemplate[] = []

  if (kind === 'recovery') {
    selected.push(pick(rnd, restMain, new Set()))
    const b = pick(rnd, side, new Set())
    selected.push(b)
    selected.push(pick(rnd, side, new Set([b.id])))
  } else {
    const avoidGroups = new Set<string>()
    for (const id of lastStrengthIds) {
      const yt = QUEST_TEMPLATES.find((t) => t.id === id)
      if (yt) avoidGroups.add(yt.muscle ?? 'leg')
    }
    const strengthKeys = (['push', 'leg', 'core'] as MuscleGroup[]).filter((k) => !sore.has(k))

    if (strengthKeys.length >= 2) {
      const [aId, bId] = pickStrength(rnd, level, lastStrengthIds, { avoidGroups, soreGroups: sore })
      const a = QUEST_TEMPLATES.find((t) => t.id === aId)!
      const b = QUEST_TEMPLATES.find((t) => t.id === bId)!
      const excluded = new Set<string>([aId, bId])
      const c = pick(rnd, nonStrengthMain, excluded)
      excluded.add(c.id)
      const d = pick(rnd, side, excluded)
      selected.push(a, b, c, d, pick(rnd, side, new Set([d.id])))
    } else if (strengthKeys.length === 1) {
      const [aId] = pickStrength(rnd, level, lastStrengthIds, { avoidGroups, soreGroups: sore })
      const a = QUEST_TEMPLATES.find((t) => t.id === aId)!
      const excluded = new Set<string>([a.id])
      const c = pick(rnd, restMain, excluded)
      const d = pick(rnd, side, excluded)
      excluded.add(d.id)
      selected.push(a, c, d, pick(rnd, side, excluded))
    } else {
      selected.push(pick(rnd, restMain, new Set()))
      const b = pick(rnd, side, new Set())
      selected.push(b)
      selected.push(pick(rnd, side, new Set([b.id])))
    }
  }

  return shuffle(selected, rnd).map((t, i) => toQuest(t, level, eff, rnd, date, i))
}

const EMPTY_EXCLUDED: ReadonlySet<string> = new Set()

/**
 * Заміна квеста на альтернативу з того ж м'яза / категорії (або легшу сім'ю),
 * без дублів з поточним набором дня. Deterministically seeded від заміни.
 */
export function swapFor(
  quest: DailyQuest,
  level: number,
  eff: number,
  date: string,
  excludeTemplateIds: ReadonlySet<string> = EMPTY_EXCLUDED,
  swapsUsed: number = 0,
): DailyQuest {
  const present = new Set([...excludeTemplateIds, quest.templateId])
  const available = unlockedTemplates(level)
  const mains = available.filter((t) => t.main)
  const pool: QuestTemplate[] = quest.main
    ? (() => {
        const sameMuscle = mains.filter(
          (t) => t.muscle && t.muscle === quest.muscle && !present.has(t.id),
        )
        const sameCat = mains.filter(
          (t) => t.category === quest.category && !present.has(t.id),
        )
        const rest = mains.filter((t) => t.rest && !present.has(t.id))
        const any = mains.filter((t) => !present.has(t.id))
        return sameMuscle.length > 0
          ? sameMuscle
          : sameCat.length > 0
            ? sameCat
            : rest.length > 0
              ? rest
              : any
      })()
    : available.filter((t) => !t.main && !present.has(t.id))

  if (pool.length === 0) return quest
  const rnd = mulberry32(hashSeed(`${date}-${quest.templateId}-${swapsUsed}`))
  const t = pool[Math.floor(rnd() * pool.length)]
  const index = Number(quest.id.split('-').pop() ?? 0)
  return toQuest(t, level, eff, rnd, date, index)
}