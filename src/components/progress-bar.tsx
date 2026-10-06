import { type StatusTone, toneBg } from '@/lib/torrent'
import { cn } from '@/lib/utils'

/**
 * Rounded progress bar with a soft gradient fill. Tone changes crossfade;
 * `active` adds a gentle light sweep along the fill.
 */
export function ProgressBar({
  progress,
  tone,
  active = false,
  className,
}: {
  progress: number
  tone: StatusTone
  active?: boolean
  className?: string
}) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full', className)}
    >
      <div className={cn('absolute inset-0 opacity-15 transition-colors duration-500', toneBg[tone])} />
      <div
        className={cn(
          'absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width,background-color] duration-500 ease-out',
          toneBg[tone],
          clamped === 0 && 'opacity-0',
        )}
        style={{ width: `max(${clamped * 100}%, 0.375rem)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/35 to-transparent" />
        {active && (
          <div className="animate-shimmer absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        )}
      </div>
    </div>
  )
}
