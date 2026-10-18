import { CalendarDays } from 'lucide-react'
import type { BatchFormValue } from '../types'
import {
  daysUntil,
  expiryStateForDays,
  formatDateFull,
  monthEndYmd,
  relativeExpiryText,
  resolveExpiryDate,
  statusText,
  todayYmd,
  ymOf,
} from '../lib/expiry'
import { QuantityInput } from './QuantityInput'

interface BatchFieldsProps {
  value: BatchFormValue
  onChange: (patch: Partial<BatchFormValue>) => void
  unit: string
  warnDays: number
  showQuantity?: boolean
  quantityLabel?: string
}

const MODES = [
  { key: 'computed', label: '按保质期推算' },
  { key: 'explicit', label: '直接填过期日' },
  { key: 'none', label: '无保质期' },
] as const

export function BatchFields({
  value,
  onChange,
  unit,
  warnDays,
  showQuantity = true,
  quantityLabel = '数量',
}: BatchFieldsProps) {
  const preview = resolveExpiryDate(
    value.expiryMode,
    value.productionDate || undefined,
    Number(value.shelfLifeValue) || undefined,
    value.shelfLifeUnit,
    value.expiryDate || undefined,
  )
  const previewDays = preview ? daysUntil(preview) : undefined
  const previewState =
    previewDays !== undefined ? expiryStateForDays(previewDays, warnDays) : undefined

  return (
    <>
      {showQuantity && (
        <div className="field">
          <span className="field-label">{quantityLabel}</span>
          <QuantityInput
            value={value.quantity}
            onChange={(quantity) => onChange({ quantity })}
            min={0}
            suffix={unit}
          />
        </div>
      )}

      <div className="field">
        <span className="field-label">保质期记录方式</span>
        <div className="seg">
          {MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={value.expiryMode === mode.key ? 'active' : ''}
              onClick={() => onChange({ expiryMode: mode.key })}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {value.expiryMode === 'computed' && (
        <div className="field-grid">
          <label className="field">
            <span className="field-label">生产日期</span>
            <input
              type="date"
              className="text-input"
              value={value.productionDate}
              max={todayYmd()}
              onChange={(event) => onChange({ productionDate: event.target.value })}
            />
          </label>
          <div className="field">
            <span className="field-label">保质期时长</span>
            <div className="inline-inputs">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                className="text-input"
                placeholder="例如 30"
                value={value.shelfLifeValue}
                onChange={(event) => onChange({ shelfLifeValue: event.target.value })}
              />
              <select
                className="text-input select"
                value={value.shelfLifeUnit}
                onChange={(event) =>
                  onChange({ shelfLifeUnit: event.target.value as BatchFormValue['shelfLifeUnit'] })
                }
              >
                <option value="day">天</option>
                <option value="month">个月</option>
                <option value="year">年</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {value.expiryMode === 'explicit' && (
        <div className="field">
          <span className="field-label">
            过期日期
            <span className="precision-switch">
              <button
                type="button"
                className={`mini-chip${value.expiryPrecision === 'day' ? ' active' : ''}`}
                onClick={() => onChange({ expiryPrecision: 'day' })}
              >
                按日
              </button>
              <button
                type="button"
                className={`mini-chip${value.expiryPrecision === 'month' ? ' active' : ''}`}
                onClick={() =>
                  onChange({
                    expiryPrecision: 'month',
                    expiryDate: value.expiryDate ? monthEndYmd(ymOf(value.expiryDate)) : '',
                  })
                }
              >
                仅年月
              </button>
            </span>
          </span>
          {value.expiryPrecision === 'month' ? (
            <input
              type="month"
              className="text-input"
              value={value.expiryDate ? ymOf(value.expiryDate) : ''}
              onChange={(event) =>
                onChange({
                  expiryDate: event.target.value ? monthEndYmd(event.target.value) : '',
                })
              }
            />
          ) : (
            <input
              type="date"
              className="text-input"
              value={value.expiryDate}
              onChange={(event) => onChange({ expiryDate: event.target.value })}
            />
          )}
          {value.expiryPrecision === 'month' && (
            <p className="field-hint">
              按当月最后一天计算，例如「2026年10月」会在 10 月 31 日之后才显示过期。
            </p>
          )}
        </div>
      )}

      {value.expiryMode === 'none' && (
        <p className="field-hint">适合纸巾、洗护用品等没有明确保质期的物品。</p>
      )}

      {preview && previewDays !== undefined && previewState && (
        <div className={`expiry-preview exp-${previewState}`}>
          <CalendarDays size={16} />
          <span>
            {value.expiryMode === 'computed'
              ? '预计到期'
              : value.expiryPrecision === 'month'
                ? '到期月'
                : '到期日'}{' '}
            <b>
              {formatDateFull(
                preview,
                value.expiryMode === 'explicit' ? value.expiryPrecision : 'day',
              )}
            </b>
          </span>
          <span className="expiry-preview-state">
            {statusText(previewState)} · {relativeExpiryText(previewDays)}
          </span>
        </div>
      )}

      <div className="field">
        <span className="field-label">当前使用状态</span>
        <div className="seg">
          <button
            type="button"
            className={value.status === 'sealed' ? 'active' : ''}
            onClick={() => onChange({ status: 'sealed' })}
          >
            未拆封
          </button>
          <button
            type="button"
            className={value.status === 'open' ? 'active' : ''}
            onClick={() => onChange({ status: 'open' })}
          >
            使用中
          </button>
          <button
            type="button"
            className={value.status === 'discarded' ? 'active' : ''}
            onClick={() => onChange({ status: 'discarded' })}
          >
            弃用
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">批次备注（可选）</span>
        <input
          className="text-input"
          placeholder="例如：放在冰箱上层"
          value={value.note ?? ''}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </label>
    </>
  )
}
