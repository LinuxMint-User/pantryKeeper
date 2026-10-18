import { AlertTriangle, Boxes, Clock, Moon, Plus, Search, Settings, Sun, X } from 'lucide-react'
import type { InventoryData } from '../types'
import type { Filter } from '../lib/nav'
import { CATEGORY_META } from '../lib/categories'
import {
  greeting,
  sortWithinGroup,
  summarizeItem,
  todayLabel,
  type SortableSummary,
} from '../lib/expiry'
import { ItemCard } from './ItemCard'

interface HomeTabProps {
  data: InventoryData
  query: string
  onQueryChange: (value: string) => void
  filter: Filter
  onFilterChange: (filter: Filter) => void
  onOpenItem: (id: string) => void
  onAdd: () => void
  onOpenSettings: () => void
  isDark: boolean
  onToggleTheme: () => void
}

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'soon', label: '临期' },
  { key: 'expired', label: '已过期' },
  { key: 'fresh', label: '正常' },
  { key: 'none', label: '无保质期' },
  { key: 'finished', label: '已用完' },
  { key: 'discarded', label: '已弃用' },
]

const GROUP_TITLES: Record<Exclude<Filter, 'all'>, string> = {
  expired: '已过期',
  soon: '即将到期',
  fresh: '保存良好',
  none: '无保质期',
  finished: '已用完',
  discarded: '已弃用',
}

export function HomeTab({
  data,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onOpenItem,
  onAdd,
  onOpenSettings,
  isDark,
  onToggleTheme,
}: HomeTabProps) {
  const warnDays = data.settings.warnDays
  const all = data.items.map((item) => ({ item, summary: summarizeItem(item, warnDays) }))
  const activeItems = all.filter(
    (entry) => entry.summary.state !== 'finished' && entry.summary.state !== 'discarded',
  )
  const expiredCount = all.filter((entry) => entry.summary.state === 'expired').length
  const soonCount = all.filter((entry) => entry.summary.state === 'soon').length

  const keyword = query.trim().toLowerCase()
  const matched = all.filter(({ item }) => {
    if (!keyword) return true
    return (
      item.name.toLowerCase().includes(keyword) ||
      CATEGORY_META[item.category].label.includes(keyword) ||
      (item.note ?? '').toLowerCase().includes(keyword)
    )
  })

  const groupKeys: Exclude<Filter, 'all'>[] =
    filter === 'all'
      ? ['expired', 'soon', 'fresh', 'none', 'discarded']
      : [filter]

  const groups = groupKeys.map((key) => {
    const entries = matched
      .filter((entry) => entry.summary.state === key)
      .sort((a: SortableSummary, b: SortableSummary) =>
        key === 'finished' || key === 'discarded'
          ? b.item.updatedAt.localeCompare(a.item.updatedAt)
          : sortWithinGroup(a, b),
      )
    return { key, entries }
  })

  const visibleCount = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const totalCount = all.length

  return (
    <div className="tab-page">
      <header className="page-head home-head">
        <div>
          <p className="eyebrow">
            {greeting()} · {todayLabel()}
          </p>
          <h1>囤货管家</h1>
          <p className="page-subtitle">家里的东西，心里有数</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="icon-btn ghost"
            onClick={onToggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            title={isDark ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            className="icon-btn ghost"
            onClick={onOpenSettings}
            aria-label="设置"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="search-box">
        <Search size={18} />
        <input
          type="search"
          placeholder="搜索物品、分类或备注"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => onQueryChange('')} aria-label="清空搜索">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="overview-row">
        <button
          type="button"
          className="stat-card stat-danger"
          onClick={() => onFilterChange(filter === 'expired' ? 'all' : 'expired')}
        >
          <span className="stat-icon">
            <AlertTriangle size={17} />
          </span>
          <span className="stat-value">{expiredCount}</span>
          <span className="stat-label">已过期</span>
        </button>
        <button
          type="button"
          className="stat-card stat-warn"
          onClick={() => onFilterChange(filter === 'soon' ? 'all' : 'soon')}
        >
          <span className="stat-icon">
            <Clock size={17} />
          </span>
          <span className="stat-value">{soonCount}</span>
          <span className="stat-label">临期</span>
        </button>
        <button
          type="button"
          className="stat-card stat-primary"
          onClick={() => onFilterChange('all')}
        >
          <span className="stat-icon">
            <Boxes size={17} />
          </span>
          <span className="stat-value">{activeItems.length}</span>
          <span className="stat-label">在库物品</span>
        </button>
      </div>

      <div className="filter-row" role="tablist" aria-label="库存筛选">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={filter === chip.key}
            className={`chip${filter === chip.key ? ' active' : ''}`}
            onClick={() => onFilterChange(chip.key)}
          >
            {chip.label}
            {chip.key === 'expired' && expiredCount > 0 && (
              <span className="chip-count">{expiredCount}</span>
            )}
            {chip.key === 'soon' && soonCount > 0 && <span className="chip-count">{soonCount}</span>}
          </button>
        ))}
      </div>

      {visibleCount === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">
            {keyword ? '🔍' : filter === 'finished' ? '🗑️' : filter === 'discarded' ? '📦' : '🧺'}
          </span>
          <h3>
            {keyword
              ? '没找到匹配的物品'
              : filter === 'finished'
                ? '还没有用完的物品'
                : filter === 'discarded'
                  ? '还没有弃用的物品'
                  : '这里还空空的'}
          </h3>
          <p>
            {keyword
              ? '换个关键词试试，或清空搜索查看全部库存。'
              : filter === 'all'
                ? '把家里的东西录进来，临期时就会提醒你。'
                : '当前筛选下没有物品。'}
          </p>
          {filter === 'all' && !keyword && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
              <Plus size={16} /> 添加第一件物品
            </button>
          )}
        </div>
      ) : (
        <>
          {groups.map((group) =>
            group.entries.length === 0 ? null : (
              <section className="group" key={group.key}>
                <div className="group-head">
                  <span className="group-title">
                    <span className={`group-dot dot-${group.key}`} />
                    {group.key === 'soon'
                      ? `${warnDays} 天内到期`
                      : GROUP_TITLES[group.key]}
                    <span className="group-count">{group.entries.length}</span>
                  </span>
                  {group.key === 'expired' && <span className="group-hint">优先处理</span>}
                  {group.key === 'soon' && <span className="group-hint">尽快使用</span>}
                  {group.key === 'discarded' && <span className="group-hint">不计入在库</span>}
                </div>
                <div className="item-grid">
                  {group.entries.map(({ item, summary }) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      summary={summary}
                      onClick={() => onOpenItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </>
      )}

      <p className="list-footnote">
        共 {totalCount} 件物品 · 数据仅保存在本机
      </p>
    </div>
  )
}
