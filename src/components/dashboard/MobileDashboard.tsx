// src/components/dashboard/MobileDashboard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Truck, 
  Fuel, 
  Wrench, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Activity
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTrucks, useMaintenanceRecords, useFuelRecords } from '@/hooks/useFleetData'

interface QuickStat {
  title: string
  value: string | number
  change?: number
  icon: any
  color: string
  bgColor: string
}

export function MobileDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Fetch real data
  const { data: trucks, refetch: refetchTrucks } = useTrucks()
  const { data: maintenanceRecords, refetch: refetchMaintenance } = useMaintenanceRecords()
  const { data: fuelRecords, refetch: refetchFuel } = useFuelRecords()

  // Calculate real stats
  const activeTrucks = trucks?.filter(truck => truck.status === 'ACTIVE')?.length ?? 0
  const maintenanceTrucks = trucks?.filter(truck => truck.status === 'MAINTENANCE')?.length ?? 0
  const complianceIssues = trucks?.filter(truck => 
    truck.complianceStatus === 'expired' || truck.complianceStatus === 'expiring'
  )?.length ?? 0
  
  const avgFuelEfficiency = fuelRecords?.length
    ? (fuelRecords.reduce((sum, record) => sum + (record.efficiencyKmpl || 0), 0) / fuelRecords.length).toFixed(1)
    : '0.0'

  const quickStats: QuickStat[] = [
    {
      title: 'Active Trucks',
      value: activeTrucks,
      change: +2,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'In Maintenance',
      value: maintenanceTrucks,
      change: -1,
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    },
    {
      title: 'Fuel Efficiency',
      value: `${avgFuelEfficiency} km/L`,
      change: +0.2,
      icon: Fuel,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Compliance Issues',
      value: complianceIssues,
      change: +1,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    }
  ]

  // Convert real data to recent activities
  const recentActivities = [
    ...(fuelRecords?.slice(0, 5).map(record => ({
      id: record.id,
      type: 'fuel',
      truck: record.truck?.registration || 'Unknown',
      action: 'Fuel recorded',
      time: new Date(record.date).toLocaleDateString(),
      amount: `KSh ${record.totalCost?.toLocaleString() || '0'}`
    })) || []),
    ...(maintenanceRecords?.slice(0, 3).map(record => ({
      id: record.id,
      type: 'maintenance',
      truck: record.truck?.registration || 'Unknown',
      action: record.serviceType || 'Service completed',
      time: new Date(record.date).toLocaleDateString(),
      amount: `KSh ${record.cost?.toLocaleString() || '0'}`
    })) || [])
  ].slice(0, 5)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchTrucks(), refetchMaintenance(), refetchFuel()])
    setLastRefresh(new Date())
    setIsRefreshing(false)
  }

  // Pull-to-refresh functionality
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Pull-to-refresh indicator */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ 
          opacity: isPulling ? 1 : 0,
          y: isPulling ? 0 : -50
        }}
        className="fixed top-16 left-1/2 transform -translate-x-1/2 z-20"
      >
        <div className="bg-white dark:bg-slate-800 rounded-full p-3 shadow-lg border">
          <RefreshCw className={`h-5 w-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      </motion.div>

      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Fleet Overview
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                      {stat.change && (
                        <div className={`flex items-center space-x-1 ${
                          stat.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">
                            {Math.abs(stat.change)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {stat.title}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="trucks">Trucks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  {recentActivities.length > 0 ? recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.truck}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {activity.action}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {activity.time}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {activity.amount}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  )) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No recent activity
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                  Priority Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">
                          Insurance Expiring Soon
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Documents expire in 5 days
                        </p>
                      </div>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-orange-900 dark:text-orange-100">
                          Maintenance Overdue
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          Scheduled maintenance pending
                        </p>
                      </div>
                      <Badge className="bg-orange-500">High</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trucks" className="mt-4">
            <div className="space-y-3">
              {trucks?.map((truck) => (
                <Card key={truck.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {truck.registration}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {truck.make} {truck.model}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={truck.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={
                            truck.status === 'ACTIVE'
                              ? 'bg-green-500'
                              : 'bg-orange-500'
                          }
                        >
                          {truck.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-slate-400 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No trucks found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
