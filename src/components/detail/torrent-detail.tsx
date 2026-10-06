import { useCanGoBack, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { ChevronLeft, Ellipsis, Pause, Play, TriangleAlert, X } from 'lucide-react'
import { ActionMenuItems, useTorrentActionGroups } from '@/components/torrents/actions'
import { useTorrentsView } from '@/components/torrents/torrents-view'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsDesktop, useIsSplit } from '@/hooks/use-media-query'
import { formatBytes, formatEta, formatRatio, formatSpeed } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import { PieceBitfield } from '@/lib/pieces'
import { useTorrentDetail } from '@/lib/queries'
import { type Torrent, TorrentStatus } from '@/lib/rpc/types'
import {
  DETAIL_TABS,
  type DetailTab,
  displayProgress,
  hasError,
  isComplete,
  isMagnetPending,
  isPaused,
  pieceBitfield,
  pieceSummary,
  stateLabel,
  statusTone,
  toneText,
} from '@/lib/torrent'
import { clearSelection } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { FilesTab } from './files-tab'
import { OverviewTab } from './overview-tab'
import { PeersTab } from './peers-tab'
import { PieceMap } from './piece-map'
import { TrackersTab } from './trackers-tab'

const TAB_TITLES: Record<DetailTab, string> = {
  overview: 'Overview',
  files: 'Files',
  peers: 'Peers',
  trackers: 'Trackers',
}

export function TorrentDetail({ torrentId }: { torrentId: number }) {
  const { torrent, hasDetail, isMissing, isPending } = useTorrentDetail(torrentId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailToolbar torrent={torrent ?? null} />
      {torrent ? (
        <DetailContent torrent={torrent} hasDetail={hasDetail} />
      ) : isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>Torrent Unavailable</EmptyTitle>
            <EmptyDescription>
              {isMissing ? 'It may have been removed.' : 'It couldn’t be loaded from the server.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}

function DetailToolbar({ torrent }: { torrent: Torrent | null }) {
  const isSplit = useIsSplit()
  const isDesktop = useIsDesktop()
  const { closeDetail } = useTorrentsView()
  const router = useRouter()
  const canGoBack = useCanGoBack()

  const back = () => {
    if (canGoBack) router.history.back()
    else closeDetail()
  }

  return (
    <div className="pt-safe flex h-12 shrink-0 items-center gap-1 border-b px-2">
      {!isSplit && (
        <Button variant="ghost" onClick={back} className="-ml-1 text-base">
          <ChevronLeft data-icon="inline-start" className="size-5" />
          Torrents
        </Button>
      )}
      <div className="flex-1" />
      {torrent && <PauseResumeButton torrent={torrent} />}
      {torrent && <DetailMenu torrent={torrent} />}
      {isDesktop && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => {
                clearSelection()
                closeDetail()
              }}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Close <span className="text-muted-foreground">Esc</span>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function PauseResumeButton({ torrent }: { torrent: Torrent }) {
  const { togglePaused } = useTorrentActions()
  const paused = isPaused(torrent)
  return (
    <Button variant="ghost" onClick={() => togglePaused(torrent)}>
      {paused ? (
        <Play data-icon="inline-start" className="fill-current" />
      ) : (
        <Pause data-icon="inline-start" className="fill-current" />
      )}
      {paused ? 'Resume' : 'Pause'}
    </Button>
  )
}

function DetailMenu({ torrent }: { torrent: Torrent }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DetailMenuItems torrent={torrent} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DetailMenuItems({ torrent }: { torrent: Torrent }) {
  // Pause/Resume already has its own toolbar button.
  const groups = useTorrentActionGroups(torrent, { includePauseResume: false })
  return <ActionMenuItems groups={groups} kind="dropdown" />
}

function DetailContent({ torrent, hasDetail }: { torrent: Torrent; hasDetail: boolean }) {
  const { tab = 'overview' } = useSearch({ from: '/_torrents/torrents/$torrentId' })
  const navigate = useNavigate({ from: '/torrents/$torrentId' })

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Header torrent={torrent} />
      <StatStrip torrent={torrent} />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          navigate({
            search: (prev) => ({ ...prev, tab: value === 'overview' ? undefined : (value as DetailTab) }),
            replace: true,
          })
        }
        className="gap-0"
      >
        {/* Sticky, so tabs stay reachable while scrolling long file lists. */}
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <TabsList className="w-full">
            {DETAIL_TABS.map((value) => (
              <TabsTrigger key={value} value={value} className="flex-1">
                {TAB_TITLES[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview">
          <OverviewTab torrent={torrent} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab torrent={torrent} loading={!hasDetail} />
        </TabsContent>
        <TabsContent value="peers">
          <PeersTab torrent={torrent} loading={!hasDetail} />
        </TabsContent>
        <TabsContent value="trackers">
          <TrackersTab torrent={torrent} loading={!hasDetail} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Header({ torrent: t }: { torrent: Torrent }) {
  const tone = statusTone(t)
  const bitfield = isMagnetPending(t)
    ? PieceBitfield.placeholder(t.metadataPercentComplete)
    : (pieceBitfield(t) ?? PieceBitfield.placeholder(displayProgress(t)))
  const eta = t.status === TorrentStatus.Downloading && !hasError(t) ? formatEta(t.eta) : null

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-3">
      <h2 className="select-text break-words font-bold text-xl leading-tight">{t.name}</h2>
      <div className="flex flex-col gap-2.5">
        <PieceMap bitfield={bitfield} tone={tone} />
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span className="text-muted-foreground">{pieceSummary(t)}</span>
          <span className={cn('shrink-0 font-semibold', eta ? 'text-foreground' : toneText[tone])}>
            {eta ? `${eta} left` : stateLabel(t)}
          </span>
        </div>
      </div>
      {hasError(t) && t.errorString && (
        <p className="flex items-start gap-2 text-sm text-status-error">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {t.errorString}
        </p>
      )}
    </div>
  )
}

/** App Store–style row of metrics separated by hairlines. */
function StatStrip({ torrent: t }: { torrent: Torrent }) {
  const eta = formatEta(t.eta)
  const items = [
    {
      label: 'Download',
      value: formatSpeed(t.rateDownload),
      className: t.rateDownload > 0 && 'text-status-downloading',
    },
    { label: 'Upload', value: formatSpeed(t.rateUpload), className: t.rateUpload > 0 && 'text-status-seeding' },
    { label: 'Ratio', value: formatRatio(t.uploadRatio) },
    eta && !isComplete(t) ? { label: 'Remaining', value: eta } : { label: 'Size', value: formatBytes(t.sizeWhenDone) },
  ]
  return (
    <dl className="mx-4 mb-2 grid grid-cols-4 divide-x rounded-xl border bg-muted/30 py-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col-reverse items-center gap-0.5 px-1">
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd className={cn('truncate font-semibold text-sm tabular-nums', item.className)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
