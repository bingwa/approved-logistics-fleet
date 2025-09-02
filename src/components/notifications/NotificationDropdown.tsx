'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'MAINTENANCE' | 'COMPLIANCE' | 'FUEL' | 'SYSTEM'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// Create a global notification store for cross-component updates
let globalNotifications: Notification[] = []
const notificationListeners: ((notifications: Notification[]) => void)[] = []

const updateGlobalNotifications = (notifications: Notification[]) => {
  globalNotifications = notifications
  notificationListeners.forEach(listener => listener(notifications))
}

const subscribeToNotifications = (callback: (notifications: Notification[]) => void) => {
  notificationListeners.push(callback)
  return () => {
    const index = notificationListeners.indexOf(callback)
    if (index > -1) {
      notificationListeners.splice(index, 1)
    }
  }
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (response.ok) {
        const data = await response.json()
        const fetchedNotifications = data.notifications || []
        setNotifications(fetchedNotifications)
        updateGlobalNotifications(fetchedNotifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAllAsRead = async () => {
    try {
      setIsMarkingRead(true)
      
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        // Immediately update all notifications to read
        const updatedNotifications = notifications.map(notification => ({ 
          ...notification, 
          isRead: true 
        }))
        
        setNotifications(updatedNotifications)
        updateGlobalNotifications(updatedNotifications)
        
        toast.success('All notifications marked as read')
      } else {
        toast.error('Failed to mark notifications as read')
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark notifications as read')
    } finally {
      setIsMarkingRead(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      if (response.ok) {
        // Mark specific notification as read in local state
        const updatedNotifications = notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
        
        setNotifications(updatedNotifications)
        updateGlobalNotifications(updatedNotifications)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Subscribe to global notification updates
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((updatedNotifications) => {
      setNotifications(updatedNotifications)
    })
    
    return unsubscribe
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length
  const recentNotifications = notifications.slice(0, 5)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* FIXED: Only show badge if unreadCount > 0 */}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0 min-w-4"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96">
        {/* Header with Mark All Read */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {/* FIXED: Only show badge if unreadCount > 0 */}
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {/* FIXED: Only show button if there are unread notifications */}
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={markAllAsRead}
              disabled={isMarkingRead}
              className="h-7 text-xs"
            >
              {isMarkingRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span className="ml-1">
                {isMarkingRead ? 'Marking...' : 'Mark all read'}
              </span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : recentNotifications.length > 0 ? (
            recentNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${
                  !notification.isRead ? 'bg-blue-50/30 border-l-2 border-l-blue-500' : ''
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(notification.priority)}`}
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 5 && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-xs">
              View all {notifications.length} notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export the notification store functions for use in other components
export { subscribeToNotifications, updateGlobalNotifications }
