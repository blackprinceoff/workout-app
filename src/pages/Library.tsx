import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { QUEST_TEMPLATES } from '../game/quests'
import { levelInfo } from '../game/leveling'
import { CATEGORY_LABELS } from '../game/constants'
import { CategoryGlyph, StatGlyph, Dumbbell, Search, Lock, Check } from '../components/Glyphs'
import type { QuestCategory } from '../game/types'

export function Library() {
  const { state } = useGame()
  const currentLevel = levelInfo(state.totalXp).level

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory | 'all'>('all')

  const categories: { key: QuestCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Усі' },
    { key: 'strength', label: CATEGORY_LABELS.strength },
    { key: 'core', label: CATEGORY_LABELS.core },
    { key: 'cardio', label: CATEGORY_LABELS.cardio },
    { key: 'mobility', label: CATEGORY_LABELS.mobility },
    { key: 'break', label: CATEGORY_LABELS.break },
  ]

  const filteredTemplates = useMemo(() => {
    return QUEST_TEMPLATES.filter((t) => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesTitle = t.title.toLowerCase().includes(q)
        const matchesVariant = t.variants?.some((v) => v.title.toLowerCase().includes(q) || v.note?.toLowerCase().includes(q))
        if (!matchesTitle && !matchesVariant) return false
      }
      return true
    })
  }, [selectedCategory, search])

  return (
    <>
      <h1 className="page-title">
        <Dumbbell size={24} strokeWidth={1.6} /> Довідник вправ
      </h1>
      <p className="page-sub">Енциклопедія бойових технік, варіацій та рівнів складності</p>

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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filteredTemplates.map((t) => {
          const unlockedVariants = t.variants?.filter((v) => v.minLevel <= currentLevel) ?? []
          const isUnlocked = !t.minLevel || t.minLevel <= currentLevel

          return (
            <div key={t.id} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: isUnlocked ? 1 : 0.75 }}>
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
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-sub)', padding: '4px 8px', borderRadius: 6 }}>
                  {t.stat && <StatGlyph stat={t.stat} size={14} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>+{t.baseXp} XP</span>
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
    </>
  )
}
