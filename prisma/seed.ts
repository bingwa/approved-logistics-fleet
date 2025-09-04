// prisma/seed.ts (CREATE this new file)
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'



async function main() {
  // Create default users
  const adminPassword = await bcrypt.hash('admin123', 12)
  const managerPassword = await bcrypt.hash('manager123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@approvedlogistics.co.ke' },
    update: {},
    create: {
      email: 'admin@approvedlogistics.co.ke',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      department: 'IT',
      isActive: true,
    }
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@approvedlogistics.co.ke' },
    update: {},
    create: {
      email: 'manager@approvedlogistics.co.ke',
      name: 'Fleet Manager',
      password: managerPassword,
      role: 'MANAGER',
      department: 'Operations',
      isActive: true,
    }
  })

  // Create sample trucks
  const trucks = await Promise.all([
    prisma.truck.upsert({
      where: { registration: 'KBY 123A' },
      update: {},
      create: {
        registration: 'KBY 123A',
        make: 'Isuzu',
        model: 'FVZ',
        year: 2020,
        currentMileage: 145000,
        status: 'ACTIVE',
      }
    }),
    // ... add other trucks
  ])

  console.log('Created users:', { admin: admin.email, manager: manager.email })
  console.log('Created trucks:', trucks.map(truck => truck.registration))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
