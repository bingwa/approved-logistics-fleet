// src/components/layout/Header.tsx (Updated)
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Search, User, LogOut, Bell } from 'lucide-react'
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleMobileMenuClick = () => {
    setIsMobileSidebarOpen(true)
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm sticky top-0 z-30"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMobileMenuClick}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden lg:flex"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search - Hidden on small screens, shown on larger screens */}
            <div className={`hidden sm:block transition-all duration-200 ${
              isSearchFocused ? 'w-96' : 'w-64'
            }`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search trucks, records..."
                  className="pl-10 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
            >
              <Search className="h-5 w-5" />
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
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-700 shadow-md">
                    <AvatarImage src={session?.user?.image || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {session?.user?.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                
                {/* Mobile-only Theme Toggle */}
                <div className="sm:hidden">
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Theme</span>
                      <ThemeToggle />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                </div>
                
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
    </>
  )
}
