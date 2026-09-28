import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { levelInfo, powerScore } from '../game/leveling'
import { CATEGORY_LABELS, CLASS_BY_LEVEL } from '../game/constants'
import {
  BarChart3,
  CalendarDays,
  Crown,
  Flame,
  Medal,
  Scale,
  Shield,
  Swords,
  TrendingUp,
  Trophy,
  Zap,
} from '../components/Glyphs'
import { formatUa, lastNDays, weekdayShort } from '../game/dates'

export function Progress() {
  const { state } = useGame()
  const level = levelInfo(state.totalXp)

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

  const muscleCounts = useMemo(() => {
    const counts: Record<string, number> = { push: 0, leg: 0, core: 0 }
    for (const quests of Object.values(state.questsByDate)) {
      for (const q of quests) {
        if (q.done && q.muscle && counts[q.muscle] !== undefined) {
          counts[q.muscle]++
        }
      }
    }
    return counts
  }, [state.questsByDate])

  const totalMuscle = muscleCounts.push + muscleCounts.leg + muscleCounts.core || 1
  const pushPct = (muscleCounts.push / totalMuscle) * 100
  const legPct = (muscleCounts.leg / totalMuscle) * 100
  const corePct = (muscleCounts.core / totalMuscle) * 100

  const totalCats =
    (state.perCategoryDone.strength || 0) +
    (state.perCategoryDone.core || 0) +
    (state.perCategoryDone.cardio || 0) +
    (state.perCategoryDone.mobility || 0) +
    (state.perCategoryDone.break || 0) || 1

  const latestWeight = state.weightHistory[state.weightHistory.length - 1]?.valueKg ?? state.profile.weightKg
  const weightDelta = state.weightHistory.length > 1
    ? latestWeight - state.weightHistory[0].valueKg
    : 0

  const minWeight = useMemo(() => {
    if (!state.weightHistory.length) return 0
    return Math.min(...state.weightHistory.map((w) => w.valueKg))
  }, [state.weightHistory])

  const maxWeight = useMemo(() => {
    if (!state.weightHistory.length) return 0
    return Math.max(...state.weightHistory.map((w) => w.valueKg))
  }, [state.weightHistory])

  const avgWeight = useMemo(() => {
    if (!state.weightHistory.length) return 0
    const sum = state.weightHistory.reduce((acc, w) => acc + w.valueKg, 0)
    return Math.round((sum / state.weightHistory.length) * 10) / 10
  }, [state.weightHistory])

  const personalRecords = useMemo(() => {
    let maxQ = 0
    let maxXp = 0
    let activeDays = 0
    for (const qs of Object.values(state.questsByDate)) {
      const done = qs.filter((q) => q.done)
      if (done.length > 0) {
        activeDays++
        if (done.length > maxQ) maxQ = done.length
        const dayXp = done.reduce((sum, q) => sum + q.xp, 0)
        if (dayXp > maxXp) maxXp = dayXp
      }
    }
    return { maxQuests: maxQ, maxXp: Math.floor(maxXp), activeDays }
  }, [state.questsByDate])

  const weekdayStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const totals = [0, 0, 0, 0, 0, 0, 0]
    for (const [dateStr, quests] of Object.entries(state.questsByDate)) {
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      let dayIndex = date.getDay() - 1
      if (dayIndex === -1) dayIndex = 6
      totals[dayIndex]++
      const done = quests.filter((q) => q.done).length
      counts[dayIndex] += done
    }
    const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
    const avgPerDay = counts.map((c, i) => (totals[i] > 0 ? Math.round((c / totals[i]) * 10) / 10 : 0))
    const maxAvg = Math.max(1, ...avgPerDay)
    const bestDayIndex = avgPerDay.indexOf(Math.max(...avgPerDay))
    const bestDayName = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'][bestDayIndex]
    return { counts, totals, avgPerDay, maxAvg, bestDayName, labels }
  }, [state.questsByDate])

  const heightM = state.profile.heightCm > 0 ? state.profile.heightCm / 100 : 0
  const bmi = heightM > 0 ? Math.round((latestWeight / (heightM * heightM)) * 10) / 10 : 0
  const bmiCategory =
    bmi === 0
      ? ''
      : bmi < 18.5
      ? 'Недостатня вага'
      : bmi < 25
      ? 'Норма'
      : bmi < 30
      ? 'Надмірна вага'
      : 'Ожиріння'
  const bmiColor =
    bmi === 0
      ? 'var(--text-dim)'
      : bmi >= 18.5 && bmi < 25
      ? 'var(--good)'
      : bmi < 30
      ? 'var(--gold)'
      : 'var(--danger)'

  const [noteSearch, setNoteSearch] = useState('')

  const allNotes = useMemo(() => {
    return Object.entries(state.notesByDate || {})
      .filter(([, text]) => text.trim().length > 0)
      .sort(([a], [b]) => b.localeCompare(a))
  }, [state.notesByDate])

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) return allNotes
    const q = noteSearch.toLowerCase()
    return allNotes.filter(([date, text]) => date.includes(q) || text.toLowerCase().includes(q))
  }, [allNotes, noteSearch])

  const waterEntries = useMemo(() => {
    return Object.entries(state.waterByDate || {}).sort(([a], [b]) => b.localeCompare(a))
  }, [state.waterByDate])
  const totalWaterGlasses = waterEntries.reduce((acc, [, val]) => acc + val, 0)
  const avgWaterGlasses = waterEntries.length > 0 ? Math.round((totalWaterGlasses / waterEntries.length) * 10) / 10 : 0

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
          <Shield size={16} /> Баланс м'язових груп
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Розподіл виконаних силових вправ за групами м'язів (руки/плечі, ноги, спина/кор).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{muscleCounts.push}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Руки / плечі</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{muscleCounts.leg}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ноги</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{muscleCounts.core}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Спина / кор</div>
          </div>
        </div>
        <div className="bar" style={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', background: 'var(--surface-raised)' }}>
          <div style={{ width: `${pushPct}%`, background: 'var(--gold)' }} title={`Push: ${muscleCounts.push}`} />
          <div style={{ width: `${legPct}%`, background: 'var(--gold-dim)' }} title={`Leg: ${muscleCounts.leg}`} />
          <div style={{ width: `${corePct}%`, background: 'var(--success)' }} title={`Core: ${muscleCounts.core}`} />
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Trophy size={16} /> Квести за категоріями
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Загальна кількість виконаних квестів за типами активності.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 4 }}>
          {(['strength', 'core', 'cardio', 'mobility', 'break'] as const).map((cat) => {
            const count = state.perCategoryDone[cat] || 0
            const pct = Math.round((count / totalCats) * 100)
            return (
              <div key={cat} style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                </div>
                <div className="bar" style={{ height: 6, borderRadius: 3, background: 'var(--surface-raised)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Trophy size={16} /> Особисті рекорди
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Твої найкращі досягнення за весь час тренувань у FitQuest.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Макс. квестів за день</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>{personalRecords.maxQuests}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Макс. XP за день</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>{personalRecords.maxXp}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Активних днів</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>{personalRecords.activeDays}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Рекорд серії</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>{state.bestStreak} дн.</div>
          </div>
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <CalendarDays size={16} /> Ефективність за днями тижня
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Середня кількість виконаних квестів за кожен день тижня. Найпродуктивніший день: <strong style={{ color: 'var(--gold)' }}>{weekdayStats.bestDayName}</strong>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, alignItems: 'flex-end', height: 90, paddingBottom: 4 }}>
          {weekdayStats.avgPerDay.map((val, i) => {
            const h = (val / weekdayStats.maxAvg) * 100
            const label = weekdayStats.labels[i]
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>{val > 0 ? val : ''}</span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(4, h)}%`,
                    background: val === Math.max(...weekdayStats.avgPerDay) && val > 0 ? 'var(--gold)' : 'var(--surface-raised)',
                    borderRadius: 4,
                  }}
                  title={`${label}: сер. ${val} квестів`}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Crown size={16} /> Кар'єра героя (Класи)
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Етапи еволюції твого класу у FitQuest залежно від рівня.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {CLASS_BY_LEVEL.map((c) => {
            const isUnlocked = level.level >= c.minLevel
            const nextClassRow = CLASS_BY_LEVEL.find((x) => x.minLevel > c.minLevel)
            const isCurrent = level.level >= c.minLevel && (!nextClassRow || level.level < nextClassRow.minLevel)
            return (
              <div
                key={c.minLevel}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: isCurrent ? 'var(--gold-dim-bg, rgba(236,200,120,0.15))' : 'var(--panel-sub)',
                  border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border-solid)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', color: isUnlocked ? 'var(--gold-bright)' : 'var(--text-dim)', width: 40 }}>
                    {c.minLevel} р.
                  </span>
                  <span style={{ fontWeight: isCurrent ? 700 : 400, color: isUnlocked ? 'var(--text)' : 'var(--text-dim)' }}>
                    {c.name}
                  </span>
                </div>
                <div>
                  {isCurrent ? (
                    <span style={{ fontSize: 11, background: 'var(--gold)', color: 'var(--background)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      Поточний клас
                    </span>
                  ) : isUnlocked ? (
                    <span style={{ fontSize: 11, color: 'var(--good)' }}>✓ Відкрито</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.minLevel - level.level} рівнів до розблокування</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {state.weightHistory.length > 0 && (
        <div className="panel section-mb">
          <div className="panel-title">
            <Scale size={16} /> Динаміка ваги тіла
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Історія вимірювань ваги ({state.weightHistory.length} записів).
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
            <span>Початкова: <strong>{state.weightHistory[0].valueKg} кг</strong> ({formatUa(state.weightHistory[0].date)})</span>
            <span>Поточна: <strong>{latestWeight} кг</strong></span>
            {state.weightHistory.length > 1 && weightDelta !== 0 && (
              <span style={{ color: weightDelta < 0 ? 'var(--good)' : 'var(--danger)', fontWeight: 600 }}>
                {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} кг
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12, padding: '8px 10px', background: 'var(--panel-sub)', borderRadius: 6, fontSize: 13, textAlign: 'center' }}>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Мінімум</div>
              <strong>{minWeight} кг</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Максимум</div>
              <strong>{maxWeight} кг</strong>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Середня</div>
              <strong>{avgWeight} кг</strong>
            </div>
          </div>
          {state.profile.heightCm > 0 && bmi > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '6px 10px', background: 'var(--panel-sub)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-dim)' }}>Індекс маси тіла (ІМТ):</span>
              <span>
                <strong>{bmi}</strong> <span style={{ color: bmiColor, marginLeft: 4 }}>({bmiCategory})</span>
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gap: 6 }}>
            {state.weightHistory.slice(-5).reverse().map((w, i) => {
              const prev = state.weightHistory[state.weightHistory.length - 1 - i - 1]
              const delta = prev ? w.valueKg - prev.valueKg : null
              return (
                <div key={w.date} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dim)' }}>
                  <span>{formatUa(w.date)}</span>
                  <span>
                    <strong style={{ color: 'var(--text)' }}>{w.valueKg}</strong> кг
                    {delta !== null && delta !== 0 && (
                      <span style={{ marginLeft: 6, color: delta < 0 ? 'var(--good)' : 'var(--danger)', fontSize: 12 }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {waterEntries.length > 0 && (
        <div className="panel section-mb">
          <div className="panel-title">
            💧 Статистика гідратації
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Споживання води за весь час тренувань (ціль — 8 склянок / 2 л на день).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Всього випито</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>
                {totalWaterGlasses} скл. <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>({Math.round(totalWaterGlasses * 0.25 * 10) / 10} л)</span>
              </div>
            </div>
            <div style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6 }}>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Середнє на день</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold-bright)' }}>
                {avgWaterGlasses} скл. <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-dim)' }}>({Math.round(avgWaterGlasses * 0.25 * 10) / 10} л)</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {waterEntries.slice(0, 5).map(([date, count]) => (
              <div key={date} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dim)' }}>
                <span>{formatUa(date)}</span>
                <span>
                  <strong style={{ color: count >= 8 ? 'var(--gold-bright)' : 'var(--text)' }}>{count}</strong> / 8 склянок
                  {count >= 8 && <span style={{ marginLeft: 6, color: 'var(--good)', fontSize: 11 }}>✓ ціль</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allNotes.length > 0 && (
        <div className="panel section-mb">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>📝 Журнал нотаток дня ({filteredNotes.length}/{allNotes.length})</span>
            <input
              type="text"
              placeholder="Пошук у нотатках..."
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              aria-label="Пошук у нотатках"
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-solid)',
                background: 'var(--surface-raised)',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                width: 160,
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            Архів записів самопочуття та рефлексії тренувань.
          </p>
          {filteredNotes.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
              Нічого не знайдено за запитом "{noteSearch}".
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, maxHeight: 350, overflowY: 'auto' }}>
              {filteredNotes.map(([date, text]) => (
                <div key={date} style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6, fontSize: 13 }}>
                  <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>{formatUa(date)}</div>
                  <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            <Zap size={15} color="var(--gold-dim)" /> Спалено енергії: <strong>{Math.round(state.totalXp * 0.75)} ккал</strong>
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