// src/app/(dashboard)/page.tsx
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
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatKSH, formatDate } from '@/lib/utils'
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

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data in parallel
      const [trucksRes, fuelRes, maintenanceRes, complianceRes] = await Promise.all([
        fetch('/api/trucks', { cache: 'no-store' }),
        fetch('/api/fuel', { cache: 'no-store' }),
        fetch('/api/maintenance', { cache: 'no-store' }),
        fetch('/api/compliance', { cache: 'no-store' })
      ])

      const trucksData = trucksRes.ok ? await trucksRes.json() : { trucks: [] }
      const fuelData = fuelRes.ok ? await fuelRes.json() : { fuelRecords: [] }
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { maintenanceRecords: [] }
      const complianceData = complianceRes.ok ? await complianceRes.json() : { documents: [] }

      // Process data to calculate statistics
      const trucks = trucksData.trucks || []
      const fuelRecords = fuelData.fuelRecords || []
      const maintenanceRecords = maintenanceData.maintenanceRecords || []
      const complianceDocuments = complianceData.documents || []

      // Calculate current month and previous month for comparisons
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      // Fuel statistics
      const currentMonthFuel = fuelRecords.filter((record: any) => 
        new Date(record.date) >= currentMonth
      )
      const previousMonthFuel = fuelRecords.filter((record: any) => {
        const recordDate = new Date(record.date)
        return recordDate >= previousMonth && recordDate < currentMonth
      })

      const fuelCost = currentMonthFuel.reduce((sum: number, record: any) => sum + record.totalCost, 0)
      const prevFuelCost = previousMonthFuel.reduce((sum: number, record: any) => sum + record.totalCost, 0)
      const fuelChange = prevFuelCost > 0 ? ((fuelCost - prevFuelCost) / prevFuelCost) * 100 : 0

      // Maintenance statistics
      const currentMonthMaintenance = maintenanceRecords.filter((record: any) => 
        new Date(record.serviceDate) >= currentMonth
      )
      const previousMonthMaintenance = maintenanceRecords.filter((record: any) => {
        const recordDate = new Date(record.serviceDate)
        return recordDate >= previousMonth && recordDate < currentMonth
      })

      const maintenanceCost = currentMonthMaintenance.reduce((sum: number, record: any) => {
        const laborCost = record.laborCost || 0
        const partsCost = (record.spareParts || []).reduce((pSum: number, part: any) => pSum + part.totalPrice, 0)
        return sum + laborCost + partsCost
      }, 0)

      const prevMaintenanceCost = previousMonthMaintenance.reduce((sum: number, record: any) => {
        const laborCost = record.laborCost || 0
        const partsCost = (record.spareParts || []).reduce((pSum: number, part: any) => pSum + part.totalPrice, 0)
        return sum + laborCost + partsCost
      }, 0)

      const maintenanceChange = prevMaintenanceCost > 0 ? ((maintenanceCost - prevMaintenanceCost) / prevMaintenanceCost) * 100 : 0

      // Compliance statistics
      const validDocuments = complianceDocuments.filter((doc: any) => doc.status === 'VALID').length
      const expiringDocuments = complianceDocuments.filter((doc: any) => doc.status === 'EXPIRING').length
      const expiredDocuments = complianceDocuments.filter((doc: any) => doc.status === 'EXPIRED').length

      // Total expenses
      const totalExpenses = fuelCost + maintenanceCost
      const prevTotalExpenses = prevFuelCost + prevMaintenanceCost
      const expenseChange = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0

      const dashboardStats: DashboardStats = {
        totalExpenses,
        monthlyExpenses: totalExpenses,
        expenseChange,
        fuelRecords: fuelRecords.length,
        fuelCost,
        fuelChange,
        maintenanceRecords: maintenanceRecords.length,
        maintenanceCost,
        maintenanceChange,
        complianceDocuments: complianceDocuments.length,
        validDocuments,
        expiringDocuments,
        expiredDocuments,
        truckCount: trucks.length,
        activeTrucks: trucks.filter((truck: any) => truck.status === 'ACTIVE').length
      }

      setStats(dashboardStats)

      // Prepare recent activity
      const activities: RecentActivity[] = []

      // Add recent fuel records
      fuelRecords.slice(0, 3).forEach((record: any) => {
        activities.push({
          id: record.id,
          type: 'fuel',
          description: `Fuel dispensing - ${record.liters}L`,
          amount: record.totalCost,
          date: record.date,
          truck: record.truck?.registration
        })
      })

      // Add recent maintenance records
      maintenanceRecords.slice(0, 3).forEach((record: any) => {
        const totalCost = record.laborCost + (record.spareParts || []).reduce((sum: number, part: any) => sum + part.totalPrice, 0)
        activities.push({
          id: record.id,
          type: 'maintenance',
          description: record.description,
          amount: totalCost,
          date: record.serviceDate,
          truck: record.truck?.registration
        })
      })

      // Add recent compliance documents
      complianceDocuments.slice(0, 2).forEach((doc: any) => {
        activities.push({
          id: doc.id,
          type: 'compliance',
          description: `${doc.documentType.replace('_', ' ')} document`,
          amount: doc.cost,
          date: doc.createdAt,
          truck: doc.truck?.registration
        })
      })

      // Sort by date and take most recent
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentActivity(activities.slice(0, 5))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

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
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Failed to Load Dashboard
          </h3>
          <Button onClick={fetchDashboardData}>Try Again</Button>
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
      </motion.div>

      {/* Main Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(stats.totalExpenses)}</div>
              <div className="flex items-center space-x-1">
                {stats.expenseChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-green-500" />
                )}
                <p className={`text-xs ${stats.expenseChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs(stats.expenseChange).toFixed(1)}% from last month
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Fuel Cost */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Fuel Cost</CardTitle>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(stats.fuelCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.fuelRecords} records this month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Maintenance Cost */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Maintenance Cost</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatKSH(stats.maintenanceCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.maintenanceRecords} services this month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Compliance Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Compliance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.validDocuments}/{stats.complianceDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Valid documents
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats and Alerts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Fleet Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
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

        {/* Compliance Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
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

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.truck} • {formatDate(activity.date)}
                      </p>
                    </div>
                    {activity.amount && (
                      <Badge variant="outline" className="ml-2">
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

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/fuel')}
              >
                <Fuel className="h-6 w-6" />
                <span>Add Fuel</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/maintenance')}
              >
                <Wrench className="h-6 w-6" />
                <span>Maintenance</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/compliance')}
              >
                <Shield className="h-6 w-6" />
                <span>Compliance</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col space-y-2"
                onClick={() => router.push('/reports')}
              >
                <TrendingUp className="h-6 w-6" />
                <span>Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
