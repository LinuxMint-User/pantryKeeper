import type { InventoryData } from '../types'
import { CATEGORY_META, CATEGORY_ORDER } from '../lib/categories'
import { batchExpiryInfo, summarizeItem } from '../lib/expiry'

interface StatsTabProps {
  data: InventoryData
  onOpenItem: (id: string) => void
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

export function StatsTab({ data, onOpenItem }: StatsTabProps) {
  const warnDays = data.settings.warnDays
  const entries = data.items.map((item) => ({ item, summary: summarizeItem(item, warnDays) }))
  const activeEntries = entries.filter(
    (entry) => entry.summary.state !== 'finished' && entry.summary.state !== 'discarded',
  )
  const expired = activeEntries.filter((entry) => entry.summary.state === 'expired')
  const soon = activeEntries.filter((entry) => entry.summary.state === 'soon')

  const batches = activeEntries.flatMap(({ item }) =>
    item.batches
      .filter((batch) => batch.quantity > 0 && batch.status !== 'discarded')
      .map((batch) => ({ item, batch })),
  )
  const sealed = batches.filter(({ batch }) => batch.status === 'sealed').length
  const open = batches.filter(({ batch }) => batch.status === 'open').length
  const finishedBatches = data.items.flatMap((item) => item.batches).filter((b) => b.quantity <= 0)
    .length
  const discardedBatches = data.items
    .flatMap((item) => item.batches)
    .filter((batch) => batch.quantity > 0 && batch.status === 'discarded').length

  const categoryRows = CATEGORY_ORDER.map((category) => {
    const count = activeEntries.filter(({ item }) => item.category === category).length
    return { category, count }
  })
  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.count))

  const upcoming = batches
    .map(({ item, batch }) => {
      const info = batchExpiryInfo(batch, warnDays)
      return { item, batch, info, days: info.daysLeft }
    })
    .filter((row) => row.days !== undefined && row.days >= 0 && row.days <= 7)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))

  const urgent = [...expired, ...soon]
    .sort((a, b) => (a.summary.nearestDays ?? 0) - (b.summary.nearestDays ?? 0))
    .slice(0, 4)

  return (
    <div className="tab-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">数据都在本机，不上传云端</p>
          <h1>统计</h1>
        </div>
      </header>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">在库物品</span>
          <strong className="metric-value">{activeEntries.length}</strong>
          <span className="metric-unit">件</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">未用完批次</span>
          <strong className="metric-value">{batches.length}</strong>
          <span className="metric-unit">个</span>
        </div>
        <div className="metric-card metric-warn">
          <span className="metric-label">临期</span>
          <strong className="metric-value">{soon.length}</strong>
          <span className="metric-unit">件</span>
        </div>
        <div className="metric-card metric-danger">
          <span className="metric-label">已过期</span>
          <strong className="metric-value">{expired.length}</strong>
          <span className="metric-unit">件</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>分类分布</h2>
          <span className="panel-sub">按在库物品计</span>
        </div>
        <div className="cat-list">
          {categoryRows.map(({ category, count }) => {
            const meta = CATEGORY_META[category]
            return (
              <div className="cat-row" key={category}>
                <span className="cat-name">
                  <span className="cat-emoji" style={{ background: meta.bg }}>
                    {meta.emoji}
                  </span>
                  {meta.label}
                </span>
                <span className="cat-bar">
                  <span
                    className="cat-bar-fill"
                    style={{
                      width: `${count === 0 ? 0 : Math.max(8, (count / maxCategory) * 100)}%`,
                      background: meta.color,
                    }}
                  />
                </span>
                <span className="cat-count">{count}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>未来 7 天到期</h2>
          <span className="panel-sub">{upcoming.length} 个批次</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="panel-empty">未来 7 天没有到期批次。</p>
        ) : (
          <div className="upcoming-list">
            {upcoming.map(({ item, batch, days }) => (
              <button
                type="button"
                className="upcoming-row"
                key={batch.id}
                onClick={() => onOpenItem(item.id)}
              >
                <span className="upcoming-name">
                  {CATEGORY_META[item.category].emoji} {item.name}
                </span>
                <span className="upcoming-qty">
                  {formatQty(batch.quantity)} {item.unit}
                </span>
                <span className="badge badge-soon">
                  {days === 0 ? '今天到期' : `${days} 天后`}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>批次状态</h2>
          <span className="panel-sub">共 {batches.length} 个未用完批次</span>
        </div>
        <div className="batch-stat-row">
          <div className="batch-stat">
            <span className="batch-stat-value">{sealed}</span>
            <span className="batch-stat-label">未拆封</span>
          </div>
          <div className="batch-stat">
            <span className="batch-stat-value">{open}</span>
            <span className="batch-stat-label">使用中</span>
          </div>
          <div className="batch-stat muted">
            <span className="batch-stat-value">{discardedBatches}</span>
            <span className="batch-stat-label">已弃用</span>
          </div>
          <div className="batch-stat muted">
            <span className="batch-stat-value">{finishedBatches}</span>
            <span className="batch-stat-label">已用完批次</span>
          </div>
        </div>
      </section>

      {urgent.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>最需要处理</h2>
            <span className="panel-sub">先处理它们</span>
          </div>
          <div className="urgent-list">
            {urgent.map(({ item, summary }) => (
              <button
                type="button"
                className="urgent-row"
                key={item.id}
                onClick={() => onOpenItem(item.id)}
              >
                <span className="urgent-name">
                  {CATEGORY_META[item.category].emoji} {item.name}
                </span>
                <span className={`urgent-days exp-${summary.state}`}>{summary.nearestLabel}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="tip-card">
        <span className="tip-emoji">💡</span>
        <p>
          消耗时优先选择到期更近的批次，也就是“先进先出”。出库时系统会自动把最早到期的批次排在前面。
        </p>
      </div>
    </div>
  )
}
