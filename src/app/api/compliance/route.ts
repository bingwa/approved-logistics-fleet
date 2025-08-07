// src/app/api/compliance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// GET - Fetch compliance documents
export async function GET(request: NextRequest) {
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

    console.log(`Fetched ${documents.length} compliance documents`)

    return NextResponse.json({
      success: true,
      documents
    })

  } catch (error) {
    console.error('Error fetching compliance documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance documents' },
      { status: 500 }
    )
  }
}

// POST - Create new compliance document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      truckId,
      documentType,
      certificateNumber,
      issueDate,
      expiryDate,
      cost,
      issuingAuthority,
      documentUrl,
      daysToExpiry,
      status
    } = body

    // Validation
    if (!truckId || !documentType || !certificateNumber || !issueDate || 
        !expiryDate || !cost || !issuingAuthority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const document = await prisma.complianceDocument.create({
      data: {
        truckId,
        documentType,
        certificateNumber,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        cost: parseFloat(cost),
        issuingAuthority,
        documentUrl,
        daysToExpiry: parseInt(daysToExpiry),
        status,
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

    console.log('Compliance document created successfully:', document.id)

    // Invalidate cache
    revalidatePath('/compliance')
    revalidatePath('/dashboard')
    revalidatePath('/reports')

    return NextResponse.json({
      success: true,
      document
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating compliance document:', error)
    return NextResponse.json(
      { error: 'Failed to create compliance document' },
      { status: 500 }
    )
  }
}
