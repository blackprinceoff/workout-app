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
  const { state, addBodyMeasurements, removeBodyMeasurements } = useGame()
  const level = levelInfo(state.totalXp)

  const [chestInput, setChestInput] = useState('')
  const [waistInput, setWaistInput] = useState('')
  const [hipsInput, setHipsInput] = useState('')
  const [armsInput, setArmsInput] = useState('')
  const [thighsInput, setThighsInput] = useState('')

  const handleSaveMeasurements = (e: React.FormEvent) => {
    e.preventDefault()
    addBodyMeasurements({
      chest: chestInput ? Number(chestInput) : undefined,
      waist: waistInput ? Number(waistInput) : undefined,
      hips: hipsInput ? Number(hipsInput) : undefined,
      arms: armsInput ? Number(armsInput) : undefined,
      thighs: thighsInput ? Number(thighsInput) : undefined,
    })
    setChestInput('')
    setWaistInput('')
    setHipsInput('')
    setArmsInput('')
    setThighsInput('')
  }

  const exportBodyMeasurementsCsv = () => {
    if (!state.bodyMeasurements.length) return
    const rows = ['Дата,Груди (см),Талія (см),Стегна (см),Руки (см),Ноги (см)']
    for (const m of state.bodyMeasurements) {
      rows.push(`${m.date},${m.chest ?? ''},${m.waist ?? ''},${m.hips ?? ''},${m.arms ?? ''},${m.thighs ?? ''}`)
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fitquest-body-measurements.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportWeightHistoryCsv = () => {
    if (!state.weightHistory.length) return
    const rows = ['Дата,Вага (кг)']
    for (const w of state.weightHistory) {
      rows.push(`${w.date},${w.valueKg}`)
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fitquest-weight-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportNotesTxt = () => {
    if (!allNotes.length) return
    const content = allNotes.map(([date, text]) => `--- ${formatUa(date)} (${date}) ---\n${text}\n`).join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fitquest-daily-notes-${state.currentDate}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const days14 = useMemo(() => lastNDays(14, state.currentDate), [state.currentDate])
  const days7 = useMemo(() => lastNDays(7, state.currentDate), [state.currentDate])
  const days30 = useMemo(() => lastNDays(30, state.currentDate), [state.currentDate])
  const days35 = useMemo(() => lastNDays(35, state.currentDate), [state.currentDate])

  const monthNamesUa = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ]

  const [selectedYear, setSelectedYear] = useState(() => Number(state.currentDate.split('-')[0]))
  const [selectedMonth, setSelectedMonth] = useState(() => Number(state.currentDate.split('-')[1]))

  const monthDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; inMonth: boolean }[] = []
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1)
    const lastDay = new Date(selectedYear, selectedMonth, 0)
    let jsDay = firstDay.getDay()
    let startOffset = jsDay === 0 ? 6 : jsDay - 1

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1, -i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push({ dateStr: `${y}-${m}-${day}`, dayNum: d.getDate(), inMonth: false })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const mStr = String(selectedMonth).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      days.push({ dateStr: `${selectedYear}-${mStr}-${dStr}`, dayNum: d, inMonth: true })
    }

    while (days.length % 7 !== 0) {
      const nextDateNum = days.length - startOffset - lastDay.getDate() + 1
      const d = new Date(selectedYear, selectedMonth, nextDateNum)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      days.push({ dateStr: `${y}-${m}-${day}`, dayNum: d.getDate(), inMonth: false })
    }

    return days
  }, [selectedYear, selectedMonth])

  const monthSummary = useMemo(() => {
    let questsDone = 0
    let xpEarned = 0
    let activeDays = 0
    let caloriesBurned = 0
    for (const d of monthDays) {
      if (!d.inMonth) continue
      const qs = state.questsByDate[d.dateStr] || []
      const done = qs.filter((q) => q.done)
      if (done.length > 0) {
        activeDays++
        questsDone += done.length
        const dayXp = done.reduce((sum, q) => sum + q.xp, 0)
        xpEarned += dayXp
        caloriesBurned += Math.round(dayXp * 3.5)
      }
    }
    return { questsDone, xpEarned: Math.floor(xpEarned), activeDays, caloriesBurned }
  }, [monthDays, state.questsByDate])

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

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

  const weeklyTarget = state.settings.weeklyTargetDays ?? 4
  const activeDaysLast7 = days7.filter((d) => {
    const qs = state.questsByDate[d] ?? []
    return qs.some((q) => q.done)
  }).length
  const weeklyProgressPct = Math.min(100, Math.round((activeDaysLast7 / weeklyTarget) * 100))

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

  const exerciseStats = useMemo(() => {
    const map: Record<string, { title: string; count: number; totalXp: number; category: string }> = {}
    for (const quests of Object.values(state.questsByDate)) {
      for (const q of quests) {
        if (q.done) {
          const key = q.templateId || q.title
          if (!map[key]) {
            map[key] = { title: q.title, count: 0, totalXp: 0, category: q.category }
          }
          map[key].count++
          map[key].totalXp += q.xp
        }
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count || b.totalXp - a.totalXp).slice(0, 5)
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

      <div className="panel section-mb">
        <div className="panel-title">
          <Flame size={16} /> Тижнева мета тренувань
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-dim)' }}>Активних днів за останні 7 днів:</span>
          <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{activeDaysLast7} / {weeklyTarget} днів</span>
        </div>
        <div className="progress-track" style={{ height: 8, background: 'var(--surface-raised)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            className="progress-fill"
            style={{
              width: `${weeklyProgressPct}%`,
              height: '100%',
              background: activeDaysLast7 >= weeklyTarget ? 'var(--good)' : 'var(--gold)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
          {activeDaysLast7 >= weeklyTarget
            ? '🎉 Вітаємо! Тижневу мету тренувань досягнуто!'
            : `Ще ${Math.max(0, weeklyTarget - activeDaysLast7)} днів до виконання тижневої мети.`}
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={16} /> Календар активності ({monthNamesUa[selectedMonth - 1]} {selectedYear})
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="btn"
              style={{ padding: '2px 8px', fontSize: 12, background: 'var(--surface-raised)', color: 'var(--text)' }}
              title="Попередній місяць"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => {
                const [y, m] = state.currentDate.split('-').map(Number)
                setSelectedYear(y)
                setSelectedMonth(m)
              }}
              className="btn"
              style={{ padding: '2px 6px', fontSize: 11, background: 'var(--surface-raised)', color: 'var(--text-dim)' }}
              title="Поточний місяць"
            >
              Сьогодні
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="btn"
              style={{ padding: '2px 8px', fontSize: 12, background: 'var(--surface-raised)', color: 'var(--text)' }}
              title="Наступний місяць"
            >
              ›
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Календарна сітка місяця: інтенсивність виконання квестів за кожен день.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Нд</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {monthDays.map(({ dateStr, dayNum, inMonth }) => {
            const n = doneCount(dateStr)
            const level = n === 0 ? 'l0' : n === 1 ? 'l1' : n === 2 ? 'l2' : n === 3 || n === 4 ? 'l3' : 'l4'
            return (
              <div
                key={dateStr}
                className={`heat-cell ${level} ${dateStr === state.currentDate ? 'today' : ''}`}
                style={{ opacity: inMonth ? 1 : 0.4, fontSize: 11 }}
                title={`${formatUa(dateStr)} · ${n} квестів`}
              >
                {dayNum}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Zap size={16} /> Підсумок за {monthNamesUa[selectedMonth - 1]} {selectedYear}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          Статистика тренувань та досягнень за обраний місяць.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Активних днів</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{monthSummary.activeDays}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Квестів</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{monthSummary.questsDone}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>XP зароблено</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{monthSummary.xpEarned}</div>
          </div>
          <div style={{ background: 'var(--panel-sub)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Енергія (ккал)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)' }}>{monthSummary.caloriesBurned}</div>
          </div>
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
          <Flame size={16} /> Віхи серії
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Прогрес розблокування ключових віх серії тренувань. Твій рекорд: <strong style={{ color: 'var(--gold)' }}>{state.bestStreak} дн.</strong>
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { days: 3, title: 'Караван не зупиняється', desc: 'Серія 3 дні' },
            { days: 7, title: 'Тиждень воїна', desc: 'Серія 7 днів' },
            { days: 14, title: 'Двічі по тижню', desc: 'Серія 14 днів' },
            { days: 30, title: 'Місяць без пощади', desc: 'Серія 30 днів' },
            { days: 66, title: 'Два місяці волі', desc: 'Серія 66 днів' },
            { days: 100, title: 'Сотня', desc: 'Серія 100 днів' },
          ].map((m) => {
            const unlocked = state.bestStreak >= m.days
            const pct = Math.min(100, Math.round((state.bestStreak / m.days) * 100))
            return (
              <div
                key={m.days}
                style={{
                  background: unlocked ? 'var(--gold-dim-bg, rgba(236,200,120,0.12))' : 'var(--panel-sub)',
                  border: unlocked ? '1px solid var(--gold)' : '1px solid var(--border-solid)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: unlocked ? 'var(--gold-bright)' : 'var(--text)' }}>
                    {m.days} дн. — {m.title}
                  </span>
                  <span style={{ fontSize: 12, color: unlocked ? 'var(--good)' : 'var(--text-dim)' }}>
                    {unlocked ? '✓ Досягнуто' : `${state.bestStreak}/${m.days} (${pct}%)`}
                  </span>
                </div>
                {!unlocked && (
                  <div className="bar" style={{ height: 4, borderRadius: 2, background: 'var(--surface-raised)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Medal size={16} /> Найчастіші вправи
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Топ вправ, які ти виконував найчастіше за весь час.
        </p>
        {exerciseStats.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
            Ще немає виконаних квестів. Почни тренування!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {exerciseStats.map((ex, idx) => (
              <div
                key={ex.title}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--panel-sub)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: idx === 0 ? 'var(--gold-bright)' : 'var(--text-dim)', width: 20 }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{ex.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Категорія: {CATEGORY_LABELS[ex.category as keyof typeof CATEGORY_LABELS] || ex.category}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{ex.count} разів</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>+{Math.floor(ex.totalXp)} XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          {state.profile.heightCm > 0 && state.profile.age > 0 && latestWeight > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 10px', background: 'var(--panel-sub)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-dim)' }}>Енергообмін (BMR / TDEE):</span>
              <span>
                <strong>{Math.round(10 * latestWeight + 6.25 * state.profile.heightCm - 5 * state.profile.age - 78)} ккал</strong> <span style={{ color: 'var(--text-dim)' }}>(база)</span> / <strong style={{ color: 'var(--gold)' }}>{Math.round((10 * latestWeight + 6.25 * state.profile.heightCm - 5 * state.profile.age - 78) * 1.55)} ккал</strong> <span style={{ color: 'var(--text-dim)' }}>(норма)</span>
              </span>
            </div>
          )}
          {state.profile.targetWeightKg > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 10px', background: 'var(--panel-sub)', borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-dim)' }}>Цільова вага:</span>
              <span>
                <strong>{state.profile.targetWeightKg} кг</strong>
                <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                  ({Math.abs(Math.round((latestWeight - state.profile.targetWeightKg) * 10) / 10)} кг до цілі)
                </span>
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
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text)' }}
              onClick={exportWeightHistoryCsv}
            >
              Експорт історії ваги у CSV
            </button>
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

      <div className="panel section-mb">
        <div className="panel-title">
          📏 Вимірювання тіла (обхвати, см)
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Записуй параметри обхватів для відстеження прогресу трансформації тіла.
        </p>
        <form onSubmit={handleSaveMeasurements} style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Груди</label>
              <input
                type="number"
                step="0.5"
                placeholder="см"
                value={chestInput}
                onChange={(e) => setChestInput(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-solid)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Талія</label>
              <input
                type="number"
                step="0.5"
                placeholder="см"
                value={waistInput}
                onChange={(e) => setWaistInput(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-solid)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Стегна</label>
              <input
                type="number"
                step="0.5"
                placeholder="см"
                value={hipsInput}
                onChange={(e) => setHipsInput(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-solid)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Руки</label>
              <input
                type="number"
                step="0.5"
                placeholder="см"
                value={armsInput}
                onChange={(e) => setArmsInput(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-solid)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>Ноги</label>
              <input
                type="number"
                step="0.5"
                placeholder="см"
                value={thighsInput}
                onChange={(e) => setThighsInput(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-solid)', background: 'var(--surface-raised)', color: 'var(--text)', fontSize: 13 }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 13, padding: '6px 14px' }}>
            Зберегти заміри на сьогодні ({formatUa(state.currentDate)})
          </button>
        </form>

        {state.bodyMeasurements.length > 0 ? (
          <>
            <div style={{ display: 'grid', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
              {state.bodyMeasurements.slice(-10).reverse().map((m) => (
                <div key={m.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-sub)', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
                  <div>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 2 }}>{formatUa(m.date)}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {m.chest !== undefined && <span>Груди: <strong style={{ color: 'var(--text)' }}>{m.chest}</strong> см</span>}
                      {m.waist !== undefined && <span>Талія: <strong style={{ color: 'var(--text)' }}>{m.waist}</strong> см</span>}
                      {m.hips !== undefined && <span>Стегна: <strong style={{ color: 'var(--text)' }}>{m.hips}</strong> см</span>}
                      {m.arms !== undefined && <span>Руки: <strong style={{ color: 'var(--text)' }}>{m.arms}</strong> см</span>}
                      {m.thighs !== undefined && <span>Ноги: <strong style={{ color: 'var(--text)' }}>{m.thighs}</strong> см</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBodyMeasurements(m.date)}
                    className="btn"
                    style={{ background: 'transparent', color: 'var(--danger)', fontSize: 11, padding: '2px 6px' }}
                    title="Видалити заміри"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text)' }}
                onClick={exportBodyMeasurementsCsv}
              >
                Експорт замірів тіла у CSV
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Ще немає збережених замірів. Введи показники вище та натисни зберегти.
          </div>
        )}
      </div>

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
            <>
              <div style={{ display: 'grid', gap: 10, maxHeight: 350, overflowY: 'auto' }}>
                {filteredNotes.map(([date, text]) => (
                  <div key={date} style={{ background: 'var(--panel-sub)', padding: '10px 12px', borderRadius: 6, fontSize: 13 }}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>{formatUa(date)}</div>
                    <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{text}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text)' }}
                  onClick={exportNotesTxt}
                >
                  Експорт нотаток у TXT
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="panel section-mb">
        <div className="panel-title">
          <CalendarDays size={16} /> Карта активності (останні 30 днів)
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
          Інтенсивність виконаних квестів за останній місяць.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {days30.map((d) => {
            const qs = state.questsByDate[d] || []
            const done = qs.filter((q) => q.done).length
            const total = qs.length
            let bg = 'var(--surface-sub)'
            let color = 'var(--text-dim)'
            if (done >= 4 || (total > 0 && done === total)) {
              bg = 'var(--gold)'
              color = '#000'
            } else if (done >= 2) {
              bg = 'var(--gold-dim)'
              color = '#000'
            } else if (done === 1) {
              bg = 'var(--surface-raised)'
              color = 'var(--gold)'
            }
            return (
              <div
                key={d}
                title={`${formatUa(d)}: виконано ${done}/${total} квестів`}
                style={{
                  background: bg,
                  color: color,
                  borderRadius: 4,
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid var(--border-solid)',
                  cursor: 'default',
                }}
              >
                <div>{d.slice(8)}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>{done > 0 ? `${done}в` : '—'}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>
          <span>← 30 днів тому</span>
          <span>Сьогодні →</span>
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