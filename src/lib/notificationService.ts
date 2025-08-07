// src/lib/notificationService.ts
import { prisma } from '@/lib/prisma'
import { NotificationType, NotificationPriority } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  truckId?: string
  truckRegistration?: string
  actionUrl?: string
  expiresAt?: Date
}

export class NotificationService {
  // Create a new notification
  static async createNotification(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          priority: params.priority,
          title: params.title,
          message: params.message,
          truckId: params.truckId,
          truckRegistration: params.truckRegistration,
          actionUrl: params.actionUrl,
          expiresAt: params.expiresAt,
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          truck: {
            select: { registration: true, make: true, model: true }
          }
        }
      })

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string, includeRead = false) {
    try {
      const where = includeRead 
        ? { userId }
        : { userId, isRead: false }

      const notifications = await prisma.notification.findMany({
        where,
        include: {
          truck: {
            select: { registration: true, make: true, model: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50
      })

      return notifications
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId: userId
        },
        data: {
          isRead: true
        }
      })

      return notification
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      })

      return result
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Check for compliance expiries and create notifications
  static async checkComplianceExpiries() {
    try {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const expiringDocuments = await prisma.complianceDocument.findMany({
        where: {
          expiryDate: {
            lte: thirtyDaysFromNow
          },
          status: {
            in: ['VALID', 'EXPIRING']
          }
        },
        include: {
          truck: true
        }
      })

      for (const doc of expiringDocuments) {
        const daysToExpiry = Math.ceil(
          (doc.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )

        let priority: NotificationPriority = 'LOW'
        let title = ''

        if (daysToExpiry <= 0) {
          priority = 'CRITICAL'
          title = `${doc.documentType} has expired`
        } else if (daysToExpiry <= 7) {
          priority = 'HIGH'
          title = `${doc.documentType} expires in ${daysToExpiry} days`
        } else if (daysToExpiry <= 30) {
          priority = 'MEDIUM'
          title = `${doc.documentType} expires in ${daysToExpiry} days`
        }

        // Get users who should receive this notification (admin and managers)
        const users = await prisma.user.findMany({
          where: {
            role: {
              in: ['ADMIN', 'MANAGER']
            },
            isActive: true
          }
        })

        for (const user of users) {
          // Check if notification already exists
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              type: 'COMPLIANCE',
              truckId: doc.truckId,
              message: {
                contains: doc.documentType
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
              }
            }
          })

          if (!existingNotification) {
            await this.createNotification({
              userId: user.id,
              type: 'COMPLIANCE',
              priority,
              title,
              message: `${doc.documentType} for ${doc.truck.registration} (${doc.truck.make} ${doc.truck.model}) ${daysToExpiry <= 0 ? 'has expired' : `expires on ${doc.expiryDate.toDateString()}`}. Please renew immediately.`,
              truckId: doc.truckId,
              truckRegistration: doc.truck.registration,
              actionUrl: `/compliance?truck=${doc.truckId}`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire in 7 days
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking compliance expiries:', error)
    }
  }

  // Check for maintenance due dates
  static async checkMaintenanceDue() {
    try {
      const trucks = await prisma.truck.findMany({
        include: {
          maintenanceRecords: {
            orderBy: { serviceDate: 'desc' },
            take: 1
          }
        }
      })

      for (const truck of trucks) {
        const lastMaintenance = truck.maintenanceRecords[0]
        const currentMileage = truck.currentMileage
        
        if (lastMaintenance) {
          const mileageSinceLastService = currentMileage - (lastMaintenance.mileageAtService || 0)
          const daysSinceLastService = Math.floor(
            (new Date().getTime() - lastMaintenance.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          let shouldNotify = false
          let priority: NotificationPriority = 'LOW'
          let message = ''

          // Check mileage-based maintenance (every 10,000 km)
          if (mileageSinceLastService >= 10000) {
            shouldNotify = true
            priority = 'HIGH'
            message = `${truck.registration} is due for maintenance. Current mileage: ${currentMileage.toLocaleString()} km, last service: ${(lastMaintenance.mileageAtService || 0).toLocaleString()} km`
          } else if (mileageSinceLastService >= 8000) {
            shouldNotify = true
            priority = 'MEDIUM'
            message = `${truck.registration} approaching maintenance milestone. ${mileageSinceLastService.toLocaleString()} km since last service`
          }

          // Check time-based maintenance (every 90 days)
          if (daysSinceLastService >= 90) {
            shouldNotify = true
            priority = 'HIGH'
            message = `${truck.registration} is overdue for maintenance. Last service was ${daysSinceLastService} days ago`
          } else if (daysSinceLastService >= 75) {
            shouldNotify = true
            priority = 'MEDIUM'
            message = `${truck.registration} due for maintenance in ${90 - daysSinceLastService} days`
          }

          if (shouldNotify) {
            const users = await prisma.user.findMany({
              where: {
                role: { in: ['ADMIN', 'MANAGER'] },
                isActive: true
              }
            })

            for (const user of users) {
              await this.createNotification({
                userId: user.id,
                type: 'MAINTENANCE',
                priority,
                title: 'Maintenance Due',
                message,
                truckId: truck.id,
                truckRegistration: truck.registration,
                actionUrl: `/maintenance?truck=${truck.id}`,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking maintenance due:', error)
    }
  }

  // Check fuel efficiency issues
  static async checkFuelEfficiency() {
    try {
      // Get recent fuel records with poor efficiency
      const recentFuelRecords = await prisma.fuelRecord.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          },
          efficiencyKmpl: {
            lt: 2.0 // Less than 2 km/L is poor efficiency
          }
        },
        include: {
          truck: true
        }
      })

      for (const record of recentFuelRecords) {
        const users = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'MANAGER'] },
            isActive: true
          }
        })

        for (const user of users) {
          await this.createNotification({
            userId: user.id,
            type: 'FUEL',
            priority: 'MEDIUM',
            title: 'Poor Fuel Efficiency Alert',
            message: `${record.truck.registration} recorded poor fuel efficiency: ${record.efficiencyKmpl.toFixed(1)} km/L on ${record.date.toDateString()}. Route: ${record.route}`,
            truckId: record.truckId,
            truckRegistration: record.truck.registration,
            actionUrl: `/fuel?truck=${record.truckId}`,
          })
        }
      }
    } catch (error) {
      console.error('Error checking fuel efficiency:', error)
    }
  }

  // Run all automated checks
  static async runAutomatedChecks() {
    console.log('Running automated notification checks...')
    try {
      await Promise.all([
        this.checkComplianceExpiries(),
        this.checkMaintenanceDue(),
        this.checkFuelEfficiency()
      ])
      console.log('Automated notification checks completed')
    } catch (error) {
      console.error('Error running automated checks:', error)
    }
  }
}
