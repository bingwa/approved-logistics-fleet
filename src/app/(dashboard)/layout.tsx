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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

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
    // Only redirect if we're certain there's no access
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      {isDemoMode && !session && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">
          🎯 Demo Mode Active - Client Presentation Environment
        </div>
      )}
      <AppLayout>{children}</AppLayout>
    </div>
  )
}
