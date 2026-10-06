import { useSelector } from '@tanstack/react-store'
import { PanelLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { FILTER_INFO } from '@/lib/torrent'
import { openDialog } from '@/lib/ui'
import { AltSpeedToggle, AppMenu } from './app-menu'
import { SearchField } from './search-field'
import { useTorrentsView } from './torrents-view'
import { ColumnsMenu } from './view-options-menu'

export function DesktopToolbar() {
  const { search } = useTorrentsView()
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
      <h1 className="font-semibold">{search.filter === 'all' ? 'All Torrents' : FILTER_INFO[search.filter].title}</h1>
      <div className="flex-1" />
      <SearchField className="w-56 xl:w-72" showShortcut />
      <Button onClick={() => openDialog({ type: 'add' })}>
        <Plus data-icon="inline-start" />
        Add
      </Button>
      <div className="flex items-center">
        <AltSpeedToggle />
        <ColumnsMenu />
        <AppMenu showSelect={false} />
      </div>
    </header>
  )
}
