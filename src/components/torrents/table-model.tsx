import { useSelector } from '@tanstack/react-store'
import {
  type ColumnVisibilityState,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  functionalUpdate,
  type OnChangeFn,
  type ReactTable,
  type Row,
  rowSelectionFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ProgressBar } from '@/components/progress-bar'
import { Rate } from '@/components/rate'
import {
  formatBytes,
  formatDate,
  formatEta,
  formatPercent,
  formatRatio,
  formatRelative,
  formatSpeed,
} from '@/lib/format'
import { preferencesAtom, updatePreferences } from '@/lib/preferences'
import { type Torrent, TorrentStatus } from '@/lib/rpc/types'
import {
  displayProgress,
  hasError,
  rowDetail,
  SORT_INFO,
  stateLabel,
  statusTone,
  type TorrentSort,
  toneText,
} from '@/lib/torrent'
import { selectionAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'

/**
 * One headless TanStack Table drives both layouts: the desktop renders it as a virtualized
 * table, phones and tablets render the same rows as cards. Sorting is owned by the URL,
 * selection by `selectionAtom`, and column visibility by preferences.
 */
export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
  columnSizingFeature,
})

export type TorrentTable = ReactTable<typeof features, Torrent>
export type TorrentRow = Row<typeof features, Torrent>

const helper = createColumnHelper<typeof features, Torrent>()

/** Sort with SORT_INFO, tie-breaking on id so equal keys (e.g. 0 kB/s) don't shuffle between polls. */
const sortBy = (sort: TorrentSort) => ({
  sortFn: (a: TorrentRow, b: TorrentRow) =>
    SORT_INFO[sort].compare(a.original, b.original) || a.original.id - b.original.id,
  sortDescFirst: SORT_INFO[sort].desc,
})

const Numeric = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <span className={cn('tabular-nums', muted && 'text-muted-foreground')}>{children}</span>
)

/** Column ids that hold numbers; right-aligned in the table. */
export const NUMERIC_COLUMNS = new Set(['progress', 'size', 'rateDownload', 'rateUpload', 'eta', 'ratio', 'queue'])

export const columns = helper.columns([
  // Selection is via clicks (⌘/Ctrl-click toggles, Shift-click extends), not checkboxes;
  // selecting more than one torrent shows the selection pane in the inspector.
  helper.accessor('name', {
    header: 'Name',
    size: 320,
    enableHiding: false,
    ...sortBy('name'),
    // flex-1 so the cell fills its column — otherwise the bar only spans the name's width.
    cell: ({ row: { original: t } }) => (
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="mb-1 truncate font-medium leading-snug" title={t.name}>
          {t.name}
        </span>
        <ProgressBar
          progress={displayProgress(t)}
          tone={statusTone(t)}
          active={t.status === TorrentStatus.Downloading && t.rateDownload > 0}
          className="h-1"
        />
        {/* Like Transmission's own rows: state word + progress details + live rates under the bar. */}
        <span
          className={cn(
            'mt-0.5 flex items-baseline gap-1.5 text-muted-foreground text-xs leading-none tabular-nums',
            hasError(t) && 'text-status-error',
          )}
          title={t.errorString || undefined}
        >
          <span className="min-w-0 flex-1 truncate">
            <span className={cn('font-medium', toneText[statusTone(t)])}>{stateLabel(t)}</span> · {rowDetail(t)}
          </span>
          {t.rateDownload > 0 && <Rate rate={t.rateDownload} direction="down" />}
          {t.rateUpload > 0 && <Rate rate={t.rateUpload} direction="up" />}
        </span>
      </div>
    ),
  }),
  helper.accessor((t) => stateLabel(t), {
    id: 'status',
    header: 'Status',
    size: 140,
    ...sortBy('status'),
    cell: ({ row: { original: t } }) => (
      <span className={cn('truncate font-medium', toneText[statusTone(t)])} title={t.errorString || undefined}>
        {stateLabel(t)}
      </span>
    ),
  }),
  helper.accessor('percentDone', {
    id: 'progress',
    header: 'Done',
    size: 72,
    ...sortBy('progress'),
    cell: ({ row: { original: t } }) => <Numeric>{formatPercent(displayProgress(t))}</Numeric>,
  }),
  helper.accessor('sizeWhenDone', {
    id: 'size',
    header: 'Size',
    size: 96,
    ...sortBy('size'),
    cell: ({ getValue }) => <Numeric>{formatBytes(getValue())}</Numeric>,
  }),
  helper.accessor('rateDownload', {
    header: 'Down',
    size: 100,
    ...sortBy('rateDownload'),
    cell: ({ getValue }) => {
      const rate = getValue()
      return rate > 0 ? (
        <span className="text-status-downloading tabular-nums">{formatSpeed(rate)}</span>
      ) : (
        <Numeric muted>—</Numeric>
      )
    },
  }),
  helper.accessor('rateUpload', {
    header: 'Up',
    size: 100,
    ...sortBy('rateUpload'),
    cell: ({ getValue }) => {
      const rate = getValue()
      return rate > 0 ? (
        <span className="text-status-seeding tabular-nums">{formatSpeed(rate)}</span>
      ) : (
        <Numeric muted>—</Numeric>
      )
    },
  }),
  helper.accessor('eta', {
    header: 'ETA',
    size: 84,
    ...sortBy('eta'),
    cell: ({ row: { original: t } }) => (
      <Numeric muted={t.eta < 0}>{(t.status === TorrentStatus.Downloading && formatEta(t.eta)) || '—'}</Numeric>
    ),
  }),
  helper.accessor('uploadRatio', {
    id: 'ratio',
    header: 'Ratio',
    size: 68,
    ...sortBy('ratio'),
    cell: ({ getValue }) => <Numeric>{formatRatio(getValue())}</Numeric>,
  }),
  helper.accessor('addedDate', {
    header: 'Added',
    size: 116,
    ...sortBy('addedDate'),
    cell: ({ getValue }) => (
      <span className="truncate text-muted-foreground" title={formatDate(getValue())}>
        {formatRelative(getValue())}
      </span>
    ),
  }),
  helper.accessor('queuePosition', {
    id: 'queue',
    header: '#',
    size: 56,
    ...sortBy('queue'),
    cell: ({ getValue }) => <Numeric muted>{getValue() + 1}</Numeric>,
  }),
])

/** Human titles for the column picker. */
export const COLUMN_TITLES: Record<string, string> = {
  status: 'Status',
  progress: 'Done',
  size: 'Size',
  rateDownload: 'Download Speed',
  rateUpload: 'Upload Speed',
  eta: 'Time Remaining',
  ratio: 'Ratio',
  addedDate: 'Date Added',
  queue: 'Queue Position',
}

/**
 * Selection through Table's row handler, so Shift extends a range from the last-clicked row.
 * `only` replaces the selection (a plain click); otherwise the row is toggled.
 */
export function toggleRow(row: TorrentRow, { range = false, only = false } = {}) {
  if (only) selectionAtom.set({})
  const checked = only || range ? true : !row.getIsSelected()
  row.getToggleSelectedHandler()({ target: { checked }, shiftKey: range })
}

export function useTorrentTable({
  data,
  sorting,
  onSortingChange,
}: {
  data: Torrent[]
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}): TorrentTable {
  const rowSelection = useSelector(selectionAtom)
  const columnVisibility = useSelector(preferencesAtom, (p) => p.columnVisibility)

  return useTable({
    features,
    columns,
    data,
    getRowId: (t) => String(t.id),
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange,
    onRowSelectionChange: (updater) => selectionAtom.set((prev) => functionalUpdate(updater, prev)),
    onColumnVisibilityChange: (updater) =>
      updatePreferences({
        columnVisibility: functionalUpdate<ColumnVisibilityState>(updater, preferencesAtom.get().columnVisibility),
      }),
    isRowRangeSelectionEvent: (event) => (event as { shiftKey?: boolean }).shiftKey === true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    // The data reference changes on every poll; keep the user's selection.
    autoResetSorting: false,
  })
}
