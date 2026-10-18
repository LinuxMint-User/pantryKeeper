import { Minus, Plus } from 'lucide-react'

interface QuantityInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function QuantityInput({ value, onChange, min = 0, max, step = 1, suffix }: QuantityInputProps) {
  const clamp = (next: number) => {
    let result = Math.max(min, round(next))
    if (max !== undefined) result = Math.min(max, result)
    return result
  }

  return (
    <div className="qty-stepper">
      <button
        type="button"
        className="qty-btn"
        aria-label="减少"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus size={16} />
      </button>
      <div className="qty-field">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(clamp(Number(event.target.value) || 0))}
        />
        {suffix && <span className="qty-suffix">{suffix}</span>}
      </div>
      <button
        type="button"
        className="qty-btn"
        aria-label="增加"
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
