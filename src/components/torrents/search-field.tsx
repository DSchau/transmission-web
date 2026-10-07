import { useSelector } from '@tanstack/react-store'
import { Search, X } from 'lucide-react'
import { type ChangeEvent, type KeyboardEvent, useEffect, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { searchOpenAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'

/** Opens the search field wherever it lives (toolbar icon or header title row); "/" uses it. */
export function openSearch() {
  searchOpenAtom.set(true)
  // The input is always mounted (the toolbar field morphs); wait a frame, then focus.
  requestAnimationFrame(() => document.getElementById('torrent-search')?.focus())
}

/**
 * Binds the input to the `q` search param. Blurring the field empty closes it, and focusing
 * it always opens it — both search fields share this, so "/" and click behave identically.
 */
function useSearchInput() {
  const { search, setSearch } = useTorrentsView()
  const [text, setText] = useState(search.q)

  // Follow external changes (back/forward, "Clear Search").
  useEffect(() => setText(search.q), [search.q])

  const update = (value: string) => {
    setText(value)
    setSearch({ q: value })
  }

  return {
    text,
    update,
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

/** Trailing clear button, or the "/" hint while the field is empty. */
function SearchTrailing({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <InputGroupAddon align="inline-end">
      {text ? (
        <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={onClear}>
          <X />
        </InputGroupButton>
      ) : (
        <Kbd>/</Kbd>
      )}
    </InputGroupAddon>
  )
}

/** The field used in the phone/tablet title row (in place of the title while searching). */
export function SearchField({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { text, update, inputProps } = useSearchInput()

  return (
    <InputGroup className={cn('h-8', className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput {...inputProps} autoFocus={autoFocus} />
      <SearchTrailing text={text} onClear={() => update('')} />
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
  const { text, update, inputProps } = useSearchInput()
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
          <SearchTrailing text={text} onClear={() => update('')} />
        </InputGroup>
      </TooltipTrigger>
      <TooltipContent>
        Search torrents <Kbd>/</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
