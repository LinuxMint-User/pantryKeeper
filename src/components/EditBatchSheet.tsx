import { useState } from 'react'
import type { Batch, BatchFormValue, Item } from '../types'
import { todayYmd } from '../lib/expiry'
import { applyBatchForm, validateBatchForm } from '../lib/store'
import { BatchFields } from './BatchFields'
import { Sheet } from './Sheet'

interface EditBatchSheetProps {
  item: Item
  batch: Batch
  warnDays: number
  onClose: () => void
  onSubmit: (batch: Batch) => void
}

export function EditBatchSheet({ item, batch, warnDays, onClose, onSubmit }: EditBatchSheetProps) {
  const [value, setValue] = useState<BatchFormValue>({
    quantity: batch.quantity,
    expiryMode: batch.expiryMode,
    productionDate: batch.productionDate ?? todayYmd(),
    shelfLifeValue: batch.shelfLifeValue ? String(batch.shelfLifeValue) : '',
    shelfLifeUnit: batch.shelfLifeUnit ?? 'day',
    expiryDate: batch.expiryDate ?? '',
    expiryPrecision: batch.expiryPrecision ?? 'day',
    status: batch.status,
    note: batch.note ?? '',
  })
  const [error, setError] = useState('')

  const update = (patch: Partial<BatchFormValue>) => {
    setValue((previous) => ({ ...previous, ...patch }))
    setError('')
  }

  const submit = () => {
    const message = validateBatchForm(value, false)
    if (message) {
      setError(message)
      return
    }
    onSubmit(applyBatchForm(batch, value))
  }

  return (
    <Sheet
      title={`编辑批次 · ${item.name}`}
      subtitle={`当前数量 ${batch.quantity} ${item.unit}，出库数量请在物品详情调整`}
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={submit}>
            保存批次
          </button>
        </>
      }
    >
      <BatchFields
        value={value}
        onChange={update}
        unit={item.unit}
        warnDays={warnDays}
        showQuantity={false}
      />
    </Sheet>
  )
}
