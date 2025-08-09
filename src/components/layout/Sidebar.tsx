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
  User,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
  isMobile?: boolean
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench, badge: 3 },
  { name: 'Fuel Records', href: '/fuel', icon: Fuel },
  { name: 'Compliance', href: '/compliance', icon: Shield, badge: 2 },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ collapsed, onToggle, isMobile = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r",
      "transition-all duration-300 ease-in-out"
    )}>
      
      {/* Logo Area */}
      <div className={cn(
        "flex items-center px-4 py-4 border-b",
        collapsed && !isMobile ? "justify-center px-2" : "justify-start"
      )}>
        {!collapsed || isMobile ? (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Approved Logistics</span>
              <span className="text-xs text-muted-foreground">Fleet Management</span>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && onToggle(true)} // Close sidebar on mobile after navigation
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0 h-5 w-5",
                collapsed && !isMobile ? "mr-0" : "mr-3"
              )} />
              
              {(!collapsed || isMobile) && (
                <span className="flex-1">{item.name}</span>
              )}
              
              {item.badge && (!collapsed || isMobile) && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"} 
                  className="ml-auto text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Collapse Toggle - Hidden on mobile */}
      {!isMobile && (
        <div className="p-2">
          <Button
            variant="ghost"
            onClick={() => onToggle(!collapsed)}
            className={cn(
              "w-full justify-center hover:bg-accent",
              collapsed ? "px-2" : "justify-between px-3"
            )}
            size="sm"
          >
            {!collapsed && <span className="text-sm">Collapse</span>}
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Quick Stats - Only show when expanded */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-t bg-muted/50">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Quick Stats
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 bg-background rounded">
              <div className="font-semibold text-green-600">8</div>
              <div className="text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <div className="font-semibold text-orange-600">2</div>
              <div className="text-muted-foreground">Maintenance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
