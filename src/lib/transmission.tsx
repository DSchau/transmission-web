import { useSelector } from '@tanstack/react-store'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type ConnectionConfig, connectionAtom, credentialsAtom, rpcUrlFor } from './connection'
import { PendingChanges } from './pending'
import { TransmissionClient } from './rpc/client'

export interface Transmission {
  client: TransmissionClient
  pending: PendingChanges
  config: ConnectionConfig
  /** Query-key prefix. Changes whenever the connection (or credentials) change, so caches never mix. */
  key: readonly ['transmission', number]
}

const TransmissionContext = createContext<Transmission | null>(null)
let generation = 0

/** Owns the RPC client for the current connection settings. */
export function TransmissionProvider({ children }: { children: ReactNode }) {
  const config = useSelector(connectionAtom)
  const credentials = useSelector(credentialsAtom)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild only when the endpoint or credentials change
  const value = useMemo<Transmission>(
    () => ({
      client: new TransmissionClient(rpcUrlFor(config), credentials),
      pending: new PendingChanges(),
      config,
      key: ['transmission', ++generation] as const,
    }),
    [config.url, credentials],
  )

  return <TransmissionContext.Provider value={value}>{children}</TransmissionContext.Provider>
}

export function useTransmission(): Transmission {
  const value = useContext(TransmissionContext)
  if (!value) throw new Error('useTransmission must be used inside <TransmissionProvider>')
  return value
}
