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
}

export const REFRESH_INTERVALS = [1, 2, 3, 5, 10] as const

export const PREFERENCES_KEY = 'transmission-web.preferences'

export const preferencesAtom = persistedAtom<Preferences>(PREFERENCES_KEY, {
  theme: 'system',
  refreshInterval: 2,
  columnVisibility: { queue: false, eta: true, ratio: true, addedDate: true },
  sidebarCollapsed: false,
})

export const updatePreferences = (patch: Partial<Preferences>) => preferencesAtom.set((prev) => ({ ...prev, ...patch }))
