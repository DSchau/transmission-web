import { createFileRoute } from '@tanstack/react-router'
import { StatisticsPage } from '@/components/settings/statistics-page'

export const Route = createFileRoute('/statistics')({
  component: StatisticsPage,
})
