import { useGame } from '../state/GameContext'
import { ACHIEVEMENTS, getAchievementProgress } from '../game/achievements'
import { formatUa } from '../game/dates'
import { ACHIEVEMENT_ICONS, Check, Glyph, Trophy } from '../components/Glyphs'

export function Achievements() {
  const { state, level } = useGame()
  const unlocked = Object.keys(state.unlockedAchievements).length

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ad = state.unlockedAchievements[a.id]
    const bd = state.unlockedAchievements[b.id]
    if (ad && bd) return bd.localeCompare(ad)
    if (ad) return -1
    if (bd) return 1
    return 0
  })

  return (
    <>
      <h1 className="page-title">
        <Trophy size={24} strokeWidth={1.6} /> Трофеї
      </h1>
      <p className="page-sub">
        Досягнень відкрито: {unlocked} з {ACHIEVEMENTS.length}
      </p>

      <div className="trophy-grid">
        {sorted.map((a) => {
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
                {!isUnlocked && progress && (
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontWeight: 600 }}>
                    Прогрес: {progress}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}