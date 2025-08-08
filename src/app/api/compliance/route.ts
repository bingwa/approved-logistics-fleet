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
    console.log('[DEBUG] compliance session.user:', session?.user)
    
    if (!session?.user?.id) {
      console.error('[ERROR] No user ID in session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user exists in database
    const userExists = await prisma.user.findUnique({ 
      where: { id: session.user.id } 
    })
    console.log('[DEBUG] compliance userExists:', !!userExists)
    
    if (!userExists) {
      return NextResponse.json({ error: 'User does not exist in DB' }, { status: 400 })
    }

    const body = await request.json()
    console.log('[DEBUG] compliance POST body received:', body)

    const {
      truckId,
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      status,
      documentUrl,
      reminderDays,
    } = body

    // Validate required fields
    if (
      !truckId ||
      !documentType ||
      !documentNumber ||
      !issueDate ||
      !issuingAuthority
    ) {
      console.error('Validation failed: Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const complianceDocument = await prisma.complianceDocument.create({
      data: {
        truckId,
        documentType,
        documentNumber,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        issuingAuthority,
        status: status || 'ACTIVE',
        documentUrl: documentUrl || '',
        reminderDays: reminderDays ? parseInt(reminderDays) : null,
        createdBy: session.user.id, // Fix for foreign key constraint
      },
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

    console.log('Compliance document created successfully:', complianceDocument.id)

    revalidatePath('/compliance')
    revalidatePath('/reports')

    return NextResponse.json({ success: true, complianceDocument }, { status: 201 })
  } catch (error) {
    console.error('Detailed error creating compliance document:', error)
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
