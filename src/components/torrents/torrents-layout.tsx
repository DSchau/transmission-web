import { Outlet, useNavigate } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { DropOverlay } from '@/components/drop-zone'
import { ResizablePanel } from '@/components/resizable-panel'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useIsDesktop, useIsSplit } from '@/hooks/use-media-query'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { useSessionStats } from '@/lib/queries'
import { FILTERS } from '@/lib/torrent'
import { clearSelection, confirmRemove, openDialog, selectModeAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { ConnectionBanner } from './connection-state'
import { cycleSidebar, DesktopToolbar } from './desktop-toolbar'
import { ListHeader } from './list-header'
import { openSearch } from './search-field'
import { SelectionBar } from './selection-bar'
import { SelectionSummary } from './selection-summary'
import { RAIL_WIDTH, Sidebar, SidebarRail } from './sidebar'
import { StatusPanel } from './status-panel'
import { TorrentListView } from './torrent-list-view'
import { TORRENT_TABLE_ID, TorrentTableView } from './torrent-table-view'
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

/** A button, not an anchor: the router owns the URL hash. Hidden until focused. */
function SkipToTorrents() {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Browsers start Tab from wherever you last clicked, so a click into the window would
    // skip past this link. With nothing focused, Tab always lands here first instead.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return
      if (document.activeElement && document.activeElement !== document.body) return
      event.preventDefault()
      ref.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => document.getElementById(TORRENT_TABLE_ID)?.focus()}
      className="sr-only z-50 rounded-md bg-primary font-medium text-primary-foreground text-sm shadow-lg outline-none focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Skip to torrents
    </button>
  )
}

function Layout() {
  const isDesktop = useIsDesktop()
  const isSplit = useIsSplit()
  const { selected, openTorrentId } = useTorrentsView()
  const selectMode = useSelector(selectModeAtom)
  const sidebarMode = useSelector(preferencesAtom, (p) => p.sidebar)
  const sidebarWidth = useSelector(preferencesAtom, (p) => p.sidebarWidth)
  const inspectorWidth = useSelector(preferencesAtom, (p) => p.inspectorWidth)
  const multiple = selected.length > 1
  const [listScrolled, setListScrolled] = useState(false)
  // Keeps the session's transfer history (the speed charts) up to date.
  useSessionStats()

  if (isDesktop) {
    const inspectorOpen = multiple || openTorrentId != null
    return (
      <div className="flex h-full">
        <SkipToTorrents />
        {sidebarMode !== 'hidden' && (
          <ResizablePanel
            edge="right"
            label="Resize sidebar"
            width={sidebarWidth}
            onWidthChange={(width) => updatePreferences({ sidebarWidth: width })}
            min={220}
            max={400}
            maxViewportFraction={0.3}
            railWidth={RAIL_WIDTH}
            rail={sidebarMode === 'rail'}
            onRailChange={(rail) => updatePreferences({ sidebar: rail ? 'rail' : 'full' })}
            className="w-56 border-r xl:w-60"
          >
            {(rail) => (rail ? <SidebarRail className="min-h-0 flex-1" /> : <Sidebar className="min-h-0 flex-1" />)}
          </ResizablePanel>
        )}
        <main className="flex min-w-0 flex-1 flex-col">
          <GlassPane
            list={(topInset) => (
              <TorrentTableView className="min-h-0 flex-1" topInset={topInset} onScrolledChange={setListScrolled} />
            )}
          >
            <DesktopToolbar />
            <ConnectionBanner />
            <StatusPanel chart={sidebarMode !== 'full'} chartCollapsed={listScrolled} />
          </GlassPane>
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
          <GlassList chrome={<StatusPanel chart />} />
          {selectMode && <SelectionBar />}
        </section>
        <main className="flex min-w-0 flex-1 flex-col">{multiple ? <SelectionSummary /> : <Outlet />}</main>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <GlassList
        // Once the list scrolls, the strip folds down to its one-line summary to give the cards room.
        chrome={<StatusPanel chart chartCollapsed={listScrolled} />}
        scrolled={listScrolled}
        onScrolledChange={setListScrolled}
      />
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

/** The phone/tablet list with its header, banner and status strip on a frosted pane over the cards. */
function GlassList({
  chrome,
  scrolled = false,
  onScrolledChange,
}: {
  chrome: ReactNode
  scrolled?: boolean
  onScrolledChange?: (scrolled: boolean) => void
}) {
  return (
    <GlassPane
      scrolled={scrolled}
      list={(topInset) => (
        <TorrentListView className="min-h-0 flex-1" topInset={topInset} onScrolledChange={onScrolledChange} />
      )}
    >
      <ListHeader />
      <ConnectionBanner />
      {chrome}
    </GlassPane>
  )
}

/**
 * Overlays `children` on a frosted pane on top of `list`, so rows scroll underneath it instead of
 * stopping at its edge. `list` gets the pane's height to inset its content by.
 */
function GlassPane({
  list,
  children,
  scrolled = false,
}: {
  list: (topInset: number) => ReactNode
  children: ReactNode
  scrolled?: boolean
}) {
  const [height, setHeight] = useState(0)
  const scrolledRef = useRef(scrolled)
  scrolledRef.current = scrolled
  const paneRef = useCallback((pane: HTMLDivElement | null) => {
    if (!pane) return
    let settle: ReturnType<typeof setTimeout> | undefined
    // The inset grows right away but only shrinks once the pane has stopped moving, and never while
    // scrolled: the chart folding away just reveals more cards under the glass, and following it
    // frame by frame would shift the list (and on unfold, snap it to the folded height first).
    const observer = new ResizeObserver(() => {
      setHeight((current) => Math.max(current, pane.offsetHeight))
      clearTimeout(settle)
      settle = setTimeout(() => {
        if (!scrolledRef.current) setHeight(pane.offsetHeight)
      }, 450)
    })
    observer.observe(pane)
    return () => {
      clearTimeout(settle)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {list(height)}
      <div
        ref={paneRef}
        className="absolute inset-x-0 top-0 z-20 bg-background/70 backdrop-blur-xl backdrop-saturate-150"
      >
        {children}
      </div>
      <DropOverlay />
    </div>
  )
}

/** Keyboard shortcuts for the list (ignored while typing in a field). */
function Shortcuts() {
  const { selected, openTorrentId, torrents, closeDetail, setSearch } = useTorrentsView()
  const navigate = useNavigate()

  useHotkeys({
    // 1–7 pick a filter in sidebar order, like Finder/Mail's numbered views.
    ...Object.fromEntries(FILTERS.map((filter, i) => [String(i + 1), () => setSearch({ filter })])),
    '/': openSearch,
    n: () => openDialog({ type: 'add' }),
    '[': cycleSidebar,
    // ⌘, is the Mac convention, but the browser keeps it for its own settings.
    ',': () => navigate({ to: '/settings' }),
    Escape: () => {
      if (selected.length > 1) clearSelection()
      else if (openTorrentId != null) {
        clearSelection()
        closeDetail()
      }
    },
    'Delete|Backspace': () => {
      const targets = selected.length > 0 ? selected : torrents.filter((t) => t.id === openTorrentId)
      if (targets.length > 0) confirmRemove(targets)
    },
  })
  return null
}
