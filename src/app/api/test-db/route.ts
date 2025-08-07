// src/app/api/test-db/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@approvedlogistics.co.ke' },
      select: { id: true, email: true, name: true, role: true }
    })
    
    return NextResponse.json({
      success: true,
      userCount,
      adminExists: !!admin,
      admin
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
