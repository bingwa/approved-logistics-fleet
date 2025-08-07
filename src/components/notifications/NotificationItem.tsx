// src/components/notifications/NotificationItem.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Wrench, Fuel, Shield, Check } from 'lucide-react'
import { motion } from 'framer-motion'

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

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onClick: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick
}: NotificationItemProps) {
  const router = useRouter()
  const [isMarking, setIsMarking] = useState(false)

  const getIcon = (type: string) => {
    switch (type) {
      case 'COMPLIANCE':
        return Shield
      case 'MAINTENANCE':
        return Wrench
      case 'FUEL':
        return Fuel
      default:
        return AlertTriangle
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COMPLIANCE':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
      case 'MAINTENANCE':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'FUEL':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'MEDIUM':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const handleClick = () => {
    if (!notification.isRead) {
      handleMarkAsRead()
    }
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      onClick()
    }
  }

  const handleMarkAsRead = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    
    if (notification.isRead) return
    
    setIsMarking(true)
    await onMarkAsRead(notification.id)
    setIsMarking(false)
  }

  const Icon = getIcon(notification.type)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
      className={`p-4 border-l-4 cursor-pointer transition-all ${
        notification.isRead 
          ? 'border-l-transparent bg-transparent' 
          : getPriorityColor(notification.priority)
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor(notification.type)}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                notification.isRead 
                  ? 'text-slate-600 dark:text-slate-400' 
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {notification.title}
              </p>
              
              {notification.truckRegistration && (
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {notification.truckRegistration}
                  </Badge>
                  {notification.truck && (
                    <span className="text-xs text-slate-500">
                      {notification.truck.make} {notification.truck.model}
                    </span>
                  )}
                </div>
              )}
              
              <p className={`text-xs mt-2 ${
                notification.isRead 
                  ? 'text-slate-500 dark:text-slate-500' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {notification.message}
              </p>
              
              <p className="text-xs text-slate-400 mt-2">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <Badge 
                variant={notification.priority === 'CRITICAL' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {notification.priority}
              </Badge>
              
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarking}
                  className="h-6 w-6 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
