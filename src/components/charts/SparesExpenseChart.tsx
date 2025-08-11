// src/components/charts/SparesExpenseChart.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKSH } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Settings, Package, TrendingUp, AlertCircle } from 'lucide-react'

interface SparePartRecord {
  id: string
  name: string
  category: string
  quantity: number
  unitPrice: number
  totalPrice: number
  supplier: string
  installationLocation: string
  maintenanceRecord: {
    serviceDate: string
    truck: {
      registration: string
    }
  }
}

interface SparesAnalytics {
  totalInvestment: number
  totalQuantity: number
  averageCostPerPart: number
  topCategories: Array<{ category: string; totalCost: number; count: number }>
  topSuppliers: Array<{ supplier: string; totalCost: number; count: number }>
  monthlyTrend: Array<{ month: string; cost: number; quantity: number }>
  recentPurchases: SparePartRecord[]
}

const COLORS = ['#e67e22', '#f39c12', '#d35400', '#e74c3c', '#c0392b', '#8e44ad']

export function SparesExpenseChart() {
  const [sparesData, setSparesData] = useState<SparesAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSparesData()
  }, [])

  const fetchSparesData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch maintenance records with spare parts
      const response = await fetch('/api/maintenance?includeSpares=true')
      if (!response.ok) {
        throw new Error('Failed to fetch spare parts data')
      }

      const data = await response.json()
      const maintenanceRecords = data.maintenanceRecords || []

      // Extract and process spare parts data
      const allSpareParts: SparePartRecord[] = []
      
      maintenanceRecords.forEach((record: any) => {
        if (record.spareParts && record.spareParts.length > 0) {
          record.spareParts.forEach((part: any) => {
            allSpareParts.push({
              id: part.id,
              name: part.name,
              category: part.category || 'General',
              quantity: part.quantity || 0,
              unitPrice: part.unitPrice || 0,
              totalPrice: part.totalPrice || 0,
              supplier: part.supplier || 'Unknown',
              installationLocation: part.installationLocation || 'Workshop',
              maintenanceRecord: {
                serviceDate: record.serviceDate,
                truck: {
                  registration: record.truck?.registration || 'Unknown'
                }
              }
            })
          })
        }
      })

      if (allSpareParts.length === 0) {
        setSparesData(null)
        setIsLoading(false)
        return
      }

      // Calculate analytics
      const totalInvestment = allSpareParts.reduce((sum, part) => sum + part.totalPrice, 0)
      const totalQuantity = allSpareParts.reduce((sum, part) => sum + part.quantity, 0)
      const averageCostPerPart = allSpareParts.length > 0 ? totalInvestment / allSpareParts.length : 0

      // Top categories
      const categoryMap = new Map()
      allSpareParts.forEach(part => {
        const existing = categoryMap.get(part.category) || { totalCost: 0, count: 0 }
        categoryMap.set(part.category, {
          totalCost: existing.totalCost + part.totalPrice,
          count: existing.count + 1
        })
      })
      
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 6)

      // Top suppliers
      const supplierMap = new Map()
      allSpareParts.forEach(part => {
        const existing = supplierMap.get(part.supplier) || { totalCost: 0, count: 0 }
        supplierMap.set(part.supplier, {
          totalCost: existing.totalCost + part.totalPrice,
          count: existing.count + 1
        })
      })
      
      const topSuppliers = Array.from(supplierMap.entries())
        .map(([supplier, data]) => ({ supplier, ...data }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 5)

      // Monthly trend (last 6 months)
      const monthlyMap = new Map()
      allSpareParts.forEach(part => {
        const date = new Date(part.maintenanceRecord.serviceDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        
        const existing = monthlyMap.get(monthKey) || { month: monthName, cost: 0, quantity: 0 }
        monthlyMap.set(monthKey, {
          month: monthName,
          cost: existing.cost + part.totalPrice,
          quantity: existing.quantity + part.quantity
        })
      })

      const monthlyTrend = Array.from(monthlyMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6)

      // Recent purchases (last 10)
      const recentPurchases = allSpareParts
        .sort((a, b) => new Date(b.maintenanceRecord.serviceDate).getTime() - new Date(a.maintenanceRecord.serviceDate).getTime())
        .slice(0, 10)

      setSparesData({
        totalInvestment,
        totalQuantity,
        averageCostPerPart,
        topCategories,
        topSuppliers,
        monthlyTrend,
        recentPurchases
      })

    } catch (error) {
      console.error('Error fetching spares data:', error)
      setError('Failed to load spare parts data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 animate-spin" />
              Loading Spare Parts Data...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Analyzing spare parts expenses...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !sparesData) {
    return (
      <div className="grid gap-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-orange-800">No Spares Data Available</CardTitle>
            <CardDescription className="text-orange-600">
              Add maintenance records with spare parts to see detailed analysis and expense tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-white rounded-lg p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-800 mb-2">To see spare parts analytics:</h4>
              <ul className="text-sm text-orange-700 text-left max-w-md mx-auto space-y-1">
                <li>• Create maintenance records</li>
                <li>• Add spare parts to those records</li>
                <li>• Include quantities, prices, and suppliers</li>
                <li>• Track installation locations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Total Investment</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {formatKSH(sparesData.totalInvestment)}
            </div>
            <p className="text-xs text-orange-600">Spare parts spending</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">
              {sparesData.totalQuantity.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600">Parts purchased</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Avg Cost/Part</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">
              {formatKSH(sparesData.averageCostPerPart)}
            </div>
            <p className="text-xs text-yellow-600">Average price</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-pink-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Categories</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              {sparesData.topCategories.length}
            </div>
            <p className="text-xs text-red-600">Part types</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Monthly Spare Parts Expenses
            </CardTitle>
            <CardDescription>Cost trend over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sparesData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatKSH(value)} />
                <Tooltip formatter={(value) => [formatKSH(Number(value)), 'Cost']} />
                <Bar dataKey="cost" fill="#e67e22" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              Parts by Category
            </CardTitle>
            <CardDescription>Distribution of spare parts spending</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sparesData.topCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="totalCost"
                  label={({ category, totalCost }) => `${category}: ${formatKSH(totalCost)}`}
                >
                  {sparesData.topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatKSH(Number(value)), 'Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-600" />
            Recent Spare Parts Purchases
          </CardTitle>
          <CardDescription>Latest parts added to maintenance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Part Name</th>
                  <th className="text-left p-2 font-semibold">Category</th>
                  <th className="text-left p-2 font-semibold">Truck</th>
                  <th className="text-left p-2 font-semibold">Quantity</th>
                  <th className="text-left p-2 font-semibold">Unit Price</th>
                  <th className="text-left p-2 font-semibold">Total Cost</th>
                  <th className="text-left p-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sparesData.recentPurchases.map((part, index) => (
                  <tr key={part.id} className={index % 2 === 0 ? 'bg-orange-50' : 'bg-white'}>
                    <td className="p-2 font-medium">{part.name}</td>
                    <td className="p-2">{part.category}</td>
                    <td className="p-2">{part.maintenanceRecord.truck.registration}</td>
                    <td className="p-2">{part.quantity}</td>
                    <td className="p-2">{formatKSH(part.unitPrice)}</td>
                    <td className="p-2 font-semibold text-orange-800">{formatKSH(part.totalPrice)}</td>
                    <td className="p-2">{new Date(part.maintenanceRecord.serviceDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
