import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { GlobalDialogs } from '@/components/dialogs/global-dialogs'
import { SignInDialog } from '@/components/dialogs/sign-in-dialog'
import { DropZone } from '@/components/drop-zone'
import { Toaster } from '@/components/ui/sonner'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
})

function Root() {
  return (
    <>
      <Outlet />
      <GlobalDialogs />
      <SignInDialog />
      <DropZone />
      <Toaster position="bottom-center" />
    </>
  )
}
