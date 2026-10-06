import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import type { Torrent } from '@/lib/rpc/types'
import { haveSummary, statusSummary } from '@/lib/torrent'
import { openDialog } from '@/lib/ui'
import { Row, Section } from './detail-rows'

export function OverviewTab({ torrent: t }: { torrent: Torrent }) {
  return (
    <div className="pb-8">
      <Section title="Transfer">
        <Row label="Status">{statusSummary(t)}</Row>
        <Row label="Have">{haveSummary(t)}</Row>
        <Row label="Downloaded">{formatBytes(t.downloadedEver)}</Row>
        <Row label="Uploaded">{formatBytes(t.uploadedEver)}</Row>
        <Row label="Peers">
          {t.peersSendingToUs} ↓ · {t.peersGettingFromUs} ↑ · {t.peersConnected} connected
        </Row>
      </Section>

      <Section title="Information">
        <Row label="Location">
          <button
            type="button"
            onClick={() => openDialog({ type: 'location', torrents: [t] })}
            className="break-all text-right font-mono text-foreground text-xs underline-offset-2 hover:underline"
            title="Set location…"
          >
            {t.downloadDir}
          </button>
        </Row>
        <Row label="Size">{formatBytes(t.totalSize)}</Row>
        <Row label="Added">{formatDateTime(t.addedDate)}</Row>
        {t.doneDate > 0 && <Row label="Completed">{formatDateTime(t.doneDate)}</Row>}
        {t.dateCreated != null && t.dateCreated > 0 && <Row label="Created">{formatDate(t.dateCreated)}</Row>}
        {t.isPrivate != null && <Row label="Privacy">{t.isPrivate ? 'Private' : 'Public'}</Row>}
        {t.creator && <Row label="Creator">{t.creator}</Row>}
        <Row label="Hash">
          <span className="inline-flex items-center gap-1">
            <span className="select-all break-all font-mono text-xs">{t.hashString}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copy hash"
              onClick={() => copyText(t.hashString, 'Hash copied')}
            >
              <Copy />
            </Button>
          </span>
        </Row>
        {t.magnetLink && (
          <Row label="Magnet">
            <Button variant="outline" size="xs" onClick={() => copyText(t.magnetLink ?? '', 'Magnet link copied')}>
              <Copy data-icon="inline-start" /> Copy Link
            </Button>
          </Row>
        )}
        {t.comment && (
          <div className="flex flex-col gap-1 py-2.5 text-sm">
            <dt>Comment</dt>
            <dd className="select-text whitespace-pre-wrap break-words text-muted-foreground">{t.comment}</dd>
          </div>
        )}
      </Section>
    </div>
  )
}
