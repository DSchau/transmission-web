import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { rpcProxy } from './dev/rpc-proxy.ts'
import { mockTransmission } from './mock/plugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.MOCK === '1'
  // The daemon the dev server proxies `/transmission/rpc` to (same-origin in dev, no CORS needed).
  const target = env.TRANSMISSION_URL || 'http://localhost:9091'

  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string
  }

  return {
    define: { __APP_VERSION__: JSON.stringify(version) },
    // Relative base so the build works from any folder, e.g. TRANSMISSION_WEB_HOME.
    base: './',
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      rpcProxy(),
      useMock && mockTransmission({ count: Number(env.MOCK_COUNT) || undefined, auth: env.MOCK_AUTH }),
    ],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      proxy: useMock ? undefined : { '/transmission/rpc': { target, changeOrigin: true } },
    },
  }
})
