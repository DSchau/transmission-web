import { useSelector } from '@tanstack/react-store'
import { CircleAlert, CircleHelp, Search, X } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { CompiledQuery } from '@/lib/query'
import type { Torrent } from '@/lib/rpc/types'
import { compileTorrentQuery, QUERY_FIELDS } from '@/lib/torrent'
import { searchOpenAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'

/** Opens the search field wherever it lives (toolbar icon or header title row); "/" uses it. */
export function openSearch() {
  searchOpenAtom.set(true)
  // The input is always mounted (the toolbar field morphs); wait a frame, then focus.
  requestAnimationFrame(() => document.getElementById('torrent-search')?.focus())
}

/** Pause before the URL (and so the list) follows the typing — enough that intermediate
 * keystrokes ("rati" while heading for "ratio:<0.5") never commit as name filters. */
const SEARCH_DEBOUNCE_MS = 250

/**
 * Binds the input to the `q` search param, which may be a structured query ("ratio:<0.5
 * status:seeding"). The text is local and instant; the URL — and so the filtered list —
 * follows debounced, and flushes on blur. Blurring an empty field closes it; focusing always
 * opens it. Both search fields share this, so "/" and click behave identically.
 */
function useSearchInput() {
  const { search, setSearch } = useTorrentsView()
  const [text, setText] = useState(search.q)
  const timer = useRef<number | undefined>(undefined)

  // Follow external changes (back/forward, "Clear Search").
  useEffect(() => setText(search.q), [search.q])

  // Never navigate after unmount.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const update = (value: string) => {
    setText(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSearch({ q: value }), SEARCH_DEBOUNCE_MS)
  }

  /** Commits right now — used on blur, so the last thing typed doesn't linger uncommitted. */
  const flush = () => {
    window.clearTimeout(timer.current)
    if (text !== search.q) setSearch({ q: text })
  }

  /** The clear (×) button — a deliberate single action, so it commits immediately. */
  const clear = () => {
    setText('')
    window.clearTimeout(timer.current)
    setSearch({ q: '' })
  }

  return {
    text,
    update,
    clear,
    /** The query as it exists in the input right now — for live diagnostics. */
    query: compileTorrentQuery(text),
    inputProps: {
      id: 'torrent-search',
      type: 'search',
      placeholder: 'Search torrents',
      'aria-label': 'Search torrents',
      autoComplete: 'off',
      value: text,
      onChange: (event: ChangeEvent<HTMLInputElement>) => update(event.target.value),
      onFocus: () => searchOpenAtom.set(true),
      onBlur: () => {
        flush()
        if (!text) searchOpenAtom.set(false)
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
          if (text) update('')
          else event.currentTarget.blur()
        }
      },
      className: '[&::-webkit-search-cancel-button]:hidden',
    },
  }
}

/** Trailing accessory: query warnings, then clear — or the help sheet / shortcut hint when empty. */
function SearchTrailing({
  text,
  query,
  compact,
  onClear,
}: {
  text: string
  query: CompiledQuery<Torrent>
  compact?: boolean
  onClear: () => void
}) {
  return (
    <InputGroupAddon align="inline-end">
      {query.diagnostics.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-status-checking" role="img" aria-label="Query warning">
              <CircleAlert className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            {query.diagnostics.slice(0, 3).map((diagnostic) => (
              <div key={diagnostic.message}>{diagnostic.message}</div>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
      {text ? (
        <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={onClear}>
          <X />
        </InputGroupButton>
      ) : compact ? (
        <Kbd>/</Kbd>
      ) : (
        <SearchHelp />
      )}
    </InputGroupAddon>
  )
}

/** Cheat sheet for the query syntax, generated from the field registry. */
function SearchHelp() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton size="icon-xs" aria-label="Search syntax help">
          <CircleHelp />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Search queries</DropdownMenuLabel>
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 text-xs">
          <p className="text-muted-foreground">
            Words match names; combine terms — all must match. Prefix “-” to exclude, “quotes” for phrases. Ops: : = !=
            &lt; &lt;= &gt; &gt;=
          </p>
          <ul className="flex flex-col gap-1.5">
            {QUERY_FIELDS.map((field) => (
              <li key={field.key} className="flex items-baseline gap-3">
                <code className="shrink-0 font-mono text-[11px]">{field.example}</code>
                <span className="min-w-0 flex-1 text-muted-foreground">{field.describe}</span>
              </li>
            ))}
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The field used in the phone/tablet title row (in place of the title while searching). */
export function SearchField({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { text, clear, query, inputProps } = useSearchInput()

  return (
    <InputGroup className={cn('h-8', className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput {...inputProps} autoFocus={autoFocus} />
      <SearchTrailing text={text} query={query} onClear={clear} />
    </InputGroup>
  )
}

/**
 * Desktop toolbar search — one element that morphs. Collapsed it is a 32px magnifier; on
 * click (or "/") its width, border and background animate in place so the input appears to
 * expand out of the icon. Nothing mounts or unmounts, so there is no swap and no layout
 * shift — the icon is always in the same spot and becomes the field's leading glyph.
 */
export function ToolbarSearchField({ className }: { className?: string }) {
  const { search } = useTorrentsView()
  const open = useSelector(searchOpenAtom)
  const { text, clear, query, inputProps } = useSearchInput()
  const expanded = open || search.q !== ''

  return (
    <Tooltip open={expanded ? false : undefined}>
      <TooltipTrigger asChild>
        <InputGroup
          data-state={expanded ? 'open' : 'closed'}
          role={expanded ? 'group' : 'button'}
          aria-label={expanded ? undefined : 'Search torrents'}
          tabIndex={expanded ? undefined : 0}
          onClick={expanded ? undefined : openSearch}
          onKeyDown={
            expanded
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openSearch()
                  }
                }
          }
          className={cn(
            'h-8 shrink cursor-pointer overflow-hidden transition-[width,background-color,border-color] duration-200',
            expanded
              ? 'w-56 cursor-text xl:w-72'
              : 'w-8 border-transparent bg-transparent hover:bg-accent dark:bg-transparent',
            className,
          )}
        >
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            {...inputProps}
            tabIndex={expanded ? 0 : -1}
            className={cn(inputProps.className, !expanded && 'opacity-0')}
          />
          <SearchTrailing text={text} query={query} compact={!expanded} onClear={clear} />
        </InputGroup>
      </TooltipTrigger>
      <TooltipContent>
        Search torrents <Kbd>/</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
