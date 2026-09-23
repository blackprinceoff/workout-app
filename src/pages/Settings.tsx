import { useRef, useState } from 'react'
import { useGame } from '../state/GameContext'
import {
  Download,
  Save,
  Settings as SettingsIcon,
  Upload,
  User,
  Volume2,
} from '../components/Glyphs'

export function Settings() {
  const { state, setName, updateProfile, toggleSound, importState, resetGame, doExport } = useGame()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

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
            <label>Ім'я</label>
            <input
              value={state.profile.name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
            />
          </div>
          <div className="field">
            <label>Вік</label>
            <input
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
            <label>Зріст, см</label>
            <input
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
            <label>Вага, кг</label>
            <input
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
          <Volume2 size={16} /> Звук
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Звукові ефекти</div>
            <div className="settings-hint">Фанфари та звуки при level-up і досягненнях</div>
          </div>
          <button
            type="button"
            className={`switch ${state.settings.sound ? 'on' : ''}`}
            onClick={toggleSound}
            aria-label="Перемкнути звук"
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