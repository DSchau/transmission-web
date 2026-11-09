import { Link } from '@tanstack/react-router'
import {
  AppearanceLightMode,
  CircleDotsCenter1,
  ColorPalette2,
  Limit,
  LineChart1,
  Moon,
  Plugin1,
  SettingsGear2,
  SquareCheck,
  Sun,
} from '@/components/icons'
import { ThemeSwatch } from '@/components/theme-swatch'
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
import type { ColorTheme, Theme } from '@/lib/preferences'
import { useSession } from '@/lib/queries'
import { COLOR_THEMES, useTheme } from '@/lib/theme'
import { clearSelection, selectModeAtom } from '@/lib/ui'
import { openStatistics } from './activity'

/** The list's secondary actions (the iOS app's overflow menu). */
export function AppMenu({ showSelect = true }: { showSelect?: boolean }) {
  const { data: session } = useSession()
  const { mutate: updateSession } = useSessionMutation()
  const { theme, setTheme, resolvedTheme, colorTheme, setColorTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More">
          <CircleDotsCenter1 />
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
              <SquareCheck />
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
              <Limit />
              Alternative Speeds
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <AppearanceLightMode />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              <DropdownMenuRadioItem value="system">
                <AppearanceLightMode /> System
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
            <ColorPalette2 />
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
          <LineChart1 />
          Statistics…
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/connect">
            <Plugin1 />
            Connection…
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <SettingsGear2 />
            Settings…
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
