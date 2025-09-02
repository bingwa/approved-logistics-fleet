'use client'

import { useState, useEffect } from 'react'
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
  ChevronRight,
  // Removed Bell import - no longer needed
  Loader2
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

interface Notification {
  id: string
  type: 'MAINTENANCE' | 'COMPLIANCE' | 'FUEL' | 'SYSTEM'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isRead: boolean
}

export function Sidebar({ collapsed, onToggle, isMobile = false }: SidebarProps) {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)

  // Fetch notifications for real-time badges
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Calculate badge counts from notifications
  const unreadCount = notifications.filter(n => !n.isRead).length
  const maintenanceNotifications = notifications.filter(n => n.type === 'MAINTENANCE' && !n.isRead).length
  const complianceNotifications = notifications.filter(n => n.type === 'COMPLIANCE' && !n.isRead).length
  const fuelNotifications = notifications.filter(n => n.type === 'FUEL' && !n.isRead).length

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard 
    },
    { 
      name: 'Maintenance', 
      href: '/maintenance', 
      icon: Wrench, 
      badge: maintenanceNotifications
    },
    { 
      name: 'Fuel Records', 
      href: '/fuel', 
      icon: Fuel,
      badge: fuelNotifications
    },
    { 
      name: 'Compliance', 
      href: '/compliance', 
      icon: Shield, 
      badge: complianceNotifications
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: FileText 
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: User 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings 
    },
  ]

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        isMobile && 'fixed inset-y-0 left-0 z-50 shadow-lg'
      )}
    >
      {/* Header - REMOVED notification bell icon */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Fleet Manager</h2>
              </div>
            </motion.div>
          )}
          
          {collapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
          )}

          {/* Only toggle button - removed notification bell */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}

                {/* Badge for expanded state */}
                {!collapsed && item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge 
                      variant={isActive ? "secondary" : "destructive"}
                      className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5 ml-auto"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  </motion.div>
                )}

                {/* Dot indicator for collapsed state */}
                {collapsed && item.badge && item.badge > 0 && (
                  <div className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Footer - simplified, removed notification bell */}
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <div className="text-xs text-center text-muted-foreground">
              Fleet Management System
            </div>
          </motion.div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => onToggle(true)}
        />
      )}
    </motion.div>
  )
}
