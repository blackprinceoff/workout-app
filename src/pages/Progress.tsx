import { useMemo } from 'react'
import { useGame } from '../state/GameContext'
import { lastNDays, weekdayShort } from '../game/dates'
import { powerScore } from '../game/leveling'
import {
  BarChart3,
  CalendarDays,
  Crown,
  Flame,
  Medal,
  Swords,
  TrendingUp,
  Trophy,
} from '../components/Glyphs'

export function Progress() {
  const { state } = useGame()

  const days14 = useMemo(() => lastNDays(14, state.currentDate), [state.currentDate])
  const days7 = useMemo(() => lastNDays(7, state.currentDate), [state.currentDate])
  const days35 = useMemo(() => lastNDays(35, state.currentDate), [state.currentDate])

  const doneCount = (key: string) => (state.questsByDate[key] ?? []).filter((q) => q.done).length
  const perfectDays = days14.filter((d) => {
    const qs = state.questsByDate[d] ?? []
    return qs.length > 0 && qs.every((q) => q.done)
  }).length

  const maxPerDay = Math.max(5, ...days14.map(doneCount))

  const wonDays = days7.filter((d) => {
    const qs = state.questsByDate[d] ?? []
    return qs.length > 0 && qs.every((q) => q.done)
  }).length

  return (
    <>
      <h1 className="page-title">
        <BarChart3 size={24} strokeWidth={1.6} /> Прогрес
      </h1>
      <p className="page-sub">Статистика твого шляху до дисципліни</p>

      <div className="grid-stats section-mb">
        <div className="kpi">
          <div className="kpi-value">{state.streak}</div>
          <div className="kpi-label">Серія (днів)</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{state.bestStreak}</div>
          <div className="kpi-label">Рекорд</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{state.totalQuestsDone}</div>
          <div className="kpi-label">Квестів виконано</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{powerScore(state)}</div>
          <div className="kpi-label">Сила персонажа</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{perfectDays}</div>
          <div className="kpi-label">Ідеальних днів (14 дн)</div>
        </div>
      </div>

      <div className="panel section-mb" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <Crown size={16} /> Бос тижня
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Сім днів без прогулів — і ти перемагаєш тижневого боса. Золота клітинка — повністю виконаний день.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {days7.map((d) => {
            const qs = state.questsByDate[d] ?? []
            const all = qs.length > 0 && qs.every((q) => q.done)
            const partial = qs.some((q) => q.done)
            const level = all ? 'l4' : partial ? 'l2' : 'l0'
            return (
              <div
                key={d}
                className={`heat-cell ${level} ${d === state.currentDate ? 'today' : ''}`}
                title={`${weekdayShort(d)} ${d} · ${qs.filter((q) => q.done).length}/${qs.length} квестів`}
              />
            )
          })}
        </div>
        <div className="settings-hint" style={{ marginTop: 8 }}>
          {wonDays === 7 ? (
            <span style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>Бос переможений — тиждень без прогулів!</span>
          ) : (
            <>Переможних днів: {wonDays}/7</>
          )}
        </div>
      </div>

      <div className="grid-2 section-mb">
        <div className="panel">
          <div className="panel-title">
            <CalendarDays size={16} /> Останні 35 днів
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
            Клітинка = кількість квестів за день. Золота — найкращі дні.
          </p>
          <div className="heatmap-grid">
            {days35.map((d) => {
              const n = doneCount(d)
              const level = n === 0 ? 'l0' : n === 1 ? 'l1' : n === 2 ? 'l2' : n === 3 || n === 4 ? 'l3' : 'l4'
              return (
                <div
                  key={d}
                  className={`heat-cell ${level} ${d === state.currentDate ? 'today' : ''}`}
                  title={`${weekdayShort(d)} ${d} · ${n} квестів`}
                >
                  {n > 0 ? n : ''}
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <TrendingUp size={16} /> Квестів за день (14 днів)
          </div>
          <div className="chart">
            {days14.map((d) => {
              const n = doneCount(d)
              return (
                <div className="chart-col" key={d}>
                  <div
                    className="chart-bar"
                    style={{ height: `${(n / maxPerDay) * 100}%` }}
                    title={`${d}: ${n}`}
                  />
                  <div className="chart-label">
                    {new Date(d + 'T00:00:00').toLocaleDateString('uk-UA', { day: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Medal size={16} /> Підсумки
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={15} color="var(--gold-dim)" /> Днів на шляху: <strong>{state.daysCounted}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={15} color="var(--gold-dim)" /> Основних тренувань виконано: <strong>{countByMain(state)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={15} color="var(--gold-dim)" /> Загальний XP: <strong>{Math.floor(state.totalXp)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={15} color="var(--gold-dim)" /> Поточна серія: <strong>{state.streak}</strong>
          </div>
        </div>
      </div>
    </>
  )
}

function countByMain(state: ReturnType<typeof useGame>['state']): number {
  let total = 0
  for (const quests of Object.values(state.questsByDate)) {
    total += quests.filter((q) => q.main && q.done).length
  }
  return total
}