import { createAtom } from '@tanstack/react-store'
import { persistedAtom, safeLocalStorage, safeSessionStorage } from './persisted'
import type { Credentials } from './rpc/client'

export const DEFAULT_RPC_PATH = '/transmission/rpc'
export const DEFAULT_PORT = 9091

/**
 * Where a daemon lives.
 *
 * `url: ''` means "this server": the RPC endpoint on the same origin the app is served from
 * (e.g. when installed as Transmission's web UI, or via the Vite dev proxy). That needs no CORS,
 * and auth can be left entirely to the browser's own sign-in prompt.
 */
export interface ConnectionConfig {
  url: string
  username: string
}

const BUILD_DEFAULT_URL = (import.meta.env.VITE_RPC_URL as string | undefined) ?? ''

/** A saved daemon (e.g. "Home NUC", "Seedbox"). `name` may be blank: the host is shown instead. */
export interface ServerProfile extends ConnectionConfig {
  id: string
  name: string
}

export interface ServersState {
  servers: ServerProfile[]
  activeId: string
}

const SERVERS_KEY = 'transmission-web.servers'
/** Where the single connection lived before profiles; migrated into the first profile. */
const LEGACY_CONNECTION_KEY = 'transmission-web.connection'
const FIRST_ID = 'default'

function initialServers(): ServersState {
  let legacy: Partial<ConnectionConfig> = {}
  try {
    const raw = safeLocalStorage()?.getItem(LEGACY_CONNECTION_KEY)
    if (raw) legacy = JSON.parse(raw) as Partial<ConnectionConfig>
  } catch {
    // Corrupt or inaccessible storage: start from defaults.
  }
  return {
    servers: [{ id: FIRST_ID, name: '', url: legacy.url ?? BUILD_DEFAULT_URL, username: legacy.username ?? '' }],
    activeId: FIRST_ID,
  }
}

/** The saved servers and which one is in use. Persisted to localStorage — but never passwords. */
export const serversAtom = persistedAtom<ServersState>(SERVERS_KEY, initialServers())

export const activeServer = ({ servers, activeId }: ServersState): ServerProfile =>
  servers.find((s) => s.id === activeId) ?? servers[0] ?? (initialServers().servers[0] as ServerProfile)

/** The server in use. Change it with `switchServer`/`updateServer`. */
export const connectionAtom = createAtom(() => activeServer(serversAtom.get()))

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

export function addServer(profile: Omit<ServerProfile, 'id'>): ServerProfile {
  const server = { ...profile, id: newId() }
  serversAtom.set((state) => ({ ...state, servers: [...state.servers, server] }))
  return server
}

export function updateServer(id: string, patch: Partial<Omit<ServerProfile, 'id'>>) {
  serversAtom.set((state) => ({
    ...state,
    servers: state.servers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }))
}

/** Forgets a server and its password. The last one can't be removed. */
export function removeServer(id: string) {
  const { servers, activeId } = serversAtom.get()
  if (servers.length <= 1 || !servers.some((s) => s.id === id)) return
  forgetCredentials(id)
  const remaining = servers.filter((s) => s.id !== id)
  if (id === activeId) switchServer((remaining[0] as ServerProfile).id)
  serversAtom.set((state) => ({ ...state, servers: state.servers.filter((s) => s.id !== id) }))
}

/** Makes `id` the active server, bringing back the password it was signed in with in this tab. */
export function switchServer(id: string) {
  const state = serversAtom.get()
  if (!state.servers.some((s) => s.id === id)) return
  credentialsAtom.set(credentialsFor(id))
  if (state.activeId !== id) serversAtom.set({ ...state, activeId: id })
}

export function rpcUrlFor(config: ConnectionConfig): string {
  return config.url || DEFAULT_RPC_PATH
}

export function isSameOrigin(config: ConnectionConfig): boolean {
  if (!config.url || config.url.startsWith('/')) return true
  try {
    return new URL(config.url).origin === globalThis.location?.origin
  } catch {
    return false
  }
}

/** During `vite dev`, other-origin daemons are reached through the dev server, so CORS doesn't matter. */
export const usesDevProxy = (config: ConnectionConfig) => import.meta.env.DEV && !isSameOrigin(config)

/**
 * Turns what people type into an RPC URL. Tolerates "nas.local", "nas.local:9091",
 * "http://nas.local:9091" and the web UI's own address ("…/transmission/web/").
 * Returns `''` for "this server", `null` if it can't be parsed.
 */
export function normalizeRpcUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return ''
  if (text.startsWith('/')) return text

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text)
  let url: URL
  try {
    url = new URL(hasScheme ? text : `http://${text}`)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null
  // A bare host gets Transmission's default port; an explicit scheme suggests a reverse proxy, so leave it.
  if (!hasScheme && !url.port) url.port = String(DEFAULT_PORT)
  const path = url.pathname.replace(/\/+$/, '')
  if (path === '' || path === '/transmission' || path === '/transmission/web') url.pathname = DEFAULT_RPC_PATH
  url.hash = ''
  return url.toString()
}

// MARK: Credentials

const CREDENTIALS_KEY = 'transmission-web.credentials'
const credentialsKey = (id: string) => `${CREDENTIALS_KEY}.${id}`

function loadCredentials(id: string): Credentials | null {
  try {
    const storage = safeSessionStorage()
    const raw = storage?.getItem(credentialsKey(id)) ?? (id === FIRST_ID ? storage?.getItem(CREDENTIALS_KEY) : null)
    return raw ? (JSON.parse(raw) as Credentials) : null
  } catch {
    return null
  }
}

/** Passwords for the servers signed in to in this tab, so switching back doesn't ask again. */
const credentialsById = new Map<string, Credentials>()

/**
 * The active server's password lives in memory only — or, if the user opts in, in `sessionStorage`,
 * which is scoped to this tab and cleared when it closes. It is never written to localStorage.
 */
export const credentialsAtom = createAtom<Credentials | null>(loadCredentials(serversAtom.get().activeId))

/** Sets the password for server `id` (the active one by default). */
export function setCredentials(
  credentials: Credentials | null,
  { rememberInTab = false, id = serversAtom.get().activeId } = {},
) {
  const storage = safeSessionStorage()
  try {
    storage?.removeItem(CREDENTIALS_KEY)
    if (credentials && rememberInTab) storage?.setItem(credentialsKey(id), JSON.stringify(credentials))
    else storage?.removeItem(credentialsKey(id))
  } catch {
    // Ignore storage failures; in-memory still works.
  }
  if (credentials) credentialsById.set(id, credentials)
  else credentialsById.delete(id)
  if (id === serversAtom.get().activeId) credentialsAtom.set(credentials)
}

/** The password `id` is signed in with in this tab, if any. */
export const credentialsFor = (id: string) => credentialsById.get(id) ?? loadCredentials(id)

function forgetCredentials(id: string) {
  credentialsById.delete(id)
  try {
    safeSessionStorage()?.removeItem(credentialsKey(id))
  } catch {
    // Nothing stored.
  }
}

export const isRememberedInTab = (id = serversAtom.get().activeId) => {
  try {
    const storage = safeSessionStorage()
    return (
      storage?.getItem(credentialsKey(id)) != null || (id === FIRST_ID && storage?.getItem(CREDENTIALS_KEY) != null)
    )
  } catch {
    return false
  }
}

/**
 * Offers the credentials to the browser's password manager (Chromium's Credential Management API).
 * Elsewhere, the sign-in forms' `autocomplete` attributes let the browser offer to save them.
 */
export async function offerToPasswordManager({ username, password }: Credentials) {
  const PasswordCredentialCtor = (globalThis as { PasswordCredential?: new (data: object) => Credential })
    .PasswordCredential
  if (!PasswordCredentialCtor || !navigator.credentials?.store || !username) return
  try {
    await navigator.credentials.store(new PasswordCredentialCtor({ id: username, password, name: username }))
  } catch {
    // Declined or unsupported; nothing to do.
  }
}

/** What to call a server: its name if it has one, otherwise its host. */
export function displayNameFor(config: ConnectionConfig & { name?: string }): string {
  if (config.name?.trim()) return config.name.trim()
  return hostFor(config)
}

export function hostFor(config: ConnectionConfig): string {
  if (isSameOrigin(config)) return globalThis.location?.host || 'This server'
  try {
    return new URL(config.url).host
  } catch {
    return config.url
  }
}
