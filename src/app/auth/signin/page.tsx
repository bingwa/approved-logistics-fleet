// src/app/auth/signin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, Github, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Suspense } from 'react'

function SignInContent() {
  const [providers, setProviders] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    const setAuthProviders = async () => {
      try {
        const res = await getProviders()
        setProviders(res)
      } catch (err) {
        setError('Failed to load authentication providers')
      }
    }
    setAuthProviders()
  }, [])

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleGitHubSignIn = async () => {
    try {
      setIsLoading(true)
      setError('')
      await signIn('github', { callbackUrl })
    } catch (err) {
      setError('Failed to sign in. Please try again.')
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
                Fleet Management System
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                Sign in to access your fleet dashboard
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
              <Button
                onClick={handleGitHubSignIn}
                disabled={isLoading || !providers?.github}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Secure OAuth authentication via GitHub
                </p>
              </div>
            </div>

            {/* Information Section */}
            <div className="border-t border-border pt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Access Information
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Use your GitHub account to sign in</p>
                  <p>• Secure OAuth 2.0 authentication</p>
                  <p>• Access fleet management dashboard</p>
                  <p>• Manage fuel, maintenance, and compliance records</p>
                </div>
              </div>
            </div>

            {/* Demo Notice */}
            <div className="text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs font-medium">
                Demo System - Approved Logistics Limited
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading...</span>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
