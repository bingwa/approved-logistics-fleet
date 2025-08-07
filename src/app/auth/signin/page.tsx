// src/app/auth/signin/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Github, Loader2, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      const result = await signIn('github', { 
        callbackUrl: '/dashboard',
        redirect: false 
      })
      
      if (result?.error) {
        setError('Authentication failed. Please try again.')
        setIsLoading(false)
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  // Demo login function for client presentation
  const handleDemoLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // For demo purposes, redirect directly to dashboard
      // You can remove this after client demo
      window.location.href = '/dashboard'
    } catch (err) {
      setError('Demo login failed.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Approved Logistics Fleet
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Fleet Management System
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Demo Login Button for Client Presentation */}
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Dashboard...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Demo Access - Client Presentation
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* GitHub Login Button */}
              <Button
                onClick={handleGitHubSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Sign in with GitHub
                  </>
                )}
              </Button>
            </div>

            {/* Information Section */}
            <div className="border-t border-border pt-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">
                  🎯 Client Demo Features:
                </h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• ✅ Fleet Dashboard with Real-time Data</p>
                  <p>• ✅ Fuel Management & Tracking</p>
                  <p>• ✅ Maintenance Records & Scheduling</p>
                  <p>• ✅ Compliance Document Management</p>
                  <p>• ✅ Comprehensive Reports & Analytics</p>
                  <p>• ✅ Dark/Light Mode Toggle</p>
                  <p>• ✅ Mobile Responsive Design</p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 Click "Demo Access" to explore the full system
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
