import { AlarmClock, CheckCircle2 } from 'lucide-react'
import type { InventoryData } from '../types'
import { sortWithinGroup, summarizeItem } from '../lib/expiry'
import { ItemCard } from './ItemCard'

interface ExpiringTabProps {
  data: InventoryData
  onOpenItem: (id: string) => void
  onAdd: () => void
}

export function ExpiringTab({ data, onOpenItem, onAdd }: ExpiringTabProps) {
  const warnDays = data.settings.warnDays
  const entries = data.items
    .map((item) => ({ item, summary: summarizeItem(item, warnDays) }))
    .filter((entry) => entry.summary.state === 'expired' || entry.summary.state === 'soon')

  const expired = entries
    .filter((entry) => entry.summary.state === 'expired')
    .sort(sortWithinGroup)
  const soon = entries
    .filter((entry) => entry.summary.state === 'soon')
    .sort(sortWithinGroup)

  return (
    <div className="tab-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">先入先出，别让好东西放过期</p>
          <h1>临期提醒</h1>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="empty-state tall">
          <span className="empty-emoji">🎉</span>
          <h3>暂时没有临期物品</h3>
          <p>所有带保质期的物品都在安全期内，继续保持。</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
            继续添加物品
          </button>
        </div>
      ) : (
        <>
          <div className="alert-banner">
            <span className="alert-banner-icon">
              <AlarmClock size={22} />
            </span>
            <div>
              <strong>{entries.length} 件物品需要关注</strong>
              <p>
                已过期 {expired.length} 件
                <span className="dot-sep">·</span>
                {warnDays} 天内到期 {soon.length} 件
              </p>
            </div>
          </div>

          {expired.length > 0 && (
            <section className="group">
              <div className="group-head">
                <span className="group-title">
                  <span className="group-dot dot-expired" />
                  已过期
                  <span className="group-count">{expired.length}</span>
                </span>
                <span className="group-hint">建议丢弃或另作处理</span>
              </div>
              <div className="item-grid">
                {expired.map(({ item, summary }) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    summary={summary}
                    onClick={() => onOpenItem(item.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {soon.length > 0 && (
            <section className="group">
              <div className="group-head">
                <span className="group-title">
                  <span className="group-dot dot-soon" />
                  {warnDays} 天内到期
                  <span className="group-count">{soon.length}</span>
                </span>
                <span className="group-hint">优先消耗</span>
              </div>
              <div className="item-grid">
                {soon.map(({ item, summary }) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    summary={summary}
                    onClick={() => onOpenItem(item.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="safe-note">
            <CheckCircle2 size={17} />
            <span>提醒阈值可在设置中调整，默认 {warnDays} 天。</span>
          </div>
        </>
      )}
    </div>
  )
}
