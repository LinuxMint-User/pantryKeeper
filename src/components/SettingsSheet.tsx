import { useRef, useState } from 'react'
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react'
import type { InventoryData, Settings, ThemeMode } from '../types'
import { parseBackup } from '../lib/store'
import { Sheet } from './Sheet'

interface SettingsSheetProps {
  settings: Settings
  onClose: () => void
  onSave: (settings: Settings) => void
  onExport: () => void
  onImport: (data: InventoryData) => void
  onClear: () => void
  onReset: () => void
}

const PRESETS = [7, 14, 30, 60, 90]

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
]

export function SettingsSheet({
  settings,
  onClose,
  onSave,
  onExport,
  onImport,
  onClear,
  onReset,
}: SettingsSheetProps) {
  const [warnDays, setWarnDays] = useState(String(settings.warnDays))
  const [theme, setTheme] = useState<ThemeMode>(settings.theme)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const parsed = Number(warnDays)
    const safe = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 30
    onSave({ warnDays: safe, theme })
  }

  const importBackup = async (file: File) => {
    setError(null)
    try {
      const backup = parseBackup(await file.text())
      if (
        !window.confirm(
          `导入将覆盖当前全部库存和记录（备份含 ${backup.items.length} 件物品），确定继续吗？`,
        )
      ) {
        return
      }
      onImport(backup)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请检查备份文件')
    }
  }

  const clearAll = () => {
    if (
      window.confirm('将删除全部物品、批次和出入库记录，且无法撤销。建议先导出备份。确定清空吗？')
    ) {
      onClear()
      onClose()
    }
  }

  const reset = () => {
    if (window.confirm('恢复示例数据会覆盖当前全部库存，确定继续吗？')) {
      onReset()
      onClose()
    }
  }

  return (
    <Sheet
      title="设置"
      subtitle="提醒规则与本地数据"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={submit}>
          保存设置
        </button>
      }
    >
      <div className="field">
        <span className="field-label">外观</span>
        <div className="seg">
          {THEMES.map((option) => (
            <button
              key={option.key}
              type="button"
              className={theme === option.key ? 'active' : ''}
              onClick={() => setTheme(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="field-hint">选择“跟随系统”时，会随手机的深浅色设置自动切换。</p>
      </div>

      <div className="field">
        <span className="field-label">临期提醒阈值</span>
        <p className="field-hint">
          距离过期还有多少天时，把物品标记为“临期”。默认 {settings.warnDays} 天。
        </p>
        <div className="inline-inputs">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="text-input"
            value={warnDays}
            onChange={(event) => setWarnDays(event.target.value)}
          />
          <span className="input-suffix">天</span>
        </div>
        <div className="unit-chips">
          {PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              className={`mini-chip${Number(warnDays) === days ? ' active' : ''}`}
              onClick={() => setWarnDays(String(days))}
            >
              {days} 天
            </button>
          ))}
        </div>
      </div>

      <div className="form-divider">
        <span>数据管理</span>
      </div>

      <p className="field-hint">
        所有数据保存在当前设备中，不会上传。换设备或清理数据前可先导出备份，之后用同一份 JSON 导入恢复。
      </p>

      <div className="settings-actions">
        <button type="button" className="btn btn-secondary" onClick={onExport}>
          <Download size={17} /> 导出 JSON 备份
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={17} /> 导入 JSON 备份
        </button>
        <button type="button" className="btn btn-danger-ghost" onClick={clearAll}>
          <Trash2 size={17} /> 清空全部库存
        </button>
        <button type="button" className="btn btn-danger-ghost" onClick={reset}>
          <RotateCcw size={17} /> 恢复示例数据
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void importBackup(file)
        }}
      />
      {error && <p className="form-error">{error}</p>}

      <div className="settings-about">
        <span className="settings-logo">🧺</span>
        <div>
          <strong>囤货管家 · MVP</strong>
          <p>手机 / 平板自适应 · 可添加到主屏幕使用</p>
        </div>
      </div>
    </Sheet>
  )
}
