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

    const complianceDocuments = await prisma.complianceDocument.findMany({
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`Fetched ${complianceDocuments.length} compliance documents`)
    return NextResponse.json({
      success: true,
      complianceDocuments,
    })
  } catch (error) {
    console.error('Error fetching compliance documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance documents' },
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
    console.log('[DEBUG] Compliance backend received body:')
    console.log(JSON.stringify(body, null, 2))
    console.log('[DEBUG] session.user.id:', session?.user?.id)

    const {
      truckId,
      documentType,
      documentNumber,
      certificateNumber, // Added for backwards compatibility
      issueDate,
      expiryDate,
      issuingAuthority,
      status,
      documentUrl,
      cost,
    } = body

    // Use either documentNumber or certificateNumber
    const finalCertificateNumber = certificateNumber || documentNumber

    // Check if truck exists in database
    const doesTruckExist = await prisma.truck.findUnique({ where: { id: truckId } })
    console.log('[DEBUG] Does truck exist?', doesTruckExist ? true : false)
    console.log('[DEBUG] Truck ID being checked:', truckId)

    if (!doesTruckExist) {
      return NextResponse.json({ error: 'Truck not found in database' }, { status: 400 })
    }

    // Ensure user exists in database - create if missing
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
    } else {
      console.log('[DEBUG] User exists in database:', user.id)
    }

    // Validate required fields according to your schema
    const missingFields: string[] = []
    if (!truckId) missingFields.push('truckId')
    if (!documentType) missingFields.push('documentType')
    if (!finalCertificateNumber) missingFields.push('certificateNumber')
    if (!issueDate) missingFields.push('issueDate')
    if (!expiryDate) missingFields.push('expiryDate') // Required in your schema
    if (!issuingAuthority) missingFields.push('issuingAuthority')
    if (cost === undefined || cost === null) missingFields.push('cost') // Required in your schema

    if (missingFields.length > 0) {
      console.error('[DEBUG] Missing fields detected:', missingFields)
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Calculate days to expiry (required field in your schema)
    const today = new Date()
    const expiryDateObj = new Date(expiryDate)
    const daysToExpiry = Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Determine status based on days to expiry
    let complianceStatus = 'VALID'
    if (daysToExpiry < 0) {
      complianceStatus = 'EXPIRED'
    } else if (daysToExpiry <= 30) {
      complianceStatus = 'EXPIRING'
    }

    // Map documentType to match your enum
    let mappedDocumentType = documentType
    if (documentType === 'NTSA Inspection') mappedDocumentType = 'NTSA_INSPECTION'
    if (documentType === 'Insurance Certificate') mappedDocumentType = 'INSURANCE'
    if (documentType === 'TGL License') mappedDocumentType = 'TGL_LICENSE'
    if (documentType === 'Commercial License') mappedDocumentType = 'COMMERCIAL_LICENSE'

    const dataToInsert = {
      truckId,
      documentType: mappedDocumentType,
      certificateNumber: finalCertificateNumber, // Your schema uses certificateNumber, not documentNumber
      issueDate: new Date(issueDate),
      expiryDate: new Date(expiryDate), // Required in your schema
      issuingAuthority,
      cost: parseFloat(cost || '0'), // Required in your schema
      status: status || complianceStatus,
      documentUrl: documentUrl || '',
      daysToExpiry, // Required field in your schema
      createdBy: session.user.id,
    }

    // DEBUG: Log insert payload to Prisma
    console.log('[DEBUG] Data to insert into Prisma:')
    console.log(JSON.stringify(dataToInsert, null, 2))

    const complianceDocument = await prisma.complianceDocument.create({
      data: dataToInsert,
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    console.log('[DEBUG] Created compliance document with ID:', complianceDocument.id)

    revalidatePath('/compliance')
    revalidatePath('/reports')

    return NextResponse.json({ success: true, complianceDocument }, { status: 201 })
  } catch (error) {
    console.error('[DEBUG] Error creating compliance document:', error)
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ error: 'Invalid truck or user reference' }, { status: 400 })
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Duplicate document detected' }, { status: 409 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to create compliance document. Please try again.' },
      { status: 500 }
    )
  }
}
