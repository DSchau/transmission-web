import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatSpeed } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Compact live-rate indicator. */
export function Rate({ rate, direction, className }: { rate: number; direction: 'down' | 'up'; className?: string }) {
  const Icon = direction === 'down' ? ArrowDown : ArrowUp
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-semibold text-xs tabular-nums',
        direction === 'down' ? 'text-status-downloading' : 'text-status-seeding',
        className,
      )}
    >
      <Icon className="size-3" aria-label={direction === 'down' ? 'Download' : 'Upload'} />
      {formatSpeed(rate)}
    </span>
  )
}
