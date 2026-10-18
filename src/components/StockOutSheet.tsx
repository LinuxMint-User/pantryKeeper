import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import type { Batch, Item } from '../types'
import { batchExpiryInfo, daysUntil, formatDateFull } from '../lib/expiry'
import { formatQuantity } from './ItemCard'
import { QuantityInput } from './QuantityInput'
import { Sheet } from './Sheet'

interface StockOutSheetProps {
  item: Item
  initialBatchId?: string
  warnDays: number
  onClose: () => void
  onSubmit: (batchId: string, quantity: number, note?: string) => void
}

function sortActive(batches: Batch[]): Batch[] {
  return batches
    .filter((batch) => batch.quantity > 0 && batch.status !== 'discarded')
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate) return daysUntil(a.expiryDate) - daysUntil(b.expiryDate)
      if (a.expiryDate) return -1
      if (b.expiryDate) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
}

export function StockOutSheet({
  item,
  initialBatchId,
  warnDays,
  onClose,
  onSubmit,
}: StockOutSheetProps) {
  const batches = useMemo(() => sortActive(item.batches), [item.batches])
  const batchNumbers = useMemo(
    () => new Map(item.batches.map((batch, index) => [batch.id, index + 1])),
    [item.batches],
  )
  const initial =
    initialBatchId && batches.some((batch) => batch.id === initialBatchId)
      ? initialBatchId
      : (batches[0]?.id ?? '')
  const [selectedId, setSelectedId] = useState(initial)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const selected = batches.find((batch) => batch.id === selectedId)

  const selectBatch = (batch: Batch) => {
    setSelectedId(batch.id)
    setQuantity((current) => Math.min(Math.max(1, current), batch.quantity))
    setError('')
  }

  const submit = () => {
    if (!selected) {
      setError('请选择要出库的批次')
      return
    }
    if (!quantity || quantity <= 0) {
      setError('请输入大于 0 的出库数量')
      return
    }
    if (quantity > selected.quantity) {
      setError(`该批次最多可出库 ${formatQuantity(selected.quantity)} ${item.unit}`)
      return
    }
    onSubmit(selected.id, quantity, note.trim() || undefined)
  }

  return (
    <Sheet
      title={`出库 · ${item.name}`}
      subtitle="先到期先出库，也可以手动选择批次"
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error">{error}</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={submit}
            disabled={!selected}
          >
            确认出库
          </button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">选择批次</span>
        <div className="pick-list">
          {batches.map((batch, index) => {
            const info = batchExpiryInfo(batch, warnDays)
            const active = batch.id === selectedId
            return (
              <button
                key={batch.id}
                type="button"
                className={`pick-row${active ? ' active' : ''}`}
                onClick={() => selectBatch(batch)}
              >
                <span className="pick-radio">{active && <Check size={13} />}</span>
                <span className="pick-main">
                  <span className="pick-title">
                    <span>
                      批次 {batchNumbers.get(batch.id) ?? index + 1}
                      {index === 0 && <span className="pick-best">建议先用</span>}
                    </span>
                    <span className="pick-qty">
                      {formatQuantity(batch.quantity)} {item.unit}
                    </span>
                  </span>
                  <span className={`pick-sub exp-${info.state}`}>
                    {info.label}
                    {batch.expiryDate &&
                      ` · 到期 ${formatDateFull(batch.expiryDate, batch.expiryPrecision)}`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <span className="field-label">
          出库数量
          {selected && (
            <button
              type="button"
              className="field-inline-action"
              onClick={() => setQuantity(selected.quantity)}
            >
              全部出库
            </button>
          )}
        </span>
        <QuantityInput
          value={quantity}
          onChange={(next) => {
            setQuantity(next)
            setError('')
          }}
          min={0}
          max={selected?.quantity}
          suffix={item.unit}
        />
      </div>

      <label className="field">
        <span className="field-label">备注（可选）</span>
        <input
          className="text-input"
          placeholder="例如：早餐用掉、送给朋友"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
    </Sheet>
  )
}
