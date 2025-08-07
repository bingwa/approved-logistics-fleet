// src/app/auth/signin/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, Github, Loader2, User, Shield, Truck, BarChart3, Settings, FileText, Fuel } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Clear any previous demo session
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('demoMode')
    }
  }, [])

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Clear demo mode before OAuth
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demoMode')
      }
      
      const result = await signIn('github', { 
        callbackUrl: '/dashboard',
        redirect: false 
      })
      
      if (result?.error) {
        setError('Authentication failed. Please try again.')
        setIsLoading(false)
      } else if (result?.url) {
        window.location.href = result.url
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Set demo mode flag with timestamp for security
      if (typeof window !== 'undefined') {
        const demoSession = {
          mode: 'demo',
          timestamp: Date.now(),
          expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours demo session
          user: {
            name: 'Demo User',
            email: 'demo@approvedlogistics.co.ke',
            role: 'Fleet Manager'
          }
        }
        sessionStorage.setItem('demoMode', JSON.stringify(demoSession))
        localStorage.setItem('clientDemo', 'active')
      }
      
      // Add slight delay for better UX
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    } catch (err) {
      setError('Demo login failed.')
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-foreground">
                Approved Logistics Fleet
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 text-lg">
                Professional Fleet Management System
              </CardDescription>
              <div className="flex justify-center mt-3">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                  ✅ Production Ready
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Demo Access Button - Primary for Client Presentation */}
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initializing Demo Environment...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-5 w-5" />
                    🚀 Client Demo Access
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground font-medium">Production Authentication</span>
                </div>
              </div>

              {/* GitHub Login Button */}
              <Button
                onClick={handleGitHubSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full border-2 hover:bg-muted"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-5 w-5" />
                    Sign in with GitHub
                  </>
                )}
              </Button>
            </div>

            {/* Enhanced Feature Showcase */}
            <div className="border-t border-border pt-6">
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg p-5 space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-foreground text-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                    Complete Fleet Management Suite
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Everything you need to manage your fleet efficiently
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-foreground font-medium">Live Dashboard</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Fuel className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-foreground font-medium">Fuel Tracking</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-foreground font-medium">Maintenance</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-foreground font-medium">Compliance</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-foreground font-medium">Reports</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="text-foreground font-medium">Fleet Overview</span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 mt-4">
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                    <p className="text-sm font-semibold text-primary flex items-center justify-center">
                      <span className="animate-pulse mr-2">🎯</span>
                      Click "Client Demo Access" to explore all features instantly
                    </p>
                  </div>
                </div>

                {/* Technical Highlights */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-green-200 dark:bg-green-800 rounded-full">
                      <div className="w-full h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-muted-foreground">Database Ready</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full">
                      <div className="w-full h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <span className="text-muted-foreground">API Functional</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full">
                      <div className="w-full h-2 bg-purple-500 rounded-full"></div>
                    </div>
                    <span className="text-muted-foreground">Mobile Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Footer */}
            <div className="text-center space-y-2">
              <div className="flex justify-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  Next.js 15
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  TypeScript
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  PostgreSQL
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Built for Approved Logistics Limited • Secure & Scalable
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
