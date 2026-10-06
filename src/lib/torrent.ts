import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Inbox,
  type LucideIcon,
  PauseCircle,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { formatBytes, formatEta, formatPercent, formatRatio } from './format'
import { PieceBitfield } from './pieces'
import { type Torrent, TorrentStatus } from './rpc/types'

// MARK: Derived state

export const isPaused = (t: Torrent) => t.status === TorrentStatus.Stopped
export const isActive = (t: Torrent) => t.rateDownload > 0 || t.rateUpload > 0 || t.status === TorrentStatus.Checking
export const isDownloading = (t: Torrent) =>
  t.status === TorrentStatus.Downloading || t.status === TorrentStatus.DownloadWait
export const isSeeding = (t: Torrent) => t.status === TorrentStatus.Seeding || t.status === TorrentStatus.SeedWait
export const isChecking = (t: Torrent) => t.status === TorrentStatus.Checking || t.status === TorrentStatus.CheckWait
export const hasError = (t: Torrent) => t.error !== 0
export const isMagnetPending = (t: Torrent) => t.metadataPercentComplete < 1
export const isComplete = (t: Torrent) => t.percentDone >= 1
export const haveBytes = (t: Torrent) => t.sizeWhenDone - t.leftUntilDone

/** The progress value that best represents what the torrent is doing right now. */
export function displayProgress(t: Torrent): number {
  if (isChecking(t)) return t.recheckProgress
  if (isMagnetPending(t)) return t.metadataPercentComplete
  return t.percentDone
}

export function pieceBitfield(t: Torrent): PieceBitfield | null {
  return PieceBitfield.fromBase64(t.pieces, t.pieceCount)
}

// MARK: Presentation

/** Semantic color for a torrent's state. Maps to `--status-*` CSS variables. */
export type StatusTone = 'downloading' | 'seeding' | 'checking' | 'idle' | 'error'

export function statusTone(t: Torrent): StatusTone {
  if (hasError(t)) return 'error'
  switch (t.status) {
    case TorrentStatus.Downloading:
      return 'downloading'
    case TorrentStatus.Seeding:
      return 'seeding'
    case TorrentStatus.Checking:
    case TorrentStatus.CheckWait:
      return 'checking'
    default:
      return 'idle'
  }
}

/** Tailwind classes per tone. Kept as literals so Tailwind can see them. */
export const toneText: Record<StatusTone, string> = {
  downloading: 'text-status-downloading',
  seeding: 'text-status-seeding',
  checking: 'text-status-checking',
  idle: 'text-status-idle',
  error: 'text-status-error',
}

export const toneBg: Record<StatusTone, string> = {
  downloading: 'bg-status-downloading',
  seeding: 'bg-status-seeding',
  checking: 'bg-status-checking',
  idle: 'bg-status-idle',
  error: 'bg-status-error',
}

export const STATUS_TITLES: Record<TorrentStatus, string> = {
  [TorrentStatus.Stopped]: 'Paused',
  [TorrentStatus.CheckWait]: 'Queued for verification',
  [TorrentStatus.Checking]: 'Verifying',
  [TorrentStatus.DownloadWait]: 'Queued',
  [TorrentStatus.Downloading]: 'Downloading',
  [TorrentStatus.SeedWait]: 'Queued for seeding',
  [TorrentStatus.Seeding]: 'Seeding',
}

/** Short state word for rows: "Seeding", "Paused", "Error", … */
export function stateLabel(t: Torrent): string {
  if (hasError(t)) return 'Error'
  switch (t.status) {
    // "Finished" in Transmission means the seed ratio/idle limit stopped it — not a user pause.
    case TorrentStatus.Stopped:
      return t.isFinished ? 'Seeding complete' : 'Paused'
    case TorrentStatus.CheckWait:
    case TorrentStatus.Checking:
      return 'Verifying'
    case TorrentStatus.DownloadWait:
    case TorrentStatus.SeedWait:
      return 'Queued'
    case TorrentStatus.Downloading:
      return isMagnetPending(t) ? 'Fetching metadata' : 'Downloading'
    case TorrentStatus.Seeding:
      return 'Seeding'
  }
}

/** Everything after the state word in a row — no repetition of the state itself. */
export function rowDetail(t: Torrent): string {
  if (hasError(t) && t.errorString) return t.errorString
  const percent = formatPercent(displayProgress(t))
  if (isMagnetPending(t)) return percent
  const ofSize = `${formatBytes(haveBytes(t))} of ${formatBytes(t.sizeWhenDone)}`
  switch (t.status) {
    case TorrentStatus.Checking:
    case TorrentStatus.CheckWait:
      return percent
    case TorrentStatus.Downloading: {
      const eta = formatEta(t.eta)
      return eta ? `${percent} · ${ofSize} · ${eta} left` : `${percent} · ${ofSize}`
    }
    case TorrentStatus.DownloadWait:
      return `${percent} · ${ofSize}`
    case TorrentStatus.Seeding:
    case TorrentStatus.SeedWait:
      return `${formatBytes(t.sizeWhenDone)} · Ratio ${formatRatio(t.uploadRatio)}`
    case TorrentStatus.Stopped:
      return isComplete(t)
        ? `${formatBytes(t.sizeWhenDone)} · Ratio ${formatRatio(t.uploadRatio)}`
        : `${percent} of ${formatBytes(t.sizeWhenDone)}`
  }
}

/** "45% · 2.8 GB of 6.1 GB" */
export const haveSummary = (t: Torrent) =>
  `${formatPercent(t.percentDone, true)} · ${formatBytes(haveBytes(t))} of ${formatBytes(t.sizeWhenDone)}`

/** "1,204 of 2,048 pieces · 4 MB" — falls back to byte progress before piece data loads. */
export function pieceSummary(t: Torrent): string {
  if (isMagnetPending(t)) return 'Fetching metadata…'
  if (isChecking(t)) return `Verifying · ${formatPercent(t.recheckProgress)}`
  const bitfield = pieceBitfield(t)
  if (!bitfield) return haveSummary(t)
  const have = bitfield.haveCount
  const size = t.pieceSize ? ` · ${formatBytes(t.pieceSize)}` : ''
  const total = bitfield.count.toLocaleString()
  return have === bitfield.count ? `${total} pieces${size}` : `${have.toLocaleString()} of ${total} pieces${size}`
}

/** "Downloading from 4 of 12 peers — 12m remaining" */
export function statusSummary(t: Torrent): string {
  if (hasError(t) && t.errorString) return t.errorString
  switch (t.status) {
    case TorrentStatus.Downloading: {
      const eta = formatEta(t.eta)
      const text = `Downloading from ${t.peersSendingToUs} of ${t.peersConnected} peers`
      return eta ? `${text} — ${eta} remaining` : text
    }
    case TorrentStatus.Seeding:
      return `Seeding to ${t.peersGettingFromUs} of ${t.peersConnected} peers`
    case TorrentStatus.Checking:
      return `Verifying (${formatPercent(t.recheckProgress)})`
    default:
      return STATUS_TITLES[t.status]
  }
}

// MARK: Filtering

export const FILTERS = ['all', 'active', 'downloading', 'seeding', 'paused', 'completed', 'error'] as const
export type TorrentFilter = (typeof FILTERS)[number]

export const FILTER_INFO: Record<TorrentFilter, { title: string; icon: LucideIcon; matches: (t: Torrent) => boolean }> =
  {
    all: { title: 'All', icon: Inbox, matches: () => true },
    active: { title: 'Active', icon: Zap, matches: isActive },
    downloading: { title: 'Downloading', icon: ArrowDownCircle, matches: isDownloading },
    seeding: { title: 'Seeding', icon: ArrowUpCircle, matches: isSeeding },
    paused: { title: 'Paused', icon: PauseCircle, matches: isPaused },
    // Fully downloaded, whatever it's doing now (seeding, paused, or stopped at its ratio).
    completed: { title: 'Completed', icon: CheckCircle2, matches: isComplete },
    error: { title: 'Errors', icon: TriangleAlert, matches: hasError },
  }

export function filterTorrents(torrents: Torrent[], filter: TorrentFilter, query: string): Torrent[] {
  const q = query.trim().toLocaleLowerCase()
  const { matches } = FILTER_INFO[filter]
  if (filter === 'all' && !q) return torrents
  return torrents.filter((t) => matches(t) && (!q || t.name.toLocaleLowerCase().includes(q)))
}

export function countByFilter(torrents: Torrent[]): Record<TorrentFilter, number> {
  const counts = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<TorrentFilter, number>
  for (const t of torrents) for (const f of FILTERS) if (FILTER_INFO[f].matches(t)) counts[f]++
  return counts
}

// MARK: Sorting

/** Sort keys double as table column ids. */
export const SORTS = [
  'addedDate',
  'name',
  'progress',
  'rateDownload',
  'rateUpload',
  'size',
  'eta',
  'ratio',
  'queue',
  'status',
] as const
export type TorrentSort = (typeof SORTS)[number]

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const etaValue = (t: Torrent) => (t.eta < 0 ? Number.POSITIVE_INFINITY : t.eta)

/** `compare` is ascending; `desc` is the natural first direction (e.g. newest / fastest first). */
export const SORT_INFO: Record<
  TorrentSort,
  { title: string; desc: boolean; compare: (a: Torrent, b: Torrent) => number }
> = {
  addedDate: { title: 'Date Added', desc: true, compare: (a, b) => a.addedDate - b.addedDate },
  name: { title: 'Name', desc: false, compare: (a, b) => collator.compare(a.name, b.name) },
  progress: { title: 'Progress', desc: true, compare: (a, b) => a.percentDone - b.percentDone },
  rateDownload: { title: 'Download Speed', desc: true, compare: (a, b) => a.rateDownload - b.rateDownload },
  rateUpload: { title: 'Upload Speed', desc: true, compare: (a, b) => a.rateUpload - b.rateUpload },
  size: { title: 'Size', desc: true, compare: (a, b) => a.sizeWhenDone - b.sizeWhenDone },
  eta: { title: 'Time Remaining', desc: false, compare: (a, b) => etaValue(a) - etaValue(b) },
  ratio: { title: 'Ratio', desc: true, compare: (a, b) => a.uploadRatio - b.uploadRatio },
  queue: { title: 'Queue Order', desc: false, compare: (a, b) => a.queuePosition - b.queuePosition },
  status: { title: 'Status', desc: false, compare: (a, b) => collator.compare(stateLabel(a), stateLabel(b)) },
}

/** The sorts offered in the compact (non-table) sort menu, mirroring the iOS app. */
export const MENU_SORTS: TorrentSort[] = [
  'addedDate',
  'name',
  'progress',
  'rateDownload',
  'rateUpload',
  'size',
  'queue',
]

export function sortTorrents(torrents: Torrent[], sort: TorrentSort, desc: boolean): Torrent[] {
  const { compare } = SORT_INFO[sort]
  // Tie-break on id so equal keys (e.g. 0 kB/s) don't shuffle between polls.
  return [...torrents].sort((a, b) => (desc ? -1 : 1) * (compare(a, b) || a.id - b.id))
}

// MARK: Detail

export const DETAIL_TABS = ['overview', 'files', 'peers', 'trackers'] as const
export type DetailTab = (typeof DETAIL_TABS)[number]
