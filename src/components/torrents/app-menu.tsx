import { Link } from '@tanstack/react-router'
import { CheckSquare, Ellipsis, Moon, Plug, Settings, Sun, SunMoon, Turtle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSessionMutation } from '@/lib/mutations'
import type { Theme } from '@/lib/preferences'
import { useSession } from '@/lib/queries'
import { useTheme } from '@/lib/theme'
import { clearSelection, selectModeAtom } from '@/lib/ui'

/** The list's secondary actions (the iOS app's overflow menu). */
export function AppMenu({ showSelect = true }: { showSelect?: boolean }) {
  const { data: session } = useSession()
  const { mutate: updateSession } = useSessionMutation()
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {showSelect && (
          <>
            <DropdownMenuItem
              onSelect={() => {
                clearSelection()
                selectModeAtom.set(true)
              }}
            >
              <CheckSquare />
              Select
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {session && (
          <>
            <DropdownMenuCheckboxItem
              checked={session['alt-speed-enabled']}
              onCheckedChange={(enabled) => updateSession({ 'alt-speed-enabled': enabled })}
            >
              <Turtle />
              Alternative Speeds
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              <DropdownMenuRadioItem value="system">
                <SunMoon /> System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                <Sun /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon /> Dark
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link to="/connect">
            <Plug />
            Connection…
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings />
            Settings…
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
