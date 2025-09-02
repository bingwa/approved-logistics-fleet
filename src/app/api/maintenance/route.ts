import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  console.log('🚀 Starting GET /api/maintenance request')
  
  try {
    // Authentication check (optional for debugging)
    let session = null
    try {
      session = await getServerSession(authOptions)
      console.log('👤 Session check:', session ? 'Found' : 'Not found')
    } catch (authError) {
      console.error('⚠️ Auth error (continuing anyway):', authError)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')
    console.log('📊 Query params:', { truckId })

    // Build query conditions
    let whereConditions: any = {}
    if (truckId && truckId !== 'all') {
      whereConditions.truckId = truckId
    }

    console.log('🔄 Executing maintenance records query...')
    const startTime = Date.now()

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
        spareParts: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          }
        },
        user: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { serviceDate: 'desc' },
    })

    const queryTime = Date.now() - startTime
    console.log(`✅ Query completed in ${queryTime}ms`)
    console.log(`📊 Found ${maintenanceRecords.length} maintenance records`)

    // Process records safely
    const processedRecords = maintenanceRecords.map((record, index) => {
      try {
        return {
          id: record.id || `missing-id-${index}`,
          serviceDate: record.serviceDate || new Date().toISOString(),
          serviceType: record.serviceType || 'UNKNOWN',
          maintenanceCategory: record.maintenanceCategory || 'UNKNOWN',
          description: record.description || 'No description',
          laborCost: Number(record.laborCost) || 0,
          vendorName: record.vendorName || 'Unknown vendor',
          vendorLocation: record.vendorLocation || null,
          technicianName: record.technicianName || null,
          mileageAtService: record.mileageAtService || null,
          nextServiceDue: record.nextServiceDue || null,
          routeTaken: record.routeTaken || null,
          status: record.status || 'COMPLETED',
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: record.updatedAt || new Date().toISOString(),
          truck: {
            registration: record.truck?.registration || 'Unknown',
            make: record.truck?.make || 'Unknown',
            model: record.truck?.model || 'Unknown'
          },
          user: {
            name: record.user?.name || 'Unknown user'
          },
          spareParts: (record.spareParts || []).map((part: any) => ({
            id: part.id || 'unknown',
            name: part.name || 'Unknown part',
            quantity: Number(part.quantity) || 0,
            unitPrice: Number(part.unitPrice) || 0,
            totalPrice: Number(part.totalPrice) || 0
          }))
        }
      } catch (processingError) {
        console.error(`⚠️ Error processing record ${index}:`, processingError)
        return null
      }
    }).filter(Boolean)

    console.log(`✅ Processed ${processedRecords.length} valid records`)

    return NextResponse.json({
      success: true,
      maintenanceRecords: processedRecords,
      count: processedRecords.length,
      queryTime: `${queryTime}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in GET /api/maintenance:', error)

    // Handle specific errors
    if (error?.message?.includes('timeout')) {
      return NextResponse.json({
        error: 'Database query timeout - please try again',
        success: false,
        code: 'TIMEOUT'
      }, { status: 504 })
    }

    if (error?.message?.includes('connection')) {
      return NextResponse.json({
        error: 'Database connection error',
        success: false,
        code: 'CONNECTION_ERROR'
      }, { status: 503 })
    }

    return NextResponse.json({
      error: 'Internal server error - check logs for details',
      success: false,
      code: 'INTERNAL_ERROR',
      debug: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        code: error?.code,
        type: error?.constructor?.name
      } : undefined
    }, { status: 500 })
  }
}
