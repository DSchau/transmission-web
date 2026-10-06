import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeSync } from '@/lib/theme'
import { TransmissionProvider } from '@/lib/transmission'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Polling drives freshness; don't refetch just because a component mounted.
      staleTime: 1000,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  // Hash routing: the app is usually served as static files from Transmission's web folder
  // (or any static host), which can't rewrite deep links to index.html.
  history: createHashHistory(),
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <TransmissionProvider>
        <TooltipProvider delayDuration={400}>
          <RouterProvider router={router} />
        </TooltipProvider>
      </TransmissionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
