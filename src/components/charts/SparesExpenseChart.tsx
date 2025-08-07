// src/components/charts/SparesExpenseChart.tsx
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
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Loader2 } from 'lucide-react'
import { formatKSH } from '@/lib/utils'

// Critical: Data validation function
const validateChartData = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) {
    return []
  }
  return data.filter(item => item !== null && item !== undefined && typeof item === 'object')
}

export function SparesExpenseChart() {
  const [spareExpenses, setSpareExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

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
        
        // Process maintenance records to extract spare parts
        const processedData: any[] = []
        
        ;(data.maintenanceRecords || []).forEach((record: any) => {
          if (record.sparePartsUsed && record.sparePartsUsed.length > 0) {
            record.sparePartsUsed.forEach((spare: any, index: number) => {
              if (spare && spare.partName) {
                processedData.push({
                  id: `${record.id}-${index}`,
                  date: new Date(record.serviceDate).toLocaleDateString('en-GB', { 
                    month: 'short', 
                    day: 'numeric' 
                  }),
                  truck: record.truck?.registration || 'Unknown',
                  spareName: spare.partName,
                  quantity: spare.quantity || 1,
                  unitPrice: spare.unitPrice || 0,
                  totalCost: (spare.quantity || 1) * (spare.unitPrice || 0),
                  supplier: spare.supplier || 'Unknown',
                  category: categorizeSpare(spare.partName)
                })
              }
            })
          }
        })
        
        setSpareExpenses(processedData)
      } else {
        setError('Failed to fetch spares data')
        setSpareExpenses([])
      }
    } catch (error) {
      console.error('Error fetching spares data:', error)
      setError('Error loading spares data')
      setSpareExpenses([])
    } finally {
      setIsLoading(false)
    }
  }

  const categorizeSpare = (partName: string): string => {
    if (!partName) return 'Other Parts'
    const part = partName.toLowerCase()
    if (part.includes('oil') || part.includes('filter')) return 'Fluids & Filters'
    if (part.includes('brake') || part.includes('pad')) return 'Brakes'
    if (part.includes('tire') || part.includes('wheel')) return 'Tires & Wheels'
    if (part.includes('engine') || part.includes('belt')) return 'Engine'
    if (part.includes('electrical') || part.includes('wire')) return 'Electrical'
    return 'Other Parts'
  }

  // Calculate statistics with validation
  const totalExpense = spareExpenses.reduce((sum, expense) => sum + (expense.totalCost || 0), 0)
  const totalParts = spareExpenses.reduce((sum, expense) => sum + (expense.quantity || 0), 0)

  // Process data for charts with validation
  const categoryData = validateChartData(
    spareExpenses.reduce((acc: any[], expense) => {
      const existing = acc.find(item => item.category === expense.category)
      if (existing) {
        existing.totalCost += expense.totalCost || 0
        existing.quantity += expense.quantity || 0
      } else {
        acc.push({
          category: expense.category,
          totalCost: expense.totalCost || 0,
          quantity: expense.quantity || 0
        })
      }
      return acc
    }, [])
  )

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading spares expense data...</span>
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
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded">
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2 text-purple-600" />
          Spares Expense Report
        </CardTitle>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatKSH(totalExpense)}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Total Expense</div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {totalParts}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Parts Purchased</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* CRITICAL: Always ensure container has dimensions and validate data */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {categoryData.length > 0 ? (
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
                <Tooltip formatter={(value: any) => formatKSH(value)} />
              </PieChart>
            ) : (
              // CRITICAL: Always provide fallback when no data
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Spares Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Add maintenance records with spare parts to see analysis
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
