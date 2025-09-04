// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'  // Install if needed: npm install bcryptjs @types/bcryptjs

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@fleetmanager.co.ke'  // New email
  const password = 'admin123'  // Plain text - we'll hash it
  const hashedPassword = await bcrypt.hash(password, 10)  // 10 is a standard salt round

  // Check if user exists, update if so (to reset password)
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }  // Use 'password' field
    })
    console.log('Old demo user updated with new password')
  } else {
    console.log('User does not exist, creating new user')
    // Create new user
    await prisma.user.create({
      data: {
        email,
        name: 'Admin User',  // Optional
        password: hashedPassword,  // Hashed version
        // Add any other fields your User model requires (e.g., id, role)
      },
    })
    console.log('Demo user created: admin@fleetmanager.co.ke / admin123')
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
