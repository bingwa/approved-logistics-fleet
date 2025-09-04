// src/app/api/compliance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import  prisma  from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  console.log('🔍 [COMPLIANCE GET] Starting request')
  console.log('🔍 [COMPLIANCE GET] Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  })

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ [COMPLIANCE GET] No session found')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    console.log('✅ [COMPLIANCE GET] Session valid for user:', session.user.id)

    // Test database connection first
    try {
      await prisma.$connect()
      console.log('✅ [COMPLIANCE GET] Database connected')
    } catch (dbConnectError) {
      console.error('❌ [COMPLIANCE GET] Database connection failed:', dbConnectError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: 'Unable to connect to database'
      }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')

    const whereClause: any = {}
    if (truckId) {
      whereClause.truckId = truckId
    }

    console.log('🔍 [COMPLIANCE GET] Query params:', { truckId, whereClause })

    // Execute queries with detailed error handling
    const [complianceDocuments, total] = await Promise.all([
      prisma.complianceDocument.findMany({
        where: whereClause,
        include: {
          truck: {
            select: {
              id: true,
              registration: true,
              make: true,
              model: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Limit results to prevent timeout
      }),
      prisma.complianceDocument.count({
        where: whereClause
      })
    ])

    console.log('✅ [COMPLIANCE GET] Query successful:', {
      documentsFound: complianceDocuments.length,
      totalCount: total
    })

    return NextResponse.json({
      success: true,
      data: complianceDocuments,
      pagination: {
        total,
        page: 1,
        limit: 100,
        pages: Math.ceil(total / 100)
      }
    })

  } catch (error) {
    console.error('💥 [COMPLIANCE GET] Fatal error:')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error stack:', error?.stack)
    
    // Handle specific Prisma errors
    if (error?.code === 'P1001') {
      return NextResponse.json({
        success: false,
        error: 'Database unreachable',
        details: 'Cannot reach database server'
      }, { status: 500 })
    }
    
    if (error?.code === 'P1008') {
      return NextResponse.json({
        success: false,
        error: 'Database timeout',
        details: 'Database operation timed out'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch compliance documents',
      details: error?.message || 'Unknown database error'
    }, { status: 500 })
  } finally {
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.error('⚠️ [COMPLIANCE GET] Database disconnect error:', disconnectError)
    }
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 [COMPLIANCE POST] Starting request')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Please sign in to create compliance records'
      }, { status: 401 })
    }

    // Test database connection
    await prisma.$connect()

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        message: 'Request body must be valid JSON'
      }, { status: 400 })
    }

    const {
      truckId,
      documentType,
      certificateNumber,
      issueDate,
      expiryDate,
      cost,
      issuingAuthority,
      documentUrl,
      notes
    } = body

    // Validation
    if (!truckId) {
      return NextResponse.json({
        success: false,
        error: 'Missing truck selection',
        message: 'Please select a truck'
      }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({
        success: false,
        error: 'Missing document type',
        message: 'Please select a document type'
      }, { status: 400 })
    }

    if (!certificateNumber?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing certificate number',
        message: 'Certificate number is required'
      }, { status: 400 })
    }

    if (!issueDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing issue date',
        message: 'Issue date is required'
      }, { status: 400 })
    }

    if (!issuingAuthority?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing issuing authority',
        message: 'Issuing authority is required'
      }, { status: 400 })
    }

    // Verify truck exists
    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { id: true, registration: true }
    })

    if (!truck) {
      return NextResponse.json({
        success: false,
        error: 'Truck not found',
        message: 'The selected truck does not exist'
      }, { status: 404 })
    }

    // Process dates
    const issueDateTime = new Date(issueDate)
    const expiryDateTime = expiryDate ? new Date(expiryDate) : null

    if (isNaN(issueDateTime.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format',
        message: 'Please provide a valid issue date'
      }, { status: 400 })
    }

    if (expiryDateTime && isNaN(expiryDateTime.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format',
        message: 'Please provide a valid expiry date'
      }, { status: 400 })
    }

    if (expiryDateTime && expiryDateTime <= issueDateTime) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date range',
        message: 'Expiry date must be after issue date'
      }, { status: 400 })
    }

    // Calculate status
    let daysToExpiry = 0
    let status = 'VALID'

    if (expiryDateTime) {
      const today = new Date()
      const timeDiff = expiryDateTime.getTime() - today.getTime()
      daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24))
      
      if (daysToExpiry < 0) {
        status = 'EXPIRED'
      } else if (daysToExpiry <= 30) {
        status = 'EXPIRING_SOON'
      }
    }

    // Build create data
    const createData: any = {
      truck: {
        connect: { id: truckId }
      },
      user: {
        connect: { id: session.user.id }
      },
      documentType,
      certificateNumber: certificateNumber.trim(),
      issueDate: issueDateTime,
      status,
      cost: cost ? parseFloat(cost.toString()) : 0,
      issuingAuthority: issuingAuthority.trim(),
      documentUrl: documentUrl || null,
      daysToExpiry,
      notes: notes?.trim() || null
    }

    // Only include expiryDate if it exists
    if (expiryDateTime) {
      createData.expiryDate = expiryDateTime
    }

    // Create compliance document
    const complianceDocument = await prisma.complianceDocument.create({
      data: createData,
      include: {
        truck: {
          select: {
            id: true,
            registration: true,
            make: true,
            model: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    })

    console.log('✅ [COMPLIANCE POST] Document created:', complianceDocument.id)

    return NextResponse.json({
      success: true,
      message: 'Compliance document created successfully',
      data: complianceDocument
    }, { status: 201 })

  } catch (error) {
    console.error('💥 [COMPLIANCE POST] Fatal error:', error)
    
    if (error?.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Duplicate document',
        message: 'A document with this certificate number already exists'
      }, { status: 409 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create compliance document'
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}
