import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ConnectPage } from '@/components/settings/connect-page'

export const Route = createFileRoute('/connect')({
  /** `server`: the saved server to edit (the active one by default), or `new` to add one. */
  validateSearch: z.object({ server: z.string().optional().catch(undefined) }),
  component: ConnectPage,
})
