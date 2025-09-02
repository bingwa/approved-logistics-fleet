'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Fuel, 
  Truck, 
  Wrench, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Clock,
  Shield,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface DashboardStats {
  totalExpenses: number
  monthlyExpenses: number
  expenseChange: number
  fuelRecords: number
  fuelCost: number
  fuelChange: number
  maintenanceRecords: number
  maintenanceCost: number
  maintenanceChange: number
  complianceDocuments: number
  validDocuments: number
  expiringDocuments: number
  expiredDocuments: number
  truckCount: number
  activeTrucks: number
}

interface RecentActivity {
  id: string
  type: 'fuel' | 'maintenance' | 'compliance'
  description: string
  amount?: number
  date: string
  truck?: string
}

interface Notification {
  id: string
  type: string
  priority: string
  isRead: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboardData = async (showRefresh = false) => {
    try {
      if (!showRefresh) setIsLoading(true)
      else setIsRefreshing(true)
      
      const timestamp = Date.now()
      const [trucksRes, fuelRes, maintenanceRes, complianceRes, notificationsRes] = await Promise.all([
        fetch(`/api/trucks?_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/fuel?_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/maintenance?_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/compliance?_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/notifications?_t=${timestamp}`, { cache: 'no-store' })
      ])

      const trucksData = trucksRes.ok ? await trucksRes.json() : { trucks: [] }
      const fuelData = fuelRes.ok ? await fuelRes.json() : { fuelRecords: [] }
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { maintenanceRecords: [] }
      const complianceData = complianceRes.ok ? await complianceRes.json() : { documents: [] }
      const notificationsData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] }

      // Process data
      const trucks = trucksData.trucks || []
      const fuelRecords = fuelData.fuelRecords || []
      const maintenanceRecords = maintenanceData.maintenanceRecords || []
      const complianceDocuments = complianceData.documents || []
      setNotifications(notificationsData.notifications || [])

      // Calculate statistics
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      // Fuel statistics
      const totalFuelCost = fuelRecords.reduce((sum: number, record: any) => sum + (record.totalCost || 0), 0)
      const currentMonthFuel = fuelRecords.filter((record: any) => new Date(record.date) >= currentMonth)
      const previousMonthFuel = fuelRecords.filter((record: any) => {
        const recordDate = new Date(record.date)
        return recordDate >= previousMonth && recordDate < currentMonth
      })
      const monthlyFuelCost = currentMonthFuel.reduce((sum: number, record: any) => sum + (record.totalCost || 0), 0)
      const prevFuelCost = previousMonthFuel.reduce((sum: number, record: any) => sum + (record.totalCost || 0), 0)
      const fuelChange = prevFuelCost > 0 ? ((monthlyFuelCost - prevFuelCost) / prevFuelCost) * 100 : 0

      // Maintenance statistics
      const totalMaintenanceCost = maintenanceRecords.reduce((sum: number, record: any) => {
        const laborCost = record.laborCost || 0
        const partsCost = (record.spareParts || []).reduce((pSum: number, part: any) => pSum + (part.totalPrice || 0), 0)
        return sum + laborCost + partsCost
      }, 0)

      // Compliance statistics
      const validDocuments = complianceDocuments.filter((doc: any) => doc.status === 'VALID').length
      const expiringDocuments = complianceDocuments.filter((doc: any) => doc.status === 'EXPIRING').length
      const expiredDocuments = complianceDocuments.filter((doc: any) => doc.status === 'EXPIRED').length

      const dashboardStats: DashboardStats = {
        totalExpenses: totalFuelCost + totalMaintenanceCost,
        monthlyExpenses: monthlyFuelCost,
        expenseChange: fuelChange,
        fuelRecords: fuelRecords.length,
        fuelCost: totalFuelCost,
        fuelChange,
        maintenanceRecords: maintenanceRecords.length,
        maintenanceCost: totalMaintenanceCost,
        maintenanceChange: 0,
        complianceDocuments: complianceDocuments.length,
        validDocuments,
        expiringDocuments,
        expiredDocuments,
        truckCount: trucks.length,
        activeTrucks: trucks.filter((truck: any) => truck.status === 'ACTIVE').length
      }

      setStats(dashboardStats)

      // Recent activity
      const activities: RecentActivity[] = []
      fuelRecords.slice(-3).reverse().forEach((record: any) => {
        activities.push({
          id: record.id,
          type: 'fuel',
          description: `Fuel dispensing - ${record.liters}L`,
          amount: record.totalCost,
          date: record.date,
          truck: record.truck?.registration
        })
      })

      maintenanceRecords.slice(-3).reverse().forEach((record: any) => {
        const totalCost = (record.laborCost || 0) + (record.spareParts || []).reduce((sum: number, part: any) => sum + (part.totalPrice || 0), 0)
        activities.push({
          id: record.id,
          type: 'maintenance',
          description: record.description || 'Service completed',
          amount: totalCost,
          date: record.serviceDate,
          truck: record.truck?.registration
        })
      })

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activities.slice(0, 8))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 120000)

    return () => clearInterval(interval)
  }, [])

  const formatKSH = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Dashboard</h3>
          <Button onClick={() => fetchDashboardData()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your fleet today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {unreadCount} notification{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => router.push('/fuel')}>
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </motion.div>

      {/* Main Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKSH(stats.totalExpenses)}</div>
              <div className="flex items-center space-x-1 text-xs">
                {stats.expenseChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-green-500" />
                )}
                <p className={`${stats.expenseChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs(stats.expenseChange).toFixed(1)}% from last month
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fuel Cost</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKSH(stats.fuelCost)}</div>
              <p className="text-xs text-muted-foreground">{stats.fuelRecords} total records</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKSH(stats.maintenanceCost)}</div>
              <p className="text-xs text-muted-foreground">{stats.maintenanceRecords} total services</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.validDocuments}/{stats.complianceDocuments}</div>
              <p className="text-xs text-muted-foreground">Valid documents</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Trucks</span>
                <Badge variant="outline">{stats.truckCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {stats.activeTrucks}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.expiredDocuments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600 dark:text-red-400">Expired</span>
                  <Badge variant="destructive">{stats.expiredDocuments}</Badge>
                </div>
              )}
              {stats.expiringDocuments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">Expiring Soon</span>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    {stats.expiringDocuments}
                  </Badge>
                </div>
              )}
              {stats.expiredDocuments === 0 && stats.expiringDocuments === 0 && (
                <p className="text-sm text-green-600 dark:text-green-400">All documents valid</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.truck} • {formatDate(activity.date)}
                      </p>
                    </div>
                    {activity.amount && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formatKSH(activity.amount)}
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
