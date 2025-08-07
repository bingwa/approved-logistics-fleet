// src/components/charts/MaintenanceReportChart.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Wrench, Download, Loader2, Calendar } from 'lucide-react'
import { formatKSH, formatDate } from '@/lib/utils'
import { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'

const validateChartData = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) return []
  return data.filter(item => item && typeof item === 'object' && item !== null)
}

export function MaintenanceReportChart() {
  const [maintenanceData, setMaintenanceData] = useState<any[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [selectedTruck, setSelectedTruck] = useState<string>('all')
  const [chartType, setChartType] = useState<'trends' | 'breakdown' | 'comparison' | 'category'>('trends')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -90),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchData()
    }
  }, [selectedTruck, dateRange, isClient])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const timestamp = Date.now()
      const response = await fetch(`/api/maintenance?_t=${timestamp}`, {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        const processedData = (data.maintenanceRecords || []).map((record: any) => {
          const laborCost = record.laborCost || 0
          const partsCost = (record.spareParts || []).reduce((sum: number, part: any) => sum + part.totalPrice, 0)
          
          return {
            id: record.id,
            date: format(new Date(record.serviceDate), 'MMM dd'),
            fullDate: record.serviceDate,
            truck: record.truck?.registration || 'Unknown',
            serviceType: record.serviceType || 'Unknown',
            maintenanceCategory: record.maintenanceCategory || 'Unknown',
            description: record.description || '',
            laborCost,
            partsCost,
            totalCost: laborCost + partsCost,
            vendorName: record.vendorName || 'Unknown',
            mileageAtService: record.mileageAtService || 0,
            spareParts: record.spareParts || []
          }
        })
        
        setMaintenanceData(processedData)
        
        // Fetch trucks
        const trucksResponse = await fetch('/api/trucks')
        if (trucksResponse.ok) {
          const trucksData = await trucksResponse.json()
          setTrucks(trucksData.trucks || [])
        }
      } else {
        throw new Error('Failed to fetch maintenance data')
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
      setError('Error loading maintenance data')
      setMaintenanceData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Safe data processing
  const safeData = validateChartData(maintenanceData)
  
  // Calculate statistics
  const totalCost = safeData.reduce((sum, record) => sum + (record.totalCost || 0), 0)
  const totalLaborCost = safeData.reduce((sum, record) => sum + (record.laborCost || 0), 0)
  const totalPartsCost = safeData.reduce((sum, record) => sum + (record.partsCost || 0), 0)
  const avgCostPerService = safeData.length > 0 ? totalCost / safeData.length : 0

  // Process data for different chart types
  const trendData = validateChartData(
    safeData.reduce((acc: any[], record) => {
      const existing = acc.find(item => item?.date === record?.date)
      if (existing) {
        existing.totalCost += record?.totalCost || 0
        existing.laborCost += record?.laborCost || 0
        existing.partsCost += record?.partsCost || 0
        existing.count += 1
      } else {
        acc.push({
          date: record?.date || '',
          totalCost: record?.totalCost || 0,
          laborCost: record?.laborCost || 0,
          partsCost: record?.partsCost || 0,
          count: 1
        })
      }
      return acc
    }, [])
  )

  const categoryData = validateChartData(
    safeData.reduce((acc: any[], record) => {
      const existing = acc.find(item => item?.category === record?.maintenanceCategory)
      if (existing) {
        existing.totalCost += record?.totalCost || 0
        existing.count += 1
      } else {
        acc.push({
          category: record?.maintenanceCategory || 'Unknown',
          totalCost: record?.totalCost || 0,
          count: 1
        })
      }
      return acc
    }, [])
  )

  const serviceTypeData = validateChartData(
    safeData.reduce((acc: any[], record) => {
      const existing = acc.find(item => item?.type === record?.serviceType)
      if (existing) {
        existing.totalCost += record?.totalCost || 0
        existing.count += 1
      } else {
        acc.push({
          type: record?.serviceType || 'Unknown',
          totalCost: record?.totalCost || 0,
          count: 1
        })
      }
      return acc
    }, [])
  )

  const vendorData = validateChartData(
    safeData.reduce((acc: any[], record) => {
      const existing = acc.find(item => item?.vendor === record?.vendorName)
      if (existing) {
        existing.totalCost += record?.totalCost || 0
        existing.count += 1
      } else {
        acc.push({
          vendor: record?.vendorName || 'Unknown',
          totalCost: record?.totalCost || 0,
          count: 1
        })
      }
      return acc
    }, []).sort((a, b) => b.totalCost - a.totalCost).slice(0, 8)
  )

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  if (!isClient) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="animate-pulse">Loading chart...</div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading maintenance report data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <Button onClick={fetchData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-orange-600" />
              Maintenance Report & Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive maintenance and service cost analysis
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Select value={selectedTruck} onValueChange={setSelectedTruck}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Truck" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trucks</SelectItem>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id}>
                    {truck.registration}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trends">Trends</SelectItem>
                <SelectItem value="category">Categories</SelectItem>
                <SelectItem value="comparison">Vendors</SelectItem>
                <SelectItem value="breakdown">Types</SelectItem>
              </SelectContent>
            </Select>
            
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {formatKSH(totalCost)}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">Total Cost</div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatKSH(totalLaborCost)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Labor Costs</div>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatKSH(totalPartsCost)}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Parts Costs</div>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatKSH(avgCostPerService)}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Avg per Service</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80 w-full">
          {(trendData.length > 0 || categoryData.length > 0 || serviceTypeData.length > 0 || vendorData.length > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'trends' && trendData.length > 0 ? (
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date"
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    yAxisId="cost"
                    tickFormatter={(value) => formatKSH(value)}
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    yAxisId="count"
                    orientation="right"
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'count') return [value, 'Services']
                      return [formatKSH(value), name === 'laborCost' ? 'Labor Cost' : name === 'partsCost' ? 'Parts Cost' : 'Total Cost']
                    }}
                  />
                  <Area yAxisId="cost" type="monotone" dataKey="totalCost" fill="#f59e0b" fillOpacity={0.2} />
                  <Bar yAxisId="cost" dataKey="laborCost" fill="#3b82f6" />
                  <Bar yAxisId="cost" dataKey="partsCost" fill="#10b981" />
                  <Line yAxisId="count" type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
                </ComposedChart>
              ) : chartType === 'category' && categoryData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    dataKey="totalCost"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatKSH(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                </PieChart>
              ) : chartType === 'comparison' && vendorData.length > 0 ? (
                <BarChart data={vendorData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="vendor"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatKSH(value)}
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatKSH(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="totalCost" fill="#f59e0b" />
                </BarChart>
              ) : chartType === 'breakdown' && serviceTypeData.length > 0 ? (
                <BarChart data={serviceTypeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="type"
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatKSH(value)}
                    fontSize={12}
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatKSH(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="totalCost" fill="#8b5cf6" />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                    <p className="text-sm text-muted-foreground">
                      No data available for {chartType} view
                    </p>
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Maintenance Data Available</h3>
                <p className="text-sm text-muted-foreground">
                  Add maintenance records to see analysis and trends
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
