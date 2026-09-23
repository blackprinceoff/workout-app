import { useState } from 'react'
import { GameProvider, useGame } from './state/GameContext'
import { EventLayer } from './components/EventLayer'
import { Dashboard } from './pages/Dashboard'
import { Quests } from './pages/Quests'
import { Progress } from './pages/Progress'
import { Achievements } from './pages/Achievements'
import { Settings } from './pages/Settings'
import { Flame, NAV_ICONS, Swords, type LucideIcon } from './components/Glyphs'

type PageKey = 'dashboard' | 'quests' | 'progress' | 'achievements' | 'settings'

const NAV: { key: PageKey; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Персонаж', icon: Swords },
  { key: 'quests', label: 'Квести', icon: NAV_ICONS.quests },
  { key: 'progress', label: 'Прогрес', icon: NAV_ICONS.progress },
  { key: 'achievements', label: 'Трофеї', icon: NAV_ICONS.achievements },
  { key: 'settings', label: 'Налаштування', icon: NAV_ICONS.settings },
]

function Shell() {
  const { state } = useGame()
  const [page, setPage] = useState<PageKey>('dashboard')

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-icon">
              <Swords size={28} strokeWidth={1.5} />
            </span>
            <div>
              <div className="brand-title">FitQuest</div>
              <div className="brand-sub">шлях воїна</div>
            </div>
          </div>

          <nav className="nav-list" aria-label="Основна навігація">
            {NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${page === item.key ? 'active' : ''}`}
                onClick={() => setPage(item.key)}
              >
                <span className="nav-icon">
                  <item.icon size={18} strokeWidth={1.8} />
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="nav-streak">
            <span style={{ display: 'flex' }}>
              <Flame size={22} color="var(--success)" />
            </span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Серія
              </div>
              <div className="nav-streak-value">{state.streak} днів</div>
            </div>
          </div>
        </aside>

        <main className="content">
          {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p as PageKey)} />}
          {page === 'quests' && <Quests />}
          {page === 'progress' && <Progress />}
          {page === 'achievements' && <Achievements />}
          {page === 'settings' && <Settings />}
        </main>
      </div>

      <EventLayer events={state.events} />
    </>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}