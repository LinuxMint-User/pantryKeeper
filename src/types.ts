export type Category = 'food' | 'medicine' | 'care' | 'home' | 'other'

export type ExpiryMode = 'computed' | 'explicit' | 'none'

export type ShelfLifeUnit = 'day' | 'month' | 'year'

export type BatchStatus = 'sealed' | 'open' | 'discarded'

export type ExpiryPrecision = 'day' | 'month'

export type LogType = 'create' | 'in' | 'out' | 'adjust'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface Batch {
  id: string
  quantity: number
  initialQuantity: number
  expiryMode: ExpiryMode
  productionDate?: string
  shelfLifeValue?: number
  shelfLifeUnit?: ShelfLifeUnit
  expiryDate?: string
  /** 过期日期的精度：仅年月时 expiryDate 存当月最后一天 */
  expiryPrecision?: ExpiryPrecision
  status: BatchStatus
  note?: string
  createdAt: string
}

export interface StockLog {
  id: string
  type: LogType
  batchId?: string
  quantity: number
  at: string
  note?: string
}

export interface Item {
  id: string
  name: string
  category: Category
  unit: string
  note?: string
  batches: Batch[]
  logs: StockLog[]
  createdAt: string
  updatedAt: string
}

export interface Settings {
  warnDays: number
  theme: ThemeMode
}

export interface InventoryData {
  items: Item[]
  settings: Settings
}

export type ExpiryState = 'expired' | 'soon' | 'fresh' | 'none' | 'finished' | 'discarded'

export interface BatchFormValue {
  quantity: number
  expiryMode: ExpiryMode
  productionDate: string
  shelfLifeValue: string
  shelfLifeUnit: ShelfLifeUnit
  expiryDate: string
  expiryPrecision: ExpiryPrecision
  status: BatchStatus
  note?: string
}

export interface ItemFormValue extends BatchFormValue {
  name: string
  category: Category
  unit: string
  itemNote?: string
}
