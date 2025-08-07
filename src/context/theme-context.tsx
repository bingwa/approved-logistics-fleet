// src/context/theme-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme-preference') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const isDark = mediaQuery.matches
      
      root.classList.toggle('dark', isDark)
      setActualTheme(isDark ? 'dark' : 'light')
      
      const listener = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches)
        setActualTheme(e.matches ? 'dark' : 'light')
      }
      
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    } else {
      const isDark = theme === 'dark'
      root.classList.toggle('dark', isDark)
      setActualTheme(isDark ? 'dark' : 'light')
    }

    localStorage.setItem('theme-preference', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
