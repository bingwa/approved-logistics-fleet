import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  console.log('[DEBUG] === COMPLIANCE API POST START ===')
  
  try {
    // Step 1: Check session
    const session = await getServerSession(authOptions)
    console.log('[DEBUG] Session check:', session?.user?.id ? 'Valid' : 'Invalid')
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Please sign in to create compliance records'
      }, { status: 401 })
    }

    // Step 2: Parse request body with error handling
    let body
    try {
      body = await request.json()
      console.log('[DEBUG] Request body parsed successfully')
    } catch (parseError) {
      console.error('[DEBUG] JSON parse error:', parseError)
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
    } = body

    console.log('[DEBUG] Extracted data:', {
      truckId,
      documentType,
      certificateNumber,
      issueDate: issueDate ? 'provided' : 'missing',
      expiryDate: expiryDate ? 'provided' : 'null'
    })

    // Step 3: Validate required fields
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

    // Step 4: Verify truck exists
    let truck
    try {
      truck = await prisma.truck.findUnique({
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
    } catch (truckError) {
      console.error('[DEBUG] Truck lookup error:', truckError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: 'Failed to verify truck information'
      }, { status: 500 })
    }

    // Step 5: Process dates
    let issueDateTime: Date
    let expiryDateTime: Date | null = null

    try {
      issueDateTime = new Date(issueDate)
      if (isNaN(issueDateTime.getTime())) {
        throw new Error('Invalid issue date format')
      }

      if (expiryDate) {
        expiryDateTime = new Date(expiryDate)
        if (isNaN(expiryDateTime.getTime())) {
          throw new Error('Invalid expiry date format')
        }

        if (expiryDateTime <= issueDateTime) {
          return NextResponse.json({
            success: false,
            error: 'Invalid date range',
            message: 'Expiry date must be after issue date'
          }, { status: 400 })
        }
      }
    } catch (dateError) {
      console.error('[DEBUG] Date processing error:', dateError)
      return NextResponse.json({
        success: false,
        error: 'Invalid date format',
        message: 'Please provide valid dates'
      }, { status: 400 })
    }

    // Step 6: Calculate status and days to expiry
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

    // Step 7: Build create data object
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
      daysToExpiry
    }

    // Only include expiryDate if it's not null
    if (expiryDateTime) {
      createData.expiryDate = expiryDateTime
    }

    console.log('[DEBUG] Creating compliance document with status:', status)

    // Step 8: Create compliance document
    let complianceDocument
    try {
      complianceDocument = await prisma.complianceDocument.create({
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

      console.log('[DEBUG] Compliance document created successfully:', complianceDocument.id)
    } catch (createError) {
      console.error('[DEBUG] Database create error:', createError)
      
      // Handle specific Prisma errors
      if (createError.code === 'P2002') {
        return NextResponse.json({
          success: false,
          error: 'Duplicate document',
          message: 'A document with this certificate number already exists'
        }, { status: 409 })
      }

      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: 'Failed to create compliance document'
      }, { status: 500 })
    }

    // Step 9: Success response
    return NextResponse.json({
      success: true,
      message: 'Compliance document created successfully',
      data: complianceDocument
    }, { status: 201 })

  } catch (error) {
    console.error('[DEBUG] === COMPLIANCE API FATAL ERROR ===')
    console.error('[DEBUG] Error name:', error?.name)
    console.error('[DEBUG] Error message:', error?.message)
    console.error('[DEBUG] Error stack:', error?.stack)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while creating the compliance document'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const whereClause: any = {}
    if (truckId) {
      whereClause.truckId = truckId
    }

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
        skip,
        take: limit
      }),
      prisma.complianceDocument.count({
        where: whereClause
      })
    ])

    return NextResponse.json({
      success: true,
      data: complianceDocuments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Compliance GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch compliance documents'
    }, { status: 500 })
  }
}
