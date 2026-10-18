export type Tab = 'home' | 'expiring' | 'stats'

export type Filter = 'all' | 'expired' | 'soon' | 'fresh' | 'none' | 'finished' | 'discarded'

export const TAB_LABELS: Record<Tab, string> = {
  home: '库存',
  expiring: '临期',
  stats: '统计',
}
