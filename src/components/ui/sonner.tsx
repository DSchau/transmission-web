import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CheckCircle, CircleInfo, CircleX, ExclamationTriangle, LoadingCircle } from '@/components/icons'
import { useTheme } from '@/lib/theme'

/**
 * Small, quiet toasts that stack into a single card until hovered. The compact look lives in
 * `index.css` under `.toaster`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      position="bottom-right"
      gap={6}
      offset={16}
      mobileOffset={12}
      visibleToasts={4}
      duration={3500}
      icons={{
        success: <CheckCircle className="size-3.5 text-status-seeding" />,
        info: <CircleInfo className="size-3.5 text-muted-foreground" />,
        warning: <ExclamationTriangle className="size-3.5 text-status-checking" />,
        error: <CircleX className="size-3.5 text-destructive" />,
        loading: <LoadingCircle className="size-3.5 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          '--width': '300px',
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
