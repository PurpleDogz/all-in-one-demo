'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { httpBatchLink, TRPCClientError } from '@trpc/client'
import { useState } from 'react'
import superjson from 'superjson'
import { trpc } from './client'
import { toast } from '@/components/ui/use-toast'
import type { AppRouter } from '@/trpc/appRouter'

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  return 'http://localhost:3000'
}

function getHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const headers: Record<string, string> = {}
  const token = localStorage.getItem('accessToken')
  if (token) headers['Authorization'] = `Bearer ${token}`
  const workspaceId = localStorage.getItem('workspaceId')
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId
  return headers
}

function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    (error as TRPCClientError<AppRouter>).data?.code === 'UNAUTHORIZED'
  )
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isUnauthorized(error)) {
              toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' })
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isUnauthorized(error)) {
              toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' })
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (isUnauthorized(error)) return false
              return failureCount < 1
            },
          },
        },
      }),
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers: getHeaders,
          transformer: superjson,
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
