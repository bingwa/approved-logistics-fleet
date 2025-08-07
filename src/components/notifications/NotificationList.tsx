// src/components/notifications/NotificationList.tsx
'use client'

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { NotificationItem } from './NotificationItem'
import { CheckCheck, Settings, Bell } from 'lucide-react' // ← Add Bell here

interface Notification {
  id: string
  type: string
  priority: string
  title: string
  message: string
  truckRegistration?: string
  actionUrl?: string
  isRead: boolean
  createdAt: string
  truck?: {
    registration: string
    make: string
    model: string
  }
}

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClose: () => void
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}: NotificationListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  
  const unreadNotifications = notifications.filter(n => !n.isRead)
  const filteredNotifications = filter === 'unread' 
    ? unreadNotifications 
    : notifications

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Notifications
          </h3>
          <div className="flex items-center space-x-2">
            {unreadNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex space-x-1 mt-3">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs"
          >
            Unread ({unreadNotifications.length})
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <ScrollArea className="max-h-96">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-2">
              <Bell className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
