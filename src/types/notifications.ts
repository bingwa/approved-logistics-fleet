// src/types/notifications.ts
export interface Notification {
  id: string
  type: 'compliance' | 'maintenance' | 'fuel' | 'system'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  truckId?: string
  truckRegistration?: string
  actionUrl?: string
  isRead: boolean
  createdAt: Date
  expiresAt?: Date
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  compliance: boolean
  maintenance: boolean
  fuel: boolean
  system: boolean
}
