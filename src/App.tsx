import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import {
  AlarmClock,
  Boxes,
  Check,
  Plus,
  Settings,
  TrendingUp,
} from 'lucide-react'
import type {
  Batch,
  BatchFormValue,
  BatchStatus,
  InventoryData,
  ItemFormValue,
  Settings as SettingsType,
} from './types'
import {
  batchFromForm,
  itemFromForm,
  loadData,
  makeLog,
  saveData,
  seedData,
} from './lib/store'
import { summarizeItem } from './lib/expiry'
import type { Filter, Tab } from './lib/nav'
import { HomeTab } from './components/HomeTab'
import { ExpiringTab } from './components/ExpiringTab'
import { StatsTab } from './components/StatsTab'
import { DetailView } from './components/DetailView'
import { AddItemSheet } from './components/AddItemSheet'
import { StockInSheet } from './components/StockInSheet'
import { StockOutSheet } from './components/StockOutSheet'
import { EditItemSheet } from './components/EditItemSheet'
import { EditBatchSheet } from './components/EditBatchSheet'
import { SettingsSheet } from './components/SettingsSheet'

type Modal =
  | { type: 'add'; continuous?: boolean }
  | { type: 'settings' }
  | { type: 'stockIn'; itemId: string }
  | { type: 'stockOut'; itemId: string; batchId?: string }
  | { type: 'editItem'; itemId: string }
  | { type: 'editBatch'; itemId: string; batchId: string }
  | null

const TABS: { key: Tab; label: string; icon: typeof Boxes }[] = [
  { key: 'home', label: '库存', icon: Boxes },
  { key: 'expiring', label: '临期', icon: AlarmClock },
  { key: 'stats', label: '统计', icon: TrendingUp },
]

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000
}

export default function App() {
  const [data, setData] = useState<InventoryData>(() => loadData())
  const [tab, setTab] = useState<Tab>('home')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const toastTimer = useRef<number | undefined>(undefined)
  const longPressTimer = useRef<number | undefined>(undefined)
  const longPressTriggered = useRef(false)
  const longPressStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const themeMode = data.settings.theme ?? 'system'
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = isDark ? 'dark' : 'light'
    root.style.colorScheme = isDark ? 'dark' : 'light'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', isDark ? '#0f1513' : '#0e7c66')
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({
        style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      }).catch(() => {
        // 系统栏样式同步失败不影响应用使用
      })
    }
  }, [isDark])

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  useEffect(() => {
    if (detailId && !data.items.some((item) => item.id === detailId)) {
      setDetailId(null)
    }
  }, [data.items, detailId])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let remove: (() => void) | undefined
    void CapacitorApp.addListener('backButton', () => {
      if (modal) {
        setModal(null)
      } else if (detailId) {
        setDetailId(null)
      } else if (tab !== 'home') {
        setTab('home')
      } else {
        void CapacitorApp.exitApp()
      }
    }).then((listener) => {
      remove = () => void listener.remove()
    })
    return () => remove?.()
  }, [modal, detailId, tab])

  const warnDays = data.settings.warnDays
  const detailItem = data.items.find((item) => item.id === detailId) ?? null
  const modalItem =
    modal && 'itemId' in modal ? data.items.find((item) => item.id === modal.itemId) : undefined
  const modalBatch =
    modal?.type === 'editBatch' && modalItem
      ? modalItem.batches.find((batch) => batch.id === modal.batchId)
      : undefined

  const alertCount = useMemo(
    () =>
      data.items.filter((item) => {
        const state = summarizeItem(item, warnDays).state
        return state === 'expired' || state === 'soon'
      }).length,
    [data.items, warnDays],
  )

  const notify = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const closeModal = () => setModal(null)

  const handleAddItem = (value: ItemFormValue, continuous = false) => {
    const item = itemFromForm(value)
    setData((current) => ({ ...current, items: [item, ...current.items] }))
    if (continuous) {
      notify('已添加，可继续录入下一件')
      return
    }
    setModal(null)
    notify('已添加到库存')
  }

  const clearLongPress = () => {
    if (longPressTimer.current !== undefined) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = undefined
    }
  }

  const startFabLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearLongPress()
    longPressTriggered.current = false
    longPressStart.current = { x: event.clientX, y: event.clientY }
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setModal({ type: 'add', continuous: true })
    }, 550)
  }

  const moveFabLongPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const distance = Math.hypot(
      event.clientX - longPressStart.current.x,
      event.clientY - longPressStart.current.y,
    )
    if (distance > 10) clearLongPress()
  }

  const clickFab = () => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    setModal({ type: 'add' })
  }

  const handleStockIn = (itemId: string, value: BatchFormValue) => {
    const batch = batchFromForm(value)
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              batches: [...item.batches, batch],
              logs: [makeLog('in', batch.quantity, value.note || '入库', batch.id), ...item.logs],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
    setModal(null)
    notify('入库成功')
  }

  const handleStockOut = (
    itemId: string,
    batchId: string,
    quantity: number,
    note?: string,
  ) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item
        const batches = item.batches.map((batch) =>
          batch.id === batchId
            ? { ...batch, quantity: Math.max(0, roundQuantity(batch.quantity - quantity)) }
            : batch,
        )
        return {
          ...item,
          batches,
          logs: [makeLog('out', quantity, note || '出库', batchId), ...item.logs],
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
    setModal(null)
    notify('出库成功')
  }

  const handleSetBatchStatus = (itemId: string, batchId: string, status: BatchStatus) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              batches: item.batches.map((batch) =>
                batch.id === batchId ? { ...batch, status } : batch,
              ),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
  }

  const handleUpdateBatch = (itemId: string, batch: Batch) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              batches: item.batches.map((entry) => (entry.id === batch.id ? batch : entry)),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
    setModal(null)
    notify('批次已更新')
  }

  const handleUpdateItem = (
    itemId: string,
    value: { name: string; category: ItemFormValue['category']; unit: string; note?: string },
  ) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: value.name,
              category: value.category,
              unit: value.unit,
              note: value.note,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
    setModal(null)
    notify('物品信息已更新')
  }

  const handleDeleteItem = (item: { id: string; name: string }) => {
    if (!window.confirm(`确定删除“${item.name}”及其全部批次和记录吗？`)) return
    setData((current) => ({
      ...current,
      items: current.items.filter((entry) => entry.id !== item.id),
    }))
    setDetailId(null)
    notify('物品已删除')
  }

  const handleSaveSettings = (settings: SettingsType) => {
    setData((current) => ({ ...current, settings }))
    setModal(null)
    notify('设置已保存')
  }

  const handleToggleTheme = () => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, theme: isDark ? 'light' : 'dark' },
    }))
    notify(isDark ? '已切换到浅色模式' : '已切换到深色模式')
  }

  const handleExport = async () => {
    const date = new Date()
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`
    const fileName = `pantry-backup-${stamp}.json`
    const content = JSON.stringify(data, null, 2)

    if (Capacitor.isNativePlatform()) {
      try {
        const file = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        })
        await Share.share({
          title: '囤货管家备份',
          dialogTitle: '保存或分享备份文件',
          files: [file.uri],
        })
        notify('备份已导出')
      } catch {
        notify('导出失败，请重试')
      }
      return
    }

    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    notify('备份已导出')
  }

  const handleImport = (backup: InventoryData) => {
    setData(backup)
    setDetailId(null)
    notify(`备份已导入，共 ${backup.items.length} 件物品`)
  }

  const handleClear = () => {
    setData((current) => ({ items: [], settings: current.settings }))
    setDetailId(null)
    notify('库存已清空')
  }

  const handleReset = () => {
    setData(seedData())
    setDetailId(null)
    notify('已恢复示例数据')
  }

  const openStockOut = (itemId: string, batchId?: string) => {
    setModal({ type: 'stockOut', itemId, batchId })
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">🧺</span>
            <div>
              <strong>囤货管家</strong>
              <span>Pantry Keeper</span>
            </div>
          </div>

          <nav className="side-nav" aria-label="主导航">
            {TABS.map((entry) => {
              const Icon = entry.icon
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`side-nav-item${tab === entry.key ? ' active' : ''}`}
                  onClick={() => setTab(entry.key)}
                >
                  <Icon size={19} />
                  {entry.label}
                  {entry.key === 'expiring' && alertCount > 0 && (
                    <span className="side-nav-badge">{alertCount}</span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="side-card">
            <span className="side-card-label">需要关注</span>
            <strong>{alertCount}</strong>
            <span className="side-card-sub">件物品临期或已过期</span>
            <button type="button" onClick={() => setTab('expiring')}>
              去处理
            </button>
          </div>

          <button
            type="button"
            className="side-settings"
            onClick={() => setModal({ type: 'settings' })}
          >
            <Settings size={18} /> 设置
          </button>
        </aside>

        <main className="app-content">
          {tab === 'home' && (
            <HomeTab
              data={data}
              query={query}
              onQueryChange={setQuery}
              filter={filter}
              onFilterChange={setFilter}
              onOpenItem={setDetailId}
              onAdd={() => setModal({ type: 'add' })}
              onOpenSettings={() => setModal({ type: 'settings' })}
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
            />
          )}
          {tab === 'expiring' && (
            <ExpiringTab
              data={data}
              onOpenItem={setDetailId}
              onAdd={() => setModal({ type: 'add' })}
            />
          )}
          {tab === 'stats' && <StatsTab data={data} onOpenItem={setDetailId} />}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="主导航">
        {TABS.map((entry) => {
          const Icon = entry.icon
          return (
            <button
              key={entry.key}
              type="button"
              className={`bottom-nav-item${tab === entry.key ? ' active' : ''}`}
              onClick={() => setTab(entry.key)}
            >
              <span className="bottom-nav-icon">
                <Icon size={21} />
                {entry.key === 'expiring' && alertCount > 0 && (
                  <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </span>
              {entry.label}
            </button>
          )
        })}
      </nav>

      <button
        type="button"
        className="fab"
        onClick={clickFab}
        onPointerDown={startFabLongPress}
        onPointerMove={moveFabLongPress}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="添加物品（长按连续添加）"
        title="点击添加物品，长按连续添加"
      >
        <Plus size={20} />
        <span>添加物品</span>
      </button>

      {detailItem && (
        <DetailView
          item={detailItem}
          warnDays={warnDays}
          onBack={() => setDetailId(null)}
          onEditItem={() => setModal({ type: 'editItem', itemId: detailItem.id })}
          onDelete={() => handleDeleteItem(detailItem)}
          onStockIn={() => setModal({ type: 'stockIn', itemId: detailItem.id })}
          onStockOut={(batchId) => openStockOut(detailItem.id, batchId)}
          onSetBatchStatus={(batchId, status) =>
            handleSetBatchStatus(detailItem.id, batchId, status)
          }
          onEditBatch={(batchId) =>
            setModal({ type: 'editBatch', itemId: detailItem.id, batchId })
          }
        />
      )}

      {modal?.type === 'add' && (
        <AddItemSheet
          warnDays={warnDays}
          continuous={modal.continuous}
          onClose={closeModal}
          onSubmit={(value) => handleAddItem(value, modal.continuous)}
        />
      )}

      {modal?.type === 'settings' && (
        <SettingsSheet
          settings={data.settings}
          onClose={closeModal}
          onSave={handleSaveSettings}
          onExport={handleExport}
          onImport={handleImport}
          onClear={handleClear}
          onReset={handleReset}
        />
      )}

      {modal?.type === 'stockIn' && modalItem && (
        <StockInSheet
          item={modalItem}
          warnDays={warnDays}
          onClose={closeModal}
          onSubmit={(batch) => handleStockIn(modalItem.id, batch)}
        />
      )}

      {modal?.type === 'stockOut' && modalItem && (
        <StockOutSheet
          item={modalItem}
          initialBatchId={modal.batchId}
          warnDays={warnDays}
          onClose={closeModal}
          onSubmit={(batchId, quantity, note) =>
            handleStockOut(modalItem.id, batchId, quantity, note)
          }
        />
      )}

      {modal?.type === 'editItem' && modalItem && (
        <EditItemSheet
          item={modalItem}
          onClose={closeModal}
          onSubmit={(value) => handleUpdateItem(modalItem.id, value)}
        />
      )}

      {modal?.type === 'editBatch' && modalItem && modalBatch && (
        <EditBatchSheet
          item={modalItem}
          batch={modalBatch}
          warnDays={warnDays}
          onClose={closeModal}
          onSubmit={(batch) => handleUpdateBatch(modalItem.id, batch)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  )
}
