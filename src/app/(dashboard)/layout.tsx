// src/app/(dashboard)/layout.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      // Check multiple sources for demo mode
      const demoSession = sessionStorage.getItem('demoMode')
      const demoAccess = localStorage.getItem('clientDemo')
      const demoCookie = document.cookie.includes('demo-access=true')

      if (demoSession || demoAccess === 'active' || demoCookie) {
        try {
          if (demoSession) {
            const parsedDemo = JSON.parse(demoSession)
            // Check if demo session is still valid (not expired)
            if (parsedDemo.expires && Date.now() < parsedDemo.expires) {
              setIsDemoMode(true)
            } else {
              // Demo session expired, clear it
              sessionStorage.removeItem('demoMode')
              localStorage.removeItem('clientDemo')
              document.cookie = 'demo-access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            }
          } else {
            // Set demo mode from other indicators
            setIsDemoMode(true)
          }
        } catch (error) {
          console.error('Invalid demo session data')
          sessionStorage.removeItem('demoMode')
          setIsDemoMode(demoCookie) // Fall back to cookie
        }
      }
      setIsLoading(false)
    }
  }, [])

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated and not in demo mode
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session && !isDemoMode) {
    router.push('/auth/signin')
    return null
  }

  return <AppLayout isDemoMode={isDemoMode}>{children}</AppLayout>
}
