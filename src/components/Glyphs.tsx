import { CATEGORY_ICONS, STAT_ICONS, type LucideIcon } from './iconMaps'
import type { QuestCategory, StatKey } from '../game/types'

export {
  ACHIEVEMENT_ICONS,
  CATEGORY_ICONS,
  NAV_ICONS,
  STAT_ICONS,
  type LucideIcon,
} from './iconMaps'

export {
  Activity,
  Armchair,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  Crown,
  Download,
  Dumbbell,
  Flame,
  Footprints,
  Gem,
  HeartPulse,
  Layers,
  Medal,
  Mountain,
  RefreshCw,
  Save,
  Scale,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  StretchHorizontal,
  Sword,
  Swords,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Volume2,
  Zap,
} from 'lucide-react'

export function Glyph({
  icon,
  size = 18,
  strokeWidth = 1.75,
  className,
}: {
  icon: LucideIcon
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const C = icon
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />
}

export function StatGlyph({ stat, size = 16 }: { stat: StatKey; size?: number }) {
  return <Glyph icon={STAT_ICONS[stat]} size={size} />
}

export function CategoryGlyph({ category, size = 14 }: { category: QuestCategory; size?: number }) {
  return <Glyph icon={CATEGORY_ICONS[category]} size={size} />
}