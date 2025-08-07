// src/components/dashboard/MobileDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
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

  const quickStats: QuickStat[] = [
    {
      title: 'Active Trucks',
      value: 8,
      change: +2,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'In Maintenance',
      value: 2,
      change: -1,
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    },
    {
      title: 'Fuel Efficiency',
      value: '2.8 km/L',
      change: +0.2,
      icon: Fuel,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Compliance Issues',
      value: 3,
      change: +1,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    }
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'fuel',
      truck: 'KBY 123A',
      action: 'Fuel recorded',
      time: '2 hours ago',
      amount: 'KSh 7,500'
    },
    {
      id: 2,
      type: 'maintenance',
      truck: 'KCA 456B',
      action: 'Service completed',
      time: '5 hours ago',
      amount: 'KSh 25,000'
    },
    {
      id: 3,
      type: 'compliance',
      truck: 'KDB 789C',
      action: 'Insurance expiring',
      time: '1 day ago',
      amount: 'In 30 days'
    }
  ]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
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
                  {recentActivities.map((activity) => (
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
                  ))}
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
                          KDB 789C - Expires in 5 days
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
                          KCA 456B - 15 days overdue
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
              {[
                { reg: 'KBY 123A', status: 'Active', efficiency: '2.8 km/L' },
                { reg: 'KCA 456B', status: 'Maintenance', efficiency: '2.5 km/L' },
                { reg: 'KDB 789C', status: 'Active', efficiency: '3.1 km/L' },
              ].map((truck) => (
                <Card key={truck.reg} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Truck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {truck.reg}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Efficiency: {truck.efficiency}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={truck.status === 'Active' ? 'default' : 'secondary'}
                          className={
                            truck.status === 'Active'
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
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
