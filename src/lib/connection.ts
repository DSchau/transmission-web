import { createAtom } from '@tanstack/react-store'
import { persistedAtom, safeSessionStorage } from './persisted'
import type { Credentials } from './rpc/client'

export const DEFAULT_RPC_PATH = '/transmission/rpc'
export const DEFAULT_PORT = 9091

/**
 * Where the daemon lives. Persisted to localStorage — but never the password.
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

export const connectionAtom = persistedAtom<ConnectionConfig>('transmission-web.connection', {
  url: BUILD_DEFAULT_URL,
  username: '',
})

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

function loadCredentials(): Credentials | null {
  try {
    const raw = safeSessionStorage()?.getItem(CREDENTIALS_KEY)
    return raw ? (JSON.parse(raw) as Credentials) : null
  } catch {
    return null
  }
}

/**
 * The password lives in memory only — or, if the user opts in, in `sessionStorage`, which is
 * scoped to this tab and cleared when it closes. It is never written to localStorage.
 */
export const credentialsAtom = createAtom<Credentials | null>(loadCredentials())

export function setCredentials(credentials: Credentials | null, { rememberInTab = false } = {}) {
  const storage = safeSessionStorage()
  try {
    if (credentials && rememberInTab) storage?.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
    else storage?.removeItem(CREDENTIALS_KEY)
  } catch {
    // Ignore storage failures; in-memory still works.
  }
  credentialsAtom.set(credentials)
}

export const isRememberedInTab = () => {
  try {
    return safeSessionStorage()?.getItem(CREDENTIALS_KEY) != null
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

export function displayNameFor(config: ConnectionConfig): string {
  if (isSameOrigin(config)) return globalThis.location?.host || 'This server'
  try {
    return new URL(config.url).host
  } catch {
    return config.url
  }
}
