// src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Wrench, 
  Fuel, 
  Shield, 
  FileText, 
  Settings,
  ChevronLeft,
  Building2,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Fuel Records', href: '/fuel', icon: Fuel },
  { name: 'Compliance', href: '/compliance', icon: Shield },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <motion.div
      className="h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 shadow-lg flex flex-col"
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Logo Area */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
        <motion.div
          className="flex items-center space-x-3"
          animate={{ opacity: collapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Approved Logistics</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fleet Management</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <motion.div
              key={item.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon className={cn("flex-shrink-0 h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                  {!collapsed && <span>{item.name}</span>}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <Separator className="mx-4" />

      {/* Collapse Toggle */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(!collapsed)}
          className="w-full justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>
    </motion.div>
  )
}
