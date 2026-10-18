import type {
  Batch,
  ExpiryMode,
  ExpiryPrecision,
  ExpiryState,
  Item,
  ShelfLifeUnit,
} from '../types'

export const MS_DAY = 86_400_000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayYmd(): string {
  return toYmd(new Date())
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + days)
  return toYmd(d)
}

/** 取某年月的最后一天，例如 2026-10 → 2026-10-31 */
export function monthEndYmd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ''
  return toYmd(new Date(y, m, 0))
}

/** 从完整日期中取出年月，例如 2026-10-31 → 2026-10 */
export function ymOf(ymd: string): string {
  return ymd.slice(0, 7)
}

/** 生产日期 + 保质期 → 过期日期（月份按自然月并做月末收敛） */
export function addShelfLife(
  productionYmd: string,
  value: number,
  unit: ShelfLifeUnit,
): string {
  const base = parseYmd(productionYmd)
  if (unit === 'day') {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    d.setDate(d.getDate() + Math.round(value))
    return toYmd(d)
  }
  const months = unit === 'year' ? Math.round(value * 12) : Math.round(value)
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(base.getDate(), lastDay))
  return toYmd(target)
}

export function resolveExpiryDate(
  mode: ExpiryMode,
  productionDate?: string,
  shelfLifeValue?: number,
  shelfLifeUnit?: ShelfLifeUnit,
  explicitDate?: string,
): string | undefined {
  if (mode === 'computed' && productionDate && shelfLifeValue && shelfLifeValue > 0) {
    return addShelfLife(productionDate, shelfLifeValue, shelfLifeUnit ?? 'day')
  }
  if (mode === 'explicit' && explicitDate) return explicitDate
  return undefined
}

/** 距离过期还有几天（今天到期 = 0，已过期为负数） */
export function daysUntil(ymd: string, from: Date = new Date()): number {
  const target = parseYmd(ymd).getTime()
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  return Math.round((target - start) / MS_DAY)
}

export function expiryStateForDays(daysLeft: number, warnDays: number): ExpiryState {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= warnDays) return 'soon'
  return 'fresh'
}

export function statusText(state: ExpiryState): string {
  switch (state) {
    case 'expired':
      return '已过期'
    case 'soon':
      return '临期'
    case 'fresh':
      return '正常'
    case 'none':
      return '无保质期'
    case 'finished':
      return '已用完'
    case 'discarded':
      return '已弃用'
  }
}

export function relativeExpiryText(daysLeft: number): string {
  if (daysLeft < 0) return `已过期 ${Math.abs(daysLeft)} 天`
  if (daysLeft === 0) return '今天到期'
  return `剩 ${daysLeft} 天`
}

export function formatDateCn(ymd?: string, precision: ExpiryPrecision = 'day'): string {
  if (!ymd) return '—'
  const d = parseYmd(ymd)
  const now = new Date()
  if (precision === 'month') {
    if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}年${d.getMonth() + 1}月`
    return `${d.getMonth() + 1}月`
  }
  if (d.getFullYear() !== now.getFullYear()) {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function formatDateFull(ymd?: string, precision: ExpiryPrecision = 'day'): string {
  if (!ymd) return '—'
  if (precision === 'month') {
    const d = parseYmd(ymd)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  return ymd
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function todayLabel(): string {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${WEEK[d.getDay()]}`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function shelfProgress(batch: Batch): number | null {
  if (!batch.productionDate || !batch.expiryDate) return null
  const start = parseYmd(batch.productionDate).getTime()
  const end = parseYmd(batch.expiryDate).getTime()
  if (end <= start) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.min(1, Math.max(0, (end - today) / (end - start)))
}

export interface BatchExpiryInfo {
  state: ExpiryState
  daysLeft?: number
  label: string
  ratio: number | null
}

export function batchExpiryInfo(batch: Batch, warnDays: number): BatchExpiryInfo {
  if (batch.status === 'discarded') {
    return { state: 'discarded', label: '已弃用', ratio: null }
  }
  if (!batch.expiryDate) {
    return { state: 'none', label: '无保质期', ratio: null }
  }
  const daysLeft = daysUntil(batch.expiryDate)
  const state = expiryStateForDays(daysLeft, warnDays)
  return {
    state,
    daysLeft,
    label: relativeExpiryText(daysLeft),
    ratio: shelfProgress(batch),
  }
}

export interface ItemSummary {
  quantity: number
  batchCount: number
  activeBatchCount: number
  state: ExpiryState
  nearestBatch?: Batch
  nearestDays?: number
  nearestLabel: string
  hasOpen: boolean
  sealedBatches: number
  openBatches: number
  finishedBatches: number
  discardedBatches: number
  discardedQuantity: number
  progress: number | null
}

export function summarizeItem(item: Item, warnDays: number): ItemSummary {
  const batches = item.batches
  const active = batches.filter((b) => b.quantity > 0 && b.status !== 'discarded')
  const discarded = batches.filter((b) => b.quantity > 0 && b.status === 'discarded')
  const quantity = active.reduce((sum, b) => sum + b.quantity, 0)
  const discardedQuantity = discarded.reduce((sum, b) => sum + b.quantity, 0)
  const finishedBatches = batches.filter((b) => b.quantity <= 0).length
  const sealedBatches = active.filter((b) => b.status === 'sealed').length
  const openBatches = active.filter((b) => b.status === 'open').length
  const hasOpen = openBatches > 0

  const base = {
    quantity,
    batchCount: batches.length,
    activeBatchCount: active.length,
    hasOpen,
    sealedBatches,
    openBatches,
    finishedBatches,
    discardedBatches: discarded.length,
    discardedQuantity,
    nearestLabel: '无保质期',
    progress: null,
  }

  if (active.length === 0) {
    if (discarded.length > 0) {
      return { ...base, state: 'discarded', nearestLabel: '已弃用' }
    }
    return { ...base, state: 'finished', nearestLabel: '已用完' }
  }

  const withExpiry = active
    .filter((b) => b.expiryDate)
    .map((b) => ({ batch: b, daysLeft: daysUntil(b.expiryDate as string) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  if (withExpiry.length === 0) {
    return { ...base, state: 'none', nearestLabel: '无保质期' }
  }

  const nearest = withExpiry[0]
  const anyExpired = withExpiry.some((x) => x.daysLeft < 0)
  const anySoon = withExpiry.some((x) => x.daysLeft <= warnDays)
  const state: ExpiryState = anyExpired ? 'expired' : anySoon ? 'soon' : 'fresh'
  const progress = nearest.batch.expiryMode === 'computed' ? shelfProgress(nearest.batch) : null

  return {
    ...base,
    state,
    nearestBatch: nearest.batch,
    nearestDays: nearest.daysLeft,
    nearestLabel: relativeExpiryText(nearest.daysLeft),
    progress,
  }
}

export type SortableSummary = { item: Item; summary: ItemSummary }

export function sortWithinGroup(a: SortableSummary, b: SortableSummary): number {
  const ae = a.summary.nearestDays
  const be = b.summary.nearestDays
  if (ae !== undefined && be !== undefined) return ae - be
  if (ae !== undefined) return -1
  if (be !== undefined) return 1
  return a.item.name.localeCompare(b.item.name, 'zh-CN')
}
