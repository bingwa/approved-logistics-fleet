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
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demoSession = sessionStorage.getItem('demoMode')
      if (demoSession) {
        try {
          const parsedDemo = JSON.parse(demoSession)
          // Check if demo session is still valid (not expired)
          if (parsedDemo.expires && Date.now() < parsedDemo.expires) {
            setIsDemoMode(true)
          } else {
            // Demo session expired, clear it
            sessionStorage.removeItem('demoMode')
            localStorage.removeItem('clientDemo')
          }
        } catch (error) {
          console.error('Invalid demo session data')
          sessionStorage.removeItem('demoMode')
        }
      }
      setIsLoading(false)
    }
  }, [])

  // Show loading while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-foreground">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  // Check authentication: either NextAuth session OR valid demo mode
  if (!session && !isDemoMode) {
    // Redirect to signin if not authenticated
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 text-center text-sm font-medium">
          🎯 Demo Mode Active - Client Presentation Environment
        </div>
      )}
      <AppLayout>{children}</AppLayout>
    </div>
  )
}
