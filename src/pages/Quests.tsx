import { useEffect, useMemo, useState } from 'react'
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
import { dayKindOf, effectiveLoad, QUEST_TEMPLATES, warmFactor } from '../game/quests'
import { classNameFor, levelInfo, xpMultiplierParts } from '../game/leveling'
import type { DailyQuest, Intensity, MuscleGroup, QuestCategory, StatKey } from '../game/types'
import { CategoryGlyph, Check, Dumbbell, Flame, RefreshCw, ScrollText, Shield, Sparkles, StatGlyph, Target, Timer } from '../components/Glyphs'
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
    addCustomQuest,
    deleteCustomQuest,
  } = useGame()

  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customCat, setCustomCat] = useState<QuestCategory>('strength')
  const [customXp, setCustomXp] = useState(15)
  const [customStat, setCustomStat] = useState<StatKey | ''>('strength')
  const [filterCategory, setFilterCategory] = useState<QuestCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'done'>('all')
  const [questSearch, setQuestSearch] = useState('')
  const [questSort, setQuestSort] = useState<'default' | 'xp-desc' | 'xp-asc' | 'difficulty'>('default')
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogCat, setCatalogCat] = useState<QuestCategory | 'all'>('all')
  const [catalogSearch, setCatalogSearch] = useState('')

  const filteredTemplates = useMemo(() => {
    let list = catalogCat === 'all'
      ? QUEST_TEMPLATES
      : QUEST_TEMPLATES.filter((t) => t.category === catalogCat)
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.variants.some((v) => v.title.toLowerCase().includes(q) || (v.note && v.note.toLowerCase().includes(q))),
      )
    }
    return list
  }, [catalogCat, catalogSearch])

  const filteredQuests = useMemo(() => {
    let list: DailyQuest[] = filterCategory === 'all'
      ? todayQuests
      : todayQuests.filter((q) => q.category === filterCategory)
    if (filterStatus === 'active') {
      list = list.filter((q) => !q.done)
    } else if (filterStatus === 'done') {
      list = list.filter((q) => q.done)
    }
    if (questSearch.trim()) {
      const qLower = questSearch.toLowerCase()
      list = list.filter(
        (q) =>
          q.title.toLowerCase().includes(qLower) ||
          q.description.toLowerCase().includes(qLower),
      )
    }
    if (questSort === 'xp-desc') {
      list = [...list].sort((a, b) => b.xp - a.xp)
    } else if (questSort === 'xp-asc') {
      list = [...list].sort((a, b) => a.xp - b.xp)
    } else if (questSort === 'difficulty') {
      list = [...list].sort((a, b) => b.difficulty - a.difficulty)
    }
    return list
  }, [todayQuests, filterCategory, filterStatus, questSearch, questSort])

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return
    addCustomQuest(
      customTitle.trim(),
      customCat,
      Number(customXp) || 15,
      customStat ? customStat : undefined,
    )
    setCustomTitle('')
    setShowAddCustom(false)
  }

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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {[
            '💪 Чудове тренування, повний заряд!',
            '🔥 Важкий день, але я впорався!',
            '🧘 Легкий день відновлення.',
            '⚡ Бадьорий і продуктивний день.',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              className="btn btn-sm"
              style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface-raised)', color: 'var(--text-dim)', border: '1px solid var(--border-solid)' }}
              onClick={() => setNote(currentNote ? `${currentNote} ${preset}` : preset)}
            >
              {preset}
            </button>
          ))}
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

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={questSearch}
          onChange={(e) => setQuestSearch(e.target.value)}
          placeholder="Пошук квестів за назвою чи описом..."
          style={{
            flex: 1,
            minWidth: 200,
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 14,
          }}
        />
        <select
          value={questSort}
          onChange={(e) => setQuestSort(e.target.value as any)}
          aria-label="Сортування квестів"
          style={{
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 13,
          }}
        >
          <option value="default">Сортування: стандартне</option>
          <option value="xp-desc">За XP (від більших)</option>
          <option value="xp-asc">За XP (від менших)</option>
          <option value="difficulty">За складністю</option>
        </select>
      </div>

      <div className="chips" style={{ marginBottom: 8, gap: 6 }}>
        <button
          type="button"
          className={`chip ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          Усі статуси
        </button>
        <button
          type="button"
          className={`chip ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Активні ({todayQuests.filter((q) => !q.done).length})
        </button>
        <button
          type="button"
          className={`chip ${filterStatus === 'done' ? 'active' : ''}`}
          onClick={() => setFilterStatus('done')}
        >
          Виконані ({todayQuests.filter((q) => q.done).length})
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`chip ${filterCategory === 'all' ? 'active' : ''}`}
          onClick={() => setFilterCategory('all')}
        >
          Усі ({todayQuests.length})
        </button>
        {(['strength', 'core', 'cardio', 'mobility', 'break'] as QuestCategory[]).map((cat) => {
          const count = todayQuests.filter((q) => q.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              className={`chip ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          )
        })}
      </div>

      <div className="panel pquest-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredQuests.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px 0', fontSize: 13 }}>
            Немає квестів у цій категорії.
          </div>
        ) : (
          filteredQuests.map((q) => (
            <QuestRow
              key={q.id}
              quest={q}
              onToggle={q.done ? undoQuest : completeQuest}
              onSwap={swapQuest}
              canSwap={!q.done && swapsLeft > 0}
              onDeleteCustom={deleteCustomQuest}
            />
          ))
        )}
        <div className="settings-hint" style={{ marginTop: 2 }}>
          Замінено вправ сьогодні: {SWAPS_PER_DAY - swapsLeft}/{SWAPS_PER_DAY} — заміна дає
          альтернативу з тієї ж групи чи легшої сім'ї (XP перераховується під нову вправу).
        </div>
      </div>

      <div className="panel section-mt" style={{ padding: 12, marginTop: 12 }}>
        {!showAddCustom ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAddCustom(true)}
              style={{ flex: 1, justifyContent: 'center', minWidth: 160 }}
            >
              + Додати власний квест на сьогодні
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowCatalog(true)}
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}
            >
              <Dumbbell size={16} /> Каталог та енциклопедія вправ ({QUEST_TEMPLATES.length})
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddCustom} style={{ display: 'grid', gap: 10 }}>
            <div className="settings-label" style={{ fontSize: 13 }}>Новий власний квест</div>
            <div className="field">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Наприклад: 30 віджимань / Розтяжка"
                maxLength={40}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: 120 }}>
                <label>Категорія</label>
                <select
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value as QuestCategory)}
                  style={{
                    width: '100%',
                    background: 'var(--panel-sub)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 13,
                  }}
                >
                  <option value="strength">Сила</option>
                  <option value="core">Кор / Спина</option>
                  <option value="cardio">Кардіо</option>
                  <option value="mobility">Мобільність</option>
                  <option value="break">Перерва</option>
                </select>
              </div>
              <div className="field" style={{ width: 90 }}>
                <label>XP</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={customXp}
                  onChange={(e) => setCustomXp(Number(e.target.value) || 15)}
                />
              </div>
              <div className="field" style={{ flex: 1, minWidth: 100 }}>
                <label>Атрибут</label>
                <select
                  value={customStat}
                  onChange={(e) => setCustomStat(e.target.value as StatKey | '')}
                  style={{
                    width: '100%',
                    background: 'var(--panel-sub)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 13,
                  }}
                >
                  <option value="strength">Сила (Strength)</option>
                  <option value="endurance">Витривалість (Endurance)</option>
                  <option value="agility">Спритність (Agility)</option>
                  <option value="">Без атрибута</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowAddCustom(false)}
              >
                Скасувати
              </button>
              <button type="submit" className="btn btn-gold btn-sm">
                Додати
              </button>
            </div>
          </form>
        )}
      </div>

      <BreakTimer />
      <ExerciseHoldTimer />
      <WorkoutStopwatch />

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

      {showCatalog && (
        <div className="overlay" onClick={() => setShowCatalog(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640, width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            role="dialog"
            aria-modal="true"
            aria-label="Енциклопедія вправ"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--gold-bright)' }}>
                <Dumbbell size={20} /> Енциклопедія вправ ({QUEST_TEMPLATES.length})
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setShowCatalog(false)} aria-label="Закрити">
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
              Усі вправи та варіанти, які зустрічаються у FitQuest. З твоїм рівнем ({level.level}) розблоковані відповідні варіації.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Пошук вправи..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                aria-label="Пошук вправи"
                style={{
                  flex: '1 1 180px',
                  background: 'var(--surface-raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 13,
                }}
              />
              <select
                value={catalogCat}
                onChange={(e) => setCatalogCat(e.target.value as QuestCategory | 'all')}
                aria-label="Категорія вправ"
                style={{
                  background: 'var(--surface-raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 13,
                }}
              >
                <option value="all">Усі категорії</option>
                <option value="strength">Сила</option>
                <option value="core">Кор / Спина</option>
                <option value="cardio">Кардіо</option>
                <option value="mobility">Мобільність</option>
                <option value="break">Перерва</option>
              </select>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gap: 10, paddingRight: 4 }}>
              {filteredTemplates.map((t) => (
                <div key={t.id} style={{ background: 'var(--panel-sub)', border: '1px solid var(--border-solid)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{t.title}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
                      <span>{CATEGORY_LABELS[t.category]}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--gold)' }}>+{t.baseXp} XP</span>
                    </div>
                  </div>
                  {t.muscle && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                      Група м'язів: <strong style={{ color: 'var(--text)' }}>{t.muscle === 'push' ? 'Руки/плечі' : t.muscle === 'leg' ? 'Ноги' : 'Спина/кор'}</strong>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Варіанти виконання за рівнем:</div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    {t.variants.map((v, i) => {
                      const unlocked = level.level >= v.minLevel
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: unlocked ? 'var(--surface-raised)' : 'transparent',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            border: unlocked ? '1px solid var(--border-solid)' : '1px dashed var(--border)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: unlocked ? 'var(--text)' : 'var(--text-dim)' }}>
                              {v.minLevel} р. — {v.title}
                            </span>
                            {v.note && <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>({v.note})</span>}
                          </div>
                          <div>
                            {unlocked ? (
                              <span style={{ color: 'var(--good)', fontSize: 11 }}>✓ Доступно</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>ще {v.minLevel - level.level} рівнів</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowCatalog(false)}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function QuestRow({
  quest,
  onToggle,
  onSwap,
  canSwap,
  onDeleteCustom,
}: {
  quest: DailyQuest
  onToggle: (id: string) => void
  onSwap: (id: string) => void
  canSwap: boolean
  onDeleteCustom?: (id: string) => void
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
          {quest.templateId === 'custom' && <span className="quest-cat" style={{ color: 'var(--gold)' }}>власний</span>}
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
        {quest.templateId === 'custom' && !quest.done && onDeleteCustom && (
          <button
            type="button"
            className="quest-swap"
            onClick={() => onDeleteCustom(quest.id)}
            title="Видалити власний квест"
            aria-label="Видалити власний квест"
            style={{ color: 'var(--danger)', fontWeight: 'bold' }}
          >
            ×
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

const HOLD_PRESETS = [30, 45, 60, 90]

function ExerciseHoldTimer() {
  const { state } = useGame()
  const [durationSec, setDurationSec] = useState(30)
  const [seconds, setSeconds] = useState(30)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!running) return

    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false)
          setDone(true)
          if (state.settings.sound) playTimerDone()
          return durationSec
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [running, durationSec, state.settings.sound])

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
          <Timer size={20} color="var(--good)" />
          <div>
            <div className="settings-label">Таймер вправ ({durationSec}с)</div>
            <div className="settings-hint">Для планки, розтяжки чи утримання</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!running && !done && (
            <div style={{ display: 'flex', gap: 4 }}>
              {HOLD_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`btn btn-sm ${durationSec === sec ? 'btn-gold' : ''}`}
                  onClick={() => {
                    setDurationSec(sec)
                    setSeconds(sec)
                  }}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  {sec}с
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
              setSeconds(durationSec)
            }}
          >
            Скинути
          </button>
        </div>
      </div>
      {done && (
        <div className="settings-hint" style={{ marginTop: 8, color: 'var(--good)' }}>
          Час вичерпано! Чудове утримання!
        </div>
      )}
    </div>
  )
}

function WorkoutStopwatch() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return

    const id = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(id)
  }, [running])

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const timeStr = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

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
          <Timer size={20} color="var(--gold)" />
          <div>
            <div className="settings-label">Секундомір тренування</div>
            <div className="settings-hint">Вимірюй тривалість поточної сесії</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              color: 'var(--gold-bright)',
              minWidth: 90,
              textAlign: 'center',
            }}
          >
            {timeStr}
          </div>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => setRunning((r) => !r)}
          >
            {running ? 'Пауза' : 'Старт'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setRunning(false)
              setSeconds(0)
            }}
          >
            Скинути
          </button>
        </div>
      </div>
    </div>
  )
}