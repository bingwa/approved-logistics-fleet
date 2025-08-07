// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const { token } = req.nextauth

    // Admin-only routes
    const adminRoutes = ['/admin', '/users', '/settings/advanced']
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Manager and Admin routes
    const managerRoutes = ['/reports/advanced', '/maintenance/bulk', '/compliance/bulk']
    if (managerRoutes.some(route => pathname.startsWith(route))) {
      if (!['ADMIN', 'MANAGER'].includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
    '/admin/:path*',
    '/settings/:path*'
  ]
}
