// Create this script: scripts/create-prod-admin.ts
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@approvedlogistics.co.ke',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('Admin created:', admin.email)
}

createAdmin().catch(console.error).finally(() => prisma.$disconnect())
