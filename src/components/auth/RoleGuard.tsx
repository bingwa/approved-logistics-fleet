// src/components/auth/RoleGuard.tsx
'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: string[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession()
  
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
