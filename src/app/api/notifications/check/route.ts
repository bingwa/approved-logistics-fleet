// src/app/api/notifications/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notificationService'

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by a cron job or scheduler
    await NotificationService.runAutomatedChecks()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Automated notification checks completed' 
    })
  } catch (error) {
    console.error('Error running automated checks:', error)
    return NextResponse.json(
      { error: 'Failed to run automated checks' },
      { status: 500 }
    )
  }
}
