/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional build-time default RPC URL (empty = same origin). */
  readonly VITE_RPC_URL?: string
}

/** From package.json, injected by Vite. */
declare const __APP_VERSION__: string
