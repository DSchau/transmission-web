import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import {
  ChartArea,
  CheckSquare,
  CircleEllipsis,
  Moon,
  Palette,
  Plug,
  Settings,
  Sun,
  SunMoon,
  Turtle,
} from 'lucide-react'
import { ThemeSwatch } from '@/components/theme-swatch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { serversAtom } from '@/lib/connection'
import { useSessionMutation } from '@/lib/mutations'
import type { ColorTheme, Theme } from '@/lib/preferences'
import { useSession } from '@/lib/queries'
import { COLOR_THEMES, useTheme } from '@/lib/theme'
import { clearSelection, selectModeAtom } from '@/lib/ui'
import { openStatistics } from './activity'
import { ServerRadioItems } from './server-menu'

/** The list's secondary actions (the iOS app's overflow menu). */
export function AppMenu({ showSelect = true }: { showSelect?: boolean }) {
  const { data: session } = useSession()
  const { mutate: updateSession } = useSessionMutation()
  const hasServers = useSelector(serversAtom, (s) => s.servers.length > 1)
  const { theme, setTheme, resolvedTheme, colorTheme, setColorTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More">
          <CircleEllipsis />
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
        {hasServers && (
          <>
            <DropdownMenuLabel>Server</DropdownMenuLabel>
            <ServerRadioItems />
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-(--radix-dropdown-menu-content-available-height) max-w-(--radix-dropdown-menu-content-available-width) overflow-y-auto">
            <DropdownMenuRadioGroup value={colorTheme} onValueChange={(value) => setColorTheme(value as ColorTheme)}>
              {COLOR_THEMES.map((t) => (
                <DropdownMenuRadioItem key={t.id} value={t.id}>
                  <ThemeSwatch theme={t.id} mode={resolvedTheme} />
                  <span className="truncate">{t.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={openStatistics}>
          <ChartArea />
          Statistics…
        </DropdownMenuItem>
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
