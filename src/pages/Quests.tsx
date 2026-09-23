import { useGame } from '../state/GameContext'
import {
  CATEGORY_LABELS,
  DAY_KIND_LABEL,
  INTENSITY_LABEL,
  INTENSITY_FACTOR,
  NUDGE_HABIT_BELOW,
  SWAPS_PER_DAY,
} from '../game/constants'
import { formatUa } from '../game/dates'
import { dayKindOf, effectiveLoad, warmFactor } from '../game/quests'
import { xpMultiplierParts } from '../game/leveling'
import type { DailyQuest, Intensity, MuscleGroup } from '../game/types'
import { CategoryGlyph, Check, RefreshCw, ScrollText, Shield, Sparkles, StatGlyph, Target } from '../components/Glyphs'

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
    swapsLeft,
    level,
  } = useGame()

  const allDone = todayQuests.length > 0 && todayQuests.every((q) => q.done)
  const kind = dayKindOf(state.currentDate)
  const warm = warmFactor(level.level)
  const load = effectiveLoad(state.currentDate, state.dayIntensity, level.level)
  const mult = xpMultiplierParts(state.streak, state.habit)
  const hasProgress = todayQuests.some((q) => q.done)

  const isEvening = new Date().getHours() >= 18
  const showNudge = state.habit < NUDGE_HABIT_BELOW && !hasProgress && isEvening

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
          стане легшим, у стилі відновлення. Звірись: до наступного дня вибір скидається.
        </div>
      </div>

      {allDone && (
        <div className="done-banner" style={{ marginBottom: 16 }}>
          <Sparkles size={18} /> Усі квести виконано! День зараховано: +40 XP, вранці +5 до дисципліни
        </div>
      )}

      {showNudge && (
        <div className="nudge" style={{ marginBottom: 16 }}>
          <Shield size={16} />
          <span>
            Звичка {Math.round(state.habit)}/100. Навіть 1 легкий квест дасть +5 вранці.
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
          альтернативу з тієї ж групи чи легшої сім'ї, без втрати XP.
        </div>
      </div>

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