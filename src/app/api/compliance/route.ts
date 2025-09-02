import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  console.log('🚀 GET /api/compliance starting')
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const truckId = searchParams.get('truckId')

    let whereConditions: any = {}
    if (truckId && truckId !== 'all') {
      whereConditions.truckId = truckId
    }

    const documents = await prisma.complianceDocument.findMany({
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
      orderBy: { expiryDate: 'asc' },
    })

    console.log(`✅ Found ${documents.length} compliance documents`)
    return NextResponse.json({ success: true, documents })

  } catch (error: any) {
    console.error('❌ GET /api/compliance error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch compliance documents'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('[DEBUG] === COMPLIANCE API POST START ===')
  
  try {
    // Step 1: Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Step 2: Parse request body
    let body
    try {
      body = await request.json()
      console.log('[DEBUG] Request body parsed successfully:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 })
    }

    // Step 3: Extract and validate data
    const {
      truckId,
      documentType,
      certificateNumber,
      issueDate,
      expiryDate,
      cost,
      issuingAuthority,
      documentUrl
    } = body

    // Step 4: Validate required fields
    const requiredFields = { truckId, documentType, issueDate, issuingAuthority, certificateNumber, cost }
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missingFields,
        received: requiredFields
      }, { status: 400 })
    }

    // Step 5: Verify truck exists
    const truck = await prisma.truck.findUnique({
      where: { id: truckId }
    })

    if (!truck) {
      return NextResponse.json({
        success: false,
        error: 'Truck not found',
        truckId
      }, { status: 404 })
    }

    // Step 6: Calculate status and daysToExpiry
    const today = new Date()
    const expiryDateObj = expiryDate ? new Date(expiryDate) : null
    let finalStatus = 'VALID'
    let daysToExpiry = 0

    if (expiryDateObj) {
      daysToExpiry = Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysToExpiry < 0) {
        finalStatus = 'EXPIRED'
      } else if (daysToExpiry <= 30) {
        finalStatus = 'EXPIRING'
      } else {
        finalStatus = 'VALID'
      }
    }

    // Step 7: Create compliance document
    const complianceDocument = await prisma.complianceDocument.create({
      data: {
        truckId,
        documentType,
        certificateNumber: certificateNumber || '',
        issueDate: new Date(issueDate),
        expiryDate: expiryDateObj,
        status: finalStatus,
        cost: cost ? parseFloat(cost.toString()) : 0,
        issuingAuthority: issuingAuthority || '',
        documentUrl: documentUrl || null,
        daysToExpiry,
        user: {
          connect: {
            id: session.user.id
          }
        }
      },
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

    return NextResponse.json({
      success: true,
      message: 'Compliance document created successfully',
      document: complianceDocument
    })

  } catch (error) {
    console.error('[DEBUG] === COMPLIANCE API POST FATAL ERROR ===', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
