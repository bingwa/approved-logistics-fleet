// src/app/(dashboard)/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  Mail, 
  Smartphone, 
  Shield, 
  Database, 
  Globe, 
  Clock,
  Save,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  maintenance: boolean
  compliance: boolean
  fuel: boolean
}

interface SystemSettings {
  autoBackup: boolean
  dataRetention: string
  language: string
  timezone: string
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Theme state
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system'
  })
  
  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    push: true,
    maintenance: true,
    compliance: true,
    fuel: false
  })
  
  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    autoBackup: true,
    dataRetention: '12',
    language: 'en',
    timezone: 'Africa/Nairobi'
  })

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Apply theme changes immediately
  useEffect(() => {
    applyTheme(appearance.theme)
  }, [appearance.theme])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      
      // Load settings from localStorage (fallback) and API
      const savedAppearance = localStorage.getItem('appearance-settings')
      const savedNotifications = localStorage.getItem('notification-settings')
      const savedSystem = localStorage.getItem('system-settings')
      
      if (savedAppearance) {
        setAppearance(JSON.parse(savedAppearance))
      }
      
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications))
      }
      
      if (savedSystem) {
        setSystemSettings(JSON.parse(savedSystem))
      }
      
      // Try to load from database if user is authenticated
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/settings', {
            cache: 'no-store'
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.settings) {
              setNotifications(data.settings.notifications || notifications)
              setSystemSettings(data.settings.system || systemSettings)
              setAppearance(data.settings.appearance || appearance)
            }
          }
        } catch (error) {
          console.log('Database settings not available, using local storage')
        }
      }
      
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setIsSaving(true)
      
      const settings = {
        appearance,
        notifications,
        system: systemSettings
      }
      
      // Always save to localStorage
      localStorage.setItem('appearance-settings', JSON.stringify(appearance))
      localStorage.setItem('notification-settings', JSON.stringify(notifications))
      localStorage.setItem('system-settings', JSON.stringify(systemSettings))
      
      // Try to save to database if user is authenticated
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
          })
          
          if (response.ok) {
            toast.success('Settings saved to database successfully!')
          } else {
            toast.success('Settings saved locally')
          }
        } catch (error) {
          toast.success('Settings saved locally')
        }
      } else {
        toast.success('Settings saved locally')
      }
      
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      root.classList.toggle('dark', mediaQuery.matches)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
    
    // Store theme preference
    localStorage.setItem('theme-preference', theme)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setAppearance(prev => ({ ...prev, theme: newTheme }))
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const handleSystemChange = (key: keyof SystemSettings, value: string | boolean) => {
    setSystemSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Manage your application preferences and system settings
            </p>
          </div>
          <Button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Settings className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground font-medium">Dark mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={appearance.theme === 'dark'}
                    onCheckedChange={(checked) => 
                      handleThemeChange(checked ? 'dark' : 'light')
                    }
                    className="data-[state=checked]:bg-primary"
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Language */}
              <div className="space-y-2">
                <Label className="text-foreground">Language</Label>
                <Select
                  value={systemSettings.language}
                  onValueChange={(value) => handleSystemChange('language', value)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="en" className="text-foreground">English</SelectItem>
                    <SelectItem value="sw" className="text-foreground">Kiswahili</SelectItem>
                    <SelectItem value="fr" className="text-foreground">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label className="text-foreground">Timezone</Label>
                <Select
                  value={systemSettings.timezone}
                  onValueChange={(value) => handleSystemChange('timezone', value)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="Africa/Nairobi" className="text-foreground">
                      East Africa Time (EAT)
                    </SelectItem>
                    <SelectItem value="UTC" className="text-foreground">UTC</SelectItem>
                    <SelectItem value="Europe/London" className="text-foreground">London</SelectItem>
                    <SelectItem value="America/New_York" className="text-foreground">New York</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure how you receive alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label className="text-foreground">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <Separator className="bg-border" />
              
              <h4 className="text-sm font-semibold text-foreground">Notification Categories</h4>

              {/* Maintenance Notifications */}
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Maintenance Alerts</Label>
                <Switch
                  checked={notifications.maintenance}
                  onCheckedChange={(checked) => handleNotificationChange('maintenance', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Compliance Notifications */}
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Compliance Alerts</Label>
                <Switch
                  checked={notifications.compliance}
                  onCheckedChange={(checked) => handleNotificationChange('compliance', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Fuel Notifications */}
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Fuel Alerts</Label>
                <Switch
                  checked={notifications.fuel}
                  onCheckedChange={(checked) => handleNotificationChange('fuel', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Database className="h-5 w-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure system behavior and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Backup */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Automatic Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup system data daily
                  </p>
                </div>
                <Switch
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) => handleSystemChange('autoBackup', checked)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Data Retention */}
              <div className="space-y-2">
                <Label className="text-foreground">Data Retention (months)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  How long to keep historical data before archiving
                </p>
                <Select
                  value={systemSettings.dataRetention}
                  onValueChange={(value) => handleSystemChange('dataRetention', value)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="3" className="text-foreground">3 months</SelectItem>
                    <SelectItem value="6" className="text-foreground">6 months</SelectItem>
                    <SelectItem value="12" className="text-foreground">12 months</SelectItem>
                    <SelectItem value="24" className="text-foreground">24 months</SelectItem>
                    <SelectItem value="permanent" className="text-foreground">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <Button 
            onClick={saveSettings}
            disabled={isSaving}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving Settings...' : 'Save All Settings'}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
