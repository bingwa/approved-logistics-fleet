// src/app/api/maintenance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Build filter conditions
    let whereConditions: any = {}
    
    if (truckId && truckId !== 'all') {
      whereConditions.truckId = truckId
    }

    if (from || to) {
      whereConditions.serviceDate = {}
      if (from) whereConditions.serviceDate.gte = new Date(from)
      if (to) whereConditions.serviceDate.lte = new Date(to)
    }

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: whereConditions,
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          }
        },
        spareParts: true,
        user: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { serviceDate: 'desc' },
    })

    console.log(`Fetched ${maintenanceRecords.length} maintenance records`)

    return NextResponse.json({
      success: true,
      maintenanceRecords
    })

  } catch (error) {
    console.error('Error fetching maintenance records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('Authentication failed: No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received maintenance record data:', body)

    const {
      truckId,
      serviceDate,
      serviceType,
      maintenanceCategory,
      description,
      laborCost,
      vendorName,
      vendorLocation,
      technicianName,
      mileageAtService,
      nextServiceDue,
      routeTaken,
      receiptUrl,
      spareParts
    } = body

    // Validate required fields
    if (!truckId || !serviceDate || !serviceType || !maintenanceCategory || 
        !description || !laborCost || !vendorName) {
      console.error('Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate route requirement for maintenance
    if (serviceType === 'MAINTENANCE' && !routeTaken) {
      return NextResponse.json(
        { error: 'Route is required for maintenance activities' },
        { status: 400 }
      )
    }

    const maintenanceRecord = await prisma.maintenanceRecord.create({
      data: {
        truckId,
        serviceDate: new Date(serviceDate),
        serviceType,
        maintenanceCategory,
        description,
        laborCost: parseFloat(laborCost),
        vendorName,
        vendorLocation,
        technicianName,
        mileageAtService: mileageAtService ? parseInt(mileageAtService) : null,
        nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
        routeTaken,
        receiptUrl,
        createdBy: session.user.id,
        spareParts: {
          create: spareParts?.map((part: any) => ({
            truckId,
            name: part.name,
            quantity: parseInt(part.quantity),
            unitPrice: parseFloat(part.unitPrice),
            totalPrice: parseFloat(part.totalPrice),
            receiptUrl: part.receiptUrl,
          })) || []
        }
      },
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          }
        },
        spareParts: true,
        user: {
          select: {
            name: true,
          }
        }
      }
    })

    console.log('Maintenance record created successfully:', maintenanceRecord.id)

    // Invalidate cache for maintenance pages
    revalidatePath('/maintenance')
    revalidatePath('/reports')

    console.log('Cache invalidated')

    return NextResponse.json({
      success: true,
      maintenanceRecord
    }, { status: 201 })

  } catch (error) {
    console.error('Detailed error creating maintenance record:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid truck selected' },
          { status: 400 }
        )
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Duplicate record detected' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create maintenance record. Please try again.' },
      { status: 500 }
    )
  }
}
