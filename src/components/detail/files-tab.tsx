import { useMemo } from 'react'
import { ProgressBar } from '@/components/progress-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBytes, formatPercent } from '@/lib/format'
import { useTorrentActions } from '@/lib/mutations'
import type { Torrent } from '@/lib/rpc/types'
import { cn } from '@/lib/utils'
import { EmptyRow, LoadingRow } from './detail-rows'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const PRIORITIES = [
  { value: '1', label: 'High' },
  { value: '0', label: 'Normal' },
  { value: '-1', label: 'Low' },
]

export function FilesTab({ torrent, loading }: { torrent: Torrent; loading: boolean }) {
  const { setFiles } = useTorrentActions()

  const rows = useMemo(() => {
    const stats = torrent.fileStats ?? []
    return (torrent.files ?? [])
      .map((file, index) => ({
        file,
        index,
        wanted: stats[index]?.wanted ?? true,
        priority: stats[index]?.priority ?? 0,
      }))
      .sort((a, b) => collator.compare(a.file.name, b.file.name))
  }, [torrent.files, torrent.fileStats])

  if (loading) return <LoadingRow />
  if (rows.length === 0) return <EmptyRow>No files yet</EmptyRow>

  const single = rows.length === 1

  return (
    <ul className="divide-y pb-8">
      {rows.map(({ file, index, wanted, priority }) => {
        const slash = file.name.lastIndexOf('/')
        const name = file.name.slice(slash + 1)
        const folder = slash > 0 ? file.name.slice(0, slash) : ''
        const progress = file.length > 0 ? file.bytesCompleted / file.length : 0
        return (
          <li key={index} className="flex gap-3 px-4 py-3 [content-visibility:auto] [contain-intrinsic-size:auto_72px]">
            {!single && (
              <Checkbox
                className="mt-0.5"
                checked={wanted}
                aria-label={wanted ? `Skip ${name}` : `Download ${name}`}
                onCheckedChange={(checked) =>
                  setFiles(torrent.id, checked ? { wanted: [index] } : { unwanted: [index] })
                }
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn('break-words text-sm leading-snug', !wanted && 'text-muted-foreground')}>{name}</p>
                  {folder && (
                    <p className="truncate text-muted-foreground/70 text-xs" dir="rtl" title={folder}>
                      <bdi>{folder}</bdi>
                    </p>
                  )}
                </div>
                {!single && (
                  <Select
                    value={String(priority)}
                    onValueChange={(value) =>
                      setFiles(
                        torrent.id,
                        value === '1'
                          ? { priorityHigh: [index] }
                          : value === '-1'
                            ? { priorityLow: [index] }
                            : { priorityNormal: [index] },
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 w-[5.5rem] text-xs" aria-label="Priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ProgressBar
                progress={progress}
                tone={progress >= 1 ? 'seeding' : wanted ? 'downloading' : 'idle'}
                className="h-1"
              />
              <div className="flex justify-between text-muted-foreground text-xs tabular-nums">
                <span>
                  {formatBytes(file.bytesCompleted)} of {formatBytes(file.length)} ({formatPercent(progress)})
                </span>
                {!wanted && <span>Skipped</span>}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
