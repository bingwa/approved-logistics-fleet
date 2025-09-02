// src/hooks/useNotifications.ts
'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  userId: string
  type: 'MAINTENANCE' | 'COMPLIANCE' | 'FUEL' | 'SYSTEM'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  truckId?: string
  truckRegistration?: string
  actionUrl?: string
  isRead: boolean
  createdAt: string
  expiresAt?: string | null
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true

    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications', { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (isMounted) {
            // Apply read status from local state
            const notificationsWithReadStatus = (data.notifications || []).map((notif: Notification) => ({
              ...notif,
              isRead: readNotifications.has(notif.id)
            }))
            
            setNotifications(notificationsWithReadStatus)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
        if (isMounted) setIsLoading(false)
      }
    }

    // Load read notifications from localStorage
    const storedReadNotifications = localStorage.getItem('readNotifications')
    if (storedReadNotifications) {
      setReadNotifications(new Set(JSON.parse(storedReadNotifications)))
    }

    // Initial fetch
    fetchNotifications()

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [readNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })

      if (response.ok) {
        const newReadNotifications = new Set([...readNotifications, notificationId])
        setReadNotifications(newReadNotifications)
        localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]))
        
        // Update local state immediately
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT'
      })

      if (response.ok) {
        const allIds = notifications.map(n => n.id)
        const newReadNotifications = new Set([...readNotifications, ...allIds])
        setReadNotifications(newReadNotifications)
        localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]))
        
        // Update local state immediately
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })))
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length
  const maintenanceNotifications = notifications.filter(n => n.type === 'MAINTENANCE' && !n.isRead)
  const complianceNotifications = notifications.filter(n => n.type === 'COMPLIANCE' && !n.isRead)
  const fuelNotifications = notifications.filter(n => n.type === 'FUEL' && !n.isRead)

  return {
    notifications,
    unreadCount,
    maintenanceNotifications,
    complianceNotifications,
    fuelNotifications,
    isLoading,
    markAsRead,
    markAllAsRead
  }
}
