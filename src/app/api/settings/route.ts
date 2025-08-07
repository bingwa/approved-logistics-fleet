// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get settings from database
    const userSettings = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notificationPreferences: true
      }
    })

    // Format settings for frontend
    const settings = {
      notifications: {
        email: userSettings?.notificationPreferences?.email ?? true,
        sms: userSettings?.notificationPreferences?.sms ?? false,
        push: userSettings?.notificationPreferences?.push ?? true,
        maintenance: userSettings?.notificationPreferences?.maintenance ?? true,
        compliance: userSettings?.notificationPreferences?.compliance ?? true,
        fuel: userSettings?.notificationPreferences?.fuel ?? false
      },
      appearance: {
        theme: 'system' // Default theme
      },
      system: {
        autoBackup: true,
        dataRetention: '12',
        language: 'en',
        timezone: 'Africa/Nairobi'
      }
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications, appearance, system } = body

    // Update notification preferences in database
    if (notifications) {
      await prisma.notificationPreference.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          email: notifications.email ?? true,
          sms: notifications.sms ?? false,
          push: notifications.push ?? true,
          maintenance: notifications.maintenance ?? true,
          compliance: notifications.compliance ?? true,
          fuel: notifications.fuel ?? false,
          system: true
        },
        update: {
          email: notifications.email ?? true,
          sms: notifications.sms ?? false,
          push: notifications.push ?? true,
          maintenance: notifications.maintenance ?? true,
          compliance: notifications.compliance ?? true,
          fuel: notifications.fuel ?? false
        }
      })
    }

    console.log(`Settings updated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
