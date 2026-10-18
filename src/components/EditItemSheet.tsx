import { useState } from 'react'
import type { Category, Item } from '../types'
import { CATEGORY_META, CATEGORY_ORDER, UNIT_OPTIONS } from '../lib/categories'
import { Sheet } from './Sheet'

interface EditItemSheetProps {
  item: Item
  onClose: () => void
  onSubmit: (value: { name: string; category: Category; unit: string; note?: string }) => void
}

export function EditItemSheet({ item, onClose, onSubmit }: EditItemSheetProps) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState<Category>(item.category)
  const [unit, setUnit] = useState(item.unit)
  const [note, setNote] = useState(item.note ?? '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) {
      setError('物品名称不能为空')
      return
    }
    onSubmit({
      name: name.trim(),
      category,
      unit: unit.trim() || '个',
      note: note.trim() || undefined,
    })
  }

  return (
    <Sheet
      title="编辑物品"
      subtitle="修改名称、分类与备注，批次信息单独维护"
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn btn-primary btn-block" onClick={submit}>
            保存修改
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">物品名称</span>
        <input
          className="text-input"
          value={name}
          maxLength={40}
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
          value={unit}
          maxLength={8}
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

      <label className="field">
        <span className="field-label">物品备注（可选）</span>
        <textarea
          className="text-input textarea"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
    </Sheet>
  )
}
