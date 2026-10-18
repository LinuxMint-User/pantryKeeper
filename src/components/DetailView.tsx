import { useEffect, useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type { Batch, BatchStatus, Item } from '../types'
import { CATEGORY_META, shelfLifeUnitLabel } from '../lib/categories'
import {
  batchExpiryInfo,
  daysUntil,
  formatDateFull,
  formatLogTime,
  relativeExpiryText,
  statusText,
  summarizeItem,
} from '../lib/expiry'
import { formatQuantity } from './ItemCard'

interface DetailViewProps {
  item: Item
  warnDays: number
  onBack: () => void
  onEditItem: () => void
  onDelete: () => void
  onStockIn: () => void
  onStockOut: (batchId?: string) => void
  onSetBatchStatus: (batchId: string, status: BatchStatus) => void
  onEditBatch: (batchId: string) => void
}

function sortBatches(batches: Batch[]): Batch[] {
  const rank = (batch: Batch) => {
    if (batch.quantity <= 0) return 2
    return batch.status === 'discarded' ? 1 : 0
  }
  return [...batches].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    if (a.expiryDate && b.expiryDate) return daysUntil(a.expiryDate) - daysUntil(b.expiryDate)
    if (a.expiryDate) return -1
    if (b.expiryDate) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function DetailView({
  item,
  warnDays,
  onBack,
  onEditItem,
  onDelete,
  onStockIn,
  onStockOut,
  onSetBatchStatus,
  onEditBatch,
}: DetailViewProps) {
  const meta = CATEGORY_META[item.category]
  const summary = summarizeItem(item, warnDays)
  const batches = useMemo(() => sortBatches(item.batches), [item.batches])
  const batchNumbers = useMemo(
    () => new Map(item.batches.map((batch, index) => [batch.id, index + 1])),
    [item.batches],
  )
  const logs = useMemo(
    () => [...item.logs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12),
    [item.logs],
  )

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="detail-overlay">
      <div className="detail-page">
        <header className="detail-topbar">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="返回">
            <ChevronLeft size={22} />
          </button>
          <span className="detail-topbar-title">物品详情</span>
          <div className="detail-topbar-actions">
            <button type="button" className="icon-btn" onClick={onEditItem} aria-label="编辑物品">
              <Pencil size={18} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={onDelete}
              aria-label="删除物品"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <div className="detail-content">
          <section className="detail-hero">
            <div className="detail-hero-top">
              <span className="detail-icon" style={{ background: meta.bg }}>
                {meta.emoji}
              </span>
              <div className="detail-titles">
                <div className="detail-name-row">
                  <h1>{item.name}</h1>
                  <span className={`badge badge-${summary.state}`}>
                    {statusText(summary.state)}
                  </span>
                </div>
                <p className="detail-sub">
                  {meta.label}
                  <span className="dot-sep">·</span>
                  {summary.batchCount} 个批次
                </p>
                {item.note && <p className="detail-note">{item.note}</p>}
              </div>
            </div>

            <div className="detail-stock">
              <span className="detail-qty">
                {formatQuantity(
                  summary.state === 'discarded' ? summary.discardedQuantity : summary.quantity,
                )}
                <em>{item.unit}</em>
              </span>
              <span className="detail-stock-label">
                {summary.state === 'discarded' ? '已弃用 · 不计入库存' : '当前库存'}
              </span>
              {summary.nearestBatch?.expiryDate && (
                <span className={`detail-nearest exp-${summary.state}`}>
                  {summary.nearestLabel} ·{' '}
                  {formatDateFull(
                    summary.nearestBatch.expiryDate,
                    summary.nearestBatch.expiryPrecision,
                  )}
                </span>
              )}
            </div>

            <div className="detail-actions">
              <button type="button" className="btn btn-secondary" onClick={onStockIn}>
                <ArrowDown size={18} /> 入库
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onStockOut()}
                disabled={summary.quantity <= 0}
              >
                <ArrowUp size={18} /> 出库
              </button>
            </div>

            <div className="detail-facts">
              <span>
                <b>{summary.activeBatchCount}</b> 未用完批次
              </span>
              <span>
                <b>{summary.sealedBatches}</b> 未拆封
              </span>
              <span>
                <b>{summary.openBatches}</b> 使用中
              </span>
              {summary.discardedBatches > 0 && (
                <span>
                  <b>{summary.discardedBatches}</b> 已弃用
                </span>
              )}
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section-head">
              <h2>批次明细</h2>
              <span>不同生产日期分别记录</span>
            </div>
            <div className="batch-list">
              {batches.map((batch, index) => {
                const info = batchExpiryInfo(batch, warnDays)
                const finished = batch.quantity <= 0
                const discarded = batch.status === 'discarded'
                const usable = !finished && !discarded
                const usableBatches = batches.filter(
                  (b) => b.quantity > 0 && b.status !== 'discarded',
                )
                const isBest =
                  usable && usableBatches.findIndex((b) => b.id === batch.id) === 0
                const statusLabel = finished
                  ? '已用完'
                  : discarded
                    ? '已弃用'
                    : batch.status === 'open'
                      ? '使用中'
                      : '未拆封'
                const badgeClass = finished
                  ? 'badge-finished'
                  : discarded
                    ? 'badge-discarded'
                    : batch.status === 'open'
                      ? 'badge-open'
                      : 'badge-sealed'
                return (
                  <div
                    className={`batch-card${finished ? ' finished' : ''}${discarded ? ' discarded' : ''}`}
                    key={batch.id}
                  >
                    <div className="batch-head">
                      <span className="batch-title">
                        批次 {batchNumbers.get(batch.id) ?? index + 1}
                        {isBest && <span className="batch-best">建议先用</span>}
                      </span>
                      <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                    </div>

                    <div className="batch-main">
                      <div className="batch-qty">
                        {formatQuantity(batch.quantity)}
                        <em>{item.unit}</em>
                        <span className="batch-initial">
                          初始 {formatQuantity(batch.initialQuantity)}
                        </span>
                      </div>
                      {usable && (
                        <span className={`batch-expiry exp-${info.state}`}>{info.label}</span>
                      )}
                    </div>

                    {info.ratio !== null && usable && (
                      <div className="progress batch-progress" aria-hidden="true">
                        <span
                          className={`progress-fill fill-${info.state}`}
                          style={{ width: `${Math.max(2, info.ratio * 100)}%` }}
                        />
                      </div>
                    )}

                    <div className="batch-meta">
                      {batch.expiryMode === 'computed' && (
                        <>
                          <span>生产 {formatDateFull(batch.productionDate)}</span>
                          <span>
                            保质期 {batch.shelfLifeValue}
                            {shelfLifeUnitLabel(batch.shelfLifeUnit)}
                          </span>
                        </>
                      )}
                      {batch.expiryMode === 'explicit' && <span>直接登记过期日</span>}
                      {batch.expiryMode === 'none' && <span>无保质期</span>}
                      {batch.expiryDate ? (
                        <span className="batch-meta-expiry">
                          到期 {formatDateFull(batch.expiryDate, batch.expiryPrecision)}
                          {usable && info.daysLeft !== undefined
                            ? `（${batch.expiryPrecision === 'month' ? '按月底，' : ''}${relativeExpiryText(info.daysLeft)}）`
                            : batch.expiryPrecision === 'month'
                              ? '（按月底）'
                              : ''}
                        </span>
                      ) : (
                        <span>不设到期日</span>
                      )}
                    </div>

                    {batch.note && <p className="batch-note">{batch.note}</p>}

                    <div className="batch-actions">
                      {usable && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            onSetBatchStatus(batch.id, batch.status === 'open' ? 'sealed' : 'open')
                          }
                        >
                          {batch.status === 'open' ? '标为未拆封' : '标为使用中'}
                        </button>
                      )}
                      {!finished && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            onSetBatchStatus(batch.id, discarded ? 'sealed' : 'discarded')
                          }
                        >
                          {discarded ? '取消弃用' : '标为弃用'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={finished}
                        onClick={() => onStockOut(batch.id)}
                      >
                        出库
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => onEditBatch(batch.id)}
                      >
                        <Pencil size={13} /> 编辑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="detail-section">
            <div className="detail-section-head">
              <h2>出入库记录</h2>
              <span>最近 {logs.length} 条</span>
            </div>
            {logs.length === 0 ? (
              <p className="panel-empty">还没有出入库记录。</p>
            ) : (
              <div className="log-list">
                {logs.map((log) => {
                  const sign = log.type === 'out' ? '-' : '+'
                  const text =
                    log.type === 'create'
                      ? '新建入库'
                      : log.type === 'in'
                        ? '入库'
                        : log.type === 'out'
                          ? '出库'
                          : '库存调整'
                  return (
                    <div className="log-row" key={log.id}>
                      <span className={`log-icon log-${log.type}`}>
                        {log.type === 'out' ? (
                          <ArrowUp size={15} />
                        ) : log.type === 'adjust' ? (
                          <RefreshCw size={15} />
                        ) : (
                          <ArrowDown size={15} />
                        )}
                      </span>
                      <div className="log-main">
                        <span className="log-title">
                          {text}
                          <b className={log.type === 'out' ? 'log-out' : 'log-in'}>
                            {sign}
                            {formatQuantity(log.quantity)} {item.unit}
                          </b>
                        </span>
                        {log.note && <p>{log.note}</p>}
                      </div>
                      <time>{formatLogTime(log.at)}</time>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <button type="button" className="danger-link" onClick={onDelete}>
            <Trash2 size={16} /> 删除这件物品
          </button>
        </div>
      </div>
    </div>
  )
}
