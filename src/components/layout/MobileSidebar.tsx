// src/components/layout/MobileSidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Truck,
  Fuel,
  Wrench,
  Shield,
  FileBarChart,
  Settings,
  X,
  Building2
} from 'lucide-react'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: number
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Fleet Overview', href: '/fleet', icon: Truck },
    { name: 'Fuel Management', href: '/fuel', icon: Fuel },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, badge: 3 },
    { name: 'Compliance', href: '/compliance', icon: Shield, badge: 2 },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
    onClose()
  }

  // Close sidebar when route changes
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 lg:hidden shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Approved Logistics
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Fleet Management
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <ScrollArea className="flex-1">
                <nav className="p-4">
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href
                      const Icon = item.icon

                      return (
                        <Button
                          key={item.name}
                          variant={isActive ? 'default' : 'ghost'}
                          className={`w-full justify-start h-12 text-left font-medium transition-all ${
                            isActive
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => handleNavigation(item.href)}
                        >
                          <Icon className={`h-5 w-5 mr-3 ${
                            isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                          }`} />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge 
                              className={`ml-2 ${
                                isActive 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </nav>

                <Separator className="mx-4" />

                {/* Quick Stats */}
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        8
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Active Trucks
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-lg font-bold text-red-900 dark:text-red-100">
                        2
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        In Maintenance
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
