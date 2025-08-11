// src/app/(dashboard)/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { BarChart3, FileText, Download, TrendingUp, Loader2, Settings, Truck, Fuel, Wrench, Shield, DollarSign, Calendar, Activity, AlertCircle, Columns } from 'lucide-react'
import { FuelExpenseChart } from '@/components/charts/FuelExpenseChart'
import { SparesExpenseChart } from '@/components/charts/SparesExpenseChart'
import { MaintenanceReportChart } from '@/components/charts/MaintenanceReportChart'
import { formatKSH } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ReportStats {
  totalExpenses: number
  fuelExpenses: number
  maintenanceExpenses: number
  sparesExpenses: number
  monthlyTrend: number
}

interface Truck {
  id: string
  registration: string
  make: string
  model: string
}

// ENHANCED: Comprehensive column mappings with spare parts focus
const REPORT_TYPE_COLUMNS = {
  comprehensive: {
    maintenance: [
      "Truck Number (Registration Plate)", 
      "Service Date", 
      "Maintenance Type", 
      "Status", 
      "Technician", 
      "Labor Cost", 
      "Description",
      // SPARE PARTS FOCUSED COLUMNS
      "Spare Parts Used",
      "Spare Part Types", 
      "Spare Parts Quantity",
      "Spare Parts Unit Price",
      "Spare Parts Total Cost",
      "Parts Destination/Location",
      "Parts Supplier/Vendor"
    ],
    fuel: ["Truck Number (Registration Plate)", "Date", "Liters", "Cost per Liter", "Total Cost", "Distance", "Efficiency", "Attendant", "Route"],
    compliance: ["Truck Number (Registration Plate)", "Document Type", "Issue Date", "Expiry Date", "Status", "Days to Expiry", "Cost", "Authority"],
    analytics: ["Metric", "Value", "Period", "Trend", "Performance"],
    // NEW: Dedicated Spare Parts Section
    spares: [
      "Truck Number (Registration Plate)",
      "Service Date",
      "Spare Part Name",
      "Spare Part Category/Type",
      "Quantity Used",
      "Unit Price",
      "Total Cost",
      "Supplier/Vendor",
      "Destination/Installation Location",
      "Part Number/Code",
      "Maintenance Reference"
    ]
  },
  operational: {
    maintenance: [
      "Truck Number (Registration Plate)", 
      "Service Date", 
      "Maintenance Type", 
      "Status", 
      "Labor Cost",
      "Spare Parts Used",
      "Spare Parts Total Cost",
      "Parts Installation Location",
      "Technician"
    ],
    fuel: ["Truck Number (Registration Plate)", "Date", "Liters", "Total Cost", "Efficiency", "Route"],
    compliance: ["Truck Number (Registration Plate)", "Document Type", "Status", "Expiry Date"],
    analytics: ["Metric", "Value", "Performance Status"],
    spares: [
      "Truck Number (Registration Plate)",
      "Spare Part Name", 
      "Quantity Used",
      "Total Cost",
      "Service Date",
      "Destination/Installation Location"
    ]
  },
  financial: {
    maintenance: [
      "Truck Number (Registration Plate)", 
      "Service Date", 
      "Description", 
      "Labor Cost", 
      "Vendor",
      // FINANCIAL FOCUS ON SPARE PARTS
      "Spare Parts Cost Breakdown",
      "Individual Spare Part Costs",
      "Spare Parts vs Labor Cost Ratio",
      "Total Parts Investment"
    ],
    fuel: ["Truck Number (Registration Plate)", "Date", "Total Cost", "Cost per Liter"],
    compliance: ["Truck Number (Registration Plate)", "Document Type", "Cost"],
    analytics: ["Metric", "Cost Impact", "Budget Variance"],
    spares: [
      "Spare Part Name",
      "Spare Part Category/Type", 
      "Quantity Used",
      "Unit Price",
      "Total Cost",
      "Cost per Unit Analysis",
      "Supplier/Vendor",
      "Service Date",
      "Truck Number (Registration Plate)"
    ]
  },
  compliance: {
    compliance: ["Truck Number (Registration Plate)", "Document Type", "Certificate Number", "Issue Date", "Expiry Date", "Status", "Authority"],
    maintenance: ["Truck Number (Registration Plate)", "Service Date", "Service Type", "Status"],
    fuel: ["Truck Number (Registration Plate)", "Date", "Route"],
    analytics: ["Metric", "Compliance Status", "Days to Expiry"]
  },
  'single-truck': {
    maintenance: [
      "Service Date", 
      "Maintenance Type", 
      "Description", 
      "Labor Cost", 
      "Vendor", 
      "Technician", 
      "Status",
      "Spare Parts Details",
      "Parts Cost Analysis",
      "Parts Installation Location"
    ],
    fuel: ["Date", "Liters", "Cost per Liter", "Total Cost", "Distance", "Efficiency", "Route"],
    compliance: ["Document Type", "Issue Date", "Expiry Date", "Status", "Cost", "Authority"],
    analytics: ["Metric", "Value", "Trend", "Target"],
    spares: [
      "Service Date",
      "Spare Part Name",
      "Spare Part Category/Type",
      "Quantity Used", 
      "Unit Price",
      "Total Cost",
      "Supplier/Vendor",
      "Installation Location/Destination",
      "Maintenance Type"
    ]
  }
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [showCustomGenerator, setShowCustomGenerator] = useState(false)
  
  // Custom report generator state
  const [selectedTrucks, setSelectedTrucks] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [reportType, setReportType] = useState<string>('comprehensive')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState<{ pdf: boolean; excel: boolean }>({ pdf: false, excel: false })
  
  // Column selection state
  const [availableColumns, setAvailableColumns] = useState<{[key: string]: string[]}>({})
  const [selectedColumns, setSelectedColumns] = useState<{[key: string]: string[]}>({})

  // ENHANCED: Report fields with spare parts as a dedicated option
  const reportFields = [
    { id: 'maintenance', label: 'Maintenance Records', icon: Wrench, description: 'Service and repair records' },
    { id: 'fuel', label: 'Fuel Records', icon: Fuel, description: 'Fuel consumption and costs' },
    { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Certificates and documentation' },
    { id: 'spares', label: 'Spare Parts', icon: Settings, description: 'Detailed spare parts usage and costs' }, // NEW
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Performance metrics and insights' }
  ]

  const reportTypes = [
    { value: 'comprehensive', label: 'Comprehensive Report', description: 'Complete fleet analysis' },
    { value: 'operational', label: 'Operational Report', description: 'Focus on performance metrics' },
    { value: 'financial', label: 'Financial Report', description: 'Cost analysis and expenses' },
    { value: 'compliance', label: 'Compliance Report', description: 'Documentation and certifications' },
    { value: 'single-truck', label: 'Single Truck Profile', description: 'Detailed truck-specific report' }
  ]

  useEffect(() => {
    fetchReportStats()
    fetchTrucks()
  }, [])

  // Update available columns when report type changes
  useEffect(() => {
    console.log('[DEBUG] Report type changed to:', reportType)
    const reportColumns = REPORT_TYPE_COLUMNS[reportType as keyof typeof REPORT_TYPE_COLUMNS]
    if (reportColumns) {
      setAvailableColumns(reportColumns)
      
      // Auto-select all columns for selected fields
      const newSelectedColumns: {[key: string]: string[]} = {}
      selectedFields.forEach(fieldType => {
        if (reportColumns[fieldType as keyof typeof reportColumns]) {
          newSelectedColumns[fieldType] = [...reportColumns[fieldType as keyof typeof reportColumns]]
        }
      })
      setSelectedColumns(newSelectedColumns)
      
      console.log('[DEBUG] Available columns updated:', reportColumns)
      console.log('[DEBUG] Selected columns updated:', newSelectedColumns)
    }
  }, [reportType, selectedFields])

  const fetchTrucks = async () => {
    try {
      const response = await fetch('/api/trucks')
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
      }
    } catch (error) {
      console.error('Error fetching trucks:', error)
    }
  }

  const fetchReportStats = async () => {
    try {
      setIsLoading(true)
      
      const [fuelRes, maintenanceRes] = await Promise.all([
        fetch('/api/fuel', { cache: 'no-store' }),
        fetch('/api/maintenance', { cache: 'no-store' })
      ])

      const fuelData = fuelRes.ok ? await fuelRes.json() : { fuelRecords: [] }
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { maintenanceRecords: [] }

      const fuelRecords = fuelData.fuelRecords || []
      const maintenanceRecords = maintenanceData.maintenanceRecords || []

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
        monthlyTrend: 12.5
      })

    } catch (error) {
      console.error('Error fetching report stats:', error)
      toast.error('Failed to load report data')
    } finally {
      setIsLoading(false)
    }
  }

  // FIXED: Truck selection handlers
  const handleTruckSelection = (checked: boolean | string, truckId: string) => {
    const isChecked = checked === true
    
    if (truckId === 'all') {
      setSelectedTrucks(isChecked ? ['all'] : [])
    } else {
      setSelectedTrucks(prev => {
        const withoutAll = prev.filter(id => id !== 'all')
        if (isChecked) {
          return withoutAll.includes(truckId) ? withoutAll : [...withoutAll, truckId]
        } else {
          return withoutAll.filter(id => id !== truckId)
        }
      })
    }
  }

  // FIXED: Field selection handlers with column updates
  const handleFieldSelection = (checked: boolean | string, fieldId: string) => {
    const isChecked = checked === true
    
    setSelectedFields(prev => {
      const newFields = isChecked 
        ? prev.includes(fieldId) ? prev : [...prev, fieldId]
        : prev.filter(id => id !== fieldId)
      
      console.log('[DEBUG] Field selection updated:', newFields)
      return newFields
    })

    // Update selected columns when fields change
    if (!isChecked) {
      setSelectedColumns(prev => {
        const newCols = { ...prev }
        delete newCols[fieldId]
        return newCols
      })
    } else {
      setSelectedColumns(prev => ({
        ...prev,
        [fieldId]: [...(availableColumns[fieldId] || [])]
      }))
    }
  }

  // FIXED: Column selection handlers
  const handleColumnSelection = (checked: boolean | string, fieldType: string, columnName: string) => {
    const isChecked = checked === true
    
    setSelectedColumns(prev => {
      const currentColumns = prev[fieldType] || []
      
      if (isChecked) {
        if (!currentColumns.includes(columnName)) {
          const newColumns = [...currentColumns, columnName]
          console.log(`[DEBUG] Added column "${columnName}" to ${fieldType}:`, newColumns)
          return { ...prev, [fieldType]: newColumns }
        }
      } else {
        const newColumns = currentColumns.filter(col => col !== columnName)
        console.log(`[DEBUG] Removed column "${columnName}" from ${fieldType}:`, newColumns)
        return { ...prev, [fieldType]: newColumns }
      }
      
      return prev
    })
  }

  const handleSelectAllColumns = (fieldType: string, selectAll: boolean) => {
    setSelectedColumns(prev => ({
      ...prev,
      [fieldType]: selectAll ? [...(availableColumns[fieldType] || [])] : []
    }))
  }

  const generateCustomReport = async () => {
    if (selectedTrucks.length === 0) {
      toast.error('Please select at least one truck')
      return
    }

    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to include')
      return
    }

    const totalSelectedColumns = Object.values(selectedColumns).reduce((sum, cols) => sum + cols.length, 0)
    if (totalSelectedColumns === 0) {
      toast.error('Please select at least one column to include')
      return
    }

    try {
      setIsGenerating(true)
      
      const payload = {
        truckIds: selectedTrucks,
        fields: selectedFields,
        selectedColumns,
        dateRange,
        reportType,
        format: 'json'
      }
      
      console.log('[DEBUG] Sending payload:', payload)
      
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const result = await response.json()
        setGeneratedReport(result.report)
        toast.success('Custom report generated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating custom report:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  // Download handlers
  const downloadReportPDF = async () => {
    if (!generatedReport) {
      toast.error('No report to download')
      return
    }

    try {
      setIsDownloading(prev => ({ ...prev, pdf: true }))
      
      const response = await fetch('/api/reports/download/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: generatedReport, selectedColumns })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Fleet-Report-${format(new Date(), 'yyyy-MM-dd')}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('PDF report downloaded successfully!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to download PDF')
      }
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error('Failed to download PDF report')
    } finally {
      setIsDownloading(prev => ({ ...prev, pdf: false }))
    }
  }

  const downloadReportExcel = async () => {
    if (!generatedReport) {
      toast.error('No report to download')
      return
    }

    try {
      setIsDownloading(prev => ({ ...prev, excel: true }))
      
      const response = await fetch('/api/reports/download/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: generatedReport, selectedColumns })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Fleet-Report-${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Excel file downloaded successfully!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to download Excel file')
      }
    } catch (error) {
      console.error('Excel download error:', error)
      toast.error('Failed to download Excel file')
    } finally {
      setIsDownloading(prev => ({ ...prev, excel: false }))
    }
  }

  // UPDATED: generateFullReport function with Fleet Asset Information removed
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
        <p><strong>Fleet Size:</strong> ${trucks.length} Trucks</p>
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

  if (showCustomGenerator) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Custom Report Generator</h1>
              <p className="text-muted-foreground">
                Create detailed, customized reports with selected data columns
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCustomGenerator(false)}
            >
              Back to Reports
            </Button>
          </div>

          {/* Report Generator Form */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Left Column - Truck Selection */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Select Trucks
                  </CardTitle>
                  <CardDescription>
                    Choose which trucks to include
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-trucks"
                      checked={selectedTrucks.includes('all')}
                      onCheckedChange={(checked) => handleTruckSelection(checked, 'all')}
                    />
                    <Label htmlFor="all-trucks" className="font-medium cursor-pointer">
                      All Trucks ({trucks.length})
                    </Label>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {trucks.map((truck) => (
                      <div key={truck.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={truck.id}
                          checked={selectedTrucks.includes(truck.id)}
                          onCheckedChange={(checked) => handleTruckSelection(checked, truck.id)}
                          disabled={selectedTrucks.includes('all')}
                        />
                        <Label htmlFor={truck.id} className="flex-1 cursor-pointer text-sm">
                          {truck.registration} - {truck.make} {truck.model}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedTrucks.length > 0 && (
                    <div className="pt-2">
                      <Badge variant="outline">
                        {selectedTrucks.includes('all') 
                          ? `All ${trucks.length} trucks selected`
                          : `${selectedTrucks.length} truck${selectedTrucks.length > 1 ? 's' : ''} selected`
                        }
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Type and Date Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Report Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Range (Optional)</Label>
                    <DatePickerWithRange
                      date={dateRange}
                      onDateChange={setDateRange}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Field Selection */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Data Fields
                  </CardTitle>
                  <CardDescription>
                    Select data types to include
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reportFields.map((field) => {
                    const Icon = field.icon
                    const isSparePartsField = field.id === 'spares'
                    return (
                      <div key={field.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={(checked) => handleFieldSelection(checked, field.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={field.id} className={`flex items-center gap-2 cursor-pointer font-medium ${isSparePartsField ? 'text-orange-700' : ''}`}>
                            <Icon className="h-4 w-4" />
                            {field.label}
                            {isSparePartsField && <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">CLIENT FOCUS</Badge>}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {field.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Column Selection */}
            <div className="space-y-6">
              {/* Select Columns to Include Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Columns className="h-5 w-5" />
                    Select Columns to Include
                  </CardTitle>
                  <CardDescription>
                    Choose specific columns for your report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Columns className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Please select data fields first to see available columns</p>
                    </div>
                  ) : (
                    selectedFields.map((fieldType) => {
                      const isSparePartsField = fieldType === 'spares'
                      return (
                        <div key={fieldType} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className={`font-semibold text-sm uppercase tracking-wide ${isSparePartsField ? 'text-orange-700' : ''}`}>
                              {fieldType} Columns
                              {isSparePartsField && <span className="ml-2 text-xs">⚙️</span>}
                            </Label>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleSelectAllColumns(fieldType, true)}
                                className="text-xs h-6 px-2"
                              >
                                All
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleSelectAllColumns(fieldType, false)}
                                className="text-xs h-6 px-2"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                          
                          <div className={`grid grid-cols-1 gap-2 pl-4 border-l-2 ${isSparePartsField ? 'border-orange-300' : 'border-muted'}`}>
                            {(availableColumns[fieldType] || []).map((column) => {
                              const isSparePartsColumn = column.toLowerCase().includes('spare') || column.toLowerCase().includes('parts')
                              return (
                                <div key={`${fieldType}-${column}`} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${fieldType}-${column}`}
                                    checked={(selectedColumns[fieldType] || []).includes(column)}
                                    onCheckedChange={(checked) => handleColumnSelection(checked, fieldType, column)}
                                  />
                                  <Label htmlFor={`${fieldType}-${column}`} className={`text-sm cursor-pointer flex-1 ${isSparePartsColumn ? 'font-medium text-orange-800' : ''}`}>
                                    {column}
                                    {isSparePartsColumn && <span className="ml-1 text-xs">🔧</span>}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                          
                          {(selectedColumns[fieldType] || []).length > 0 && (
                            <Badge variant={isSparePartsField ? "default" : "secondary"} className={`text-xs ${isSparePartsField ? 'bg-orange-100 text-orange-800' : ''}`}>
                              {selectedColumns[fieldType].length} column{selectedColumns[fieldType].length > 1 ? 's' : ''} selected
                            </Badge>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={generateCustomReport}
                    disabled={isGenerating || selectedTrucks.length === 0 || selectedFields.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Generate Custom Report
                      </>
                    )}
                  </Button>
                  
                  <div className="mt-3 text-sm text-center">
                    {selectedTrucks.length === 0 && (
                      <p className="text-red-600 flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Please select at least one truck
                      </p>
                    )}
                    
                    {selectedFields.length === 0 && (
                      <p className="text-red-600 flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Please select at least one field
                      </p>
                    )}

                    {Object.values(selectedColumns).reduce((sum, cols) => sum + cols.length, 0) === 0 && selectedFields.length > 0 && (
                      <p className="text-red-600 flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Please select at least one column
                      </p>
                    )}

                    {selectedTrucks.length > 0 && selectedFields.length > 0 && Object.values(selectedColumns).reduce((sum, cols) => sum + cols.length, 0) > 0 && (
                      <p className="text-green-600 text-xs">
                        Ready to generate: {selectedTrucks.includes('all') ? trucks.length : selectedTrucks.length} trucks, {selectedFields.length} fields, {Object.values(selectedColumns).reduce((sum, cols) => sum + cols.length, 0)} columns
                        {selectedFields.includes('spares') && <span className="ml-2">🔧 Spare Parts Included</span>}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FIXED: Generated Report Preview Section */}
          {generatedReport && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Report Preview
                  {generatedReport.metadata?.sparePartsFocus && (
                    <Badge className="bg-orange-100 text-orange-800">🔧 Spare Parts Focus</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Generated on {format(new Date(generatedReport.metadata.generatedAt), 'MMM dd, yyyy HH:mm')} • 
                  {Object.keys(generatedReport.data || {}).length} data sections • 
                  {Object.values(selectedColumns).reduce((sum, cols) => sum + cols.length, 0)} columns selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">
                      {generatedReport.metadata.trucksIncluded}
                    </div>
                    <div className="text-sm text-blue-600">Trucks Analyzed</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                      {formatKSH(generatedReport.analytics?.overall?.totalOperationalCost || 0)}
                    </div>
                    <div className="text-sm text-green-600">Total Operational Cost</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-700">
                      {generatedReport.analytics?.overall?.sparePartsPercentage || 0}%
                    </div>
                    <div className="text-sm text-orange-600">Spare Parts Share</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">
                      {Object.values(generatedReport.data || {}).reduce((sum: number, records: any) => sum + (records?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-purple-600">Total Records</div>
                  </div>
                </div>

                {/* FIXED: Actual Data Tables Preview */}
                <div className="space-y-6">
                  {Object.keys(selectedColumns || {}).map(fieldType => {
                    const records = generatedReport.data?.[fieldType] || []
                    const columns = selectedColumns[fieldType] || []
                    
                    if (records.length === 0 || columns.length === 0) return null
                    
                    const isSparePartsRelated = fieldType === 'spares' || 
                      columns.some((col: string) => col.toLowerCase().includes('spare') || col.toLowerCase().includes('parts'))
                    
                    const fieldTitles = {
                      maintenance: 'Maintenance Records',
                      fuel: 'Fuel Records',
                      compliance: 'Compliance Documents',
                      spares: 'Spare Parts Details',
                      analytics: 'Analytics Data'
                    }
                    
                    return (
                      <div key={fieldType} className={`bg-gradient-to-r ${isSparePartsRelated ? 'from-orange-50 to-amber-50' : 'from-blue-50 to-indigo-50'} p-6 rounded-xl border ${isSparePartsRelated ? 'border-orange-200' : 'border-blue-200'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`font-bold text-lg flex items-center gap-2 ${isSparePartsRelated ? 'text-orange-800' : 'text-blue-800'}`}>
                            {fieldType === 'maintenance' && <Wrench className="h-5 w-5" />}
                            {fieldType === 'fuel' && <Fuel className="h-5 w-5" />}
                            {fieldType === 'compliance' && <Shield className="h-5 w-5" />}
                            {fieldType === 'spares' && <Settings className="h-5 w-5" />}
                            {fieldType === 'analytics' && <TrendingUp className="h-5 w-5" />}
                            {fieldTitles[fieldType as keyof typeof fieldTitles] || fieldType}
                            {isSparePartsRelated && <Badge className="bg-orange-100 text-orange-800 text-xs">🔧 FOCUS</Badge>}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {records.length} records • {columns.length} columns
                          </Badge>
                        </div>
                        
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm border">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className={`${isSparePartsRelated ? 'bg-gradient-to-r from-orange-600 to-orange-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white`}>
                                <tr>
                                  {columns.map((column: string) => (
                                    <th key={column} className="px-4 py-3 text-left text-sm font-semibold">
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {records.slice(0, 5).map((record: any, index: number) => (
                                  <tr key={index} className={`hover:${isSparePartsRelated ? 'bg-orange-50' : 'bg-blue-50'} transition-colors`}>
                                    {columns.map((column: string) => {
                                      let value = record[column] || 'N/A'
                                      
                                      // Format the data based on column type
                                      if (column.toLowerCase().includes('date') && value !== 'N/A') {
                                        try {
                                          value = format(new Date(value), 'MMM dd, yyyy')
                                        } catch (e) {
                                          // Keep original value if date parsing fails
                                        }
                                      }
                                      
                                      if (column.toLowerCase().includes('cost') && typeof value === 'number') {
                                        value = formatKSH(value)
                                      }
                                      
                                      if (column.toLowerCase().includes('price') && typeof value === 'number') {
                                        value = formatKSH(value)
                                      }
                                      
                                      if (column.toLowerCase().includes('quantity') && typeof value === 'number') {
                                        value = `${value.toLocaleString()} units`
                                      }
                                      
                                      // Highlight spare parts related cells
                                      const isSpareCol = column.toLowerCase().includes('spare') || 
                                                       column.toLowerCase().includes('parts') ||
                                                       column.toLowerCase().includes('quantity') ||
                                                       column.toLowerCase().includes('destination') ||
                                                       column.toLowerCase().includes('supplier')
                                      
                                      return (
                                        <td 
                                          key={column} 
                                          className={`px-4 py-3 text-sm ${isSpareCol ? 'bg-orange-50 font-medium' : ''}`}
                                        >
                                          {typeof value === 'string' && value.length > 50 
                                            ? `${value.substring(0, 50)}...` 
                                            : value
                                          }
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                                {records.length > 5 && (
                                  <tr>
                                    <td 
                                      colSpan={columns.length}
                                      className={`px-4 py-3 text-center text-sm ${isSparePartsRelated ? 'text-orange-600' : 'text-blue-600'} italic font-medium`}
                                    >
                                      ... and {records.length - 5} more records (will be included in downloaded report)
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {Object.keys(generatedReport.data || {}).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No Data Found</h3>
                      <p className="text-sm">The generated report contains no data for the selected criteria.</p>
                    </div>
                  )}
                </div>

                {/* Download Buttons */}
                <div className="flex gap-3 mt-8 justify-center">
                  <Button 
                    onClick={downloadReportPDF}
                    disabled={isDownloading.pdf}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2"
                  >
                    {isDownloading.pdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF Report
                  </Button>
                  
                  <Button 
                    onClick={downloadReportExcel}
                    disabled={isDownloading.excel}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2"
                  >
                    {isDownloading.excel ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download Excel File
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setGeneratedReport(null)}
                    className="px-6 py-2"
                  >
                    Close Preview
                  </Button>
                </div>
                
                {/* Debug Information (Remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 p-4 bg-gray-50 rounded-lg text-xs">
                    <summary className="cursor-pointer font-medium">Debug Information</summary>
                    <div className="mt-2 space-y-2">
                      <div><strong>Generated Report Keys:</strong> {Object.keys(generatedReport).join(', ')}</div>
                      <div><strong>Data Keys:</strong> {Object.keys(generatedReport.data || {}).join(', ')}</div>
                      <div><strong>Selected Columns:</strong> {JSON.stringify(selectedColumns, null, 2)}</div>
                      {Object.keys(generatedReport.data || {}).map(key => (
                        <div key={key}>
                          <strong>{key} Records:</strong> {generatedReport.data[key]?.length || 0}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
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
          <Button onClick={() => setShowCustomGenerator(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Custom Report Generator
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

        <Card className="bg-card border-border border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Spare Parts</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {stats ? formatKSH(stats.sparesExpenses) : 'Loading...'}
            </div>
            <p className="text-xs text-orange-600">Parts investment</p>
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
