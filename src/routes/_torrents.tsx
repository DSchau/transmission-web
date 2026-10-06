import { createFileRoute, retainSearchParams, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { TorrentsLayout } from '@/components/torrents/torrents-layout'
import { FILTERS, SORTS } from '@/lib/torrent'

const defaults = { filter: 'all', sort: 'addedDate', q: '' } as const

/** List state lives in the URL, so it survives reloads and can be bookmarked or shared. */
const searchSchema = z.object({
  filter: z.enum(FILTERS).default(defaults.filter).catch(defaults.filter),
  sort: z.enum(SORTS).default(defaults.sort).catch(defaults.sort),
  /** Omitted = the sort's natural direction (newest / fastest / biggest first, A→Z). */
  dir: z.enum(['asc', 'desc']).optional().catch(undefined),
  q: z.string().default(defaults.q).catch(defaults.q),
})

export type TorrentsSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_torrents')({
  validateSearch: searchSchema,
  search: {
    middlewares: [retainSearchParams(true), stripSearchParams(defaults)],
  },
  component: TorrentsLayout,
})
