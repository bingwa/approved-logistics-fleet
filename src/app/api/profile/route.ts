import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Please sign in to view your profile'
      }, { status: 401 })
    }

    // Try to get user from database
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // If user doesn't exist in DB, create from session data
    if (!user) {
      try {
        user = await prisma.user.upsert({
          where: { email: session.user.email || '' },
          update: {
            name: session.user.name || '',
            id: session.user.id,
          },
          create: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || '',
            image: session.user.image || null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true
          }
        })
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Fallback to session data if DB fails
        user = {
          id: session.user.id,
          name: session.user.name || 'Unknown User',
          email: session.user.email || '',
          image: session.user.image || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }

    // Get additional stats (optional)
    const stats = {
      maintenanceRecords: await prisma.maintenanceRecord.count({
        where: { userId: session.user.id }
      }).catch(() => 0),
      
      fuelRecords: await prisma.fuelRecord.count({
        where: { userId: session.user.id }
      }).catch(() => 0),
      
      complianceDocuments: await prisma.complianceDocument.count({
        where: { userId: session.user.id }
      }).catch(() => 0)
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats
      }
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to load profile data'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { name, email } = body

    // Validate input
    if (!name || !email) {
      return NextResponse.json({
        error: 'Name and email are required'
      }, { status: 400 })
    }

    // Update user profile
    const updatedUser = await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        updatedAt: new Date()
      },
      create: {
        id: session.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({
      error: 'Failed to update profile'
    }, { status: 500 })
  }
}
