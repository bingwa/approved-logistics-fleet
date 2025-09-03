'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      <DevtoolsOnlyInDev />
    </QueryClientProvider>
  )
}

function DevtoolsOnlyInDev() {
  const [Devtools, setDevtools] = useState<null | React.ComponentType<any>>(null)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@tanstack/react-query-devtools')
        .then((mod) => setDevtools(() => mod.ReactQueryDevtools))
        .catch(() => {})
    }
  }, [])
  return Devtools ? <Devtools initialIsOpen={false} /> : null
}
