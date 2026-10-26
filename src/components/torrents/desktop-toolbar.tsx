import { useSelector } from '@tanstack/react-store'
import { PanelLeftClose, PanelLeftDashed, PanelLeftOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { filterTitle } from '@/lib/torrent'
import { openDialog } from '@/lib/ui'
import { ToolbarSearchField } from './search-field'
import { useTorrentsView } from './torrents-view'
import { ColumnsMenu, SortMenu } from './view-options-menu'

const NEXT_MODE = { full: 'rail', rail: 'hidden', hidden: 'full' } as const
// Each icon shows what pressing will do: shrink to the rail, hide it, bring it back.
const TOGGLE_ICON = { full: PanelLeftClose, rail: PanelLeftDashed, hidden: PanelLeftOpen } as const

export const cycleSidebar = () => updatePreferences({ sidebar: NEXT_MODE[preferencesAtom.get().sidebar] })
const TOGGLE_LABEL = { full: 'Collapse sidebar', rail: 'Hide sidebar', hidden: 'Show sidebar' } as const

/**
 * Steps the sidebar full → icon rail → hidden → full. It lives in the sidebar while that's
 * showing, and in the toolbar once it's hidden.
 */
export function SidebarToggle({ className }: { className?: string }) {
  const mode = useSelector(preferencesAtom, (p) => p.sidebar)
  const Icon = TOGGLE_ICON[mode]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={TOGGLE_LABEL[mode]}
          onClick={cycleSidebar}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={mode === 'hidden' ? 'bottom' : 'right'}>
        {TOGGLE_LABEL[mode]} <Kbd>[</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

export function DesktopToolbar() {
  const { search, goHome } = useTorrentsView()
  const hidden = useSelector(preferencesAtom, (p) => p.sidebar === 'hidden')

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      {hidden && <SidebarToggle />}
      <h1 className="min-w-0 truncate font-semibold">
        <button
          type="button"
          onClick={goHome}
          aria-label="Reset view"
          className="-mx-1.5 rounded-md px-2.5 py-1 transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {filterTitle(search.filter)}
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
