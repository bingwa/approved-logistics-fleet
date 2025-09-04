// src/app/api/trucks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const truck = await prisma.truck.findUnique({
      where: { id: params.id },
      include: {
        fuelRecords: {
          orderBy: { date: 'desc' },
          take: 5
        },
        maintenanceRecords: {
          orderBy: { serviceDate: 'desc' },
          take: 5,
          include: {
            spareParts: true
          }
        },
        complianceDocuments: {
          orderBy: { expiryDate: 'asc' }
        }
      }
    })

    if (!truck) {
      return NextResponse.json(
        { error: 'Truck not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ truck })
  } catch (error) {
    console.error('Error fetching truck:', error)
    return NextResponse.json(
      { error: 'Failed to fetch truck' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const truck = await prisma.truck.update({
      where: { id: params.id },
      data: body,
    })

    return NextResponse.json({ truck })
  } catch (error) {
    console.error('Error updating truck:', error)
    return NextResponse.json(
      { error: 'Failed to update truck' },
      { status: 500 }
    )
  }
}
