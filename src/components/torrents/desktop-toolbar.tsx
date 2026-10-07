import { useSelector } from '@tanstack/react-store'
import { PanelLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { FILTER_INFO } from '@/lib/torrent'
import { openDialog } from '@/lib/ui'
import { ToolbarSearchField } from './search-field'
import { useTorrentsView } from './torrents-view'
import { ColumnsMenu, SortMenu } from './view-options-menu'

export function DesktopToolbar() {
  const { search, goHome } = useTorrentsView()
  const collapsed = useSelector(preferencesAtom, (p) => p.sidebarCollapsed)

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle sidebar"
            onClick={() => updatePreferences({ sidebarCollapsed: !collapsed })}
          >
            <PanelLeft />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{collapsed ? 'Show' : 'Hide'} sidebar</TooltipContent>
      </Tooltip>
      <h1 className="min-w-0 truncate font-semibold">
        <button
          type="button"
          onClick={goHome}
          aria-label="Reset view"
          className="-mx-1 rounded-md px-2 py-0.5 transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {search.filter === 'all' ? 'Torrents' : FILTER_INFO[search.filter].title}
        </button>
      </h1>
      <div className="flex-1" />
      <ToolbarSearchField />
      <Button className="shrink-0" onClick={() => openDialog({ type: 'add' })}>
        <Plus data-icon="inline-start" />
        Add
      </Button>
      <div className="flex shrink-0 items-center">
        <SortMenu />
        <ColumnsMenu />
      </div>
    </header>
  )
}
