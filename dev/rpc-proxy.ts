import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export const RPC_PROXY_PATH = '/__rpc_proxy'
const TARGET_HEADER = 'x-rpc-target'

/**
 * Dev-only RPC forwarder. In `vite dev`, requests for a daemon on another origin go to
 * `/__rpc_proxy` with the real URL in `X-RPC-Target`; this forwards them server-side, so the
 * browser never makes a cross-origin request and no CORS setup is needed while developing.
 */
export function rpcProxy(): Plugin {
  const middleware = async (req: IncomingMessage, res: ServerResponse) => {
    const target = req.headers[TARGET_HEADER]
    let url: URL
    try {
      url = new URL(String(target))
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol')
    } catch {
      res.statusCode = 400
      res.end(`Missing or invalid ${TARGET_HEADER} header`)
      return
    }

    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    for (const name of ['authorization', 'x-transmission-session-id']) {
      const value = req.headers[name]
      if (typeof value === 'string') headers[name] = value
    }

    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers,
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(15_000),
      })
      res.statusCode = upstream.status
      for (const name of ['content-type', 'x-transmission-session-id']) {
        const value = upstream.headers.get(name)
        if (value) res.setHeader(name, value)
      }
      // WWW-Authenticate is deliberately dropped: on a same-origin response it would make the
      // browser show its own login prompt instead of the app's sign-in dialog.
      res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch (error) {
      res.statusCode = 502
      res.end(`Couldn’t reach ${url.host} (${describe(error)}). Check the address and that the daemon is running.`)
    }
  }

  return {
    name: 'rpc-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(RPC_PROXY_PATH, (req, res) => void middleware(req, res))
    },
  }
}

/** Node's fetch says "fetch failed"; the useful part (ECONNREFUSED, ENOTFOUND, …) is in `cause`. */
function describe(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'timed out'
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause
  return cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : String(error))
}
