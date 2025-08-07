// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Kenyan currency formatter
export function formatKSH(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE')}`
}

// Date formatter
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Calculate compliance status
export function getComplianceStatus(expiryDate: string | null): 'expired' | 'expiring' | 'valid' {
  if (!expiryDate) return 'expired'
  
  const expiry = new Date(expiryDate)
  const today = new Date()
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring'
  return 'valid'
}
