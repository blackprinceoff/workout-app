import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { ACHIEVEMENTS, getAchievementProgress, getAchievementProgressRatio } from '../game/achievements'
import { formatUa } from '../game/dates'
import { ACHIEVEMENT_ICONS, Check, Glyph, Trophy } from '../components/Glyphs'

export function Achievements() {
  const { state, level } = useGame()
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'progress' | 'title'>('default')
  const [searchQuery, setSearchQuery] = useState('')
  const unlocked = Object.keys(state.unlockedAchievements).length

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    if (sortBy === 'progress') {
      const ra = getAchievementProgressRatio(a.id, state, level.level)
      const rb = getAchievementProgressRatio(b.id, state, level.level)
      if (rb !== ra) return rb - ra
      return a.title.localeCompare(b.title)
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title)
    }
    const ad = state.unlockedAchievements[a.id]
    const bd = state.unlockedAchievements[b.id]
    if (ad && bd) return bd.localeCompare(ad)
    if (ad) return -1
    if (bd) return 1
    return 0
  })

  const filtered = sorted.filter((a) => {
    const isUnlocked = Boolean(state.unlockedAchievements[a.id])
    if (filter === 'unlocked' && !isUnlocked) return false
    if (filter === 'locked' && isUnlocked) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = a.title.toLowerCase().includes(q)
      const matchDesc = a.description.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc) return false
    }
    return true
  })

  return (
    <>
      <h1 className="page-title">
        <Trophy size={24} strokeWidth={1.6} /> Трофеї
      </h1>
      <p className="page-sub">
        Досягнень відкрито: {unlocked} з {ACHIEVEMENTS.length}
      </p>

      <div className="panel section-mb" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
          <span>Прогрес колекції трофеїв</span>
          <span style={{ color: 'var(--gold-bright)' }}>{Math.round((unlocked / ACHIEVEMENTS.length) * 100)}%</span>
        </div>
        <div className="bar" style={{ height: 8, borderRadius: 4, background: 'var(--surface-raised)', overflow: 'hidden' }}>
          <div
            className="bar-fill gold"
            style={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%`, height: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }} role="tablist" aria-label="Фільтр трофеїв">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          aria-pressed={filter === 'all'}
          className={`btn btn-sm ${filter === 'all' ? 'btn-gold' : ''}`}
          onClick={() => setFilter('all')}
        >
          Усі ({ACHIEVEMENTS.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unlocked'}
          aria-pressed={filter === 'unlocked'}
          className={`btn btn-sm ${filter === 'unlocked' ? 'btn-gold' : ''}`}
          onClick={() => setFilter('unlocked')}
        >
          Відкриті ({unlocked})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'locked'}
          aria-pressed={filter === 'locked'}
          className={`btn btn-sm ${filter === 'locked' ? 'btn-gold' : ''}`}
          onClick={() => setFilter('locked')}
        >
          Заблоковані ({ACHIEVEMENTS.length - unlocked})
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label="Сортування трофеїв"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-solid)',
            background: 'var(--surface-raised)',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            minWidth: 140,
          }}
        >
          <option value="default">За замовчуванням</option>
          <option value="progress">За прогресом</option>
          <option value="title">За назвою</option>
        </select>
        <input
          type="text"
          placeholder="Пошук трофеїв..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Пошук трофеїв"
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-solid)',
            background: 'var(--surface-raised)',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            flex: '1 1 160px',
            minWidth: 140,
          }}
        />
      </div>

      <div className="trophy-grid">
        {filtered.map((a) => {
          const date = state.unlockedAchievements[a.id]
          const isUnlocked = Boolean(date)
          const Icon = ACHIEVEMENT_ICONS[a.id]
          const progress = getAchievementProgress(a.id, state, level.level)
          return (
            <div key={a.id} className={`trophy ${isUnlocked ? 'unlocked' : 'locked'}`}>
              <span className="trophy-icon">
                <Glyph icon={Icon} size={26} strokeWidth={1.4} />
              </span>
              <div>
                <div className="trophy-title">{a.title}</div>
                <div className="trophy-desc">{a.description}</div>
                {isUnlocked && (
                  <div className="trophy-date" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={12} strokeWidth={3} /> {formatUa(date)}
                  </div>
                )}
                {!isUnlocked && progress && (() => {
                  const ratio = getAchievementProgressRatio(a.id, state, level.level)
                  return (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Прогрес: {progress}</span>
                        <span>{Math.round(ratio * 100)}%</span>
                      </div>
                      <div className="bar" style={{ height: 4, borderRadius: 2, background: 'var(--surface-raised)', overflow: 'hidden', marginTop: 4 }}>
                        <div
                          className="bar-fill gold"
                          style={{ width: `${ratio * 100}%`, height: '100%' }}
                        />
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}