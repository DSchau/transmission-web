import type { ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-4">
      <h3 className="pb-1 font-semibold text-muted-foreground text-sm">{title}</h3>
      <dl className="divide-y">{children}</dl>
    </section>
  )
}

/** A label/value row, like iOS's LabeledContent. */
export function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0">{label}</dt>
      <dd className={cn('min-w-0 text-right text-muted-foreground tabular-nums', className)}>{children}</dd>
    </div>
  )
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-muted-foreground text-sm">{children}</p>
}

export function LoadingRow() {
  return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  )
}
