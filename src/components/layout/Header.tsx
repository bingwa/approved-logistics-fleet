// src/components/layout/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Search, User, LogOut, Bell, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import { NotificationBell } from '../notifications/NotificationBell'
import { MobileSidebar } from './MobileSidebar'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [demoUser, setDemoUser] = useState<any>(null)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demoSession = sessionStorage.getItem('demoMode')
      if (demoSession) {
        try {
          const parsedDemo = JSON.parse(demoSession)
          setDemoUser(parsedDemo.user)
        } catch (error) {
          console.error('Invalid demo session')
        }
      }
    }
  }, [])

  const handleSignOut = async () => {
    if (demoUser) {
      // Handle demo logout
      sessionStorage.removeItem('demoMode')
      localStorage.removeItem('clientDemo')
      window.location.href = '/auth/signin'
    } else {
      // Handle NextAuth logout
      await signOut({ callbackUrl: '/auth/signin' })
    }
  }

  const handleMobileMenuClick = () => {
    setIsMobileSidebarOpen(true)
  }

  // Use demo user or session user
  const user = demoUser || session?.user
  const userName = user?.name || 'User'
  const userEmail = user?.email || 'user@example.com'
  const userRole = demoUser?.role || 'Fleet Manager'

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={handleMobileMenuClick}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle mobile menu</span>
            </Button>

            {/* Desktop Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            {/* Logo/Title */}
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                Fleet Management
              </h1>
              {demoUser && (
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                  Demo Mode
                </Badge>
              )}
            </div>
          </div>

          {/* Search - Hidden on small screens, shown on larger screens */}
          <div className="hidden md:flex items-center space-x-2 flex-1 max-w-md mx-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fleet records..."
                className="pl-10 bg-background/50"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Theme Toggle - Hidden on mobile, shown on larger screens */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || ''} alt={userName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userName.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">{userRole}</p>
                    {demoUser && (
                      <Badge variant="outline" className="text-xs w-fit bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        Demo User
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {/* Mobile-only Theme Toggle */}
                <DropdownMenuItem className="sm:hidden">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Theme</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{demoUser ? 'Exit Demo' : 'Sign Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
    </>
  )
}
