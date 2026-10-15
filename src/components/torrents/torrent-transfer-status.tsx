import { ProgressBar } from '@/components/progress-bar'
import { Rate } from '@/components/rate'
import { formatBytes, formatEta, formatPercent, formatRatio } from '@/lib/format'
import { type Torrent, TorrentStatus } from '@/lib/rpc/types'
import {
  displayProgress,
  hasError,
  haveBytes,
  isChecking,
  isComplete,
  isMagnetPending,
  stateLabel,
  statusTone,
  toneText,
} from '@/lib/torrent'
import { cn } from '@/lib/utils'

/** Mobile rows keep live rates separate so they never crowd out progress or status. */
export function TorrentTransferStatus({ torrent: t }: { torrent: Torrent }) {
  const tone = statusTone(t)
  const progress = displayProgress(t)
  const transferring =
    t.status === TorrentStatus.Downloading ||
    t.status === TorrentStatus.Seeding ||
    t.rateDownload > 0 ||
    t.rateUpload > 0
  const eta = t.status === TorrentStatus.Downloading && !isMagnetPending(t) && !hasError(t) ? formatEta(t.eta) : null
  const detail = isMagnetPending(t)
    ? 'Waiting for torrent information'
    : isChecking(t)
      ? 'Checking local data'
      : isComplete(t)
        ? `${formatBytes(t.sizeWhenDone)} · Ratio ${formatRatio(t.uploadRatio)}`
        : `${formatBytes(haveBytes(t))} of ${formatBytes(t.sizeWhenDone)}`

  return (
    <span className="mt-2 flex w-full min-w-0 flex-col gap-2">
      <span className="flex items-baseline justify-between gap-2 text-xs">
        <span className={cn('font-semibold', toneText[tone])}>{stateLabel(t)}</span>
        <span className="shrink-0 font-medium text-muted-foreground tabular-nums">{formatPercent(progress)}</span>
      </span>
      <ProgressBar
        progress={progress}
        tone={tone}
        active={t.status === TorrentStatus.Downloading && t.rateDownload > 0}
      />
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-muted-foreground text-xs tabular-nums">
        <span>{detail}</span>
        {eta && <span>{eta} left</span>}
      </span>
      {hasError(t) && t.errorString && (
        <span className="text-status-error text-xs [overflow-wrap:anywhere]">{t.errorString}</span>
      )}
      {transferring && (
        <span className="grid grid-cols-2 gap-3 border-t border-border/60 pt-2">
          <span className="flex min-w-0 flex-col items-start gap-1">
            <span className="text-muted-foreground text-xs">Download</span>
            <Rate rate={t.rateDownload} direction="down" className="whitespace-nowrap text-sm" />
          </span>
          <span className="flex min-w-0 flex-col items-start gap-1">
            <span className="text-muted-foreground text-xs">Upload</span>
            <Rate rate={t.rateUpload} direction="up" className="whitespace-nowrap text-sm" />
          </span>
        </span>
      )}
    </span>
  )
}
