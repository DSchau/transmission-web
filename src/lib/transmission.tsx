import { useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { type ConnectionConfig, connectionAtom, credentialsAtom, rpcUrlFor } from './connection'
import { PendingChanges } from './pending'
import { SessionHistory } from './rate-history'
import { TransmissionClient } from './rpc/client'
import { exitSelectMode, signInDismissedAtom } from './ui'

export interface Transmission {
  client: TransmissionClient
  pending: PendingChanges
  /** The daemon session's transfer history, for the speed charts. */
  history: SessionHistory
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
      history: new SessionHistory({ storageKey: `transmission-web:session-history:${rpcUrlFor(config)}` }),
      config,
      key: ['transmission', ++generation] as const,
    }),
    [config.id, config.url, credentials],
  )
  useEffect(() => value.history.attach(), [value])

  // Nothing from the previous connection may show under this one.
  const queryClient = useQueryClient()
  const serverId = useRef(config.id)
  useEffect(() => {
    queryClient.removeQueries({
      predicate: ({ queryKey }) => queryKey[0] === value.key[0] && queryKey[1] !== value.key[1],
    })
    if (serverId.current === config.id) return
    serverId.current = config.id
    exitSelectMode()
    signInDismissedAtom.set(false)
  }, [value, config.id, queryClient])

  return <TransmissionContext.Provider value={value}>{children}</TransmissionContext.Provider>
}

export function useTransmission(): Transmission {
  const value = useContext(TransmissionContext)
  if (!value) throw new Error('useTransmission must be used inside <TransmissionProvider>')
  return value
}
