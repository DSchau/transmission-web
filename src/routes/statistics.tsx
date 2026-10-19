import { createFileRoute } from '@tanstack/react-router'
import { StatisticsPage } from '@/components/statistics/statistics-page'

export const Route = createFileRoute('/statistics')({ component: StatisticsPage })
