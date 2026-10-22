import { Link, useNavigate } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { Plug, Plus } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { displayNameFor, hostFor, serversAtom, switchServer } from '@/lib/connection'

/** Switches daemons and goes back to the list: an open torrent belonged to the previous one. */
export function useSwitchServer() {
  const navigate = useNavigate()
  return (id: string) => {
    if (id === serversAtom.get().activeId) return
    switchServer(id)
    navigate({ to: '/' })
  }
}

/** The saved servers, as radio items that switch to one. */
export function ServerRadioItems() {
  const { servers, activeId } = useSelector(serversAtom)
  const switchTo = useSwitchServer()

  return (
    <DropdownMenuRadioGroup value={activeId} onValueChange={switchTo}>
      {servers.map((server) => (
        <DropdownMenuRadioItem key={server.id} value={server.id}>
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{displayNameFor(server)}</span>
            {server.name.trim() && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">{hostFor(server)}</span>
            )}
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/** The saved servers to pick from, plus adding and managing them. */
export function ServerMenuItems() {
  return (
    <>
      <ServerRadioItems />
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to="/connect" search={{ server: 'new' }}>
          <Plus />
          Add Server…
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/connect">
          <Plug />
          Connection…
        </Link>
      </DropdownMenuItem>
    </>
  )
}
