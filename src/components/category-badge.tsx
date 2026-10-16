import { CATEGORY_INFO, categoryOf } from '@/lib/category'
import type { Torrent } from '@/lib/rpc/types'
import { cn } from '@/lib/utils'

/** The category's icon in its color, labeled for screen readers. */
export function CategoryIcon({ torrent, className }: { torrent: Torrent; className?: string }) {
  const info = CATEGORY_INFO[categoryOf(torrent)]
  return <info.icon role="img" aria-label={info.title} className={cn('shrink-0', info.text, className)} />
}
