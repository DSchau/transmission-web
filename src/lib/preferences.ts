import type { ColumnVisibilityState } from '@tanstack/react-table'
import { persistedAtom } from './persisted'

/** App-local preferences (not daemon settings — those live in the session). */
export type Theme = 'system' | 'light' | 'dark'

export interface Preferences {
  theme: Theme
  /** Seconds between polls. */
  refreshInterval: number
  columnVisibility: ColumnVisibilityState
  sidebarCollapsed: boolean
  /** Desktop panel widths in px; null = the responsive default. */
  sidebarWidth: number | null
  inspectorWidth: number | null
}

export const REFRESH_INTERVALS = [1, 2, 3, 5, 10] as const

export const PREFERENCES_KEY = 'transmission-web.preferences.v2'

export const preferencesAtom = persistedAtom<Preferences>(PREFERENCES_KEY, {
  theme: 'system',
  refreshInterval: 2,
  // Like Transmission's own list: the name column carries the status line (including size
  // and rates), so the table needs nothing else. The rest live in the Columns menu if wanted.
  columnVisibility: {
    status: false,
    progress: false,
    size: false,
    rateDownload: false,
    rateUpload: false,
    eta: false,
    ratio: false,
    addedDate: false,
    queue: false,
  },
  sidebarCollapsed: false,
  sidebarWidth: null,
  inspectorWidth: null,
})

export const updatePreferences = (patch: Partial<Preferences>) => preferencesAtom.set((prev) => ({ ...prev, ...patch }))
