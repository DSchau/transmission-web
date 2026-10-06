import { ArrowDownWideNarrow, ArrowUpNarrowWide, Columns3, ListFilter } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import {
  countByFilter,
  FILTER_INFO,
  FILTERS,
  MENU_SORTS,
  SORT_INFO,
  type TorrentFilter,
  type TorrentSort,
} from '@/lib/torrent'
import { cn } from '@/lib/utils'
import { COLUMN_TITLES } from './table-model'
import { useTorrentsView } from './torrents-view'

/** Show / Sort By, for layouts without the sidebar and table headers. */
export function ViewOptionsMenu() {
  const { torrents, search, setSearch } = useTorrentsView()
  const counts = useMemo(() => countByFilter(torrents), [torrents])
  const desc = search.dir ? search.dir === 'desc' : SORT_INFO[search.sort].desc
  const filtered = search.filter !== 'all'

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant={filtered ? 'secondary' : 'ghost'} size="icon" aria-label="View options">
              <ListFilter className={cn(filtered && 'text-primary')} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>View options</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={search.filter}
            onValueChange={(v) => setSearch({ filter: v as TorrentFilter })}
          >
            {FILTERS.map((filter) => {
              const info = FILTER_INFO[filter]
              // "Active" is omitted from counts: it flickers with every speed change.
              const count = filter === 'all' || filter === 'active' ? 0 : counts[filter]
              return (
                <DropdownMenuRadioItem key={filter} value={filter}>
                  <info.icon />
                  {info.title}
                  {count > 0 && <DropdownMenuShortcut>{formatNumber(count)}</DropdownMenuShortcut>}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={search.sort}
            onValueChange={(v) => setSearch({ sort: v as TorrentSort, dir: undefined })}
          >
            {MENU_SORTS.map((sort) => (
              <DropdownMenuRadioItem key={sort} value={sort}>
                {SORT_INFO[sort].title}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={desc !== SORT_INFO[search.sort].desc}
          onCheckedChange={() => setSearch({ dir: desc ? 'asc' : 'desc' })}
        >
          {desc ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
          Reverse Order
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Column picker for the desktop table. */
export function ColumnsMenu() {
  const { table } = useTorrentsView()
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide())
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Columns">
              <Columns3 />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Columns</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        {hideable.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(checked)}
            onSelect={(event) => event.preventDefault()}
          >
            {COLUMN_TITLES[column.id] ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
