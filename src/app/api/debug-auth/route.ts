// src/app/api/debug-auth/route.ts
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing database connection and user authentication...')
    
    // Test the exact credentials you're using
    const user = await prisma.user.findUnique({
      where: { email: 'admin@approvedlogistics.co.ke' }
    })
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found in database' 
      }, { status: 404 })
    }
    
    // Test password comparison with the exact password
    const isValidPassword = await bcrypt.compare('admin123', user.password || '')
    
    return NextResponse.json({
      success: true,
      userFound: !!user,
      hasPassword: !!user.password,
      passwordValid: isValidPassword,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      passwordLength: user.password?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
