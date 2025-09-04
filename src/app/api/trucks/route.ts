// src/app/api/trucks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🚛 GET /api/trucks called')
    
    // Remove auth check temporarily to debug
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('📊 Fetching trucks from database...')
    
    const trucks = await prisma.truck.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        registration: true,
        make: true,
        model: true,
        currentMileage: true,
        status: true,
        year: true
      },
      orderBy: { registration: 'asc' }
    })

    console.log(`✅ Found ${trucks.length} active trucks`)
    console.log('First truck:', trucks[0])
    
    // Return proper structure
    return NextResponse.json({ 
      trucks: trucks,
      count: trucks.length 
    })
    
  } catch (error) {
    console.error('❌ Error in /api/trucks:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch trucks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { registration, make, model, year, currentMileage } = body

    const truck = await prisma.truck.create({
      data: {
        registration,
        make,
        model,
        year: parseInt(year),
        currentMileage: parseInt(currentMileage),
        status: 'ACTIVE'
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
