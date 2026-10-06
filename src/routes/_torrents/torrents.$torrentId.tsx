import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TorrentDetail } from '@/components/detail/torrent-detail'
import { DETAIL_TABS } from '@/lib/torrent'

export const Route = createFileRoute('/_torrents/torrents/$torrentId')({
  params: {
    parse: ({ torrentId }) => ({ torrentId: z.coerce.number().int().parse(torrentId) }),
    stringify: ({ torrentId }) => ({ torrentId: String(torrentId) }),
  },
  validateSearch: z.object({
    tab: z.enum(DETAIL_TABS).optional().catch(undefined),
  }),
  component: DetailRoute,
})

function DetailRoute() {
  const { torrentId } = Route.useParams()
  // Keyed by id so switching torrents starts fresh (scroll position, animations).
  return <TorrentDetail key={torrentId} torrentId={torrentId} />
}
