// scripts/add-sample-trucks.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addSampleTrucks() {
  try {
    console.log('🚛 Adding sample trucks to database...')

    const sampleTrucks = [
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
      },
      {
        registration: 'KDD-006T',
        make: 'DAF',
        model: 'XF 480',
        year: 2021,
        currentMileage: 58000,
        status: 'MAINTENANCE'
      },
      {
        registration: 'KDD-007T',
        make: 'Renault',
        model: 'T High 520',
        year: 2020,
        currentMileage: 72000,
        status: 'ACTIVE'
      },
      {
        registration: 'KDD-008T',
        make: 'Mercedes-Benz',
        model: 'Arocs 2545',
        year: 2019,
        currentMileage: 89000,
        status: 'ACTIVE'
      }
    ]

    for (const truckData of sampleTrucks) {
      const truck = await prisma.truck.upsert({
        where: { registration: truckData.registration },
        update: {
          make: truckData.make,
          model: truckData.model,
          year: truckData.year,
          currentMileage: truckData.currentMileage,
          status: truckData.status as any
        },
        create: truckData as any
      })
      
      console.log(`✅ ${truck.status === 'ACTIVE' ? '🟢' : '🔧'} ${truck.registration} - ${truck.make} ${truck.model} (${truck.currentMileage.toLocaleString()} km)`)
    }

    // Get statistics
    const totalTrucks = await prisma.truck.count()
    const activeTrucks = await prisma.truck.count({
      where: { status: 'ACTIVE' }
    })
    const maintenanceTrucks = await prisma.truck.count({
      where: { status: 'MAINTENANCE' }
    })

    console.log('\n📊 Fleet Summary:')
    console.log(`Total Trucks: ${totalTrucks}`)
    console.log(`Active Trucks: ${activeTrucks}`)
    console.log(`In Maintenance: ${maintenanceTrucks}`)
    console.log('\n🎉 Sample trucks added successfully!')
    console.log('\n💡 You can now test:')
    console.log('   • Adding fuel records')
    console.log('   • Creating maintenance records')
    console.log('   • Managing compliance documents')
    console.log('   • Generating reports')

  } catch (error) {
    console.error('❌ Error adding sample trucks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSampleTrucks()
