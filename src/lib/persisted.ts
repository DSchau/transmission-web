import { type Atom, createAtom } from '@tanstack/react-store'

/**
 * A TanStack Store atom mirrored to Web Storage. Stored values are shallow-merged over
 * `defaults`, so adding a field later doesn't break existing users' saved state.
 */
export function persistedAtom<T extends object>(
  key: string,
  defaults: T,
  storage: Storage | undefined = safeLocalStorage(),
): Atom<T> {
  let initial = defaults
  try {
    const raw = storage?.getItem(key)
    if (raw) initial = { ...defaults, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    // Corrupt or inaccessible storage: start from defaults.
  }
  const atom = createAtom<T>(initial)
  atom.subscribe((value) => {
    try {
      storage?.setItem(key, JSON.stringify(value))
    } catch {
      // Quota exceeded / private mode: keep working in memory.
    }
  })
  return atom
}

export function safeLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function safeSessionStorage(): Storage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}
