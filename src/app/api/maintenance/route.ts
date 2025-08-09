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

    const whereConditions: any = {}
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
        truck: { select: { registration: true, make: true, model: true } },
        spareParts: true,
        user: { select: { name: true } }
      },
      orderBy: { serviceDate: 'desc' }
    })

    return NextResponse.json({ success: true, maintenanceRecords })
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // DEBUG: Log the entire body received
    console.log('[DEBUG] Backend received body:')
    console.log(JSON.stringify(body, null, 2))
    console.log('[DEBUG] session.user.id:', session?.user?.id)

    const {
      truckId,
      serviceDate,
      serviceType,
      maintenanceCategory,
      description,
      laborCost,
      vendorName,
      vendorLocation = '',
      technicianName = '',
      mileageAtService,
      nextServiceDue,
      routeTaken = '',
      receiptUrl = '',
      spareParts = []
    } = body

    // Check if truck exists in database
    const doesTruckExist = await prisma.truck.findUnique({ where: { id: truckId } })
    console.log('[DEBUG] Does truck exist?', doesTruckExist ? true : false)
    console.log('[DEBUG] Truck ID being checked:', truckId)

    if (!doesTruckExist) {
      return NextResponse.json({ error: 'Truck not found in database' }, { status: 400 })
    }

    // Ensure user exists in database - create if missing
   // Replace the user creation section with this:
let user = await prisma.user.findUnique({ where: { id: session.user.id } })
if (!user) {
  // Try to find user by email first
  const existingUserByEmail = await prisma.user.findUnique({ 
    where: { email: session.user.email || '' } 
  })
  
  if (existingUserByEmail) {
    // Update existing user with session ID
    user = await prisma.user.update({
      where: { email: session.user.email || '' },
      data: { id: session.user.id }
    })
    console.log('[DEBUG] Updated existing user with new session ID:', user.id)
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.name || '',
      }
    })
    console.log('[DEBUG] Created new user:', user.id)
  }
}

    // Validation
    const missingFields: string[] = []
    if (!truckId) missingFields.push('truckId')
    if (!serviceDate) missingFields.push('serviceDate')
    if (!serviceType) missingFields.push('serviceType')
    if (!maintenanceCategory) missingFields.push('maintenanceCategory')
    if (!description) missingFields.push('description')
    if (laborCost === undefined || laborCost === null) missingFields.push('laborCost')
    if (!vendorName) missingFields.push('vendorName')

    if (missingFields.length > 0) {
      console.error('[DEBUG] Missing fields detected:', missingFields)
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    if (serviceType === 'MAINTENANCE' && !routeTaken) {
      console.error('[DEBUG] Missing routeTaken for MAINTENANCE serviceType')
      return NextResponse.json(
        { error: 'Route is required for maintenance activities' },
        { status: 400 }
      )
    }

    const dataToInsert = {
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
        create: spareParts.map((part: any) => ({
          truckId,
          name: part.name,
          quantity: parseInt(part.quantity),
          unitPrice: parseFloat(part.unitPrice),
          totalPrice: parseFloat(part.totalPrice),
          receiptUrl: part.receiptUrl || '',
        })),
      },
    }

    // DEBUG: Log insert payload to Prisma
    console.log('[DEBUG] Data to insert into Prisma:')
    console.log(JSON.stringify(dataToInsert, null, 2))

    const maintenanceRecord = await prisma.maintenanceRecord.create({
      data: dataToInsert,
      include: {
        truck: { select: { registration: true, make: true, model: true } },
        spareParts: true,
        user: { select: { name: true } }
      }
    })

    console.log('[DEBUG] Created maintenance record with ID:', maintenanceRecord.id)

    revalidatePath('/maintenance')
    revalidatePath('/reports')

    return NextResponse.json({ success: true, maintenanceRecord }, { status: 201 })
  } catch (error) {
    console.error('[DEBUG] Error creating maintenance record:', error)
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ error: 'Invalid foreign key value' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    )
  }
}
