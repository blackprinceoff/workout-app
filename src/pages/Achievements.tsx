import { useGame } from '../state/GameContext'
import { ACHIEVEMENTS } from '../game/achievements'
import { formatUa } from '../game/dates'
import { ACHIEVEMENT_ICONS, Check, Glyph, Trophy } from '../components/Glyphs'

export function Achievements() {
  const { state } = useGame()
  const unlocked = Object.keys(state.unlockedAchievements).length

  return (
    <>
      <h1 className="page-title">
        <Trophy size={24} strokeWidth={1.6} /> Трофеї
      </h1>
      <p className="page-sub">
        Досягнень відкрито: {unlocked} з {ACHIEVEMENTS.length}
      </p>

      <div className="trophy-grid">
        {ACHIEVEMENTS.map((a) => {
          const date = state.unlockedAchievements[a.id]
          const isUnlocked = Boolean(date)
          const Icon = ACHIEVEMENT_ICONS[a.id]
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
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}