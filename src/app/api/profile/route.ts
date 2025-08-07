// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: user 
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, location, bio } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: session.user.id
        }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already taken by another user' },
        { status: 409 }
      )
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        location: location?.trim() || null,
        bio: bio?.trim() || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log(`Profile updated for user: ${updatedUser.id}`)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
