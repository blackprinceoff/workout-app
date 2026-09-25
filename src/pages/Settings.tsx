import { useRef, useState } from 'react'
import { useGame } from '../state/GameContext'
import { formatUa } from '../game/dates'
import { levelInfo, powerScore } from '../game/leveling'
import {
  Award,
  Bell,
  Download,
  Save,
  Scale,
  Settings as SettingsIcon,
  Upload,
  User,
} from '../components/Glyphs'

export function Settings() {
  const {
    state,
    setName,
    updateProfile,
    addWeight,
    removeWeight,
    toggleSound,
    toggleNotifications,
    toggleTheme,
    importState,
    resetGame,
    doExport,
  } = useGame()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const latestWeight = state.weightHistory[state.weightHistory.length - 1]?.valueKg ?? state.profile.weightKg
  const [weightInput, setWeightInput] = useState(String(latestWeight))
  const [weightSaved, setWeightSaved] = useState(false)

  const recent = state.weightHistory.slice(-6).reverse()

  const level = levelInfo(state.totalXp)
  const score = powerScore(state)
  const [copiedSummary, setCopiedSummary] = useState(false)

  const handleCopySummary = () => {
    const summary = [
      `⚔️ FitQuest: ${state.profile.name} (${level.className}) — Рівень ${level.level}`,
      `🔥 Серія: ${state.streak} дн. (рекорд ${state.bestStreak})`,
      `🛡️ Звичка: ${Math.round(state.habit)}/100 · Загалом XP: ${Math.floor(state.totalXp)}`,
      `💪 Сила персонажа: ${score} · Квестів виконано: ${state.totalQuestsDone}`,
      ` «Шлях від дивана до легенди»`,
    ].join('\n')
    navigator.clipboard.writeText(summary)
    setCopiedSummary(true)
    window.setTimeout(() => setCopiedSummary(false), 2000)
  }

  const saveWeight = () => {
    const v = Number(weightInput)
    if (!Number.isFinite(v) || v <= 0 || v > 400) return
    addWeight(Math.round(v * 10) / 10)
    setWeightInput(String(Math.round(v * 10) / 10))
    setWeightSaved(true)
    window.setTimeout(() => setWeightSaved(false), 2000)
  }

  const exportWeightCsv = () => {
    if (!state.weightHistory.length) return
    const rows = ['Дата,Вага (кг)']
    for (const w of state.weightHistory) {
      rows.push(`${w.date},${w.valueKg}`)
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fitquest-weight-history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const applyImport = async (file: File) => {
    const text = await file.text()
    const ok = importState(text)
    setImportError(!ok)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <h1 className="page-title">
        <SettingsIcon size={24} strokeWidth={1.6} /> Налаштування
      </h1>
      <p className="page-sub">Герой, твій профіль та збереження</p>

      <div className="panel section-mb">
        <div className="panel-title">
          <User size={16} /> Про персонажа
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-name">Ім'я</label>
            <input
              id="profile-name"
              value={state.profile.name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-age">Вік</label>
            <input
              id="profile-age"
              type="number"
              value={state.profile.age}
              onChange={(e) =>
                updateProfile(
                  Number(e.target.value) || 0,
                  state.profile.heightCm,
                  state.profile.weightKg,
                )
              }
            />
          </div>
          <div className="field">
            <label htmlFor="profile-height">Зріст, см</label>
            <input
              id="profile-height"
              type="number"
              value={state.profile.heightCm}
              onChange={(e) =>
                updateProfile(
                  state.profile.age,
                  Number(e.target.value) || 0,
                  state.profile.weightKg,
                )
              }
            />
          </div>
          <div className="field">
            <label htmlFor="profile-weight">Вага, кг</label>
            <input
              id="profile-weight"
              type="number"
              value={state.profile.weightKg}
              onChange={(e) =>
                updateProfile(
                  state.profile.age,
                  state.profile.heightCm,
                  Number(e.target.value) || 0,
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Scale size={16} /> Вага тіла
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Щотижневий запис</div>
            <div className="settings-hint">
              Один запис на день; зміни видно одразу в списку
            </div>
          </div>
          {weightSaved && (
            <span style={{ color: 'var(--gold)', fontSize: 13 }}>Записано</span>
          )}
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="weight-value">Вага, кг</label>
            <input
              id="weight-value"
              type="number"
              min={30}
              max={400}
              step={0.1}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveWeight()
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="weight-save">&nbsp;</label>
            <button id="weight-save" className="btn btn-gold" onClick={saveWeight}>
              Записати
            </button>
          </div>
        </div>
        {recent.length > 0 && (
          <>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {recent.map((w, i) => {
                const prev = state.weightHistory[state.weightHistory.length - 1 - i - 1]
                const delta = prev ? w.valueKg - prev.valueKg : null
                return (
                  <div
                    key={w.date}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}
                  >
                    <span style={{ color: 'var(--text-dim)' }}>{formatUa(w.date)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>
                        <strong>{w.valueKg}</strong> кг
                        {delta !== null && delta !== 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: delta < 0 ? 'var(--good)' : 'var(--danger)',
                              fontSize: 12,
                            }}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(1)}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWeight(w.date)}
                        title="Видалити запис"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: '0 4px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: 'transparent', border: '1px solid var(--border-solid)', color: 'var(--text)' }}
                onClick={exportWeightCsv}
              >
                Експорт історії ваги у CSV
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Award size={16} /> Поділитися прогресом
        </div>
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div>
            <div className="settings-label">Звіт персонажа</div>
            <div className="settings-hint">Скопіювати текстовий підсумок для щоденника чи друзів</div>
            {copiedSummary && (
              <div style={{ color: 'var(--good)', fontSize: 12, marginTop: 4 }}>
                Звіт скопійовано у буфер обміну! 📋
              </div>
            )}
          </div>
          <button className="btn btn-gold btn-sm" onClick={handleCopySummary}>
            <Award size={14} /> Скопіювати звіт
          </button>
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Bell size={16} /> Сповіщення та звук
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Браузерні сповіщення</div>
            <div className="settings-hint">Нагадування про закінчення перерви та розминку</div>
          </div>
          <button
            type="button"
            className={`switch ${state.settings.notifications ? 'on' : ''}`}
            onClick={() => void toggleNotifications()}
            aria-label="Перемкнути сповіщення"
            aria-pressed={state.settings.notifications}
          />
        </div>
        <div className="settings-row" style={{ marginTop: 12 }}>
          <div>
            <div className="settings-label">Звукові ефекти</div>
            <div className="settings-hint">Фанфари та звуки при level-up і досягненнях</div>
          </div>
          <button
            type="button"
            className={`switch ${state.settings.sound ? 'on' : ''}`}
            onClick={toggleSound}
            aria-label="Перемкнути звук"
            aria-pressed={state.settings.sound}
          />
        </div>
        <div className="settings-row" style={{ marginTop: 12 }}>
          <div>
            <div className="settings-label">Світла тема оформлення</div>
            <div className="settings-hint">Перемикання між темною та світлою палітрою</div>
          </div>
          <button
            type="button"
            className={`switch ${state.settings.theme === 'light' ? 'on' : ''}`}
            onClick={toggleTheme}
            aria-label="Перемкнути тему"
            aria-pressed={state.settings.theme === 'light'}
          />
        </div>
      </div>

      <div className="panel section-mb">
        <div className="panel-title">
          <Save size={16} /> Збереження
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">Експорт прогресу</div>
            <div className="settings-hint">Скачати JSON — резервна копія на випадок очищення браузера</div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={doExport}>
            <Download size={14} /> Експорт
          </button>
        </div>

        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div>
            <div className="settings-label">Імпорт прогресу</div>
            <div className="settings-hint">Відновити з раніше збереженого файлу</div>
            {importError && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                Помилка: некоректний файл.
              </div>
            )}
          </div>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Імпорт
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void applyImport(f)
            }}
          />
        </div>

        <div className="divider" />

        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div>
            <div className="settings-label" style={{ color: 'var(--danger)' }}>
              Скинути гру
            </div>
            <div className="settings-hint">Повністю видалити весь прогрес. Безповоротно.</div>
          </div>
          {confirmReset ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-danger btn-sm" onClick={resetGame}>
                Так, скинути
              </button>
              <button className="btn btn-sm" onClick={() => setConfirmReset(false)}>
                Скасувати
              </button>
            </div>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmReset(true)}>
              Скинути
            </button>
          )}
        </div>
      </div>

      <p className="empty-hint">FitQuest v1 · створено для програмиста, який став воїном</p>
    </>
  )
}