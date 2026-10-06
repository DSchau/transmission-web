import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { useTorrentsView } from './torrents-view'

/** Search box bound to the `q` search param. Press "/" to focus it. */
export function SearchField({ className, showShortcut = false }: { className?: string; showShortcut?: boolean }) {
  const { search, setSearch } = useTorrentsView()
  const [text, setText] = useState(search.q)

  // Follow external changes (back/forward, "Clear Search").
  useEffect(() => setText(search.q), [search.q])

  const update = (value: string) => {
    setText(value)
    setSearch({ q: value })
  }

  return (
    <InputGroup className={cn('h-8', className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        id="torrent-search"
        type="search"
        placeholder="Search torrents"
        aria-label="Search torrents"
        autoComplete="off"
        value={text}
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (text) update('')
            else event.currentTarget.blur()
          }
        }}
        className="[&::-webkit-search-cancel-button]:hidden"
      />
      <InputGroupAddon align="inline-end">
        {text ? (
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => update('')}>
            <X />
          </InputGroupButton>
        ) : (
          showShortcut && <Kbd>/</Kbd>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}
