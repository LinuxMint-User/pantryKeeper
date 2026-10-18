import type {
  Batch,
  BatchFormValue,
  BatchStatus,
  Category,
  ExpiryMode,
  InventoryData,
  Item,
  ItemFormValue,
  LogType,
  Settings,
  ShelfLifeUnit,
  StockLog,
  ThemeMode,
} from '../types'
import { addDaysYmd, monthEndYmd, resolveExpiryDate, todayYmd, ymOf } from './expiry'

const STORAGE_KEY = 'pantry-keeper.v1'

export const DEFAULT_SETTINGS: Settings = { warnDays: 30, theme: 'system' }

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function batchFromForm(value: BatchFormValue): Batch {
  const quantity = Math.max(0, Number(value.quantity) || 0)
  const lifeValue = Number(value.shelfLifeValue) || 0
  const rawExpiry = resolveExpiryDate(
    value.expiryMode,
    value.productionDate || undefined,
    lifeValue || undefined,
    value.shelfLifeUnit,
    value.expiryDate || undefined,
  )
  const expiryPrecision = value.expiryMode === 'explicit' ? value.expiryPrecision : 'day'
  const expiryDate =
    rawExpiry && expiryPrecision === 'month' ? monthEndYmd(ymOf(rawExpiry)) : rawExpiry
  return {
    id: uid(),
    quantity,
    initialQuantity: quantity,
    expiryMode: value.expiryMode,
    productionDate: value.expiryMode === 'computed' ? value.productionDate || undefined : undefined,
    shelfLifeValue: value.expiryMode === 'computed' ? lifeValue || undefined : undefined,
    shelfLifeUnit: value.expiryMode === 'computed' ? value.shelfLifeUnit : undefined,
    expiryDate,
    expiryPrecision: expiryPrecision === 'month' ? 'month' : undefined,
    status: value.status,
    note: value.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
}

export function applyBatchForm(batch: Batch, value: BatchFormValue): Batch {
  const lifeValue = Number(value.shelfLifeValue) || 0
  const rawExpiry = resolveExpiryDate(
    value.expiryMode,
    value.productionDate || undefined,
    lifeValue || undefined,
    value.shelfLifeUnit,
    value.expiryDate || undefined,
  )
  const expiryPrecision = value.expiryMode === 'explicit' ? value.expiryPrecision : 'day'
  const expiryDate =
    rawExpiry && expiryPrecision === 'month' ? monthEndYmd(ymOf(rawExpiry)) : rawExpiry
  return {
    ...batch,
    expiryMode: value.expiryMode,
    productionDate: value.expiryMode === 'computed' ? value.productionDate || undefined : undefined,
    shelfLifeValue: value.expiryMode === 'computed' ? lifeValue || undefined : undefined,
    shelfLifeUnit: value.expiryMode === 'computed' ? value.shelfLifeUnit : undefined,
    expiryDate,
    expiryPrecision: expiryPrecision === 'month' ? 'month' : undefined,
    status: value.status,
    note: value.note?.trim() || undefined,
  }
}

export function validateBatchForm(value: BatchFormValue, requireQuantity = true): string | null {
  if (requireQuantity && (!value.quantity || Number(value.quantity) <= 0)) return '请填写大于 0 的数量'
  if (value.expiryMode === 'computed') {
    if (!value.productionDate) return '请选择生产日期'
    if (!value.shelfLifeValue || Number(value.shelfLifeValue) <= 0) return '请填写保质期时长'
  }
  if (value.expiryMode === 'explicit' && !value.expiryDate) return '请选择过期日期'
  return null
}

export function itemFromForm(value: ItemFormValue): Item {
  const now = new Date().toISOString()
  const batch = batchFromForm(value)
  return {
    id: uid(),
    name: value.name.trim(),
    category: value.category,
    unit: value.unit.trim() || '个',
    note: value.itemNote?.trim() || undefined,
    batches: [batch],
    logs: [
      {
        id: uid(),
        type: 'create',
        batchId: batch.id,
        quantity: batch.quantity,
        at: now,
        note: '新建物品',
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

export function loadData(): InventoryData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as InventoryData
    if (!parsed || !Array.isArray(parsed.items)) return seedData()
    return {
      items: parsed.items,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    return seedData()
  }
}

export function saveData(data: InventoryData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 本地存储不可用时静默忽略，MVP 仍可正常浏览
  }
}

const CATEGORY_VALUES: Category[] = ['food', 'medicine', 'care', 'home', 'other']
const EXPIRY_MODES: ExpiryMode[] = ['computed', 'explicit', 'none']
const SHELF_LIFE_UNITS: ShelfLifeUnit[] = ['day', 'month', 'year']
const LOG_TYPES: LogType[] = ['create', 'in', 'out', 'adjust']
const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark']

function isYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(Date.parse(`${value}T00:00:00`))
}

function normalizeBatch(value: unknown): Batch {
  if (!value || typeof value !== 'object') {
    throw new Error('备份中的批次数据格式不正确')
  }
  const raw = value as Partial<Batch>
  const quantity = Number(raw.quantity)
  const initial = Number(raw.initialQuantity)
  const shelfLifeValue = Number(raw.shelfLifeValue)
  const expiryPrecision = raw.expiryPrecision === 'month' ? 'month' : undefined
  const rawExpiry = isYmd(raw.expiryDate) ? raw.expiryDate : undefined
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
    initialQuantity: Number.isFinite(initial) ? Math.max(0, initial) : Math.max(0, quantity || 0),
    expiryMode: EXPIRY_MODES.includes(raw.expiryMode as ExpiryMode)
      ? (raw.expiryMode as ExpiryMode)
      : 'none',
    productionDate: isYmd(raw.productionDate) ? raw.productionDate : undefined,
    shelfLifeValue:
      Number.isFinite(shelfLifeValue) && shelfLifeValue > 0 ? shelfLifeValue : undefined,
    shelfLifeUnit: SHELF_LIFE_UNITS.includes(raw.shelfLifeUnit as ShelfLifeUnit)
      ? (raw.shelfLifeUnit as ShelfLifeUnit)
      : undefined,
    expiryDate:
      rawExpiry && expiryPrecision === 'month' ? monthEndYmd(ymOf(rawExpiry)) : rawExpiry,
    expiryPrecision,
    status:
      raw.status === 'open' || raw.status === 'discarded' ? raw.status : 'sealed',
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

function normalizeLog(value: unknown): StockLog | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<StockLog>
  const quantity = Number(raw.quantity)
  if (!Number.isFinite(quantity)) return null
  const at = typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at)) ? raw.at : null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    type: LOG_TYPES.includes(raw.type as LogType) ? (raw.type as LogType) : 'adjust',
    batchId: typeof raw.batchId === 'string' ? raw.batchId : undefined,
    quantity,
    at: at ?? new Date().toISOString(),
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
  }
}

function normalizeItem(value: unknown, index: number): Item {
  if (!value || typeof value !== 'object') {
    throw new Error(`第 ${index + 1} 条物品数据格式不正确`)
  }
  const raw = value as Partial<Item>
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`第 ${index + 1} 条物品缺少名称`)
  }
  const now = new Date().toISOString()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name: raw.name.trim(),
    category: CATEGORY_VALUES.includes(raw.category as Category)
      ? (raw.category as Category)
      : 'other',
    unit: typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : '个',
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
    batches: Array.isArray(raw.batches) ? raw.batches.map(normalizeBatch) : [],
    logs: Array.isArray(raw.logs)
      ? raw.logs
          .map(normalizeLog)
          .filter((entry): entry is StockLog => entry !== null)
      : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  }
}

export function parseBackup(raw: string): InventoryData {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { items?: unknown }).items)) {
    throw new Error('备份文件缺少物品列表')
  }
  const source = parsed as { items: unknown[]; settings?: Partial<Settings> }
  const items = source.items.map(normalizeItem)
  const settings = source.settings ?? {}
  const warnDays = Number(settings.warnDays)
  return {
    items,
    settings: {
      warnDays:
        Number.isFinite(warnDays) && warnDays > 0 ? Math.round(warnDays) : DEFAULT_SETTINGS.warnDays,
      theme: THEME_MODES.includes(settings.theme as ThemeMode)
        ? (settings.theme as ThemeMode)
        : DEFAULT_SETTINGS.theme,
    },
  }
}

export function makeLog(
  type: StockLog['type'],
  quantity: number,
  note?: string,
  batchId?: string,
): StockLog {
  return {
    id: uid(),
    type,
    quantity,
    batchId,
    at: new Date().toISOString(),
    note,
  }
}

function isoDaysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function seedLog(
  type: StockLog['type'],
  quantity: number,
  daysAgo: number,
  note?: string,
  batchId?: string,
): StockLog {
  return {
    id: uid(),
    type,
    quantity,
    batchId,
    at: isoDaysAgo(daysAgo, 8 + (daysAgo % 9), (daysAgo * 13) % 60),
    note,
  }
}

function seedBatch(options: {
  quantity: number
  initialQuantity?: number
  mode: Batch['expiryMode']
  productionDate?: string
  shelfLifeValue?: number
  shelfLifeUnit?: Batch['shelfLifeUnit']
  expiryDate?: string
  status: Batch['status']
  createdAt: string
}): Batch {
  const expiryDate = resolveExpiryDate(
    options.mode,
    options.productionDate,
    options.shelfLifeValue,
    options.shelfLifeUnit,
    options.expiryDate,
  )
  return {
    id: uid(),
    quantity: options.quantity,
    initialQuantity: options.initialQuantity ?? options.quantity,
    expiryMode: options.mode,
    productionDate: options.mode === 'computed' ? options.productionDate : undefined,
    shelfLifeValue: options.mode === 'computed' ? options.shelfLifeValue : undefined,
    shelfLifeUnit: options.mode === 'computed' ? options.shelfLifeUnit : undefined,
    expiryDate,
    status: options.status,
    createdAt: options.createdAt,
  }
}

export function seedData(): InventoryData {
  const today = todayYmd()
  const ago = (n: number) => addDaysYmd(today, -n)
  const ahead = (n: number) => addDaysYmd(today, n)
  const now = new Date().toISOString()

  const milkBatchA = seedBatch({
    quantity: 2,
    initialQuantity: 3,
    mode: 'computed',
    productionDate: ago(18),
    shelfLifeValue: 21,
    shelfLifeUnit: 'day',
    status: 'sealed',
    createdAt: isoDaysAgo(18),
  })
  const milkBatchB = seedBatch({
    quantity: 3,
    mode: 'computed',
    productionDate: ago(3),
    shelfLifeValue: 21,
    shelfLifeUnit: 'day',
    status: 'open',
    createdAt: isoDaysAgo(3),
  })

  const eggA = seedBatch({
    quantity: 8,
    mode: 'explicit',
    expiryDate: ahead(5),
    status: 'sealed',
    createdAt: isoDaysAgo(8),
  })
  const eggB = seedBatch({
    quantity: 6,
    mode: 'explicit',
    expiryDate: ahead(16),
    status: 'sealed',
    createdAt: isoDaysAgo(2),
  })

  const ibuprofen = seedBatch({
    quantity: 1,
    mode: 'computed',
    productionDate: '2024-09-01',
    shelfLifeValue: 24,
    shelfLifeUnit: 'month',
    status: 'sealed',
    createdAt: isoDaysAgo(120),
  })

  const yogurt = seedBatch({
    quantity: 1,
    mode: 'computed',
    productionDate: ago(20),
    shelfLifeValue: 14,
    shelfLifeUnit: 'day',
    status: 'sealed',
    createdAt: isoDaysAgo(20),
  })

  const rice = seedBatch({
    quantity: 5,
    mode: 'none',
    status: 'open',
    createdAt: isoDaysAgo(30),
  })

  const mask = seedBatch({
    quantity: 10,
    mode: 'explicit',
    expiryDate: ahead(120),
    status: 'sealed',
    createdAt: isoDaysAgo(15),
  })

  const soySauce = seedBatch({
    quantity: 1,
    mode: 'computed',
    productionDate: ago(200),
    shelfLifeValue: 18,
    shelfLifeUnit: 'month',
    status: 'open',
    createdAt: isoDaysAgo(200),
  })

  const tissue = seedBatch({
    quantity: 12,
    mode: 'none',
    status: 'sealed',
    createdAt: isoDaysAgo(40),
  })

  const vitamin = seedBatch({
    quantity: 1,
    mode: 'explicit',
    expiryDate: ahead(25),
    status: 'sealed',
    createdAt: isoDaysAgo(60),
  })

  const shampoo = seedBatch({
    quantity: 0,
    initialQuantity: 1,
    mode: 'none',
    status: 'open',
    createdAt: isoDaysAgo(90),
  })

  const items: Item[] = [
    {
      id: uid(),
      name: '全脂牛奶',
      category: 'food',
      unit: '瓶',
      note: '冷藏保存，开封后尽快喝完',
      batches: [milkBatchA, milkBatchB],
      logs: [
        seedLog('out', 1, 2, '早餐用掉一瓶', milkBatchA.id),
        seedLog('in', 3, 3, '新买一批', milkBatchB.id),
        seedLog('in', 3, 18, '首次入库', milkBatchA.id),
      ],
      createdAt: isoDaysAgo(18),
      updatedAt: isoDaysAgo(2),
    },
    {
      id: uid(),
      name: '鸡蛋',
      category: 'food',
      unit: '个',
      batches: [eggA, eggB],
      logs: [seedLog('in', 6, 2, '补货', eggB.id), seedLog('in', 8, 8, '菜市场采购', eggA.id)],
      createdAt: isoDaysAgo(8),
      updatedAt: isoDaysAgo(2),
    },
    {
      id: uid(),
      name: '布洛芬缓释胶囊',
      category: 'medicine',
      unit: '盒',
      note: '家庭药箱',
      batches: [ibuprofen],
      logs: [seedLog('in', 1, 120, '药箱整理', ibuprofen.id)],
      createdAt: isoDaysAgo(120),
      updatedAt: isoDaysAgo(120),
    },
    {
      id: uid(),
      name: '原味酸奶',
      category: 'food',
      unit: '杯',
      batches: [yogurt],
      logs: [seedLog('in', 1, 20, '随手买的，别忘了喝', yogurt.id)],
      createdAt: isoDaysAgo(20),
      updatedAt: isoDaysAgo(20),
    },
    {
      id: uid(),
      name: '五常大米',
      category: 'food',
      unit: 'kg',
      note: '阴凉干燥处保存',
      batches: [rice],
      logs: [seedLog('in', 5, 30, '囤了一袋', rice.id)],
      createdAt: isoDaysAgo(30),
      updatedAt: isoDaysAgo(30),
    },
    {
      id: uid(),
      name: '保湿修护面膜',
      category: 'care',
      unit: '片',
      batches: [mask],
      logs: [seedLog('in', 10, 15, '双十一囤货', mask.id)],
      createdAt: isoDaysAgo(15),
      updatedAt: isoDaysAgo(15),
    },
    {
      id: uid(),
      name: '生抽酱油',
      category: 'food',
      unit: '瓶',
      note: '开封后使用中',
      batches: [soySauce],
      logs: [seedLog('in', 1, 200, '', soySauce.id)],
      createdAt: isoDaysAgo(200),
      updatedAt: isoDaysAgo(200),
    },
    {
      id: uid(),
      name: '原木抽纸',
      category: 'home',
      unit: '包',
      batches: [tissue],
      logs: [seedLog('in', 12, 40, '整箱购入', tissue.id)],
      createdAt: isoDaysAgo(40),
      updatedAt: isoDaysAgo(40),
    },
    {
      id: uid(),
      name: '维生素C泡腾片',
      category: 'medicine',
      unit: '瓶',
      batches: [vitamin],
      logs: [seedLog('in', 1, 60, '', vitamin.id)],
      createdAt: isoDaysAgo(60),
      updatedAt: isoDaysAgo(60),
    },
    {
      id: uid(),
      name: '洗发水',
      category: 'care',
      unit: '瓶',
      batches: [shampoo],
      logs: [seedLog('out', 1, 3, '用完了', shampoo.id), seedLog('in', 1, 90, '', shampoo.id)],
      createdAt: isoDaysAgo(90),
      updatedAt: isoDaysAgo(3),
    },
  ]

  return { items, settings: { ...DEFAULT_SETTINGS } }
}
