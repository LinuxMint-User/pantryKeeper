import type { Category, ShelfLifeUnit } from '../types'

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: string; bg: string }
> = {
  food: { label: '食品', emoji: '🥛', color: '#B45309', bg: '#FEF3E2' },
  medicine: { label: '药品', emoji: '💊', color: '#1D4ED8', bg: '#EAF1FF' },
  care: { label: '日化', emoji: '🧴', color: '#9D3B8E', bg: '#FBEBF7' },
  home: { label: '家居', emoji: '🧻', color: '#4B5563', bg: '#EFF2F4' },
  other: { label: '其他', emoji: '📦', color: '#0F766E', bg: '#E7F4F0' },
}

export const CATEGORY_ORDER: Category[] = ['food', 'medicine', 'care', 'home', 'other']

export const UNIT_OPTIONS = ['个', '瓶', '盒', '包', '袋', '罐', '条', '片', '杯', 'kg', 'L']

export const SHELF_LIFE_UNIT_LABEL: Record<ShelfLifeUnit, string> = {
  day: '天',
  month: '个月',
  year: '年',
}

export function shelfLifeUnitLabel(unit?: ShelfLifeUnit): string {
  return unit ? SHELF_LIFE_UNIT_LABEL[unit] : ''
}
