// scripts/check-admin.ts
import prisma from '@/lib/prisma'


async function checkAdmin() {
  try {
    console.log('🔍 Checking database connection...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@approvedlogistics.co.ke' }
    })
    
    if (admin) {
      console.log('✅ Admin user found:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        hasPassword: !!admin.password
      })
    } else {
      console.log('❌ Admin user not found')
      
      // Create admin user
      console.log('🔧 Creating admin user...')
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@approvedlogistics.co.ke',
          name: 'System Administrator',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      
      console.log('✅ Admin user created:', newAdmin.email)
    }
    
    // Check if tables exist
    const tableCount = await prisma.user.count()
    console.log(`📊 Total users in database: ${tableCount}`)
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()
