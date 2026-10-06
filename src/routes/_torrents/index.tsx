import { createFileRoute } from '@tanstack/react-router'
import { ArrowDownCircle } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export const Route = createFileRoute('/_torrents/')({
  component: NothingSelected,
})

/** Detail column with nothing selected (only visible in split layouts). */
function NothingSelected() {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ArrowDownCircle />
        </EmptyMedia>
        <EmptyTitle>No Torrent Selected</EmptyTitle>
        <EmptyDescription>Select a torrent to see its details.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
