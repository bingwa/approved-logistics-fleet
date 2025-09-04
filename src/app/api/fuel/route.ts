// src/app/api/fuel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fuelRecords = await prisma.fuelRecord.findMany({
      include: {
        truck: {
          select: {
            registration: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ fuelRecords })
  } catch (error) {
    console.error('Error fetching fuel records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting fuel record creation...')
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received fuel record data:', body)

    const {
      truckId,
      date,
      liters,
      costPerLiter,
      route,
      odometerReading,
      previousOdometer,
      attendantName,
      receiptNumber,
      receiptUrl,
    } = body

    if (
      !truckId ||
      !date ||
      liters == null ||
      costPerLiter == null ||
      odometerReading == null ||
      previousOdometer == null ||
      !attendantName
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const truck = await prisma.truck.findUnique({ where: { id: String(truckId) } })
    if (!truck) {
      console.error('Truck not found:', truckId)
      return NextResponse.json({ error: 'Truck not found' }, { status: 400 })
    }
    if (truck.status !== 'ACTIVE') {
      console.error('Truck not active:', truck.status)
      return NextResponse.json({ error: 'Selected truck is not active' }, { status: 400 })
    }

    const litersNum = Number(liters)
    const cplNum = Number(costPerLiter)
    const odoNum = Number(odometerReading)
    const prevOdoNum = Number(previousOdometer)

    const totalCostCalc = litersNum * cplNum
    const totalCost = Number.isFinite(totalCostCalc) ? totalCostCalc : null

    const distanceCoveredRaw = odoNum - prevOdoNum
    const distanceCovered = Number.isFinite(distanceCoveredRaw) ? Math.trunc(distanceCoveredRaw) : null

    const efficiencyCalc =
      litersNum > 0 && Number.isFinite(distanceCoveredRaw)
      ? distanceCoveredRaw / litersNum
      : null
    const efficiencyKmpl =
      efficiencyCalc != null && Number.isFinite(efficiencyCalc) ? efficiencyCalc : null

    console.log('Creating fuel record with calculated values:', {
      totalCost,
      distanceCovered,
      efficiencyKmpl,
    })

    const fuelRecord = await prisma.fuelRecord.create({
      data: {
        truckId: String(truckId),
        date: new Date(date),
        liters: litersNum,
        costPerLiter: cplNum,
        totalCost: totalCost,
        route: route || null,
        odometerReading: Math.trunc(odoNum),
        previousOdometer: Math.trunc(prevOdoNum),
        distanceCovered: distanceCovered,
        efficiencyKmpl: efficiencyKmpl,
        attendantName: String(attendantName),
        receiptNumber: receiptNumber || null,
        receiptUrl: receiptUrl || null,
      },
    })

    console.log('✅ Fuel record created successfully:', fuelRecord.id)

    await prisma.truck.update({
      where: { id: String(truckId) },
      data: { currentMileage: Math.trunc(odoNum) },
    })

    console.log('✅ Truck mileage updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Fuel record created successfully',
      fuelRecordId: fuelRecord.id,
    })
  } catch (error: any) {
    console.error('❌ Detailed error creating fuel record:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate fuel record' }, { status: 400 })
    }
    if (error?.code === 'P2003') {
      return NextResponse.json({ error: 'Invalid truck reference' }, { status: 400 })
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Related record not found' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create fuel record. Details: ' + JSON.stringify(error) },
      { status: 500 }
    )
  }
}
