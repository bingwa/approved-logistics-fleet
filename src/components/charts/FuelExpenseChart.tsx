// src/components/charts/FuelExpenseChart.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Fuel, Download, Loader2 } from 'lucide-react'
import { formatKSH } from '@/lib/utils'

// Critical: Data validation function to prevent ResponsiveContainer error
const validateChartData = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) {
    return []
  }
  return data.filter(item => item !== null && item !== undefined && typeof item === 'object')
}

export function FuelExpenseChart() {
  const [fuelExpenses, setFuelExpenses] = useState<any[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [selectedTruck, setSelectedTruck] = useState<string>('all')
  const [chartType, setChartType] = useState<'trends' | 'breakdown' | 'comparison'>('trends')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [selectedTruck])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch trucks
      const trucksResponse = await fetch('/api/trucks')
      if (trucksResponse.ok) {
        const trucksData = await trucksResponse.json()
        setTrucks(trucksData.trucks || [])
      }

      // Fetch fuel data with cache busting
      const timestamp = Date.now()
      const response = await fetch(`/api/fuel?_t=${timestamp}`, {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        const processedData = (data.fuelRecords || []).map((record: any) => ({
          date: new Date(record.date).toLocaleDateString('en-GB', { 
            month: 'short', 
            day: 'numeric' 
          }),
          truck: record.truck?.registration || 'Unknown',
          liters: record.liters || 0,
          totalCost: record.totalCost || 0,
          route: record.route || '',
          efficiency: record.efficiencyKmpl || 0
        }))
        
        setFuelExpenses(processedData)
      } else {
        setError('Failed to fetch fuel data')
        setFuelExpenses([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Error loading data')
      setFuelExpenses([])
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate statistics with safe data
  const totalExpense = fuelExpenses.reduce((sum, expense) => sum + (expense.totalCost || 0), 0)
  const totalLiters = fuelExpenses.reduce((sum, expense) => sum + (expense.liters || 0), 0)
  const avgEfficiency = fuelExpenses.length > 0 
    ? fuelExpenses.reduce((sum, expense) => sum + (expense.efficiency || 0), 0) / fuelExpenses.length
    : 0

  // Process data for charts with validation
  const trendData = validateChartData(
    fuelExpenses.reduce((acc: any[], expense) => {
      const existing = acc.find(item => item.date === expense.date)
      if (existing) {
        existing.totalCost += expense.totalCost || 0
        existing.liters += expense.liters || 0
      } else {
        acc.push({
          date: expense.date,
          totalCost: expense.totalCost || 0,
          liters: expense.liters || 0
        })
      }
      return acc
    }, [])
  )

  const truckBreakdown = validateChartData(
    trucks.map(truck => {
      const truckExpenses = fuelExpenses.filter(expense => expense.truck === truck.registration)
      const totalCost = truckExpenses.reduce((sum, expense) => sum + (expense.totalCost || 0), 0)
      return totalCost > 0 ? {
        truck: truck.registration,
        totalCost,
        records: truckExpenses.length
      } : null
    }).filter(Boolean)
  )

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading fuel expense data...</span>
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
              <Fuel className="h-5 w-5 mr-2 text-blue-600" />
              Fuel Expense Report
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive fuel cost analysis and trends
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
                <SelectItem value="breakdown">Breakdown</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatKSH(totalExpense)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Total Expense</div>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {totalLiters.toFixed(1)}L
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Total Fuel</div>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {avgEfficiency.toFixed(1)} km/L
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Avg Efficiency</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* CRITICAL: Always ensure container has dimensions and validate data */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'trends' && trendData.length > 0 ? (
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatKSH(value)} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'totalCost' ? formatKSH(value) : `${value}L`,
                    name === 'totalCost' ? 'Total Cost' : 'Liters'
                  ]}
                />
                <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            ) : chartType === 'breakdown' && truckBreakdown.length > 0 ? (
              <PieChart>
                <Pie
                  data={truckBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ truck, percent }) => `${truck} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  dataKey="totalCost"
                >
                  {truckBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatKSH(value)} />
              </PieChart>
            ) : chartType === 'comparison' && truckBreakdown.length > 0 ? (
              <BarChart data={truckBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="truck" />
                <YAxis tickFormatter={(value) => formatKSH(value)} />
                <Tooltip formatter={(value: any) => formatKSH(value)} />
                <Bar dataKey="totalCost" fill="#3b82f6" />
              </BarChart>
            ) : (
              // CRITICAL: Always provide fallback when no data
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Add fuel records to see expense analysis
                  </p>
                </div>
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
