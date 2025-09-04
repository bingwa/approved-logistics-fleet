// scripts/create-users-final.ts
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'



async function createUsers() {
  try {
    console.log('🔐 Creating admin user...')
    
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@approvedlogistics.co.ke',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email: admin@approvedlogistics.co.ke')
    console.log('🔑 Password: admin123')
    console.log('👤 Role: ADMIN')

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Admin user already exists!')
    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

createUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
