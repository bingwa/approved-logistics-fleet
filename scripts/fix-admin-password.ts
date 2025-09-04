// scripts/fix-admin-password.ts
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'



async function fixAdminPassword() {
  console.log('🔧 Fixing admin password...')
  
  // Hash the password with the same configuration as your auth system
  const newHash = await bcrypt.hash('admin123', 12)
  
  console.log('🔐 New hash generated:', newHash)
  
  // Update the admin user
  await prisma.user.update({
    where: { email: 'admin@approvedlogistics.co.ke' },
    data: { password: newHash }
  })
  
  console.log('✅ Admin password updated successfully')
  
  // Test the hash immediately
  const isValid = await bcrypt.compare('admin123', newHash)
  console.log('🧪 Hash test result:', isValid)
}

fixAdminPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
