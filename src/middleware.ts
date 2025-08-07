// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth
    
    // Check for demo mode in cookies or headers
    const demoMode = req.cookies.get('demo-access')?.value
    const demoSession = req.cookies.get('demo-session')?.value
    
    // Allow demo access to bypass authentication
    if (demoMode === 'true' || demoSession) {
      return NextResponse.next()
    }
    
    // Admin-only routes
    const adminRoutes = ['/settings', '/users']
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Manager and Admin routes
    const managerRoutes = ['/reports', '/maintenance', '/compliance']
    if (managerRoutes.some(route => pathname.startsWith(route))) {
      if (!['ADMIN', 'MANAGER'].includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow demo access
        const demoMode = req.cookies.get('demo-access')?.value
        const demoSession = req.cookies.get('demo-session')?.value
        
        if (demoMode === 'true' || demoSession) {
          return true
        }
        
        // Otherwise require valid token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/maintenance/:path*',
    '/fuel/:path*',
    '/compliance/:path*',
    '/reports/:path*',
    '/profile/:path*',
    '/settings/:path*'
  ]
}
