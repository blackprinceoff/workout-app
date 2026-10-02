import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../state/GameContext'
import { QUEST_TEMPLATES } from '../game/quests'
import { levelInfo } from '../game/leveling'
import { CATEGORY_LABELS } from '../game/constants'
import { CategoryGlyph, StatGlyph, Dumbbell, Search, Lock, Check, X, Timer, Play, Pause, RotateCcw } from '../components/Glyphs'
import { playTimerDone } from '../utils/sound'
import type { MuscleGroup, QuestCategory, QuestTemplate } from '../game/types'

export function Library() {
  const { state, toggleFavoriteExercise } = useGame()
  const currentLevel = levelInfo(state.totalXp).level

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory | 'all' | 'favorites' | 'completed'>('all')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all')
  const [sortOption, setSortOption] = useState<'default' | 'xp-desc' | 'difficulty-asc' | 'title-asc'>('default')
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | 'all'>('all')
  const [onlyUnlocked, setOnlyUnlocked] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<QuestTemplate | null>(null)

  const categories: { key: QuestCategory | 'all' | 'favorites' | 'completed'; label: string }[] = [
    { key: 'all', label: 'Усі' },
    { key: 'favorites', label: '⭐ Улюблені' },
    { key: 'completed', label: '🏆 Виконувані' },
    { key: 'strength', label: CATEGORY_LABELS.strength },
    { key: 'core', label: CATEGORY_LABELS.core },
    { key: 'cardio', label: CATEGORY_LABELS.cardio },
    { key: 'mobility', label: CATEGORY_LABELS.mobility },
    { key: 'break', label: CATEGORY_LABELS.break },
  ]

  const completionCountFor = useCallback((templateId: string) => {
    let count = 0
    for (const quests of Object.values(state.questsByDate)) {
      for (const q of quests) {
        if (q.templateId === templateId && q.done) {
          count++
        }
      }
    }
    return count
  }, [state.questsByDate])

  const muscleFilters: { key: MuscleGroup | 'all'; label: string }[] = [
    { key: 'all', label: 'Усі групи м\'язів' },
    { key: 'push', label: 'Руки / плечі' },
    { key: 'leg', label: 'Ноги' },
    { key: 'core', label: 'Спина / кор' },
  ]

  const difficultyFilters: { key: number | 'all'; label: string }[] = [
    { key: 'all', label: 'Усі складності' },
    { key: 1, label: '⭐ 1' },
    { key: 2, label: '⭐⭐ 2' },
    { key: 3, label: '⭐⭐⭐ 3' },
  ]

  const hasActiveFilters = search.trim() !== '' || selectedCategory !== 'all' || selectedMuscle !== 'all' || sortOption !== 'default' || selectedDifficulty !== 'all' || onlyUnlocked
  const resetFilters = () => {
    setSearch('')
    setSelectedCategory('all')
    setSelectedMuscle('all')
    setSortOption('default')
    setSelectedDifficulty('all')
    setOnlyUnlocked(false)
  }

  const filteredTemplates = useMemo(() => {
    const list = QUEST_TEMPLATES.filter((t) => {
      if (selectedCategory === 'favorites') {
        if (!state.favoriteExerciseIds?.includes(t.id)) return false
      } else if (selectedCategory === 'completed') {
        if (completionCountFor(t.id) === 0) return false
      } else if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false
      }
      if (selectedMuscle !== 'all' && t.muscle !== selectedMuscle) return false
      if (selectedDifficulty !== 'all' && t.difficulty !== selectedDifficulty) return false
      if (onlyUnlocked) {
        const isUnlocked = !t.minLevel || t.minLevel <= currentLevel
        if (!isUnlocked) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesTitle = t.title.toLowerCase().includes(q)
        const matchesVariant = t.variants?.some((v) => v.title.toLowerCase().includes(q) || v.note?.toLowerCase().includes(q))
        if (!matchesTitle && !matchesVariant) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortOption === 'xp-desc') return b.baseXp - a.baseXp
      if (sortOption === 'difficulty-asc') return a.difficulty - b.difficulty
      if (sortOption === 'title-asc') return a.title.localeCompare(b.title, 'uk')
      return 0
    })
  }, [selectedCategory, selectedMuscle, selectedDifficulty, onlyUnlocked, search, sortOption, state.favoriteExerciseIds, completionCountFor, currentLevel])

  return (
    <>
      <h1 className="page-title">
        <Dumbbell size={24} strokeWidth={1.6} /> Довідник вправ
      </h1>
      <p className="page-sub">Енциклопедія бойових технік, варіацій та рівнів складності. Натисни на вправу для деталей та тренування.</p>

      <div className="panel section-mb" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-dim)' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Пошук вправи чи варіації..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'var(--surface-sub)',
                border: '1px solid var(--border-solid)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            style={{
              padding: '8px 12px',
              background: 'var(--surface-sub)',
              border: '1px solid var(--border-solid)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 14,
            }}
          >
            <option value="default">Сортування: за замовчуванням</option>
            <option value="xp-desc">За XP (найбільші)</option>
            <option value="difficulty-asc">За складністю (легкі спочатку)</option>
            <option value="title-asc">За назвою (А-Я)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`btn btn-sm ${selectedCategory === c.key ? 'btn-gold' : ''}`}
              style={
                selectedCategory !== c.key
                  ? { background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)' }
                  : undefined
              }
              onClick={() => setSelectedCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {muscleFilters.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`btn btn-sm ${selectedMuscle === m.key ? 'btn-gold' : ''}`}
                style={
                  selectedMuscle !== m.key
                    ? { background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)' }
                    : undefined
                }
                onClick={() => setSelectedMuscle(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {difficultyFilters.map((d) => (
              <button
                key={String(d.key)}
                type="button"
                className={`btn btn-sm ${selectedDifficulty === d.key ? 'btn-gold' : ''}`}
                style={
                  selectedDifficulty !== d.key
                    ? { background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)' }
                    : undefined
                }
                onClick={() => setSelectedDifficulty(d.key)}
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm ${onlyUnlocked ? 'btn-gold' : ''}`}
              style={
                !onlyUnlocked
                  ? { background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)' }
                  : undefined
              }
              onClick={() => setOnlyUnlocked(!onlyUnlocked)}
            >
              🔓 Лише доступні
            </button>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text-dim)', fontSize: 12 }}
              onClick={resetFilters}
            >
              Скинути фільтри
            </button>
          )}
        </div>
      </div>

      <StrengthCalculator />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filteredTemplates.map((t) => {
          const unlockedVariants = t.variants?.filter((v) => v.minLevel <= currentLevel) ?? []
          const isUnlocked = !t.minLevel || t.minLevel <= currentLevel
          const isFav = state.favoriteExerciseIds?.includes(t.id)
          const compCount = completionCountFor(t.id)

          return (
            <div
              key={t.id}
              className="panel"
              onClick={() => setSelectedTemplate(t)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: isUnlocked ? 1 : 0.75, cursor: 'pointer', transition: 'transform 0.15s ease' }}
              title="Натисніть для перегляду та таймера"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CategoryGlyph category={t.category} size={15} />
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {CATEGORY_LABELS[t.category]}
                    </span>
                    {t.minLevel && t.minLevel > 1 && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: currentLevel >= t.minLevel ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: currentLevel >= t.minLevel ? 'var(--good)' : 'var(--danger)',
                        }}
                      >
                        Рівень {t.minLevel}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t.title}</h3>
                  {compCount > 0 && (
                    <div style={{ fontSize: 11, background: 'rgba(236, 200, 120, 0.15)', color: 'var(--gold-bright)', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      🏆 Виконано: {compCount} раз(ів)
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavoriteExercise(t.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isFav ? 'var(--gold-bright)' : 'var(--text-dim)',
                      fontSize: 18,
                      padding: 4,
                    }}
                    title={isFav ? 'Видалити з улюблених' : 'Додати в улюблені'}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-sub)', padding: '4px 8px', borderRadius: 6 }}>
                    {t.stat && <StatGlyph stat={t.stat} size={14} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>+{t.baseXp} XP</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Підходів: <strong>{t.sets}</strong></span>
                <span>База: <strong>{t.base}</strong> {t.unit === 'reps' ? 'разів' : 'сек'}</span>
                <span>Складність: <strong>{t.difficulty}/3</strong></span>
              </div>

              {t.variants && t.variants.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-solid)', paddingTop: 10, display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Варіації за рівнями</span>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                      Відкрито: {unlockedVariants.length}/{t.variants.length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                    {t.variants.map((v) => {
                      const vUnlocked = v.minLevel <= currentLevel
                      return (
                        <div
                          key={v.minLevel + v.title}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderRadius: 6,
                            background: vUnlocked ? 'var(--surface-sub)' : 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid',
                            borderColor: vUnlocked ? 'var(--border-solid)' : 'transparent',
                            opacity: vUnlocked ? 1 : 0.6,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: vUnlocked ? 'var(--text)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {vUnlocked ? <Check size={12} color="var(--good)" /> : <Lock size={12} />}
                              <span>{v.title}</span>
                            </div>
                            {v.note && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{v.note}</div>}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: vUnlocked ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                              color: vUnlocked ? 'var(--good)' : 'var(--text-dim)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ур. {v.minLevel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          Не знайдено жодної вправи за твоїм запитом.
        </div>
      )}

      {selectedTemplate && (
        <ExerciseDetailModal
          template={selectedTemplate}
          currentLevel={currentLevel}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  )
}

function ExerciseDetailModal({
  template,
  currentLevel,
  onClose,
}: {
  template: QuestTemplate
  currentLevel: number
  onClose: () => void
}) {
  const { state } = useGame()
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isRunning, setIsRunning] = useState(false)
  const timerRef = useRef<number | null>(null)

  const completions = useMemo(() => {
    let count = 0
    let totalXp = 0
    for (const quests of Object.values(state.questsByDate)) {
      for (const q of quests) {
        if (q.templateId === template.id && q.done) {
          count++
          totalXp += q.xp
        }
      }
    }
    return { count, totalXp }
  }, [state.questsByDate, template.id])

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          playTimerDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false)
    } else {
      if (timeLeft <= 0) setTimeLeft(timerSeconds)
      setIsRunning(true)
    }
  }

  const resetTimer = (secs: number) => {
    setIsRunning(false)
    setTimerSeconds(secs)
    setTimeLeft(secs)
  }

  const isUnlocked = !template.minLevel || template.minLevel <= currentLevel

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--gold-dim)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CategoryGlyph category={template.category} size={16} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {CATEGORY_LABELS[template.category]}
              </span>
              {template.muscle && (
                <span style={{ fontSize: 11, background: 'var(--surface-sub)', padding: '1px 6px', borderRadius: 4, color: 'var(--gold)' }}>
                  {template.muscle}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{template.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Закрити"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', background: 'var(--surface-sub)', padding: 12, borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>НАГОРОДА</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold-bright)' }}>+{template.baseXp} XP</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ПІДХОДИ</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{template.sets}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ВИКОНАНО РАЗІВ</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{completions.count}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ЗАРОБЛЕНО XP</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>{completions.totalXp}</div>
          </div>
        </div>

        {!isUnlocked && (
          <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: 'var(--danger)', fontSize: 13 }}>
            🔒 Ця вправа розблоковується на рівні {template.minLevel}. Поточний рівень: {currentLevel}.
          </div>
        )}

        {template.variants && template.variants.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Варіації техніки за рівнями:
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {template.variants.map((v) => {
                const vUnlocked = v.minLevel <= currentLevel
                return (
                  <div
                    key={v.minLevel + v.title}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: vUnlocked ? 'var(--surface-sub)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid',
                      borderColor: vUnlocked ? 'var(--border-solid)' : 'transparent',
                      opacity: vUnlocked ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: vUnlocked ? 'var(--text)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {vUnlocked ? <Check size={14} color="var(--good)" /> : <Lock size={14} />}
                        <span>{v.title}</span>
                      </div>
                      {v.note && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{v.note}</div>}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: vUnlocked ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: vUnlocked ? 'var(--good)' : 'var(--text-dim)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ур. {v.minLevel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border-solid)', paddingTop: 14, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            <Timer size={16} color="var(--gold)" />
            <span>Інтерактивний таймер тренування / практики</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[15, 30, 45, 60, 90].map((secs) => (
              <button
                key={secs}
                type="button"
                className={`btn btn-sm ${timerSeconds === secs ? 'btn-gold' : ''}`}
                style={timerSeconds !== secs ? { background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)' } : undefined}
                onClick={() => resetTimer(secs)}
              >
                {secs} сек
              </button>
            ))}
          </div>

          <div
            style={{
              background: 'var(--surface-sub)',
              border: '1px solid var(--border-solid)',
              borderRadius: 10,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--gold-bright)', marginBottom: 8 }}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={toggleTimer}
                style={{ minWidth: 100 }}
              >
                {isRunning ? <><Pause size={14} /> Пауза</> : <><Play size={14} /> Старт</>}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => resetTimer(timerSeconds)}
                style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text)' }}
                title="Скинути"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StrengthCalculator() {
  const [weight, setWeight] = useState('60')
  const [reps, setReps] = useState('5')

  const wNum = Number(weight) || 0
  const rNum = Number(reps) || 1
  const oneRm = wNum > 0 && rNum > 0 ? Math.round(wNum * (1 + Math.min(rNum, 30) / 30) * 10) / 10 : 0

  return (
    <div className="panel section-mb" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>
        <Dumbbell size={16} color="var(--gold)" />
        <span>Калькулятор макс. ваги (1RM Estimator)</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
        Розрахунок максимальної ваги на 1 повторення (формула Еплі) та тренувальних зон.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Вага (кг):</label>
          <input
            type="number"
            min="1"
            max="500"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{ width: 80, padding: '6px 8px', borderRadius: 6, background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Повторень:</label>
          <input
            type="number"
            min="1"
            max="30"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={{ width: 70, padding: '6px 8px', borderRadius: 6, background: 'var(--surface-sub)', border: '1px solid var(--border-solid)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-bright)', marginLeft: 'auto' }}>
          Оцінка 1RM: {oneRm} кг
        </div>
      </div>
      {oneRm > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', fontSize: 12 }}>
          <div style={{ background: 'var(--surface-sub)', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Сила (90%)</div>
            <strong style={{ color: 'var(--gold)' }}>{Math.round(oneRm * 0.9 * 10) / 10} кг</strong>
          </div>
          <div style={{ background: 'var(--surface-sub)', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Гіпертрофія (80%)</div>
            <strong style={{ color: 'var(--gold)' }}>{Math.round(oneRm * 0.8 * 10) / 10} кг</strong>
          </div>
          <div style={{ background: 'var(--surface-sub)', padding: '6px 8px', borderRadius: 6 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>Витривалість (70%)</div>
            <strong style={{ color: 'var(--gold)' }}>{Math.round(oneRm * 0.7 * 10) / 10} кг</strong>
          </div>
        </div>
      )}
    </div>
  )
}
