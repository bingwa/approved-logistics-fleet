// src/app/api/fuel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// GET handler to fetch fuel records
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
      whereConditions.date = {}
      if (from) whereConditions.date.gte = new Date(from)
      if (to) whereConditions.date.lte = new Date(to)
    }

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: whereConditions,
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    console.log(`Fetched ${fuelRecords.length} fuel records`)

    return NextResponse.json({
      success: true,
      fuelRecords
    })

  } catch (error) {
    console.error('Error fetching fuel records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel records' },
      { status: 500 }
    )
  }
}

// Updated POST handler with cache invalidation
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('Authentication failed: No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received fuel record data:', body)

    const {
      truckId,
      date,
      liters,
      costPerLiter,
      route,
      odometerReading,
      previousOdometer,
      attendantName,
      receiptNumber,
      receiptUrl,
    } = body

    // Validate required fields
    if (!truckId || !date || !liters || !costPerLiter || !route ||
        !odometerReading || !previousOdometer || !attendantName) {
      console.error('Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate derived fields
    const totalCost = parseFloat(liters) * parseFloat(costPerLiter)
    const distanceCovered = parseInt(odometerReading) - parseInt(previousOdometer)
    const efficiencyKmpl = distanceCovered / parseFloat(liters)

    // Validate distance covered
    if (distanceCovered <= 0) {
      console.error('Validation failed: Invalid odometer readings')
      return NextResponse.json(
        { error: 'Current odometer reading must be greater than previous reading' },
        { status: 400 }
      )
    }

    const fuelRecord = await prisma.fuelRecord.create({
      data: {
        truckId,
        date: new Date(date),
        liters: parseFloat(liters),
        costPerLiter: parseFloat(costPerLiter),
        totalCost,
        route,
        odometerReading: parseInt(odometerReading),
        previousOdometer: parseInt(previousOdometer),
        distanceCovered,
        efficiencyKmpl,
        attendantName,
        receiptNumber: receiptNumber || null,
        receiptUrl: receiptUrl || null,
        createdBy: session.user.id,
      },
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      }
    })

    console.log('Fuel record created successfully:', fuelRecord.id)

    // Update truck's current mileage
    await prisma.truck.update({
      where: { id: truckId },
      data: { currentMileage: parseInt(odometerReading) }
    })

    // Invalidate cache for fuel pages
    revalidatePath('/fuel')
    revalidatePath('/reports')

    console.log('Truck mileage updated and cache invalidated')

    return NextResponse.json({
      success: true,
      fuelRecord
    }, { status: 201 })

  } catch (error) {
    console.error('Detailed error creating fuel record:', error)
    
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
      { error: 'Failed to create fuel record. Please try again.' },
      { status: 500 }
    )
  }
}
