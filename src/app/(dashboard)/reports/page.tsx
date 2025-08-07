// src/app/(dashboard)/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, Download, TrendingUp, Loader2 } from 'lucide-react'
import { FuelExpenseChart } from '@/components/charts/FuelExpenseChart'
import { SparesExpenseChart } from '@/components/charts/SparesExpenseChart'
import { MaintenanceReportChart } from '@/components/charts/MaintenanceReportChart'
import { formatKSH } from '@/lib/utils'
import { toast } from 'sonner'

interface ReportStats {
  totalExpenses: number
  fuelExpenses: number
  maintenanceExpenses: number
  sparesExpenses: number
  monthlyTrend: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReportStats()
  }, [])

  const fetchReportStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data for calculations
      const [fuelRes, maintenanceRes] = await Promise.all([
        fetch('/api/fuel', { cache: 'no-store' }),
        fetch('/api/maintenance', { cache: 'no-store' })
      ])

      const fuelData = fuelRes.ok ? await fuelRes.json() : { fuelRecords: [] }
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { maintenanceRecords: [] }

      const fuelRecords = fuelData.fuelRecords || []
      const maintenanceRecords = maintenanceData.maintenanceRecords || []

      // Calculate totals
      const fuelExpenses = fuelRecords.reduce((sum: number, record: any) => sum + record.totalCost, 0)
      
      const maintenanceExpenses = maintenanceRecords.reduce((sum: number, record: any) => {
        const laborCost = record.laborCost || 0
        const partsCost = (record.spareParts || []).reduce((pSum: number, part: any) => pSum + part.totalPrice, 0)
        return sum + laborCost + partsCost
      }, 0)

      const sparesExpenses = maintenanceRecords.reduce((sum: number, record: any) => {
        return sum + (record.spareParts || []).reduce((pSum: number, part: any) => pSum + part.totalPrice, 0)
      }, 0)

      const totalExpenses = fuelExpenses + maintenanceExpenses

      setStats({
        totalExpenses,
        fuelExpenses,
        maintenanceExpenses,
        sparesExpenses,
        monthlyTrend: 12.5 // Calculate actual trend if needed
      })

    } catch (error) {
      console.error('Error fetching report stats:', error)
      toast.error('Failed to load report data')
    } finally {
      setIsLoading(false)
    }
  }

  const generateFullReport = () => {
    const reportWindow = window.open('', '_blank')
    if (!reportWindow) return

    const currentDate = new Date().toLocaleDateString('en-KE')
    
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Fleet Management Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .section { margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { padding: 20px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { color: #666; margin-top: 5px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>FLEET MANAGEMENT REPORT</h1>
        <h2>Approved Logistics Company</h2>
        <p><strong>Generated on:</strong> ${currentDate}</p>
    </div>
    
    <div class="section">
        <h3>Executive Summary</h3>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${stats ? formatKSH(stats.totalExpenses) : 'Loading...'}</div>
                <div class="stat-label">Total Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats ? formatKSH(stats.fuelExpenses) : 'Loading...'}</div>
                <div class="stat-label">Fuel Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats ? formatKSH(stats.maintenanceExpenses) : 'Loading...'}</div>
                <div class="stat-label">Maintenance Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats ? formatKSH(stats.sparesExpenses) : 'Loading...'}</div>
                <div class="stat-label">Spare Parts</div>
            </div>
        </div>
        
        <p><strong>Report Period:</strong> All Time</p>
        <p><strong>Fleet Size:</strong> 1 Truck</p>
        <p><strong>Operational Status:</strong> Active</p>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        }
    </script>
</body>
</html>`

    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-foreground">Loading reports...</span>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fleet Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive fleet expense analysis and reporting
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={generateFullReport}>
            <FileText className="h-4 w-4 mr-2" />
            Full Report
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Expenses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats ? formatKSH(stats.totalExpenses) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">All time expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Fuel Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats ? formatKSH(stats.fuelExpenses) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">Fuel costs</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Maintenance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats ? formatKSH(stats.maintenanceExpenses) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">Service costs</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Spare Parts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats ? formatKSH(stats.sparesExpenses) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">Parts costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Charts */}
      <Tabs defaultValue="fuel" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="fuel">Fuel Expenses</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Report</TabsTrigger>
          <TabsTrigger value="spares">Spares Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fuel" className="space-y-4">
          <FuelExpenseChart />
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceReportChart />
        </TabsContent>
        
        <TabsContent value="spares" className="space-y-4">
          <SparesExpenseChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}
