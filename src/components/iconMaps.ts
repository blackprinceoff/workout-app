import {
  Activity,
  Armchair,
  Award,
  BarChart3,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  Gem,
  HeartPulse,
  Layers,
  Medal,
  Mountain,
  Scale,
  ScrollText,
  Settings,
  Shield,
  StretchHorizontal,
  Sword,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { QuestCategory, StatKey } from '../game/types'

export const STAT_ICONS: Record<StatKey, LucideIcon> = {
  strength: Sword,
  endurance: HeartPulse,
  agility: Zap,
}

export const CATEGORY_ICONS: Record<QuestCategory, LucideIcon> = {
  strength: Dumbbell,
  core: Layers,
  cardio: Activity,
  mobility: StretchHorizontal,
  break: Timer,
}

export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: Swords,
  quests: ScrollText,
  progress: BarChart3,
  achievements: Trophy,
  settings: Settings,
}

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first_step: Footprints,
  streak_3: Flame,
  streak_7: Swords,
  streak_14: Award,
  streak_30: Medal,
  streak_66: Flame,
  streak_100: Trophy,
  habit_crafted: Shield,
  level_5: TrendingUp,
  level_10: Gem,
  level_20: Mountain,
  level_30: Mountain,
  level_50: Trophy,
  level_100: Award,
  quests_25: Target,
  quests_100: Dumbbell,
  quests_500: Trophy,
  quests_1000: Layers,
  balanced: Scale,
  nights_watch: Armchair,
  boss_week: Crown,
}

export type { LucideIcon }