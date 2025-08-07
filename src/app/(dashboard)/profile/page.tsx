// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Save, 
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  Check,
  Edit,
  Camera,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  location: string | null
  bio: string | null
  role: string
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const { data: session, update: updateSession, status } = useSession()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [originalData, setOriginalData] = useState<ProfileData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false) // Fix hydration issues

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch profile data from database
  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/profile', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfileData(data.profile)
          setOriginalData(data.profile)
          console.log('Profile loaded from database')
        } else {
          setError('Profile data not found')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load profile')
        toast.error('Failed to load profile data')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Error loading profile data')
      toast.error('Error loading profile data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch when client-side and session is available
    if (isClient && status === 'authenticated' && session?.user) {
      fetchProfile()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
      setError('Please sign in to view your profile')
    }
  }, [isClient, session, status])

  const handleSaveProfile = async () => {
    if (!profileData) {
      toast.error('No profile data to save')
      return
    }

    // Validate required fields
    if (!profileData.name?.trim() || !profileData.email?.trim()) {
      toast.error('Name and email are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
          phone: profileData.phone?.trim() || null,
          location: profileData.location?.trim() || null,
          bio: profileData.bio?.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setProfileData(data.profile)
        setOriginalData(data.profile)
        
        // Update session if name or email changed
        if (session && (data.profile.name !== session.user?.name || data.profile.email !== session.user?.email)) {
          await updateSession({
            ...session,
            user: {
              ...session.user,
              name: data.profile.name,
              email: data.profile.email
            }
          })
        }

        setIsEditing(false)
        toast.success('Profile updated successfully!')
        console.log('Profile saved to database')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Restore original data from database
    if (originalData) {
      setProfileData(originalData)
    }
    setIsEditing(false)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    if (!profileData) return
    
    setProfileData(prev => prev ? { 
      ...prev, 
      [field]: value 
    } : null)
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!profileData || !originalData) return false
    
    return (
      profileData.name !== originalData.name ||
      profileData.email !== originalData.email ||
      profileData.phone !== originalData.phone ||
      profileData.location !== originalData.location ||
      profileData.bio !== originalData.bio
    )
  }

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    )
  }

  // Show loading state during authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading profile...</span>
        </div>
      </div>
    )
  }

  // Show error state if authentication failed or no session
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Authentication Required
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to view your profile
          </p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  // Show error state if profile data failed to load
  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Failed to Load Profile
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'Unable to load profile data'}
          </p>
          <Button onClick={fetchProfile} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Main profile UI - only renders when we have valid data
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your personal information and account details
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isSaving || !hasUnsavedChanges()}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </motion.div>

        {/* Show unsaved changes indicator */}
        {isEditing && hasUnsavedChanges() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                You have unsaved changes. Save or cancel to continue.
              </span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-32 w-32 mx-auto border-4 border-background shadow-lg">
                    <AvatarImage src={session?.user?.image || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl">
                      {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 rounded-full h-10 w-10"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {profileData.name || 'User Name'}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {profileData.email}
                </p>
                <Badge variant="secondary" className="mb-4">
                  {profileData.role || 'User'}
                </Badge>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-foreground">{profileData.email}</span>
                  </div>
                  {profileData.phone && (
                    <div className="flex items-center justify-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-foreground">{profileData.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-foreground">{profileData.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Member since {new Date(profileData.createdAt).getFullYear()}</span>
                  </div>
                </div>

                <Separator className="my-4 bg-border" />

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <User className="h-5 w-5 mr-2 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={profileData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                      className="bg-background border-border text-foreground disabled:opacity-50"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                      className="bg-background border-border text-foreground disabled:opacity-50"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      placeholder="+254 700 000 000"
                      className="bg-background border-border text-foreground disabled:opacity-50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-foreground">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={!isEditing}
                      className="bg-background border-border text-foreground disabled:opacity-50"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    className="bg-background border-border text-foreground disabled:opacity-50 resize-none"
                    rows={3}
                  />
                </div>

                {/* Account Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Account Active</p>
                        <p className="text-sm text-green-600 dark:text-green-400">Your account is in good standing</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="text-foreground">
                        {new Date(profileData.updatedAt).toLocaleDateString('en-KE')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Type:</span>
                      <span className="text-foreground">{profileData.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since:</span>
                      <span className="text-foreground">
                        {new Date(profileData.createdAt).toLocaleDateString('en-KE')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profile ID:</span>
                      <span className="text-foreground font-mono text-xs">{profileData.id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
