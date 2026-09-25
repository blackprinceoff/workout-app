import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import {
  CATEGORY_LABELS,
  DAY_KIND_LABEL,
  INTENSITY_LABEL,
  INTENSITY_FACTOR,
  NUDGE_HABIT_BELOW,
  SWAPS_PER_DAY,
} from '../game/constants'
import { formatUa, shiftDateKey } from '../game/dates'
import { dayKindOf, effectiveLoad, warmFactor } from '../game/quests'
import { classNameFor, levelInfo, xpMultiplierParts } from '../game/leveling'
import type { DailyQuest, Intensity, MuscleGroup } from '../game/types'
import { CategoryGlyph, Check, Flame, RefreshCw, ScrollText, Shield, Sparkles, StatGlyph, Target, Timer } from '../components/Glyphs'
import { playTimerDone } from '../utils/sound'

const INTENSITIES: Intensity[] = ['light', 'normal', 'intense']

const SORE_OPTIONS: { key: MuscleGroup; label: string }[] = [
  { key: 'push', label: 'Руки/плечі' },
  { key: 'leg', label: 'Ноги' },
  { key: 'core', label: 'Спина/кор' },
]

export function Quests() {
  const {
    state,
    todayQuests,
    completeQuest,
    undoQuest,
    setIntensity,
    markSickDay,
    sickTokensLeft,
    sickDayMarked,
    swapQuest,
    setSoreGroups,
    setNote,
    swapsLeft,
    level,
  } = useGame()

  const allDone = todayQuests.length > 0 && todayQuests.every((q) => q.done)
  const kind = dayKindOf(state.currentDate)
  const warm = warmFactor(level.level)
  const load = effectiveLoad(state.currentDate, state.dayIntensity, level.level)
  const mult = xpMultiplierParts(state.streak, state.habit)
  const hasProgress = todayQuests.some((q) => q.done)
  const currentNote = state.notesByDate[state.currentDate] || ''

  const isEvening = new Date().getHours() >= 18
  const showNudge = state.habit < NUDGE_HABIT_BELOW && !hasProgress && isEvening

  const yesterdayKey = shiftDateKey(state.currentDate, -1)
  const yesterdayQuests = state.questsByDate[yesterdayKey]
  const missedYesterday =
    yesterdayQuests &&
    yesterdayQuests.length > 0 &&
    !yesterdayQuests.some((q) => q.main && q.done) &&
    !state.sickUsed.includes(yesterdayKey) &&
    !hasProgress

  const [dismissedMissBanner, setDismissedMissBanner] = useState(false)
  const showMissBanner = missedYesterday && !dismissedMissBanner

  const toggleSore = (key: MuscleGroup) => {
    const next = state.soreGroups.includes(key)
      ? state.soreGroups.filter((g) => g !== key)
      : [...state.soreGroups, key]
    setSoreGroups(next)
  }

  return (
    <>
      <h1 className="page-title">
        <ScrollText size={24} strokeWidth={1.6} /> Квести дня
      </h1>
      <p className="page-sub">{formatUa(state.currentDate)} · виконавши всі, отримаєш бонус +40 XP</p>

      <div className="panel section-mb" style={{ padding: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', color: 'var(--gold-dim)' }}>
              <Target size={18} />
            </span>
            <div>
              <div className="settings-label" style={{ fontSize: 13 }}>
                {DAY_KIND_LABEL[kind]}
              </div>
              <div className="settings-hint">
                Навантаження дня ×{load.toFixed(2)}
                {warm < 1 && ` (цикл ×${warm} — розігрів, повний вплив з рівня 7)`}
              </div>
              <div className="settings-hint">
                Множник XP ×{mult.total.toFixed(2)} (серія ×{mult.streak.toFixed(2)} · звичка ×
                {mult.habit.toFixed(2)})
              </div>
            </div>
          </div>

          <div className="seg" aria-label="Інтенсивність дня">
            {INTENSITIES.map((it) => (
              <button
                key={it}
                type="button"
                className={state.dayIntensity === it ? 'active' : ''}
                disabled={hasProgress}
                aria-pressed={state.dayIntensity === it}
                onClick={() => setIntensity(it)}
              >
                {INTENSITY_LABEL[it]} ×{INTENSITY_FACTOR[it]}
              </button>
            ))}
          </div>
        </div>
        {hasProgress && (
          <div className="settings-hint" style={{ marginTop: 8 }}>
            Інтенсивність закрита — декілька квестів уже виконано. Повернеться завтра.
          </div>
        )}
      </div>

      <div className="panel section-mb" style={{ padding: 12 }}>
        <div className="settings-label" style={{ fontSize: 13 }}>
          Чек-ін: що сьогодні болить чи не в формі?
        </div>
        <div className="chips">
          {SORE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`chip ${state.soreGroups.includes(o.key) ? 'active' : ''}`}
              disabled={hasProgress}
              aria-pressed={state.soreGroups.includes(o.key)}
              onClick={() => toggleSore(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="settings-hint" style={{ marginTop: 8 }}>
          Позначені групи автоматично виключаються з силових квестів сьогодні. Якщо болить усе — день
          стане легшим, у стилі відновлення. Позначення тримаються до кінця дня й скидаються наступного.
        </div>
      </div>

      <div className="panel section-mb" style={{ padding: 12 }}>
        <div className="settings-label" style={{ fontSize: 13, marginBottom: 6 }}>
          📝 Нотатка дня / Самопочуття
        </div>
        <textarea
          value={currentNote}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Як пройшло тренування? Самопочуття, ваги, думки..."
          maxLength={300}
          style={{
            width: '100%',
            background: 'var(--panel-sub)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 14,
            resize: 'vertical',
            minHeight: 60,
            fontFamily: 'inherit',
          }}
        />
        <div className="settings-hint" style={{ marginTop: 4 }}>
          Зберігається автоматично для цього дня.
        </div>
      </div>

      {showMissBanner && (
        <div
          className="nudge"
          style={{
            marginBottom: 16,
            borderColor: 'var(--danger)',
            background:
              'linear-gradient(90deg, rgba(239, 106, 106, 0.14), rgba(239, 106, 106, 0.04))',
            color: 'var(--text)',
          }}
        >
          <Flame size={18} color="var(--danger)" />
          <span>
            <strong>Вчора день було пропущено.</strong> Серія згоріла, але новий день — це новий шанс.
            Навіть один квест сьогодні поверне тебе в ритм!
          </span>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-solid)',
              padding: '4px 8px',
              color: 'var(--text)',
            }}
            onClick={() => setDismissedMissBanner(true)}
            aria-label="Зрозуміло"
          >
            Зрозуміло
          </button>
        </div>
      )}

      {allDone && (
        <div className="done-banner" style={{ marginBottom: 16 }}>
          <Sparkles size={18} /> Усі квести виконано! День зараховано: +40 XP, вранці +5 до дисципліни
        </div>
      )}

      {showNudge && (
        <div className="nudge" style={{ marginBottom: 16 }}>
          <Shield size={16} />
          <span>
            Звичка {Math.round(state.habit)}/100. Навіть один основний квест дасть +5 вранці.
            Почни з перерви — і закрий день.
          </span>
        </div>
      )}

      <div className="panel pquest-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {todayQuests.map((q) => (
          <QuestRow
            key={q.id}
            quest={q}
            onToggle={q.done ? undoQuest : completeQuest}
            onSwap={swapQuest}
            canSwap={!q.done && swapsLeft > 0}
          />
        ))}
        <div className="settings-hint" style={{ marginTop: 2 }}>
          Замінено вправ сьогодні: {SWAPS_PER_DAY - swapsLeft}/{SWAPS_PER_DAY} — заміна дає
          альтернативу з тієї ж групи чи легшої сім'ї (XP перераховується під нову вправу).
        </div>
      </div>

      <BreakTimer />

      <div className="panel section-mt" style={{ padding: 12, marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            className={`sick-toggle ${sickDayMarked ? 'active' : ''}`}
            onClick={markSickDay}
            disabled={!sickDayMarked && (hasProgress || sickTokensLeft <= 0)}
            aria-pressed={sickDayMarked}
          >
            {sickDayMarked ? 'Скасувати запис «хворого дня»' : 'Позначити день «хворим»'}
          </button>
          <div className="settings-hint">
            {sickDayMarked
              ? 'Завтра серія заморозиться, звичка −5 замість −10. Токен повернеться, якщо все ж потренуєшся.'
              : `Токенів: ${sickTokensLeft}/3 за 30 днів. Заморожує серію без згорання (звичка −5).`}
          </div>
        </div>
      </div>

      <p className="empty-hint" style={{ marginTop: 18 }}>
        Дисципліна росте на +5 за кожен завершений день, +2 за день чесного «мінімуму» (тільки
        перерви), і падає на −10 за повний прогул. Звичка формується за ~21 день. Рівні 1–2 — один
        підхід на вправу. Болить м'яз — познач у чек-іні або заміни вправу. Можеш скасувати квест,
        натиснувши на виконаний.
      </p>
    </>
  )
}

function QuestRow({
  quest,
  onToggle,
  onSwap,
  canSwap,
}: {
  quest: DailyQuest
  onToggle: (id: string) => void
  onSwap: (id: string) => void
  canSwap: boolean
}) {
  return (
    <div className={`quest-card ${quest.done ? 'done' : ''}`}>
      <button
        type="button"
        className="quest-check"
        onClick={() => onToggle(quest.id)}
        aria-label={quest.done ? 'Скасувати' : 'Виконати'}
      >
        <Check size={18} strokeWidth={3.2} style={{ display: quest.done ? 'block' : 'none' }} />
      </button>
      <div className="quest-main">
        <div className="quest-title-row">
          <span className="quest-title">{quest.title}</span>
          <span className="quest-cat">
            <CategoryGlyph category={quest.category} /> {CATEGORY_LABELS[quest.category]}
          </span>
          {quest.main && <span className="quest-cat" style={{ color: 'var(--gold-dim)' }}>основний</span>}
        </div>
        <div className="quest-desc">{quest.description}</div>
      </div>
      <div className="quest-meta">
        <div className="quest-xp">
          +{quest.xp} XP{quest.stat ? <span> · <StatGlyph stat={quest.stat} /></span> : null}
        </div>
        <div className="pips">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`pip ${n <= quest.difficulty ? 'on' : ''}`} />
          ))}
        </div>
        {canSwap && (
          <button
            type="button"
            className="quest-swap"
            onClick={() => onSwap(quest.id)}
            title="Замінити вправу"
            aria-label="Замінити вправу"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

const BREAK_PRESETS = [3, 5, 10]

function BreakTimer() {
  const { state } = useGame()
  const [duration, setDuration] = useState(5)
  const [seconds, setSeconds] = useState(5 * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const currentLevel = levelInfo(state.totalXp).level

  useEffect(() => {
    if (!running) {
      document.title = `FitQuest — ${classNameFor(currentLevel)} · ${currentLevel}`
      return
    }

    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false)
          setDone(true)
          if (state.settings.sound) playTimerDone()
          if (
            state.settings.notifications &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification('FitQuest', {
                body: 'Перерву завершено — час рухатись!',
                icon: '/favicon.svg',
              })
            } catch {
              // Ignore notification errors in restrictive environments
            }
          }
          document.title = `FitQuest — ${classNameFor(currentLevel)} · ${currentLevel}`
          return duration * 60
        }
        const nextS = s - 1
        const mm = String(Math.floor(nextS / 60)).padStart(2, '0')
        const ss = String(nextS % 60).padStart(2, '0')
        document.title = `(${mm}:${ss}) FitQuest — Перерва`
        return nextS
      })
    }, 1000)

    const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
    const ss = String(seconds % 60).padStart(2, '0')
    document.title = `(${mm}:${ss}) FitQuest — Перерва`

    return () => {
      clearInterval(id)
      document.title = `FitQuest — ${classNameFor(currentLevel)} · ${currentLevel}`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, duration, state.settings.sound, state.settings.notifications, currentLevel])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="panel section-mb" style={{ marginTop: 16, padding: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Timer size={20} color="var(--gold-dim)" />
          <div>
            <div className="settings-label">Перерва ({duration} хв)</div>
            <div className="settings-hint">Відійди від стільця і порухайся</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!running && !done && (
            <div style={{ display: 'flex', gap: 4 }}>
              {BREAK_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm ${duration === m ? 'btn-gold' : ''}`}
                  onClick={() => {
                    setDuration(m)
                    setSeconds(m * 60)
                  }}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  {m}хв
                </button>
              ))}
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              color: done ? 'var(--good)' : 'var(--gold-bright)',
              minWidth: 70,
              textAlign: 'center',
            }}
          >
            {mm}:{ss}
          </div>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => {
              setDone(false)
              setRunning((r) => !r)
            }}
          >
            {running ? 'Пауза' : 'Старт'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setRunning(false)
              setDone(false)
              setSeconds(duration * 60)
            }}
          >
            Скинути
          </button>
        </div>
      </div>
      {done && (
        <div className="settings-hint" style={{ marginTop: 8, color: 'var(--good)' }}>
          Перерву завершено — час рухатись!
        </div>
      )}
    </div>
  )
}