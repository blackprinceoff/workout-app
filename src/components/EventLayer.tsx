import { type CSSProperties, type ReactNode } from 'react'
import type { GameEvent } from '../game/types'
import { ACHIEVEMENTS } from '../game/achievements'
import { Confetti } from './Confetti'
import { Flame, HeartPulse, Sparkles, Swords, Trophy } from './Glyphs'

export function EventLayer({ events }: { events: GameEvent[] }) {
  const levelUp = events.find((e) => e.type === 'levelup')
  const unlock = events.find((e) => e.type === 'unlock')
  const achievements = events.filter((e) => e.type === 'achievement')
  const dayComplete = events.some((e) => e.type === 'dayComplete')
  const dayPartial = events.some((e) => e.type === 'dayPartial')
  const sickDay = events.some((e) => e.type === 'sickDay')
  const record = events.find((e) => e.type === 'newRecord')

  return (
    <>
      {levelUp?.type === 'levelup' && (
        <>
          <LevelUpModal
            level={levelUp.level}
            className={levelUp.className}
            unlocks={unlock?.type === 'unlock' ? unlock.items : []}
          />
          <Confetti />
        </>
      )}
      <div className="toast-area">
        {achievements.length > 0 &&
          achievements.map((e, i) =>
            e.type === 'achievement' ? (
              <AchievementToast key={e.achievementId} id={e.achievementId} index={i} />
            ) : null,
          )}
        {dayComplete && (
          <Toast>
            <Sparkles size={16} /> День завершено! Бонус +40 XP
          </Toast>
        )}
        {dayPartial && (
          <Toast>
            <Sparkles size={16} /> День частково зараховано: серія заморожена, звичка +2
          </Toast>
        )}
        {sickDay && (
          <Toast>
            <HeartPulse size={16} /> Хворий день зараховано: серія збережена, звичка −5
          </Toast>
        )}
        {record && record.type === 'newRecord' && (
          <Toast>
            <Flame size={16} /> Новий рекорд серії: {record.streak} дн!
          </Toast>
        )}
      </div>
    </>
  )
}

function LevelUpModal({
  level,
  className,
  unlocks,
}: {
  level: number
  className: string
  unlocks: { templateId: string; title: string; minLevel: number }[]
}) {
  return (
    <div className="overlay">
      <div className="modal">
        <span className="modal-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <Swords size={52} strokeWidth={1.4} color="var(--gold)" />
        </span>
        <div className="modal-title">Рівень {level}</div>
        <div className="modal-text">
          Ти став <strong>{className}</strong>!<br />
          Тіло зміцніло. Продовжуй, воїне.
        </div>
        {unlocks.length > 0 && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              textAlign: 'left',
              fontSize: 14,
            }}
          >
            <div style={{ color: 'var(--gold-dim)', fontWeight: 700, marginBottom: 6 }}>
              Відкрито нові вправи
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: 'var(--text)' }}>
              {unlocks.map((u) => (
                <li key={u.templateId}>
                  <strong>{u.title}</strong> <span style={{ color: 'var(--text-dim)' }}>(з рівня {u.minLevel})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function AchievementToast({ id, index }: { id: string; index: number }) {
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  return (
    <Toast index={index}>
      <Trophy size={16} color="var(--gold)" /> Досягнення: «{def?.title ?? id}»
    </Toast>
  )
}

function Toast({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const style: CSSProperties = { animationDelay: `${index * 0.15}s`, animationFillMode: 'both' }
  return (
    <div className="toast" style={style}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{children}</span>
    </div>
  )
}