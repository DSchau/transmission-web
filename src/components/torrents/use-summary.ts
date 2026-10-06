import { useQueryClient } from '@tanstack/react-query'
import { formatNumber, quantizeRate } from '@/lib/format'
import { useSession } from '@/lib/queries'
import { useTransmission } from '@/lib/transmission'
import { useTorrentsView } from './torrents-view'

/**
 * "92 of 1,633 torrents", plus total rates. Rates are quantized to 1 significant figure so
 * the summary doesn't rewrite itself on every poll's jitter.
 */
export function useTransferSummary() {
  const { torrents, visible } = useTorrentsView()
  const { data: session } = useSession()
  let down = 0
  let up = 0
  for (const t of torrents) {
    down += t.rateDownload
    up += t.rateUpload
  }
  const shown = visible.length
  const total = torrents.length
  const noun = (shown === total ? total : shown) === 1 ? 'torrent' : 'torrents'
  return {
    countText:
      shown === total ? `${formatNumber(total)} ${noun}` : `${formatNumber(shown)} of ${formatNumber(total)} ${noun}`,
    down: quantizeRate(down),
    up: quantizeRate(up),
    exactDown: down,
    exactUp: up,
    altSpeedEnabled: session?.['alt-speed-enabled'] ?? false,
  }
}

/** Refetches everything for the current connection right away. */
export function useRetryConnection() {
  const queryClient = useQueryClient()
  const { key } = useTransmission()
  return () => queryClient.refetchQueries({ queryKey: key })
}
