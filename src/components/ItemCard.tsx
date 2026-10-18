import type { Item } from '../types'
import { formatDateCn, statusText, type ItemSummary } from '../lib/expiry'
import { CATEGORY_META } from '../lib/categories'

interface ItemCardProps {
  item: Item
  summary: ItemSummary
  onClick: () => void
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 100) / 100)
}

export function ItemCard({ item, summary, onClick }: ItemCardProps) {
  const meta = CATEGORY_META[item.category]
  const progress = summary.progress

  return (
    <button type="button" className={`item-card state-${summary.state}`} onClick={onClick}>
      <span className="item-icon" style={{ background: meta.bg }}>
        {meta.emoji}
      </span>
      <span className="item-body">
        <span className="item-top">
          <span className="item-name">{item.name}</span>
          <span className={`badge badge-${summary.state}`}>{statusText(summary.state)}</span>
        </span>
        <span className="item-meta">
          {meta.label}
          <span className="dot-sep">·</span>
          {summary.state === 'discarded'
            ? `弃用 ${formatQuantity(summary.discardedQuantity)} ${item.unit}`
            : summary.activeBatchCount > 1
              ? `${summary.activeBatchCount} 个批次`
              : item.unit}
          {summary.hasOpen && <span className="open-tag">使用中</span>}
          {summary.discardedBatches > 0 && summary.state !== 'discarded' && (
            <span className="discard-tag">
              弃用 {formatQuantity(summary.discardedQuantity)}
              {item.unit}
            </span>
          )}
        </span>
        <span className="item-bottom">
          <span className="item-qty">
            {formatQuantity(
              summary.state === 'discarded' ? summary.discardedQuantity : summary.quantity,
            )}
            <em>{item.unit}</em>
          </span>
          <span className={`item-expiry exp-${summary.state}`}>
            {summary.nearestLabel}
            {summary.nearestBatch?.expiryDate && (
              <span className="expiry-date">
                {' · '}
                {formatDateCn(
                  summary.nearestBatch.expiryDate,
                  summary.nearestBatch.expiryPrecision,
                )}
              </span>
            )}
          </span>
        </span>
        {progress !== null && (
          <span className="progress" aria-hidden="true">
            <span
              className={`progress-fill fill-${summary.state}`}
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </span>
        )}
      </span>
    </button>
  )
}
