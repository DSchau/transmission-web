import { cn } from 'cn'
import { LoadingCircle } from '@/components/icons'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <LoadingCircle
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
