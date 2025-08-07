// src/components/layout/ThemeToggle.tsx
'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Check current theme
    const theme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = theme === 'dark' || (!theme && systemDark)
    
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-full"
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
