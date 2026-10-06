import { createFileRoute } from '@tanstack/react-router'
import { ConnectPage } from '@/components/settings/connect-page'

export const Route = createFileRoute('/connect')({
  component: ConnectPage,
})
