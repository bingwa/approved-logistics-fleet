// src/app/layout.tsx
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import QueryProvider from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/context/theme-context'
import SessionProvider from '@/components/providers/SessionProvider'
import 'animate.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Approved Logistics Limited - Fleet Management',
  description: 'Comprehensive fleet management system for Approved Logistics Limited',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fleet Management',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body className="bg-background text-foreground antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
            </QueryProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
