import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { createMockDaemon, type MockOptions } from './daemon.ts'

const SESSION_ID = 'mock-session-id'

export interface MockPluginOptions extends MockOptions {
  /** `"user:pass"` to require HTTP basic auth, e.g. to try the sign-in flow. */
  auth?: string
}

/**
 * Serves a fake Transmission RPC endpoint at `/transmission/rpc` from the Vite dev
 * (and preview) server. Enable with `MOCK=1`; `MOCK_COUNT` and `MOCK_AUTH` tune it.
 */
export function mockTransmission(options: MockPluginOptions = {}): Plugin {
  const daemon = createMockDaemon(options)
  const expectedAuth = options.auth ? `Basic ${Buffer.from(options.auth).toString('base64')}` : null

  const middleware = (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end()
      return
    }
    if (expectedAuth && req.headers.authorization !== expectedAuth) {
      res.statusCode = 401
      // No WWW-Authenticate challenge, so the browser doesn't show its own prompt and the
      // app's sign-in dialog is exercised instead.
      res.end('Unauthorized')
      return
    }
    if (req.headers['x-transmission-session-id'] !== SESSION_ID) {
      res.statusCode = 409
      res.setHeader('X-Transmission-Session-Id', SESSION_ID)
      res.end()
      return
    }
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      let result: unknown
      try {
        const request = JSON.parse(body) as { method: string; arguments?: Record<string, unknown>; tag?: number }
        result = {
          result: 'success',
          arguments: daemon.handle(request.method, request.arguments ?? {}),
          tag: request.tag,
        }
      } catch (error) {
        result = { result: error instanceof Error ? error.message : String(error) }
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    })
  }

  return {
    name: 'mock-transmission',
    configureServer(server) {
      server.middlewares.use('/transmission/rpc', middleware)
      server.httpServer?.once('listening', () => {
        server.config.logger.info('  ➜  Mock Transmission RPC at /transmission/rpc', { timestamp: true })
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/transmission/rpc', middleware)
    },
  }
}
