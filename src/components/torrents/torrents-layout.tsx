import { Outlet } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { ResizablePanel } from '@/components/resizable-panel'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useIsDesktop, useIsSplit } from '@/hooks/use-media-query'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { clearSelection, openDialog, selectModeAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ConnectionBanner } from './connection-state'
import { DesktopToolbar } from './desktop-toolbar'
import { ListHeader } from './list-header'
import { openSearch } from './search-field'
import { SelectionBar } from './selection-bar'
import { SelectionSummary } from './selection-summary'
import { Sidebar } from './sidebar'
import { StatusPanel } from './status-panel'
import { TorrentListView } from './torrent-list-view'
import { TorrentTableView } from './torrent-table-view'
import { TorrentsViewProvider, useTorrentsView } from './torrents-view'

/**
 * Three responsive layouts over the same data:
 * - phone (< 768px): a list; the detail slides over it like a navigation push
 * - tablet (768–1023px): list + detail side by side, like the iOS split view
 * - desktop (≥ 1024px): filter sidebar + table + an inspector that opens on selection
 */
export function TorrentsLayout() {
  return (
    <TorrentsViewProvider>
      <Shortcuts />
      <Layout />
    </TorrentsViewProvider>
  )
}

function Layout() {
  const isDesktop = useIsDesktop()
  const isSplit = useIsSplit()
  const { selected, openTorrentId } = useTorrentsView()
  const selectMode = useSelector(selectModeAtom)
  const sidebarCollapsed = useSelector(preferencesAtom, (p) => p.sidebarCollapsed)
  const sidebarWidth = useSelector(preferencesAtom, (p) => p.sidebarWidth)
  const inspectorWidth = useSelector(preferencesAtom, (p) => p.inspectorWidth)
  const multiple = selected.length > 1

  if (isDesktop) {
    const inspectorOpen = multiple || openTorrentId != null
    return (
      <div className="flex h-full">
        {!sidebarCollapsed && (
          <ResizablePanel
            edge="right"
            label="Resize sidebar"
            width={sidebarWidth}
            onWidthChange={(width) => updatePreferences({ sidebarWidth: width })}
            min={180}
            max={400}
            maxViewportFraction={0.3}
            className="w-56 border-r xl:w-60"
          >
            <Sidebar className="min-h-0 flex-1" />
          </ResizablePanel>
        )}
        <main className="flex min-w-0 flex-1 flex-col">
          <DesktopToolbar />
          <ConnectionBanner />
          <StatusPanel />
          <TorrentTableView className="min-h-0 flex-1" />
        </main>
        {inspectorOpen && (
          <ResizablePanel
            edge="left"
            label="Resize inspector"
            width={inspectorWidth}
            onWidthChange={(width) => updatePreferences({ inspectorWidth: width })}
            min={320}
            max={900}
            maxViewportFraction={0.5}
            className="w-[24rem] border-l xl:w-[28rem] 2xl:w-[32rem]"
          >
            <aside className="flex min-h-0 flex-1 flex-col">{multiple ? <SelectionSummary /> : <Outlet />}</aside>
          </ResizablePanel>
        )}
      </div>
    )
  }

  if (isSplit) {
    return (
      <div className="flex h-full">
        <section className="flex w-[22rem] shrink-0 flex-col border-r lg:w-[24rem]">
          <ListHeader />
          <ConnectionBanner />
          <StatusPanel />
          <TorrentListView className="min-h-0 flex-1" />
          {selectMode && <SelectionBar />}
        </section>
        <main className="flex min-w-0 flex-1 flex-col">{multiple ? <SelectionSummary /> : <Outlet />}</main>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <ListHeader />
      <ConnectionBanner />
      <StatusPanel />
      <TorrentListView className="min-h-0 flex-1" />
      {selectMode && <SelectionBar />}
      {/* Kept mounted underneath so the list keeps its scroll position. */}
      <div
        className={cn(
          'animate-push-in fixed inset-0 z-40 flex flex-col bg-background',
          openTorrentId == null && 'hidden',
        )}
      >
        {openTorrentId != null && <Outlet />}
      </div>
    </div>
  )
}

/** Keyboard shortcuts for the list (ignored while typing in a field). */
function Shortcuts() {
  const { selected, openTorrentId, torrents, closeDetail } = useTorrentsView()

  useHotkeys({
    '/': openSearch,
    n: () => openDialog({ type: 'add' }),
    Escape: () => {
      if (selected.length > 1) clearSelection()
      else if (openTorrentId != null) {
        clearSelection()
        closeDetail()
      }
    },
    'Delete|Backspace': () => {
      const targets = selected.length > 0 ? selected : torrents.filter((t) => t.id === openTorrentId)
      if (targets.length > 0) {
        openDialog({ type: 'remove', ids: targets.map((t) => t.id), names: targets.map((t) => t.name) })
      }
    },
  })
  return null
}
