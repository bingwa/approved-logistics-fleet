// scripts/add-active-trucks.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addActiveTrucks() {
  try {
    console.log('🚛 Adding active trucks to database...')

    const activeTrucks = [
      {
        registration: 'KDD-001T',
        make: 'Mercedes-Benz',
        model: 'Actros 1848',
        year: 2020,
        currentMileage: 75000,
        status: 'ACTIVE'
      },
      {
        registration: 'KDD-002T', 
        make: 'Scania',
        model: 'R450',
        year: 2021,
        currentMileage: 65000,
        status: 'ACTIVE'
      },
      {
        registration: 'KDD-003T',
        make: 'Volvo', 
        model: 'FH16',
        year: 2019,
        currentMileage: 85000,
        status: 'ACTIVE'
      },
      {
        registration: 'KDD-004T',
        make: 'MAN',
        model: 'TGX 540', 
        year: 2022,
        currentMileage: 45000,
        status: 'ACTIVE'
      },
      {
        registration: 'KDD-005T',
        make: 'Iveco',
        model: 'Stralis 570',
        year: 2018,
        currentMileage: 95000,
        status: 'ACTIVE'
      }
    ]

    for (const truckData of activeTrucks) {
      const truck = await prisma.truck.upsert({
        where: { registration: truckData.registration },
        update: {
          status: 'ACTIVE' // Ensure existing trucks are set to ACTIVE
        },
        create: truckData as any
      })
      
      console.log(`✅ ${truck.registration} - ${truck.make} ${truck.model} (${truck.currentMileage.toLocaleString()} km)`)
    }

    const activeTruckCount = await prisma.truck.count({
      where: { status: 'ACTIVE' }
    })

    console.log(`\n🎉 ${activeTruckCount} active trucks now available!`)
    console.log('You can now test the fuel form functionality.')

  } catch (error) {
    console.error('❌ Error adding active trucks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addActiveTrucks()
