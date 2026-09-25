export type StatKey = 'strength' | 'endurance' | 'agility'

export type QuestCategory = 'strength' | 'core' | 'cardio' | 'mobility' | 'break'

export type Difficulty = 1 | 2 | 3

export type Intensity = 'light' | 'normal' | 'intense'

export type DayKind = 'recovery' | 'light' | 'normal' | 'hard'

export type QuestUnit = 'reps' | 'secs' | 'min' | 'fixed'

export type MuscleGroup = 'push' | 'leg' | 'core'

export interface QuestVariant {
  minLevel: number
  title: string
  note?: string
  range?: [number, number]
}

export interface QuestTemplate {
  id: string
  title: string
  category: QuestCategory
  muscle?: MuscleGroup
  rest?: boolean
  minLevel?: number
  difficulty: Difficulty
  stat?: StatKey
  baseXp: number
  main: boolean
  unit: QuestUnit
  sets?: number
  base?: number
  grow?: number
  cap?: number
  variants: QuestVariant[]
}

export interface DailyQuest {
  id: string
  templateId: string
  variantId: string
  title: string
  description: string
  category: QuestCategory
  muscle?: MuscleGroup
  difficulty: Difficulty
  stat?: StatKey
  xp: number
  main: boolean
  done: boolean
  completedAt: string | null
}

export interface PlayerProfile {
  name: string
  age: number
  heightCm: number
  weightKg: number
}

export interface GameSettings {
  sound: boolean
  notifications: boolean
  theme: 'dark' | 'light'
}

export type GameEvent =
  | { type: 'levelup'; level: number; className: string }
  | { type: 'unlock'; items: { templateId: string; title: string; minLevel: number }[] }
  | { type: 'achievement'; achievementId: string }
  | { type: 'dayComplete' }
  | { type: 'dayPartial' }
  | { type: 'newRecord'; streak: number }
  | { type: 'sickDay' }
  | { type: 'miss' }

export interface HabitPoint {
  date: string
  value: number
}

export interface WeightEntry {
  date: string
  valueKg: number
}

export interface GameState {
  version: number
  createdAt: string
  currentDate: string
  profile: PlayerProfile
  settings: GameSettings
  dayIntensity: Intensity
  totalXp: number
  stats: Record<StatKey, number>
  habit: number
  bestHabit: number
  streak: number
  bestStreak: number
  daysCounted: number
  dayBonusClaimed: boolean
  totalQuestsDone: number
  perCategoryDone: Record<QuestCategory, number>
  questsByDate: Record<string, DailyQuest[]>
  unlockedAchievements: Record<string, string>
  sickUsed: string[]
  habitHistory: HabitPoint[]
  weightHistory: WeightEntry[]
  swapsUsed: number
  soreGroups: MuscleGroup[]
  onboardingDone: boolean
  events: GameEvent[]
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  check: (state: GameState, level: number) => boolean
}

export interface LevelInfo {
  level: number
  className: string
  xpIntoLevel: number
  xpToNext: number
  progress: number
}