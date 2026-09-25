import { useGame } from '../state/GameContext'
import { CLASS_BY_LEVEL, CATEGORY_LABELS, HABIT_DAY_GAIN, STAT_LABELS } from '../game/constants'
import { lastNDays, shiftDateKey } from '../game/dates'
import { xpMultiplier } from '../game/leveling'
import { QUEST_TEMPLATES } from '../game/quests'
import { getCompanionInfo } from '../game/companion'
import {
  BarChart3,
  CategoryGlyph,
  Flame,
  ScrollText,
  Shield,
  Sparkles,
  StatGlyph,
  Swords,
  TrendingUp,
  Trophy,
  Zap,
} from '../components/Glyphs'
import type { QuestCategory } from '../game/types'

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { state, level, statsList, todayQuests } = useGame()

  const mainDone = todayQuests.filter((q) => q.main && q.done).length
  const mainTotal = todayQuests.filter((q) => q.main).length
  const totalDone = todayQuests.filter((q) => q.done).length

  const mult = xpMultiplier(state.streak, state.habit)
  const companion = getCompanionInfo(state, todayQuests)

  const categories: QuestCategory[] = ['strength', 'core', 'cardio', 'mobility', 'break']

  const trend = state.habitHistory.slice(-7)
  const trendDelta = trend.length < 2 ? 0 : trend[trend.length - 1].value - trend[0].value
  const trendLabel = trend.length < 2 ? 'ще формується' : trendDelta >= 5 ? 'росте' : trendDelta <= -5 ? 'падає' : 'стабільна'
  const daysTo100 = Math.max(0, Math.ceil((100 - state.habit) / HABIT_DAY_GAIN))
  const last14 = lastNDays(14, state.currentDate)
  const ideal14 = last14.filter((d) => {
    const q = state.questsByDate[d]
    return !!q && q.length > 0 && q.every((x) => x.done)
  }).length
  const last7 = lastNDays(7, state.currentDate)
  const quests7 = last7.reduce(
    (sum, d) => sum + (state.questsByDate[d] ?? []).filter((q) => q.done).length,
    0,
  )
  const wh = state.weightHistory
  const lastW = wh[wh.length - 1]
  const prevW = wh[wh.length - 2]
  const weightNote =
    lastW && prevW
      ? `${lastW.valueKg - prevW.valueKg > 0 ? '+' : ''}${(lastW.valueKg - prevW.valueKg).toFixed(1)} до минулого`
      : lastW
        ? 'перший запис'
        : 'немає записів'
  const nextUnlocks = QUEST_TEMPLATES.filter((t) => (t.minLevel ?? 1) > level.level)
    .sort((a, b) => (a.minLevel ?? 1) - (b.minLevel ?? 1))
    .slice(0, 3)
  const nextClass = CLASS_BY_LEVEL.find((r) => r.minLevel > level.level)

  const yesterdayKey = shiftDateKey(state.currentDate, -1)
  const yesterdayQuests = state.questsByDate[yesterdayKey]
  const missedYesterday =
    yesterdayQuests &&
    yesterdayQuests.length > 0 &&
    !yesterdayQuests.some((q) => q.main && q.done) &&
    !state.sickUsed.includes(yesterdayKey) &&
    totalDone === 0
  const showBossSad = missedYesterday || (state.habit < 30 && state.streak === 0 && totalDone === 0)

  return (
    <>
      <h1 className="page-title">
        <Swords size={24} strokeWidth={1.6} /> Персонаж
      </h1>
      <p className="page-sub">Твій шлях від дивана до легенди</p>

      {showBossSad && (
        <div
          className="nudge section-mb"
          style={{
            borderColor: 'var(--danger)',
            background:
              'linear-gradient(90deg, rgba(239, 106, 106, 0.16), rgba(239, 106, 106, 0.04))',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Flame size={20} color="var(--danger)" />
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--danger)' }}>Бос сумує через прогул!</strong> Дисципліна падає, серія на нулі. Зроби сьогодні хоча б один квест, щоб відновити темп!
          </div>
          <button
            type="button"
            className="btn btn-sm btn-gold"
            onClick={() => onNavigate('quests')}
            style={{ whiteSpace: 'nowrap' }}
          >
            До квестів
          </button>
        </div>
      )}

      <div className="hero-row">
        <div className="panel panel-gold">
          <div className="char-name">{state.profile.name}</div>
          <span className="char-class">{level.className}</span>

          <div className="level-wrap">
            <div className="level-badge">
              <span className="level-badge-value">{level.level}</span>
              <span className="level-badge-label">РІВЕНЬ</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="bar">
                <div className="bar-fill gold" style={{ width: `${level.progress * 100}%` }} />
              </div>
              <div className="bar-labels">
                <span>{level.xpIntoLevel} XP</span>
                <span>{level.xpToNext} XP до рівня {level.level + 1}</span>
              </div>
            </div>
          </div>

          <div className="integrity-row">
            <div className="integrity-cell">
              <div className="integrity-label">
                <span>
                  <Flame size={14} /> Дисципліна
                </span>
                <span>{Math.round(state.habit)}</span>
              </div>
              <div className="bar">
                <div
                  className={`bar-fill ${state.habit >= 50 ? 'green' : 'red'}`}
                  style={{ width: `${state.habit}%` }}
                />
              </div>
              <div
                className="char-class"
                style={{
                  display: 'block',
                  color: 'var(--text-dim)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                Звичка: +5 за день · −10 за прогул
              </div>
            </div>
            <div className="integrity-cell">
              <div className="integrity-label">
                <span>
                  <Zap size={14} /> Серія
                </span>
                <span>{state.streak} дн.</span>
              </div>
              <div
                className="char-class"
                style={{
                  display: 'block',
                  color: state.streak > 0 ? 'var(--success)' : 'var(--text-dim)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {state.streak > 0
                  ? `Бонус XP ×${mult.toFixed(2)}`
                  : `Множник XP ×${mult.toFixed(2)} — зроби квест сьогодні!`}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <BarChart3 size={16} /> Характеристики
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {statsList.map(({ key, value }) => (
              <div className="stat-card" key={key}>
                <span className="stat-icon">
                  <StatGlyph stat={key} size={22} />
                </span>
                <div className="stat-name">{STAT_LABELS[key]}</div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel section-mb" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--gold-dim-bg, rgba(236,200,120,0.15))',
            border: '1px solid var(--gold-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gold-bright)',
            flexShrink: 0,
          }}
        >
          <Sparkles size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold-bright)' }}>
              {companion.name}
            </span>
            <span
              style={{
                fontSize: 11,
                background: 'var(--surface-raised)',
                padding: '2px 8px',
                borderRadius: 4,
                color: 'var(--text-dim)',
              }}
            >
              {companion.badge}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, fontStyle: 'italic' }}>
            «{companion.quote}»
          </div>
        </div>
      </div>

      <div className="panel section-mb" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <Shield size={16} /> Попереду на шляху
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {nextClass && (
            <Kpi value={`${nextClass.minLevel}`} label={`Клас «${nextClass.name}» · рівень`} />
          )}
          {nextUnlocks.map((u) => (
            <div key={u.id} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--gold-bright)' }}>
                {u.minLevel}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                нова вправа
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{u.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-title">
            <ScrollText size={16} /> Квести сьогодні
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ flex: 1, maxWidth: 260 }}>
              <div className="bar">
                <div
                  className="bar-fill gold"
                  style={{ width: `${(totalDone / todayQuests.length) * 100}%` }}
                />
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold-bright)' }}>
              {totalDone}/{todayQuests.length}
            </div>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14 }}>
            Основних виконано: {mainDone}/{mainTotal}. Виконай хоча б один, щоб серія не перервалась.
          </div>
          <button className="btn btn-gold" onClick={() => onNavigate('quests')}>
            <ScrollText size={16} /> До квестів
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">
            <Trophy size={16} /> Прогрес
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <Kpi value={state.bestStreak} label="Рекорд серії" suffix=" дн" />
            <Kpi value={state.totalQuestsDone} label="Квестів виконано" />
            <Kpi value={state.daysCounted} label="Днів у шляху" />
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => onNavigate('progress')}>
            <BarChart3 size={16} /> Детальніше
          </button>
        </div>
      </div>

      <div className="panel section-mb" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <TrendingUp size={16} /> Динаміка
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 180px', minWidth: 180 }}>
            <div className="spark">
              {trend.length > 0 ? (
                trend.map((p, i) => (
                  <div key={i} className="spark-bar" style={{ height: `${Math.max(6, p.value)}%` }} />
                ))
              ) : (
                <div className="settings-hint" style={{ padding: '10px 0' }}>
                  Дані з'являться після першого переходу дня
                </div>
              )}
            </div>
            <div className="settings-hint" style={{ textAlign: 'center', marginTop: 6 }}>
              Звичка: {trendLabel} · {Math.round(state.habit)} зараз
            </div>
          </div>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            <Kpi value={daysTo100} label="днів до 100" />
            <Kpi value={`${ideal14}/14`} label="ідеальних днів" />
            <Kpi value={quests7} label="квестів за 7 дн" />
            <Kpi value={lastW ? lastW.valueKg : 0} suffix=" кг" label="вага" note={weightNote} />
          </div>
        </div>
      </div>

      <div className="panel section-mb" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <Shield size={16} /> Категорії активності
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <div key={cat} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--gold-dim)' }}>
                <CategoryGlyph category={cat} size={22} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold-bright)' }}>
                {state.perCategoryDone[cat]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[cat]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Kpi({
  value,
  label,
  suffix = '',
  note,
}: {
  value: string | number
  label: string
  suffix?: string
  note?: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold-bright)' }}>
        {value}
        {suffix}
      </div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)' }}>
        {label}
      </div>
      {note && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{note}</div>}
    </div>
  )
}