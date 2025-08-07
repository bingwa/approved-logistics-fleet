// src/app/api/debug-auth/route.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Test the exact credentials you're using
    const user = await prisma.user.findUnique({
      where: { email: 'admin@approvedlogistics.co.ke' }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Test password comparison
    const isValidPassword = await bcrypt.compare('admin123', user.password || '')
    
    return NextResponse.json({
      userFound: !!user,
      hasPassword: !!user.password,
      passwordValid: isValidPassword,
      userId: user.id,
      userRole: user.role
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}
