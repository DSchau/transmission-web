import type {
  AddedTorrent,
  AddTorrentArguments,
  AddTorrentResult,
  FileUpdate,
  QueueDirection,
  SessionInfo,
  SessionUpdate,
  Torrent,
} from './types'

export type TransmissionErrorKind = 'unauthorized' | 'http' | 'invalid-response' | 'server' | 'handshake' | 'network'

/** Errors surfaced by the RPC layer. `kind` lets the UI react (e.g. show sign-in on `unauthorized`). */
export class TransmissionError extends Error {
  readonly kind: TransmissionErrorKind
  readonly status?: number

  constructor(kind: TransmissionErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'TransmissionError'
    this.kind = kind
    this.status = status
  }
}

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof TransmissionError && error.kind === 'unauthorized'

export interface Credentials {
  username: string
  password: string
}

interface RPCResponse<T> {
  result: string
  arguments?: T
}

const SESSION_DEFAULTS: SessionInfo = {
  version: 'Unknown',
  'rpc-version': 0,
  'download-dir': '',
  'start-added-torrents': true,
  'alt-speed-enabled': false,
  'alt-speed-down': 0,
  'alt-speed-up': 0,
  'speed-limit-down-enabled': false,
  'speed-limit-down': 0,
  'speed-limit-up-enabled': false,
  'speed-limit-up': 0,
  seedRatioLimited: false,
  seedRatioLimit: 2,
}

const REQUEST_TIMEOUT = 15_000
/** Served by dev/rpc-proxy.ts during `vite dev` only. */
const DEV_PROXY_PATH = '/__rpc_proxy'
const SESSION_HEADER = 'X-Transmission-Session-Id'

const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function basicAuth({ username, password }: Credentials): string {
  // btoa only handles Latin-1; encode as UTF-8 first so non-ASCII passwords work.
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return `Basic ${btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))}`
}

function isCrossOrigin(url: string): boolean {
  try {
    return new URL(url, globalThis.location?.href).origin !== globalThis.location?.origin
  } catch {
    return false
  }
}

function withTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT)
  return signal && 'any' in AbortSignal ? AbortSignal.any([signal, timeout]) : (signal ?? timeout)
}

/**
 * A thin client for the Transmission RPC protocol.
 *
 * Handles the `X-Transmission-Session-Id` CSRF handshake (HTTP 409) transparently, and sends
 * HTTP basic auth when credentials are given. Without credentials, same-origin requests still
 * carry whatever basic auth the browser cached from its own sign-in prompt.
 */
export class TransmissionClient {
  readonly url: string
  /** In dev, cross-origin daemons are reached through the dev server (no CORS needed). */
  readonly proxied: boolean
  private readonly authorization: string | null
  private sessionId: string | null = null

  constructor(url: string, credentials?: Credentials | null) {
    this.url = url
    this.proxied = import.meta.env.DEV && isCrossOrigin(url)
    this.authorization = credentials?.username ? basicAuth(credentials) : null
  }

  // MARK: Core

  async call<T = Record<string, never>>(
    method: string,
    args: object = {},
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<T> {
    const body = JSON.stringify({ method, arguments: args })

    // At most one retry: the first call usually 409s to hand us a session id.
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (this.sessionId) headers[SESSION_HEADER] = this.sessionId
      if (this.authorization) headers.Authorization = this.authorization
      if (this.proxied) headers['X-RPC-Target'] = this.url

      let response: Response
      try {
        response = await fetch(this.proxied ? DEV_PROXY_PATH : this.url, {
          method: 'POST',
          body,
          headers,
          signal: withTimeout(signal),
        })
      } catch (error) {
        if (signal?.aborted) throw error // cancelled by the caller (e.g. React Query); not a failure
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw new TransmissionError('network', 'The server took too long to respond.')
        }
        throw new TransmissionError(
          'network',
          'Couldn’t reach the server. Check the address, and if it’s on a different origin, that it allows cross-origin requests (CORS).',
        )
      }

      switch (true) {
        case response.status === 409:
          this.sessionId = response.headers.get(SESSION_HEADER)
          if (!this.sessionId) {
            throw new TransmissionError(
              'handshake',
              'The server didn’t send a session id. If it’s on a different origin, it must expose the X-Transmission-Session-Id header (CORS).',
            )
          }
          continue
        case response.status === 401 || response.status === 403:
          throw new TransmissionError(
            'unauthorized',
            'Authentication failed. Check your username and password.',
            response.status,
          )
        case response.ok: {
          let decoded: RPCResponse<T>
          try {
            decoded = (await response.json()) as RPCResponse<T>
          } catch {
            throw new TransmissionError('invalid-response', 'The server sent an unexpected response.')
          }
          if (decoded.result !== 'success') throw new TransmissionError('server', capitalizeFirst(decoded.result))
          return (decoded.arguments ?? {}) as T
        }
        case this.proxied && response.status === 502:
          // The dev proxy couldn't reach the daemon; its message says why.
          throw new TransmissionError('network', await response.text())
        default:
          throw new TransmissionError('http', `The server responded with HTTP ${response.status}.`, response.status)
      }
    }
    throw new TransmissionError('handshake', 'Couldn’t establish a session with the server.')
  }

  // MARK: Torrents

  async torrents(fields: readonly string[], ids?: number[], signal?: AbortSignal): Promise<Torrent[]> {
    const args = ids ? { fields, ids } : { fields }
    const response = await this.call<{ torrents: Torrent[] }>('torrent-get', args, { signal })
    return response.torrents
  }

  async magnetLink(id: number): Promise<string | undefined> {
    const [torrent] = await this.torrents(['magnetLink'], [id])
    return torrent?.magnetLink
  }

  start = (ids: number[], now = false) => this.call(now ? 'torrent-start-now' : 'torrent-start', { ids })
  stop = (ids: number[]) => this.call('torrent-stop', { ids })
  verify = (ids: number[]) => this.call('torrent-verify', { ids })
  reannounce = (ids: number[]) => this.call('torrent-reannounce', { ids })

  remove = (ids: number[], deleteLocalData: boolean) =>
    this.call('torrent-remove', { ids, 'delete-local-data': deleteLocalData })

  /** Moves (or just re-points) the torrents' data to `location`. */
  setLocation = (ids: number[], location: string, move: boolean) =>
    this.call('torrent-set-location', { ids, location, move })

  /** Renames a file or folder inside a torrent. For the torrent itself, `path` is its current name. */
  rename = (id: number, path: string, name: string) => this.call('torrent-rename-path', { ids: [id], path, name })

  moveInQueue = (ids: number[], direction: QueueDirection) => this.call(`queue-move-${direction}`, { ids })

  setFiles = (id: number, update: FileUpdate) => {
    const args: Record<string, unknown> = { ids: [id] }
    if (update.wanted?.length) args['files-wanted'] = update.wanted
    if (update.unwanted?.length) args['files-unwanted'] = update.unwanted
    if (update.priorityHigh?.length) args['priority-high'] = update.priorityHigh
    if (update.priorityNormal?.length) args['priority-normal'] = update.priorityNormal
    if (update.priorityLow?.length) args['priority-low'] = update.priorityLow
    return this.call('torrent-set', args)
  }

  async add(args: AddTorrentArguments): Promise<AddTorrentResult> {
    const response = await this.call<{ 'torrent-added'?: AddedTorrent; 'torrent-duplicate'?: AddedTorrent }>(
      'torrent-add',
      args,
    )
    if (response['torrent-added']) return { kind: 'added', torrent: response['torrent-added'] }
    if (response['torrent-duplicate']) return { kind: 'duplicate', torrent: response['torrent-duplicate'] }
    throw new TransmissionError('invalid-response', 'The server sent an unexpected response.')
  }

  // MARK: Session

  async session(signal?: AbortSignal): Promise<SessionInfo> {
    // Be lenient: older daemons may omit some keys.
    return { ...SESSION_DEFAULTS, ...(await this.call<Partial<SessionInfo>>('session-get', {}, { signal })) }
  }

  updateSession = (update: SessionUpdate) => this.call('session-set', update)
}
