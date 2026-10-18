import { useRef, useState } from 'react'
import type { BatchFormValue, Category, ItemFormValue } from '../types'
import { CATEGORY_META, CATEGORY_ORDER, UNIT_OPTIONS } from '../lib/categories'
import { todayYmd } from '../lib/expiry'
import { validateBatchForm } from '../lib/store'
import { BatchFields } from './BatchFields'
import { Sheet } from './Sheet'

interface AddItemSheetProps {
  warnDays: number
  continuous?: boolean
  onClose: () => void
  onSubmit: (value: ItemFormValue) => void
}

function initialBatch(): BatchFormValue {
  return {
    quantity: 1,
    expiryMode: 'computed',
    productionDate: todayYmd(),
    shelfLifeValue: '30',
    shelfLifeUnit: 'day',
    expiryDate: '',
    expiryPrecision: 'day',
    status: 'sealed',
    note: '',
  }
}

export function AddItemSheet({
  warnDays,
  continuous = false,
  onClose,
  onSubmit,
}: AddItemSheetProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [unit, setUnit] = useState('个')
  const [itemNote, setItemNote] = useState('')
  const [batch, setBatch] = useState<BatchFormValue>(initialBatch)
  const [error, setError] = useState('')
  const nameFieldRef = useRef<HTMLLabelElement>(null)

  const updateBatch = (patch: Partial<BatchFormValue>) => {
    setBatch((previous) => ({ ...previous, ...patch }))
    setError('')
  }

  const resetForm = () => {
    setName('')
    setCategory('food')
    setUnit('个')
    setItemNote('')
    setBatch(initialBatch())
    setError('')
    nameFieldRef.current?.closest('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = () => {
    if (!name.trim()) {
      setError('请先填写物品名称')
      return
    }
    const batchError = validateBatchForm(batch)
    if (batchError) {
      setError(batchError)
      return
    }
    onSubmit({
      ...batch,
      name: name.trim(),
      category,
      unit: unit.trim() || '个',
      itemNote: itemNote.trim() || undefined,
    })
    if (continuous) resetForm()
  }

  return (
    <Sheet
      title="添加物品"
      subtitle={
        continuous
          ? '连续录入模式 · 保存后自动清空，可接着录下一件'
          : '记录物品信息和第一批库存'
      }
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={submit}>
            {continuous ? '保存并继续录入' : '添加到库存'}
          </button>
        </>
      }
    >
      <label className="field" ref={nameFieldRef}>
        <span className="field-label">物品名称</span>
        <input
          className="text-input"
          placeholder="例如：全脂牛奶"
          maxLength={40}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
        />
      </label>

      <div className="field">
        <span className="field-label">分类</span>
        <div className="category-grid">
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY_META[key]
            return (
              <button
                key={key}
                type="button"
                className={`category-chip${category === key ? ' active' : ''}`}
                onClick={() => setCategory(key)}
              >
                <span>{meta.emoji}</span>
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <span className="field-label">单位</span>
        <input
          className="text-input"
          placeholder="个 / 瓶 / 盒 / kg …"
          maxLength={8}
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
        />
        <div className="unit-chips">
          {UNIT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`mini-chip${unit === option ? ' active' : ''}`}
              onClick={() => setUnit(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="form-divider">
        <span>第一批库存</span>
      </div>

      <BatchFields
        value={batch}
        onChange={updateBatch}
        unit={unit.trim() || '个'}
        warnDays={warnDays}
      />

      <label className="field">
        <span className="field-label">物品备注（可选）</span>
        <textarea
          className="text-input textarea"
          rows={2}
          placeholder="例如：放在冰箱上层，开封后尽快喝完"
          value={itemNote}
          onChange={(event) => setItemNote(event.target.value)}
        />
      </label>
    </Sheet>
  )
}
