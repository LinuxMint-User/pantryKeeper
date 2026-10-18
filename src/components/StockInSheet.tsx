import { useState } from 'react'
import type { BatchFormValue, Item } from '../types'
import { todayYmd } from '../lib/expiry'
import { validateBatchForm } from '../lib/store'
import { BatchFields } from './BatchFields'
import { Sheet } from './Sheet'

interface StockInSheetProps {
  item: Item
  warnDays: number
  onClose: () => void
  onSubmit: (batch: BatchFormValue) => void
}

function defaultBatch(item: Item): BatchFormValue {
  const last = item.batches[item.batches.length - 1]
  const computed = [...item.batches]
    .reverse()
    .find((batch) => batch.expiryMode === 'computed' && batch.shelfLifeValue)
  const mode = last?.expiryMode ?? 'computed'
  return {
    quantity: 1,
    expiryMode: mode,
    productionDate: todayYmd(),
    shelfLifeValue: computed?.shelfLifeValue ? String(computed.shelfLifeValue) : '30',
    shelfLifeUnit: computed?.shelfLifeUnit ?? 'day',
    expiryDate: '',
    expiryPrecision: last?.expiryPrecision ?? 'day',
    status: 'sealed',
    note: '',
  }
}

export function StockInSheet({ item, warnDays, onClose, onSubmit }: StockInSheetProps) {
  const [batch, setBatch] = useState<BatchFormValue>(() => defaultBatch(item))
  const [error, setError] = useState('')

  const total = item.batches
    .filter((entry) => entry.quantity > 0)
    .reduce((sum, entry) => sum + entry.quantity, 0)

  const update = (patch: Partial<BatchFormValue>) => {
    setBatch((previous) => ({ ...previous, ...patch }))
    setError('')
  }

  const submit = () => {
    const message = validateBatchForm(batch)
    if (message) {
      setError(message)
      return
    }
    onSubmit(batch)
  }

  return (
    <Sheet
      title={`入库 · ${item.name}`}
      subtitle={`当前库存 ${total} ${item.unit}，入库会新增一个独立批次`}
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={submit}>
            确认入库
          </button>
        </>
      }
    >
      <BatchFields value={batch} onChange={update} unit={item.unit} warnDays={warnDays} />
    </Sheet>
  )
}
