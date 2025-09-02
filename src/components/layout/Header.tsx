'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Search, User, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import ThemeToggle from './ThemeToggle'
import { NotificationDropdown } from '../notifications/NotificationDropdown'

interface HeaderProps {
  onMenuClick: () => void
  isMobile?: boolean
  sidebarCollapsed?: boolean
}

export function Header({ onMenuClick, isMobile = false, sidebarCollapsed = false }: HeaderProps) {
  const { data: session } = useSession()
  const [demoUser, setDemoUser] = useState<any>(null)

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
      sessionStorage.removeItem('demoMode')
      localStorage.removeItem('clientDemo')
      window.location.href = '/auth/signin'
    } else {
      await signOut({ callbackUrl: '/auth/signin' })
    }
  }

  const user = demoUser || session?.user
  const userName = user?.name || 'User'
  const userEmail = user?.email || 'user@example.com'

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
      {/* Left side - Menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="flex-shrink-0"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Center - Search (hidden on mobile) */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search trucks, maintenance, compliance..."
            className="pl-8 w-full"
          />
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || ''} alt={userName} />
                <AvatarFallback>
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
