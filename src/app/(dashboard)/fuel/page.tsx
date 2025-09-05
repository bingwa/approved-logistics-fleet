// src/app/(dashboard)/fuel/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Plus, Fuel, TrendingUp, BarChart3, Download, Eye, FileText, Calculator, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddFuelRecordForm } from '@/components/forms/AddFuelRecordForm'
import { formatKSH, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface FuelRecord {
  id: string
  date: string
  liters: number
  costPerLiter: number
  totalCost: number
  route: string
  odometerReading: number
  previousOdometer: number
  distanceCovered: number
  efficiencyKmpl: number
  receiptNumber: string
  attendantName: string
  truck: {
    registration: string
    make: string
    model: string
  }
  user: {
    name: string
  }
}

const routeColors = {
  'Nairobi-Mombasa': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  'Nairobi-Kisumu': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  'Nairobi-Eldoret': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  'Nairobi-Meru': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  'Mombasa-Malaba': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300'
}

export default function FuelManagementPage() {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([])
  const [trucks, setTrucks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTruck, setSelectedTruck] = useState('all')
  const [selectedRoute, setSelectedRoute] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const router = useRouter()

  // Fetch fuel records from database
  const fetchFuelRecords = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      
      // Add cache busting timestamp
      const timestamp = Date.now()
      const response = await fetch(`/api/fuel?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched fuel records:', data.fuelRecords?.length || 0)
        setFuelRecords(data.fuelRecords || [])
      } else {
        console.error('Failed to fetch fuel records:', response.status)
        toast.error('Failed to load fuel records')
        setFuelRecords([])
      }
    } catch (error) {
      console.error('Error fetching fuel records:', error)
      toast.error('Error loading fuel records')
      setFuelRecords([])
    } finally {
      if (showLoading) setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch trucks for filters
  const fetchTrucks = async () => {
    try {
      const response = await fetch('/api/trucks', {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setTrucks(data.trucks || [])
      }
    } catch (error) {
      console.error('Error fetching trucks:', error)
    }
  }

  useEffect(() => {
    fetchFuelRecords()
    fetchTrucks()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchFuelRecords(false)
  }

  const handleRecordCreated = () => {
    // Refresh data after creating new record
    setShowAddForm(false)
    fetchFuelRecords(false)
    toast.success('Fuel record created successfully!')
  }

  // Calculate totals and analytics
  const totalLiters = fuelRecords.reduce((sum, record) => sum + record.liters, 0)
  const totalCost = fuelRecords.reduce((sum, record) => sum + record.totalCost, 0)
  const avgEfficiency = fuelRecords.length > 0 
    ? fuelRecords.reduce((sum, record) => sum + record.efficiencyKmpl, 0) / fuelRecords.length 
    : 0
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0
  const totalDistance = fuelRecords.reduce((sum, record) => sum + record.distanceCovered, 0)
  const avgCostPerKm = totalDistance > 0 ? totalCost / totalDistance : 0

  // Get unique values for filters
  const uniqueTrucks = [...new Set(fuelRecords.map(record => record.truck.registration))]
  const uniqueRoutes = [...new Set(fuelRecords.map(record => record.route))]

  // Filter records
  const filteredRecords = fuelRecords.filter(record => {
    const matchesSearch = record.truck.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.attendantName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTruck = selectedTruck === 'all' || record.truck.registration === selectedTruck
    const matchesRoute = selectedRoute === 'all' || record.route === selectedRoute
    return matchesSearch && matchesTruck && matchesRoute
  })

  // Generate fuel efficiency report
  const generateEfficiencyReport = (truckRegistration?: string) => {
    const records = truckRegistration 
      ? fuelRecords.filter(record => record.truck.registration === truckRegistration)
      : fuelRecords

    if (records.length === 0) {
      toast.error('No records available for report generation')
      return
    }

    const reportWindow = window.open('', '_blank')
    if (!reportWindow) return

    const currentDate = new Date().toLocaleDateString('en-KE')
    
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Fuel Efficiency Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { margin-top: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>FUEL EFFICIENCY REPORT</h1>
        <h2>Fleet Manager</h2>
        <p><strong>Generated on:</strong> ${currentDate}</p>
    </div>
    
    <div class="info">
        <p><strong>Current Rate:</strong> KSh ${avgCostPerLiter.toFixed(2)} per liter (average)</p>
        <p><strong>Report Period:</strong> ${new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</p>
        <p><strong>Total Records:</strong> ${records.length}</p>
        ${truckRegistration ? `<p><strong>Vehicle:</strong> ${truckRegistration}</p>` : ''}
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Truck</th>
                <th>Route</th>
                <th>Liters</th>
                <th>Distance (km)</th>
                <th>Efficiency (km/L)</th>
                <th>Total Cost (KSh)</th>
                <th>Cost/km (KSh)</th>
                <th>Attendant</th>
            </tr>
        </thead>
        <tbody>
            ${records.map(record => {
              const costPerKm = record.distanceCovered > 0 ? record.totalCost / record.distanceCovered : 0
              return `
                <tr>
                    <td>${formatDate(record.date)}</td>
                    <td>${record.truck.registration}</td>
                    <td>${record.route}</td>
                    <td>${record.liters}</td>
                    <td>${record.distanceCovered}</td>
                    <td>${record.efficiencyKmpl.toFixed(1)}</td>
                    <td>${record.totalCost.toLocaleString()}</td>
                    <td>${costPerKm.toFixed(2)}</td>
                    <td>${record.attendantName}</td>
                </tr>
              `
            }).join('')}
        </tbody>
    </table>

    <div class="summary">
        <h3>SUMMARY BY ROUTE</h3>
        ${uniqueRoutes.map(route => {
          const routeRecords = records.filter(r => r.route === route)
          const routeAvgEfficiency = routeRecords.reduce((sum, r) => sum + r.efficiencyKmpl, 0) / routeRecords.length
          const routeTotalCost = routeRecords.reduce((sum, r) => sum + r.totalCost, 0)
          const routeTotalDistance = routeRecords.reduce((sum, r) => sum + r.distanceCovered, 0)
          
          return `<p><strong>${route}:</strong> ${routeRecords.length} trips, ${routeAvgEfficiency.toFixed(1)} km/L average, KSh ${routeTotalCost.toLocaleString()} total cost, ${routeTotalDistance.toLocaleString()} km total distance</p>`
        }).join('')}
    </div>

    <script>
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`

    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading fuel records...</span>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fuel Management</h1>
          <p className="text-muted-foreground">
            Track fuel consumption, costs, and efficiency from company depot
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fuel Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Fuel Record</DialogTitle>
                <DialogDescription>
                  Record fuel dispensing from the company depot
                </DialogDescription>
              </DialogHeader>
              <AddFuelRecordForm 
                onSuccess={handleRecordCreated}
                onCancel={() => setShowAddForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel dispensing</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiters.toLocaleString()}L</div>
            <p className="text-xs text-muted-foreground">Fuel consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKSH(totalCost)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEfficiency.toFixed(1)} km/L</div>
            <p className="text-xs text-muted-foreground">Fleet average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKSH(avgCostPerLiter)}</div>
            <p className="text-xs text-muted-foreground">Depot rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost/km</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKSH(avgCostPerKm)}</div>
            <p className="text-xs text-muted-foreground">Per kilometer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDistance.toLocaleString()} km</div>
            <p className="text-xs text-muted-foreground">Total covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by truck, route, or attendant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sm:max-w-sm"
            />
            
            <Select value={selectedTruck} onValueChange={setSelectedTruck}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="All trucks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trucks</SelectItem>
                {uniqueTrucks.map((truck) => (
                  <SelectItem key={truck} value={truck}>
                    {truck}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue placeholder="All routes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All routes</SelectItem>
                {uniqueRoutes.map((route) => (
                  <SelectItem key={route} value={route}>
                    {route}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => generateEfficiencyReport()}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Report
              </Button>
              <Button 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Records Table */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No fuel records found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {fuelRecords.length === 0 
                  ? 'Start by adding your first fuel record'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {fuelRecords.length === 0 && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Record
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Truck</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Liters</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Efficiency</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Attendant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{record.truck.registration}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.truck.make} {record.truck.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={routeColors[record.route as keyof typeof routeColors] || 'bg-gray-100 text-gray-800'}
                        >
                          {record.route}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.liters}L</TableCell>
                      <TableCell>{record.distanceCovered} km</TableCell>
                      <TableCell>{record.efficiencyKmpl.toFixed(1)} km/L</TableCell>
                      <TableCell>{formatKSH(record.totalCost)}</TableCell>
                      <TableCell>{record.attendantName}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateEfficiencyReport(record.truck.registration)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
