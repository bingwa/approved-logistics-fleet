// src/components/charts/FleetPerformanceChart.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Activity, Target, Loader2 } from 'lucide-react'

// Critical: Data validation function
const validateChartData = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) {
    return []
  }
  return data.filter(item => item !== null && item !== undefined && typeof item === 'object')
}

export function FleetPerformanceChart() {
  const [truck, setTruck] = useState<any>(null)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [viewType, setViewType] = useState<'radar' | 'bar'>('radar')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTruckData()
  }, [])

  const fetchTruckData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/trucks', { cache: 'no-store' })
      
      if (response.ok) {
        const trucksData = await response.json()
        const firstTruck = trucksData.trucks?.[0]
        
        if (firstTruck) {
          setTruck(firstTruck)
          
          // Create performance metrics - in real app, calculate from actual data
          const performanceMetrics = [
            { metric: 'Fuel Efficiency', value: 75, fullMark: 100 },
            { metric: 'Maintenance Status', value: 85, fullMark: 100 },
            { metric: 'Compliance Status', value: 95, fullMark: 100 },
            { metric: 'Utilization', value: 80, fullMark: 100 },
            { metric: 'Cost Efficiency', value: 70, fullMark: 100 }
          ]
          
          setPerformanceData(performanceMetrics)
        } else {
          setError('No trucks found')
        }
      } else {
        setError('Failed to fetch truck data')
      }
    } catch (error) {
      console.error('Error fetching truck data:', error)
      setError('Error loading truck data')
    } finally {
      setIsLoading(false)
    }
  }

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-500 text-white' }
    if (score >= 60) return { label: 'Good', color: 'bg-blue-500 text-white' }
    if (score >= 40) return { label: 'Fair', color: 'bg-yellow-500 text-black' }
    return { label: 'Poor', color: 'bg-red-500 text-white' }
  }

  // Validate data before using
  const safePerformanceData = validateChartData(performanceData)
  
  const overallScore = safePerformanceData.length > 0 
    ? Math.round(safePerformanceData.reduce((sum, item) => sum + (item.value || 0), 0) / safePerformanceData.length)
    : 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading truck performance data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !truck) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {error || 'No Truck Data Available'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please add a truck to your fleet to see performance analysis.
            </p>
            {error && (
              <button onClick={fetchTruckData} className="px-4 py-2 bg-blue-600 text-white rounded">
                Try Again
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Performance Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Fleet Performance Analysis
              </CardTitle>
              <CardDescription>
                Performance analysis for {truck.registration} ({truck.make} {truck.model})
              </CardDescription>
            </div>
            <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radar">Radar</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* CRITICAL: Always ensure container has dimensions and validate data */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {safePerformanceData.length > 0 ? (
                viewType === 'radar' ? (
                  <RadarChart data={safePerformanceData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name={truck.registration}
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip />
                  </RadarChart>
                ) : (
                  <BarChart data={safePerformanceData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="metric" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                )
              ) : (
                // CRITICAL: Always provide fallback when no data
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Performance metrics will appear once data is available
                    </p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">{truck.registration}</span>
              <Badge className={getPerformanceLevel(overallScore).color}>
                {getPerformanceLevel(overallScore).label}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Vehicle:</span>
                <span>{truck.make} {truck.model}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Mileage:</span>
                <span>{truck.currentMileage?.toLocaleString() || 0} km</span>
              </div>
              <div className="flex justify-between">
                <span>Overall Score:</span>
                <span className="font-semibold">{overallScore}/100</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${getPerformanceLevel(overallScore).color.split(' ')[0]}`}
                  style={{ width: `${overallScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Individual Metrics */}
          <div className="space-y-3">
            {safePerformanceData.map((metric, index) => {
              const performance = getPerformanceLevel(metric.value)
              return (
                <div key={metric.metric} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{metric.metric}</span>
                    <span className="text-sm font-semibold">{metric.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${performance.color.split(' ')[0]}`}
                      style={{ width: `${metric.value}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
