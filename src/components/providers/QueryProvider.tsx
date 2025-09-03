'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Devtools only in development; nothing loads in production */}
      <DevtoolsOnlyInDev />
    </QueryClientProvider>
  )
}

function DevtoolsOnlyInDev() {
  const [Devtools, setDevtools] = useState<null | React.ComponentType<any>>(null)

  useEffect(() => {
    // This condition is evaluated at build time, so the import is tree‑shaken in production
    if (process.env.NODE_ENV === 'development') {
      import('@tanstack/react-query-devtools')
        .then((mod) => setDevtools(() => mod.ReactQueryDevtools))
        .catch(() => {
          // optional: swallow if not installed locally
        })
    }
  }, [])

  return Devtools ? <Devtools initialIsOpen={false} /> : null
}
