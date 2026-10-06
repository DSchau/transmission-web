import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Full-page settings layout with a back button and iOS-style grouped sections. */
export function PageShell({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  return (
    <div className="h-full overflow-y-auto bg-muted/40">
      <header className="pt-safe sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-2xl items-center gap-2 px-2">
          <Button
            variant="ghost"
            onClick={() => (canGoBack ? router.history.back() : navigate({ to: '/' }))}
            className="text-base"
          >
            <ChevronLeft data-icon="inline-start" className="size-5" />
            Back
          </Button>
          <h1 className="flex-1 truncate text-center font-semibold">{title}</h1>
          <div className="flex w-20 justify-end">{actions}</div>
        </div>
      </header>
      <main className="pb-safe mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  )
}

export function SettingsSection({
  title,
  footer,
  children,
}: {
  title?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      {title && <h2 className="px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">{title}</h2>}
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
      {footer && <div className="px-4 text-muted-foreground text-xs">{footer}</div>}
    </section>
  )
}

export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode
  description?: ReactNode
  htmlFor?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-12 items-center gap-4 px-4 py-2.5', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={htmlFor} className="text-sm">
          {label}
        </label>
        {description && <div className="text-muted-foreground text-xs">{description}</div>}
      </div>
      {children}
    </div>
  )
}
