// src/components/layout/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Search, User, LogOut, Bell, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import { NotificationBell } from '../notifications/NotificationBell'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
  isMobile?: boolean
  sidebarCollapsed?: boolean
}

export function Header({ onMenuClick, isMobile = false, sidebarCollapsed = false }: HeaderProps) {
  const { data: session } = useSession()
  const [demoUser, setDemoUser] = useState(null)
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

  // Use demo user or session user
  const user = demoUser || session?.user
  const userName = user?.name || 'User'
  const userEmail = user?.email || 'user@example.com'
  const userRole = demoUser?.role || 'Fleet Manager'

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className={cn(
            "mr-2 px-2",
            // Always show on mobile, show on desktop only when sidebar collapsed
            isMobile ? "flex" : sidebarCollapsed ? "flex" : "hidden"
          )}
        >
          {isMobile && !sidebarCollapsed ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        {/* Logo/Title - Hidden on mobile when space is tight */}
        <div className="flex items-center space-x-2 mr-4">
          <div className={cn(
            "flex items-center space-x-2",
            "hidden sm:flex" // Hide on very small screens
          )}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AL</span>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold">Approved Logistics</h1>
              <p className="text-xs text-muted-foreground">Fleet Management</p>
            </div>
          </div>
        </div>

        {/* Search - Responsive */}
        <div className={cn(
          "flex-1 max-w-lg mx-4",
          "hidden md:block" // Hide on mobile to save space
        )}>
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4",
              isSearchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              type="search"
              placeholder="Search trucks, maintenance, compliance..."
              className="pl-10 w-full"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>
        </div>

        {/* Mobile search button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="md:hidden mr-2"
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          
          {/* Notifications */}
          <NotificationBell />

          {/* Theme toggle - Hidden on small mobile */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Demo mode badge */}
          {demoUser && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Demo Mode
            </Badge>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || ''} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                {userRole && (
                  <Badge variant="outline" className="w-fit text-xs">
                    {userRole}
                  </Badge>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
