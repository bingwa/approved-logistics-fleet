// src/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  isDemoMode?: boolean
}

export function AppLayout({ children, isDemoMode = false }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      // Auto-collapse sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first responsive layout */}
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar - Hidden on mobile by default */}
        <div className={cn(
          "transition-all duration-300 ease-in-out border-r bg-card",
          // Desktop behavior
          "hidden md:flex md:flex-col",
          sidebarCollapsed ? "md:w-16" : "md:w-64",
          // Mobile behavior (only show when explicitly opened)
          isMobile && !sidebarCollapsed && "fixed inset-y-0 left-0 z-50 w-64 flex flex-col shadow-lg"
        )}>
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={handleSidebarToggle}
            isMobile={isMobile}
          />
        </div>

        {/* Mobile backdrop when sidebar is open */}
        {isMobile && !sidebarCollapsed && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden" 
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <Header 
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            isMobile={isMobile}
            sidebarCollapsed={sidebarCollapsed}
          />

          {/* Main content */}
          <main className={cn(
            "flex-1 overflow-auto bg-muted/10",
            "px-4 py-4 md:px-6 md:py-6"
          )}>
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
