// src/app/api/trucks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const trucks = await prisma.truck.findMany({
      orderBy: { registration: 'asc' },
      include: {
        _count: {
          select: {
            fuelRecords: true,
            maintenanceRecords: true,
            complianceDocuments: true,
          }
        }
      }
    })

    return NextResponse.json({ trucks })
  } catch (error) {
    console.error('Error fetching trucks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trucks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registration, make, model, year, currentMileage } = body

    const truck = await prisma.truck.create({
      data: {
        registration,
        make,
        model,
        year: parseInt(year),
        currentMileage: parseInt(currentMileage),
      },
    })

    return NextResponse.json({ truck }, { status: 201 })
  } catch (error) {
    console.error('Error creating truck:', error)
    return NextResponse.json(
      { error: 'Failed to create truck' },
      { status: 500 }
    )
  }
}
