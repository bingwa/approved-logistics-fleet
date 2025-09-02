import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current date for comparisons
    const now = new Date()
    const notifications = []

    // 1. Check for maintenance due (next 30 days)
    try {
      const upcomingMaintenance = await prisma.maintenanceRecord.findMany({
        where: {
          nextServiceDue: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          truck: { select: { registration: true } }
        }
      })

      upcomingMaintenance.forEach(record => {
        const daysUntil = Math.ceil((new Date(record.nextServiceDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `maintenance-${record.id}`,
          userId: session.user.id,
          type: 'MAINTENANCE',
          priority: daysUntil <= 7 ? 'HIGH' : 'MEDIUM',
          title: 'Service Due Soon',
          message: `${record.truck.registration} needs service in ${daysUntil} days`,
          truckId: record.truckId,
          truckRegistration: record.truck.registration,
          actionUrl: '/maintenance',
          isRead: false,
          createdAt: now.toISOString(),
          expiresAt: record.nextServiceDue?.toISOString()
        })
      })
    } catch (maintenanceError) {
      console.error('Error fetching maintenance notifications:', maintenanceError)
    }

    // 2. Check for expired/expiring compliance documents
    try {
      const expiringCompliance = await prisma.complianceDocument.findMany({
        where: {
          OR: [
            { status: 'EXPIRED' },
            { 
              status: 'EXPIRING',
              expiryDate: {
                lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        },
        include: {
          truck: { select: { registration: true } }
        }
      })

      expiringCompliance.forEach(doc => {
        const isExpired = doc.status === 'EXPIRED'
        const daysUntil = doc.expiryDate ? Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
        
        notifications.push({
          id: `compliance-${doc.id}`,
          userId: session.user.id,
          type: 'COMPLIANCE',
          priority: isExpired ? 'CRITICAL' : 'HIGH',
          title: isExpired ? 'Document Expired' : 'Document Expiring Soon',
          message: `${doc.truck.registration} - ${doc.documentType.replace('_', ' ')} ${isExpired ? 'has expired' : `expires in ${Math.abs(daysUntil)} days`}`,
          truckId: doc.truckId,
          truckRegistration: doc.truck.registration,
          actionUrl: '/compliance',
          isRead: false,
          createdAt: now.toISOString(),
          expiresAt: doc.expiryDate?.toISOString()
        })
      })
    } catch (complianceError) {
      console.error('Error fetching compliance notifications:', complianceError)
    }

    // 3. Check for fuel efficiency alerts
    try {
      const recentFuelRecords = await prisma.fuelRecord.findMany({
        where: {
          date: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          truck: { select: { registration: true } }
        },
        orderBy: { date: 'desc' }
      })

      if (recentFuelRecords.length > 0) {
        const avgEfficiency = recentFuelRecords.reduce((sum, record) => sum + record.efficiencyKmpl, 0) / recentFuelRecords.length
        const lowEfficiencyRecords = recentFuelRecords.filter(record => record.efficiencyKmpl < avgEfficiency * 0.8)
        
        lowEfficiencyRecords.slice(0, 3).forEach(record => {
          notifications.push({
            id: `fuel-${record.id}`,
            userId: session.user.id,
            type: 'FUEL',
            priority: 'MEDIUM',
            title: 'Low Fuel Efficiency Alert',
            message: `${record.truck.registration} showing reduced efficiency: ${record.efficiencyKmpl.toFixed(1)} km/L`,
            truckId: record.truckId,
            truckRegistration: record.truck.registration,
            actionUrl: '/fuel',
            isRead: false,
            createdAt: record.date,
            expiresAt: null
          })
        })
      }
    } catch (fuelError) {
      console.error('Error fetching fuel notifications:', fuelError)
    }

    // Sort by priority and date
    const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
    notifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      success: true,
      notifications: notifications.slice(0, 20)
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch notifications' 
      },
      { status: 500 }
    )
  }
}
