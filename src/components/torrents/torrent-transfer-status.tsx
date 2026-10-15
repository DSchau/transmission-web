import { ProgressBar } from '@/components/progress-bar'
import { Rate } from '@/components/rate'
import { formatEta, formatPercent, formatRatio } from '@/lib/format'
import { type Torrent, TorrentStatus } from '@/lib/rpc/types'
import {
  displayProgress,
  hasError,
  isChecking,
  isComplete,
  isMagnetPending,
  stateLabel,
  statusTone,
  toneText,
} from '@/lib/torrent'
import { cn } from '@/lib/utils'

/** Fixed-width slot so one direction appearing or dropping to zero never moves the other. */
function RateSlot({ rate, direction }: { rate: number; direction: 'down' | 'up' }) {
  if (rate <= 0) return <span aria-hidden className="min-w-[3.75rem]" />
  return <Rate rate={rate} direction={direction} className="min-w-[3.75rem] justify-end" />
}

/** Mobile card body: progress bar, then one status line with live rates in fixed slots on the right. */
export function TorrentTransferStatus({ torrent: t }: { torrent: Torrent }) {
  const tone = statusTone(t)
  const progress = displayProgress(t)
  const error = hasError(t) && t.errorString
  const eta = t.status === TorrentStatus.Downloading && !isMagnetPending(t) && !error ? formatEta(t.eta) : null
  const detail = error
    ? t.errorString
    : !isMagnetPending(t) && !isChecking(t) && isComplete(t)
      ? `Ratio ${formatRatio(t.uploadRatio)}`
      : [formatPercent(progress), eta].filter(Boolean).join(' · ')
  const transferring = t.rateDownload > 0 || t.rateUpload > 0

  return (
    <>
      <ProgressBar
        progress={progress}
        tone={tone}
        active={t.status === TorrentStatus.Downloading && t.rateDownload > 0}
        className="mt-1.5"
      />
      <span className="mt-1.5 flex h-5 items-center gap-2 text-xs leading-none tabular-nums">
        <span className={cn('min-w-0 flex-1 truncate', error ? 'text-status-error' : 'text-muted-foreground')}>
          <span className={cn('font-semibold', toneText[tone])}>{stateLabel(t)}</span> · {detail}
        </span>
        {transferring && (
          <span className="flex shrink-0 items-center gap-2">
            <RateSlot rate={t.rateDownload} direction="down" />
            <RateSlot rate={t.rateUpload} direction="up" />
          </span>
        )}
      </span>
    </>
  )
}
