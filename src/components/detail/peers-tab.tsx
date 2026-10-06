import { Lock } from 'lucide-react'
import { Rate } from '@/components/rate'
import { formatPercent } from '@/lib/format'
import type { Torrent } from '@/lib/rpc/types'
import { EmptyRow, LoadingRow } from './detail-rows'

export function PeersTab({ torrent, loading }: { torrent: Torrent; loading: boolean }) {
  if (loading || !torrent.peers) return <LoadingRow />
  if (torrent.peers.length === 0) return <EmptyRow>No peers connected</EmptyRow>

  const peers = [...torrent.peers].sort((a, b) => b.rateToClient + b.rateToPeer - (a.rateToClient + a.rateToPeer))
  return (
    <ul className="divide-y pb-8">
      {peers.map((peer) => (
        <li key={`${peer.address}:${peer.port}`} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[0.8125rem]">{peer.address}</span>
            {peer.isEncrypted && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Encrypted" />}
            <span className="ml-auto text-muted-foreground tabular-nums">{formatPercent(peer.progress)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground text-xs">
            <span className="min-w-0 flex-1 truncate">{peer.clientName || 'Unknown client'}</span>
            {peer.flagStr && (
              <span className="font-mono" title="Peer flags">
                {peer.flagStr}
              </span>
            )}
            {peer.rateToClient > 0 && <Rate rate={peer.rateToClient} direction="down" />}
            {peer.rateToPeer > 0 && <Rate rate={peer.rateToPeer} direction="up" />}
          </div>
        </li>
      ))}
    </ul>
  )
}
